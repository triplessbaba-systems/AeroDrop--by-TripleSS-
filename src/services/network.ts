import { PeerDevice, IncomingTransferPrompt, ClipboardItem } from '../types/transfer';

type EventCallback = (data: any) => void;

export class NetworkService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.emit('connection_change', { status: 'connected' });
        this.startHeartbeat();
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.emit('connection_change', { status: 'disconnected' });
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.emit('connection_change', { status: 'error' });
      };

      this.ws.binaryType = 'arraybuffer';

      this.ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          if (event.data.byteLength >= 40) {
            const idBytes = new Uint8Array(event.data, 0, 36);
            const transferId = new TextDecoder().decode(idBytes).trim();
            const view = new DataView(event.data, 36, 4);
            const chunkIndex = view.getUint32(0, true);
            const chunkData = new Uint8Array(event.data, 40);
            this.emit('binary_chunk', { transferId, chunkIndex, chunkData });
          }
          return;
        }

        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (err) {
          return;
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleIncomingMessage(message: { type: string; payload: any }): void {
    const { type, payload } = message;

    switch (type) {
      case 'INIT_STATE':
        this.emit('init_state', payload);
        break;
      case 'PEER_JOINED':
        this.emit('peer_joined', payload as PeerDevice);
        break;
      case 'PEER_LEFT':
        this.emit('peer_left', payload as { id: string });
        break;
      case 'PEER_UPDATED':
        this.emit('peer_updated', payload as PeerDevice);
        break;
      case 'TRANSFER_REQUEST':
        this.emit('transfer_request', payload as IncomingTransferPrompt);
        break;
      case 'TRANSFER_ACCEPTED':
        this.emit('transfer_accepted', payload);
        break;
      case 'TRANSFER_REJECTED':
        this.emit('transfer_rejected', payload);
        break;
      case 'TRANSFER_CHUNK':
        this.emit('transfer_chunk', payload);
        break;
      case 'TRANSFER_COMPLETED':
        this.emit('transfer_completed', payload);
        break;
      case 'TRANSFER_CANCELLED':
        this.emit('transfer_cancelled', payload);
        break;
      case 'TRANSFER_PAUSED':
        this.emit('transfer_paused', payload);
        break;
      case 'TRANSFER_RESUMED':
        this.emit('transfer_resumed', payload);
        break;
      case 'CLIPBOARD_RECEIVED':
        this.emit('clipboard_received', payload as ClipboardItem);
        break;
      default:
        break;
    }
  }

  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  private sendJson(type: string, payload: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }

  public renameSelf(name: string): void {
    this.sendJson('RENAME_PEER', { name });
  }

  public sendTransferOffer(
    receiverId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    totalChunks: number
  ): void {
    this.sendJson('TRANSFER_OFFER', {
      receiverId,
      fileName,
      fileSize,
      mimeType,
      totalChunks
    });
  }

  public sendConsent(transferId: string, accepted: boolean): void {
    this.sendJson('TRANSFER_CONSENT', { transferId, accepted });
  }

  public sendChunk(transferId: string, chunkIndex: number, totalChunks: number, chunkData: string): void {
    this.sendJson('TRANSFER_CHUNK', {
      transferId,
      chunkIndex,
      totalChunks,
      chunkData
    });
  }

  public sendComplete(transferId: string): void {
    this.sendJson('TRANSFER_COMPLETE', { transferId });
  }

  public sendPublicKey(publicKey: string): void {
    this.sendJson('SET_PUBLIC_KEY', { publicKey });
  }

  public sendPause(transferId: string): void {
    this.sendJson('TRANSFER_PAUSE', { transferId });
  }

  public sendResume(transferId: string): void {
    this.sendJson('TRANSFER_RESUME', { transferId });
  }

  public sendBinaryChunk(transferId: string, chunkIndex: number, data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const encoder = new TextEncoder();
      const idBytes = encoder.encode(transferId.padEnd(36, ' ').slice(0, 36));
      const packet = new Uint8Array(40 + data.length);
      packet.set(idBytes, 0);
      const view = new DataView(packet.buffer, 36, 4);
      view.setUint32(0, chunkIndex, true);
      packet.set(data, 40);
      this.ws.send(packet.buffer);
    }
  }

  public sendCancel(transferId: string): void {
    this.sendJson('TRANSFER_CANCEL', { transferId });
  }

  public sendClipboard(text: string, targetPeerId?: string): void {
    this.sendJson('CLIPBOARD_SHARE', { text, targetPeerId });
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getIsConnecting(): boolean {
    return this.isConnecting;
  }
}

export const network = new NetworkService();

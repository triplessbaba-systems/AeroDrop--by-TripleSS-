export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type OperatingSystem = 'windows' | 'macos' | 'ios' | 'android' | 'linux' | 'unknown';

export interface PeerDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  os: OperatingSystem;
  ip: string;
  isHost: boolean;
  connectedAt: number;
  publicKey?: string;
}

export type TransferStatus =
  | 'idle'
  | 'offering'
  | 'pending_consent'
  | 'streaming'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled';

export interface ActiveTransfer {
  transferId: string;
  direction: 'upload' | 'download';
  peerId: string;
  peerName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: TransferStatus;
  progress: number;
  transferredBytes: number;
  totalChunks: number;
  transferredChunks: number;
  speedBps: number;
  estimatedRemainingSeconds: number;
  startTime: number;
  isEncrypted?: boolean;
  error?: string;
  downloadBlobUrl?: string;
}

export interface IncomingTransferPrompt {
  transferId: string;
  senderId: string;
  senderName: string;
  senderOs: OperatingSystem;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  isEncrypted?: boolean;
}

export interface ClipboardItem {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isEncrypted?: boolean;
}

export interface ServerInfo {
  hostName: string;
  port: number;
  localIps: Array<{ interface: string; address: string }>;
  primaryIp: string;
  primaryUrl: string;
  peerCount: number;
  qrCode: string;
}

export interface TransferHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  direction: 'sent' | 'received';
  peerName: string;
  timestamp: number;
  isEncrypted?: boolean;
  downloadUrl?: string;
}

export interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  path?: string;
}

export interface MediaPreviewTarget {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

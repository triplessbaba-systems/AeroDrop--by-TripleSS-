import React, { useState, useEffect, useRef } from 'react';
import { network } from './services/network';
import { cryptoService } from './services/crypto';
import { audioNotification } from './services/audio';
import { storageService } from './services/storage';
import { wakeLockService } from './services/wakeLock';
import { ZipBuilder, ZipEntry } from './services/zip';
import {
  PeerDevice,
  ActiveTransfer,
  IncomingTransferPrompt,
  ClipboardItem,
  ServerInfo,
  TransferHistoryItem,
  MediaPreviewTarget
} from './types/transfer';
import { Header } from './components/Header';
import { RadarView } from './components/RadarView';
import { DropZone } from './components/DropZone';
import { TransferConsentModal } from './components/TransferConsentModal';
import { ActiveTransfers } from './components/ActiveTransfers';
import { ClipboardSync } from './components/ClipboardSync';
import { QRCodeModal } from './components/QRCodeModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { MediaPreviewModal } from './components/MediaPreviewModal';

const CHUNK_SIZE = 128 * 1024;

export const App: React.FC = () => {
  const [self, setSelf] = useState<PeerDevice | null>(null);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(audioNotification.getSoundEnabled());
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(
    audioNotification.getNotificationEnabled()
  );
  const [isEncryptedReady, setIsEncryptedReady] = useState<boolean>(false);

  const [incomingPrompt, setIncomingPrompt] = useState<IncomingTransferPrompt | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<ActiveTransfer[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);

  const [previewTarget, setPreviewTarget] = useState<MediaPreviewTarget | null>(null);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const receivingBuffers = useRef<
    Map<
      string,
      {
        fileName: string;
        fileSize: number;
        mimeType: string;
        totalChunks: number;
        chunks: Uint8Array[];
        senderName: string;
        senderId: string;
        startTime: number;
        isEncrypted: boolean;
      }
    >
  >(new Map());

  const activeUploads = useRef<
    Map<
      string,
      {
        file: File;
        receiverId: string;
        isPaused: boolean;
        cancelled: boolean;
        currentChunk: number;
        totalChunks: number;
      }
    >
  >(new Map());

  useEffect(() => {
    fetch('/api/info')
      .then((res) => res.json())
      .then((data: ServerInfo) => {
        setServerInfo(data);
      })
      .catch(() => {});

    cryptoService
      .initialize()
      .then((publicKeyJwk) => {
        setIsEncryptedReady(true);
        network.sendPublicKey(publicKeyJwk);
      })
      .catch(() => {
        setIsEncryptedReady(false);
      });

    const unsubscribeConn = network.on('connection_change', ({ status }) => {
      setIsConnected(status === 'connected');
    });

    const syncPeerCrypto = (peerList: PeerDevice[]) => {
      peerList.forEach((p) => {
        if (p.publicKey) {
          cryptoService.deriveSharedKeyForPeer(p.id, p.publicKey).catch(() => {});
        }
      });
    };

    const unsubscribeInit = network.on('init_state', (payload) => {
      setSelf(payload.self);
      setPeers(payload.peers);
      syncPeerCrypto(payload.peers);
      if (payload.peers.length > 0 && !selectedPeerId) {
        setSelectedPeerId(payload.peers[0].id);
      }
    });

    const unsubscribeJoined = network.on('peer_joined', (newPeer: PeerDevice) => {
      setPeers((prev) => {
        const filtered = prev.filter((p) => p.id !== newPeer.id);
        return [...filtered, newPeer];
      });
      if (newPeer.publicKey) {
        cryptoService.deriveSharedKeyForPeer(newPeer.id, newPeer.publicKey).catch(() => {});
      }
      setSelectedPeerId((prev) => prev || newPeer.id);
    });

    const unsubscribeLeft = network.on('peer_left', ({ id }) => {
      setPeers((prev) => prev.filter((p) => p.id !== id));
      cryptoService.removePeerKey(id);
      setSelectedPeerId((prev) => (prev === id ? null : prev));
    });

    const unsubscribeUpdated = network.on('peer_updated', (updatedPeer: PeerDevice) => {
      setPeers((prev) => prev.map((p) => (p.id === updatedPeer.id ? updatedPeer : p)));
      setSelf((prev) => (prev?.id === updatedPeer.id ? updatedPeer : prev));
      if (updatedPeer.publicKey) {
        cryptoService.deriveSharedKeyForPeer(updatedPeer.id, updatedPeer.publicKey).catch(() => {});
      }
    });

    const unsubscribeRequest = network.on('transfer_request', (prompt: IncomingTransferPrompt) => {
      setIncomingPrompt(prompt);
      audioNotification.playChime('offer');
      audioNotification.showNotification(
        'Gelen Dosya Talebi',
        `${prompt.senderName} size "${prompt.fileName}" göndermek istiyor.`
      );
    });

    const unsubscribeAccepted = network.on('transfer_accepted', ({ transferId }) => {
      startChunkStreaming(transferId);
    });

    const unsubscribeRejected = network.on('transfer_rejected', ({ transferId }) => {
      setActiveTransfers((prev) =>
        prev.map((t) => (t.transferId === transferId ? { ...t, status: 'rejected' } : t))
      );
      activeUploads.current.delete(transferId);
      audioNotification.playChime('error');
      wakeLockService.release();
    });

    const unsubscribeBinaryChunk = network.on(
      'binary_chunk',
      ({ transferId, chunkIndex, chunkData }) => {
        handleIncomingBinaryChunk(transferId, chunkIndex, chunkData);
      }
    );

    const unsubscribeCompleted = network.on('transfer_completed', ({ transferId, fileName, fileSize }) => {
      handleTransferCompleted(transferId, fileName, fileSize);
    });

    const unsubscribeCancelled = network.on('transfer_cancelled', ({ transferId }) => {
      setActiveTransfers((prev) =>
        prev.map((t) => (t.transferId === transferId ? { ...t, status: 'cancelled' } : t))
      );
      receivingBuffers.current.delete(transferId);
      storageService.clearTransfer(transferId);
      const upload = activeUploads.current.get(transferId);
      if (upload) {
        upload.cancelled = true;
        activeUploads.current.delete(transferId);
      }
      audioNotification.playChime('error');
      wakeLockService.release();
    });

    const unsubscribePaused = network.on('transfer_paused', ({ transferId }) => {
      setActiveTransfers((prev) =>
        prev.map((t) => (t.transferId === transferId ? { ...t, status: 'paused' } : t))
      );
      const upload = activeUploads.current.get(transferId);
      if (upload) {
        upload.isPaused = true;
      }
    });

    const unsubscribeResumed = network.on('transfer_resumed', ({ transferId }) => {
      setActiveTransfers((prev) =>
        prev.map((t) => (t.transferId === transferId ? { ...t, status: 'streaming' } : t))
      );
      const upload = activeUploads.current.get(transferId);
      if (upload) {
        upload.isPaused = false;
        resumeUploadStreaming(transferId);
      }
    });

    const unsubscribeClipboard = network.on('clipboard_received', (clip: ClipboardItem) => {
      setClipboardItems((prev) => [clip, ...prev.slice(0, 19)]);
      audioNotification.playChime('offer');
      audioNotification.showNotification('Pano Verisi Alındı', `${clip.senderName} bir metin paylaştı.`);
    });

    return () => {
      unsubscribeConn();
      unsubscribeInit();
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribeUpdated();
      unsubscribeRequest();
      unsubscribeAccepted();
      unsubscribeRejected();
      unsubscribeBinaryChunk();
      unsubscribeCompleted();
      unsubscribeCancelled();
      unsubscribePaused();
      unsubscribeResumed();
      unsubscribeClipboard();
    };
  }, []);

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    audioNotification.setSoundEnabled(next);
  };

  const handleRequestNotification = async () => {
    const granted = await audioNotification.requestNotificationPermission();
    setIsNotificationEnabled(granted);
  };

  const handleUpdateName = (newName: string) => {
    network.renameSelf(newName);
    setSelf((prev) => (prev ? { ...prev, name: newName } : null));
  };

  const handleSendFiles = async (files: File[], receiverId: string) => {
    const receiver = peers.find((p) => p.id === receiverId);
    if (!receiver) return;

    for (const file of files) {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const tempTransferId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const sharedKey = cryptoService.getSharedKey(receiverId);

      activeUploads.current.set(tempTransferId, {
        file,
        receiverId,
        isPaused: false,
        cancelled: false,
        currentChunk: 0,
        totalChunks
      });

      const newTransfer: ActiveTransfer = {
        transferId: tempTransferId,
        direction: 'upload',
        peerId: receiverId,
        peerName: receiver.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'offering',
        progress: 0,
        transferredBytes: 0,
        totalChunks,
        transferredChunks: 0,
        speedBps: 0,
        estimatedRemainingSeconds: 0,
        startTime: Date.now(),
        isEncrypted: !!sharedKey
      };

      setActiveTransfers((prev) => [newTransfer, ...prev]);

      await new Promise<void>((resolve) => {
        const unsubscribeOfferSent = network.on('transfer_offer_sent', (session) => {
          unsubscribeOfferSent();
          const uploadSession = activeUploads.current.get(tempTransferId);
          if (uploadSession) {
            activeUploads.current.delete(tempTransferId);
            activeUploads.current.set(session.transferId, uploadSession);
          }

          setActiveTransfers((prev) =>
            prev.map((t) =>
              t.transferId === tempTransferId
                ? { ...t, transferId: session.transferId, status: 'offering' }
                : t
            )
          );
          resolve();
        });

        network.sendTransferOffer(receiverId, file.name, file.size, file.type, totalChunks);
      });
    }
  };

  const startChunkStreaming = async (transferId: string) => {
    const uploadSession = activeUploads.current.get(transferId);
    if (!uploadSession) return;

    await wakeLockService.acquire();

    const { file, receiverId } = uploadSession;
    const totalChunks = uploadSession.totalChunks;
    const startTime = Date.now();
    const sharedKey = cryptoService.getSharedKey(receiverId);

    setActiveTransfers((prev) =>
      prev.map((t) => (t.transferId === transferId ? { ...t, status: 'streaming', startTime } : t))
    );

    for (let chunkIndex = uploadSession.currentChunk; chunkIndex < totalChunks; chunkIndex++) {
      if (uploadSession.cancelled) {
        wakeLockService.release();
        return;
      }
      if (uploadSession.isPaused) {
        uploadSession.currentChunk = chunkIndex;
        wakeLockService.release();
        return;
      }

      const startByte = chunkIndex * CHUNK_SIZE;
      const endByte = Math.min(file.size, startByte + CHUNK_SIZE);
      const chunkBlob = file.slice(startByte, endByte);
      const arrayBuffer = await chunkBlob.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);

      let payloadPacket: Uint8Array;

      if (sharedKey) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          sharedKey,
          rawBytes
        );
        const cipherBytes = new Uint8Array(encrypted);
        payloadPacket = new Uint8Array(1 + 12 + cipherBytes.length);
        payloadPacket[0] = 1;
        payloadPacket.set(iv, 1);
        payloadPacket.set(cipherBytes, 13);
      } else {
        payloadPacket = new Uint8Array(1 + rawBytes.length);
        payloadPacket[0] = 0;
        payloadPacket.set(rawBytes, 1);
      }

      network.sendBinaryChunk(transferId, chunkIndex, payloadPacket);
      uploadSession.currentChunk = chunkIndex + 1;

      const transferredBytes = endByte;
      const progress = Math.round((transferredBytes / file.size) * 100);
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speedBps = elapsedSeconds > 0 ? transferredBytes / elapsedSeconds : 0;
      const remainingBytes = file.size - transferredBytes;
      const estimatedRemainingSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;

      setActiveTransfers((prev) =>
        prev.map((t) =>
          t.transferId === transferId
            ? {
                ...t,
                progress,
                transferredBytes,
                transferredChunks: chunkIndex + 1,
                speedBps,
                estimatedRemainingSeconds
              }
            : t
        )
      );

      if (chunkIndex % 4 === 0) {
        await new Promise((r) => setTimeout(r, 2));
      }
    }

    network.sendComplete(transferId);
    wakeLockService.release();
  };

  const resumeUploadStreaming = (transferId: string) => {
    startChunkStreaming(transferId);
  };

  const handlePauseTransfer = (transferId: string) => {
    const upload = activeUploads.current.get(transferId);
    if (upload) {
      upload.isPaused = true;
    }
    network.sendPause(transferId);
    setActiveTransfers((prev) =>
      prev.map((t) => (t.transferId === transferId ? { ...t, status: 'paused' } : t))
    );
    wakeLockService.release();
  };

  const handleResumeTransfer = (transferId: string) => {
    const upload = activeUploads.current.get(transferId);
    if (upload) {
      upload.isPaused = false;
      resumeUploadStreaming(transferId);
    }
    network.sendResume(transferId);
    setActiveTransfers((prev) =>
      prev.map((t) => (t.transferId === transferId ? { ...t, status: 'streaming' } : t))
    );
  };

  const handleAcceptPrompt = async (transferId: string) => {
    if (!incomingPrompt) return;

    await wakeLockService.acquire();
    const sharedKey = cryptoService.getSharedKey(incomingPrompt.senderId);

    receivingBuffers.current.set(transferId, {
      fileName: incomingPrompt.fileName,
      fileSize: incomingPrompt.fileSize,
      mimeType: incomingPrompt.mimeType,
      totalChunks: incomingPrompt.totalChunks,
      chunks: [],
      senderName: incomingPrompt.senderName,
      senderId: incomingPrompt.senderId,
      startTime: Date.now(),
      isEncrypted: !!sharedKey
    });

    const newTransfer: ActiveTransfer = {
      transferId,
      direction: 'download',
      peerId: incomingPrompt.senderId,
      peerName: incomingPrompt.senderName,
      fileName: incomingPrompt.fileName,
      fileSize: incomingPrompt.fileSize,
      mimeType: incomingPrompt.mimeType,
      status: 'streaming',
      progress: 0,
      transferredBytes: 0,
      totalChunks: incomingPrompt.totalChunks,
      transferredChunks: 0,
      speedBps: 0,
      estimatedRemainingSeconds: 0,
      startTime: Date.now(),
      isEncrypted: !!sharedKey
    };

    setActiveTransfers((prev) => [newTransfer, ...prev]);
    network.sendConsent(transferId, true);
    setIncomingPrompt(null);
  };

  const handleRejectPrompt = (transferId: string) => {
    network.sendConsent(transferId, false);
    setIncomingPrompt(null);
  };

  const handleIncomingBinaryChunk = async (
    transferId: string,
    chunkIndex: number,
    chunkData: Uint8Array
  ) => {
    const bufferRec = receivingBuffers.current.get(transferId);
    if (!bufferRec) return;

    const isEnc = chunkData[0] === 1;
    let rawPayload: Uint8Array;

    if (isEnc) {
      const iv = chunkData.slice(1, 13);
      const cipherBytes = chunkData.slice(13);
      const key = cryptoService.getSharedKey(bufferRec.senderId);
      if (key) {
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          cipherBytes
        );
        rawPayload = new Uint8Array(decrypted);
      } else {
        rawPayload = cipherBytes;
      }
    } else {
      rawPayload = chunkData.slice(1);
    }

    bufferRec.chunks[chunkIndex] = rawPayload;
    storageService.saveChunk(transferId, chunkIndex, rawPayload).catch(() => {});

    const transferredChunks = bufferRec.chunks.filter(Boolean).length;
    const approximateChunkBytes = CHUNK_SIZE;
    const transferredBytes = Math.min(bufferRec.fileSize, transferredChunks * approximateChunkBytes);
    const progress = Math.round((transferredChunks / bufferRec.totalChunks) * 100);
    const elapsedSeconds = (Date.now() - bufferRec.startTime) / 1000;
    const speedBps = elapsedSeconds > 0 ? transferredBytes / elapsedSeconds : 0;
    const remainingBytes = bufferRec.fileSize - transferredBytes;
    const estimatedRemainingSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;

    setActiveTransfers((prev) =>
      prev.map((t) =>
        t.transferId === transferId
          ? {
              ...t,
              progress,
              transferredBytes,
              transferredChunks,
              speedBps,
              estimatedRemainingSeconds
            }
          : t
      )
    );
  };

  const handleTransferCompleted = async (
    transferId: string,
    fileName: string,
    fileSize: number
  ) => {
    let bufferRec = receivingBuffers.current.get(transferId);
    let downloadBlobUrl: string | undefined;

    if (bufferRec) {
      try {
        let chunks = bufferRec.chunks;
        if (chunks.filter(Boolean).length < bufferRec.totalChunks) {
          const stored = await storageService.getAllChunks(transferId);
          if (stored.length > 0) chunks = stored as Uint8Array[];
        }

        const blob = new Blob(chunks as BlobPart[], { type: bufferRec.mimeType });
        downloadBlobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadBlobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        audioNotification.playChime('complete');
        audioNotification.showNotification('Transfer Tamamlandı', `"${fileName}" başarıyla indirildi.`);
      } catch (err) {
        audioNotification.playChime('error');
      }
    } else {
      audioNotification.playChime('complete');
    }

    setActiveTransfers((prev) =>
      prev.map((t) =>
        t.transferId === transferId
          ? {
              ...t,
              status: 'completed',
              progress: 100,
              transferredBytes: fileSize,
              downloadBlobUrl
            }
          : t
      )
    );

    const activeItem = activeTransfers.find((t) => t.transferId === transferId);
    const historyItem: TransferHistoryItem = {
      id: transferId,
      fileName,
      fileSize,
      direction: activeItem?.direction === 'upload' ? 'sent' : 'received',
      peerName: activeItem?.peerName || bufferRec?.senderName || 'Cihaz',
      timestamp: Date.now(),
      isEncrypted: activeItem?.isEncrypted || bufferRec?.isEncrypted,
      downloadUrl: downloadBlobUrl
    };

    setHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
    receivingBuffers.current.delete(transferId);
    activeUploads.current.delete(transferId);
    storageService.clearTransfer(transferId).catch(() => {});
    wakeLockService.release();
  };

  const handleCancelTransfer = (transferId: string) => {
    network.sendCancel(transferId);
    setActiveTransfers((prev) =>
      prev.map((t) => (t.transferId === transferId ? { ...t, status: 'cancelled' } : t))
    );
    const upload = activeUploads.current.get(transferId);
    if (upload) {
      upload.cancelled = true;
      activeUploads.current.delete(transferId);
    }
    receivingBuffers.current.delete(transferId);
    storageService.clearTransfer(transferId).catch(() => {});
    wakeLockService.release();
  };

  const handleShareClipboard = async (text: string) => {
    let payloadText = text;
    let isEnc = false;
    if (selectedPeerId) {
      const key = cryptoService.getSharedKey(selectedPeerId);
      if (key) {
        const encrypted = await cryptoService.encryptText(text, key);
        payloadText = JSON.stringify(encrypted);
        isEnc = true;
      }
    }

    network.sendClipboard(payloadText, selectedPeerId || undefined);
    const localItem: ClipboardItem = {
      id: Date.now().toString(),
      senderId: self?.id || 'self',
      senderName: self?.name || 'Siz',
      text,
      timestamp: Date.now(),
      isEncrypted: isEnc
    };
    setClipboardItems((prev) => [localItem, ...prev.slice(0, 19)]);
  };

  const handleDownloadAllAsZip = async () => {
    const completed = activeTransfers.filter(
      (t) => t.direction === 'download' && t.status === 'completed' && t.downloadBlobUrl
    );
    if (completed.length === 0) return;

    const entries: ZipEntry[] = [];
    for (const item of completed) {
      try {
        const res = await fetch(item.downloadBlobUrl!);
        const arrayBuf = await res.arrayBuffer();
        entries.push({
          name: item.fileName,
          data: new Uint8Array(arrayBuf)
        });
      } catch (err) {
        continue;
      }
    }

    if (entries.length > 0) {
      const zipBlob = await ZipBuilder.createZip(entries);
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `AeroDrop_Arsiv_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="app-container">
      <Header
        self={self}
        serverInfo={serverInfo}
        isConnected={isConnected}
        isSoundEnabled={isSoundEnabled}
        isNotificationEnabled={isNotificationEnabled}
        isEncryptedReady={isEncryptedReady}
        onToggleSound={handleToggleSound}
        onRequestNotification={handleRequestNotification}
        onOpenQR={() => setIsQROpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onUpdateName={handleUpdateName}
      />

      <div className="main-grid">
        <RadarView
          self={self}
          peers={peers}
          selectedPeerId={selectedPeerId}
          onSelectPeer={setSelectedPeerId}
          onDropFileOnPeer={(peerId, files) => {
            const arr = Array.from(files);
            handleSendFiles(arr, peerId);
          }}
          onOpenQR={() => setIsQROpen(true)}
        />

        <div className="side-panel">
          <DropZone
            peers={peers}
            selectedPeerId={selectedPeerId}
            onSelectPeer={setSelectedPeerId}
            onSendFiles={handleSendFiles}
          />

          <ActiveTransfers
            transfers={activeTransfers}
            onCancelTransfer={handleCancelTransfer}
            onPauseTransfer={handlePauseTransfer}
            onResumeTransfer={handleResumeTransfer}
            onPreviewMedia={setPreviewTarget}
            onDownloadAllAsZip={handleDownloadAllAsZip}
          />

          <ClipboardSync
            items={clipboardItems}
            onShareText={handleShareClipboard}
          />
        </div>
      </div>

      <TransferConsentModal
        prompt={incomingPrompt}
        onAccept={handleAcceptPrompt}
        onReject={handleRejectPrompt}
      />

      <QRCodeModal
        isOpen={isQROpen}
        serverInfo={serverInfo}
        onClose={() => setIsQROpen(false)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
        onClearHistory={() => setHistory([])}
      />

      <MediaPreviewModal
        preview={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
};

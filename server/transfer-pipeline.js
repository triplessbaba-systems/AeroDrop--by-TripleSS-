import { randomUUID } from 'crypto';

export class TransferPipeline {
  constructor(peerManager) {
    this.peerManager = peerManager;
    this.transfers = new Map();
    this.fallbackFiles = new Map();
  }

  createTransferOffer({ senderId, receiverId, fileName, fileSize, mimeType, totalChunks }) {
    const sender = this.peerManager.get(senderId);
    const receiver = this.peerManager.get(receiverId);

    if (!sender || !receiver) {
      return { error: 'Gonderici veya alici cihaz bulunamadi.' };
    }

    const transferId = randomUUID();
    const session = {
      transferId,
      senderId,
      senderName: sender.name,
      receiverId,
      receiverName: receiver.name,
      fileName,
      fileSize,
      mimeType: mimeType || 'application/octet-stream',
      totalChunks,
      status: 'offering',
      transferredChunks: 0,
      createdAt: Date.now()
    };

    this.transfers.set(transferId, session);

    const sent = this.peerManager.send(receiverId, {
      type: 'TRANSFER_REQUEST',
      payload: {
        transferId,
        senderId,
        senderName: sender.name,
        senderOs: sender.os,
        fileName,
        fileSize,
        mimeType: session.mimeType,
        totalChunks
      }
    });

    if (!sent) {
      this.transfers.delete(transferId);
      return { error: 'Alici cihaza ulasilamadi.' };
    }

    return { session };
  }

  handleConsent(transferId, receiverId, accepted) {
    const session = this.transfers.get(transferId);
    if (!session || session.receiverId !== receiverId) {
      return false;
    }

    if (!accepted) {
      session.status = 'rejected';
      this.peerManager.send(session.senderId, {
        type: 'TRANSFER_REJECTED',
        payload: { transferId, receiverId, receiverName: session.receiverName }
      });
      this.transfers.delete(transferId);
      return true;
    }

    session.status = 'streaming';
    this.peerManager.send(session.senderId, {
      type: 'TRANSFER_ACCEPTED',
      payload: { transferId, receiverId, receiverName: session.receiverName }
    });
    return true;
  }

  relayChunk(transferId, chunkIndex, totalChunks, chunkData) {
    const session = this.transfers.get(transferId);
    if (!session || session.status !== 'streaming') {
      return false;
    }

    session.transferredChunks = chunkIndex + 1;

    return this.peerManager.send(session.receiverId, {
      type: 'TRANSFER_CHUNK',
      payload: {
        transferId,
        chunkIndex,
        totalChunks,
        chunkData
      }
    });
  }

  completeTransfer(transferId) {
    const session = this.transfers.get(transferId);
    if (!session) return false;

    session.status = 'completed';

    this.peerManager.send(session.receiverId, {
      type: 'TRANSFER_COMPLETED',
      payload: {
        transferId,
        fileName: session.fileName,
        fileSize: session.fileSize
      }
    });

    this.peerManager.send(session.senderId, {
      type: 'TRANSFER_COMPLETED',
      payload: {
        transferId,
        fileName: session.fileName,
        fileSize: session.fileSize
      }
    });

    setTimeout(() => {
      this.transfers.delete(transferId);
    }, 10000);

    return true;
  }

  cancelTransfer(transferId, cancelledByPeerId) {
    const session = this.transfers.get(transferId);
    if (!session) return false;

    session.status = 'cancelled';
    const otherPeerId = session.senderId === cancelledByPeerId ? session.receiverId : session.senderId;

    this.peerManager.send(otherPeerId, {
      type: 'TRANSFER_CANCELLED',
      payload: { transferId, cancelledBy: cancelledByPeerId }
    });

    this.transfers.delete(transferId);
    return true;
  }

  cleanupPeerTransfers(peerId) {
    for (const [id, session] of this.transfers.entries()) {
      if (session.senderId === peerId || session.receiverId === peerId) {
        this.cancelTransfer(id, peerId);
      }
    }
  }

  storeFallbackFile(fileName, mimeType, buffer) {
    const fileId = randomUUID();
    this.fallbackFiles.set(fileId, {
      fileId,
      fileName,
      mimeType,
      buffer,
      createdAt: Date.now()
    });

    setTimeout(() => {
      this.fallbackFiles.delete(fileId);
    }, 3600000);

    return fileId;
  }

  getFallbackFile(fileId) {
    return this.fallbackFiles.get(fileId) || null;
  }
}

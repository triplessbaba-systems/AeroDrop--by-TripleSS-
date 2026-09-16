import { randomUUID } from 'crypto';

export class PeerManager {
  constructor() {
    this.peers = new Map();
  }

  detectDeviceType(userAgent = '') {
    const ua = userAgent.toLowerCase();
    if (/iphone|ipod/.test(ua)) return { deviceType: 'mobile', os: 'ios' };
    if (/ipad/.test(ua)) return { deviceType: 'tablet', os: 'ios' };
    if (/android/.test(ua)) {
      if (/mobile/.test(ua)) return { deviceType: 'mobile', os: 'android' };
      return { deviceType: 'tablet', os: 'android' };
    }
    if (/macintosh|mac os x/.test(ua)) return { deviceType: 'desktop', os: 'macos' };
    if (/windows/.test(ua)) return { deviceType: 'desktop', os: 'windows' };
    if (/linux/.test(ua)) return { deviceType: 'desktop', os: 'linux' };
    return { deviceType: 'desktop', os: 'unknown' };
  }

  generateDefaultName(deviceType, os, clientIp) {
    const osNames = {
      windows: 'Windows PC',
      macos: 'MacBook',
      ios: 'iPhone',
      android: 'Android Cihaz',
      linux: 'Linux Makine',
      unknown: 'Cihaz'
    };
    const base = osNames[os] || 'İstemci';
    const lastOctet = clientIp.split('.').pop() || Math.floor(Math.random() * 100).toString();
    return `${base} (${lastOctet})`;
  }

  register(ws, req, customInfo = {}) {
    const id = randomUUID();
    const clientIp = req.socket.remoteAddress?.replace(/^.*:/, '') || '127.0.0.1';
    const isHost = clientIp === '127.0.0.1' || clientIp === 'localhost';
    const userAgent = req.headers['user-agent'] || '';
    const { deviceType, os } = this.detectDeviceType(userAgent);
    const name = customInfo.name || this.generateDefaultName(deviceType, os, clientIp);

    const peer = {
      id,
      name,
      deviceType,
      os,
      ip: clientIp,
      isHost,
      connectedAt: Date.now()
    };

    this.peers.set(id, { peer, ws });
    return peer;
  }

  updatePeerName(peerId, newName) {
    const record = this.peers.get(peerId);
    if (!record) return null;
    record.peer.name = newName.trim().slice(0, 40);
    return record.peer;
  }

  setPublicKey(peerId, publicKey) {
    const record = this.peers.get(peerId);
    if (!record) return null;
    record.peer.publicKey = publicKey;
    return record.peer;
  }

  remove(peerId) {
    const record = this.peers.get(peerId);
    if (record) {
      this.peers.delete(peerId);
      return record.peer;
    }
    return null;
  }

  get(peerId) {
    return this.peers.get(peerId)?.peer || null;
  }

  getSocket(peerId) {
    return this.peers.get(peerId)?.ws || null;
  }

  getAllPeers(excludeId = null) {
    const result = [];
    for (const [id, record] of this.peers.entries()) {
      if (id !== excludeId) {
        result.push(record.peer);
      }
    }
    return result;
  }

  send(peerId, message) {
    const record = this.peers.get(peerId);
    if (record && record.ws.readyState === 1) {
      record.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  sendBinary(peerId, buffer) {
    const record = this.peers.get(peerId);
    if (record && record.ws.readyState === 1) {
      record.ws.send(buffer);
      return true;
    }
    return false;
  }

  broadcast(message, excludeId = null) {
    const payload = JSON.stringify(message);
    for (const [id, record] of this.peers.entries()) {
      if (id !== excludeId && record.ws.readyState === 1) {
        record.ws.send(payload);
      }
    }
  }
}

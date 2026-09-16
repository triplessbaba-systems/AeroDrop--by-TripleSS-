import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { PeerManager } from './peer-manager.js';
import { TransferPipeline } from './transfer-pipeline.js';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '500mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const peerManager = new PeerManager();
const transferPipeline = new TransferPipeline(peerManager);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          interface: name,
          address: net.address
        });
      }
    }
  }
  return addresses;
}

const PORT = process.env.PORT || 3000;
const localIps = getLocalIpAddresses();
const primaryIp = localIps[0]?.address || '127.0.0.1';
const primaryUrl = `http://${primaryIp}:${PORT}`;

app.get('/api/info', async (_req, res) => {
  const ips = getLocalIpAddresses();
  const primary = ips[0]?.address || '127.0.0.1';
  const url = `http://${primary}:${PORT}`;
  
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    qrCodeDataUrl = '';
  }

  res.json({
    hostName: os.hostname(),
    port: PORT,
    localIps: ips,
    primaryIp: primary,
    primaryUrl: url,
    peerCount: peerManager.getAllPeers().length,
    qrCode: qrCodeDataUrl
  });
});

app.get('/api/qr', async (req, res) => {
  const targetUrl = req.query.url || primaryUrl;
  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#090d16',
        light: '#ffffff'
      }
    });
    res.json({ qr: qrDataUrl, url: targetUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR kod olusturulamadi.' });
  }
});

app.post('/api/upload', (req, res) => {
  const fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'transfer_dosyasi';
  const mimeType = req.headers['content-type'] || 'application/octet-stream';
  const buffer = req.body;

  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ error: 'Gecersiz dosya verisi.' });
  }

  const fileId = transferPipeline.storeFallbackFile(fileName, mimeType, buffer);
  res.json({
    fileId,
    downloadUrl: `/api/download/${fileId}`,
    fileName,
    size: buffer.length
  });
});

app.get('/api/download/:fileId', (req, res) => {
  const file = transferPipeline.getFallbackFile(req.params.fileId);
  if (!file) {
    return res.status(404).json({ error: 'Dosya bulunamadi veya suresi doldu.' });
  }

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('Content-Length', file.buffer.length);
  res.send(file.buffer);
});

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

wss.on('connection', (ws, req) => {
  const peer = peerManager.register(ws, req);

  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    payload: {
      self: peer,
      peers: peerManager.getAllPeers(peer.id),
      serverInfo: {
        primaryUrl,
        primaryIp,
        port: PORT
      }
    }
  }));

  peerManager.broadcast({
    type: 'PEER_JOINED',
    payload: peer
  }, peer.id);

  ws.on('message', (raw, isBinary) => {
    if (isBinary && Buffer.isBuffer(raw) && raw.length >= 40) {
      const transferId = raw.toString('utf8', 0, 36);
      const session = transferPipeline.transfers.get(transferId);
      if (session && session.status === 'streaming') {
        peerManager.sendBinary(session.receiverId, raw);
      }
      return;
    }

    try {
      const message = JSON.parse(raw.toString());
      const { type, payload } = message;

      switch (type) {
        case 'RENAME_PEER': {
          if (payload?.name) {
            const updated = peerManager.updatePeerName(peer.id, payload.name);
            if (updated) {
              peerManager.broadcast({
                type: 'PEER_UPDATED',
                payload: updated
              });
            }
          }
          break;
        }

        case 'TRANSFER_OFFER': {
          const result = transferPipeline.createTransferOffer({
            senderId: peer.id,
            receiverId: payload.receiverId,
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            mimeType: payload.mimeType,
            totalChunks: payload.totalChunks
          });

          if (result.error) {
            ws.send(JSON.stringify({
              type: 'TRANSFER_ERROR',
              payload: { error: result.error, transferId: payload.transferId }
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'TRANSFER_OFFER_SENT',
              payload: result.session
            }));
          }
          break;
        }

        case 'TRANSFER_CONSENT': {
          transferPipeline.handleConsent(payload.transferId, peer.id, payload.accepted);
          break;
        }

        case 'TRANSFER_CHUNK': {
          transferPipeline.relayChunk(
            payload.transferId,
            payload.chunkIndex,
            payload.totalChunks,
            payload.chunkData
          );
          break;
        }

        case 'TRANSFER_COMPLETE': {
          transferPipeline.completeTransfer(payload.transferId);
          break;
        }

        case 'SET_PUBLIC_KEY': {
          if (payload?.publicKey) {
            const updated = peerManager.setPublicKey(peer.id, payload.publicKey);
            if (updated) {
              peerManager.broadcast({
                type: 'PEER_UPDATED',
                payload: updated
              }, peer.id);
            }
          }
          break;
        }

        case 'TRANSFER_PAUSE': {
          const session = transferPipeline.transfers.get(payload?.transferId);
          if (session) {
            const targetId = session.senderId === peer.id ? session.receiverId : session.senderId;
            peerManager.send(targetId, {
              type: 'TRANSFER_PAUSED',
              payload: { transferId: payload.transferId }
            });
          }
          break;
        }

        case 'TRANSFER_RESUME': {
          const session = transferPipeline.transfers.get(payload?.transferId);
          if (session) {
            const targetId = session.senderId === peer.id ? session.receiverId : session.senderId;
            peerManager.send(targetId, {
              type: 'TRANSFER_RESUMED',
              payload: { transferId: payload.transferId }
            });
          }
          break;
        }

        case 'TRANSFER_CANCEL': {
          transferPipeline.cancelTransfer(payload.transferId, peer.id);
          break;
        }

        case 'CLIPBOARD_SHARE': {
          const text = payload.text ? String(payload.text).trim() : '';
          if (text.length > 0) {
            const clipPayload = {
              id: Date.now().toString(),
              senderId: peer.id,
              senderName: peer.name,
              text: text.slice(0, 50000),
              timestamp: Date.now()
            };

            if (payload.targetPeerId) {
              peerManager.send(payload.targetPeerId, {
                type: 'CLIPBOARD_RECEIVED',
                payload: clipPayload
              });
            } else {
              peerManager.broadcast({
                type: 'CLIPBOARD_RECEIVED',
                payload: clipPayload
              }, peer.id);
            }
          }
          break;
        }

        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Gecersiz mesaj formati.' }));
    }
  });

  ws.on('close', () => {
    const removed = peerManager.remove(peer.id);
    if (removed) {
      transferPipeline.cleanupPeerTransfers(peer.id);
      peerManager.broadcast({
        type: 'PEER_LEFT',
        payload: { id: peer.id }
      });
    }
  });

  ws.on('error', () => {
    peerManager.remove(peer.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`AeroDrop Sunucusu calisiyor: http://0.0.0.0:${PORT}\n`);
  process.stdout.write(`Yerel Ag Erisim Adresi: ${primaryUrl}\n`);
  if (process.platform === 'win32' && !process.env.NO_AUTO_OPEN) {
    exec(`start http://localhost:${PORT}`);
  }
});

import React, { useState } from 'react';
import { QrCode, X, Copy, Check, Wifi } from 'lucide-react';
import { ServerInfo } from '../types/transfer';

interface QRCodeModalProps {
  isOpen: boolean;
  serverInfo: ServerInfo | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  serverInfo,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetUrl = serverInfo?.primaryUrl || window.location.origin;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      return;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <QrCode size={20} color="var(--accent-primary-hover)" />
            <span>Telefondan Kolay Bağlantı</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <Wifi size={16} color="var(--accent-success)" />
            <span>Telefon ve bilgisayar aynı Wi-Fi ağına bağlı olmalıdır.</span>
          </div>

          <div className="qr-frame">
            {serverInfo?.qrCode ? (
              <img
                src={serverInfo.qrCode}
                alt="AeroDrop Bağlantı QR Kodu"
                className="qr-image"
              />
            ) : (
              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <span>QR Kod Yükleniyor...</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left', width: '100%' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              1. Babanın telefon kamerasını QR koda tutun.
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              2. Açılan bağlantıya tıklayın (Uygulama yükleme gerektirmez).
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              3. Veya telefonun tarayıcısına aşağıdaki yerel adresi yazın:
            </span>
          </div>

          <div className="qr-address-box">
            <span className="qr-url-text">{targetUrl}</span>
            <button
              className="copy-icon-btn"
              onClick={handleCopyUrl}
              title="Adresi Kopyala"
            >
              {copied ? <Check size={16} color="var(--accent-success)" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={onClose}>
            <span>Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

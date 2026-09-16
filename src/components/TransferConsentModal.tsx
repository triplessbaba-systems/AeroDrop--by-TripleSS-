import React from 'react';
import { IncomingTransferPrompt } from '../types/transfer';
import { DownloadCloud, Check, X, File, ShieldAlert, Smartphone, Laptop } from 'lucide-react';

interface TransferConsentModalProps {
  prompt: IncomingTransferPrompt | null;
  onAccept: (transferId: string) => void;
  onReject: (transferId: string) => void;
}

export const TransferConsentModal: React.FC<TransferConsentModalProps> = ({
  prompt,
  onAccept,
  onReject
}) => {
  if (!prompt) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getSenderDeviceIcon = () => {
    if (prompt.senderOs === 'ios' || prompt.senderOs === 'android') {
      return <Smartphone size={16} />;
    }
    return <Laptop size={16} />;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <DownloadCloud size={20} color="var(--accent-primary-hover)" />
            <span>Gelen Dosya Talebi</span>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => onReject(prompt.transferId)}
            title="Kapat ve Reddet"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary-hover)'
            }}
          >
            <File size={28} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={prompt.fileName}
            >
              {prompt.fileName}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {formatFileSize(prompt.fileSize)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              width: '100%',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}
          >
            {getSenderDeviceIcon()}
            <span>Gönderen:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{prompt.senderName}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              color: 'var(--text-muted)'
            }}
          >
            <ShieldAlert size={14} />
            <span>Dosya doğrudan yerel Wi-Fi üzerinden aktarılacaktır.</span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="modal-btn reject"
            onClick={() => onReject(prompt.transferId)}
          >
            <X size={16} />
            <span>Reddet</span>
          </button>
          <button
            className="modal-btn accept"
            onClick={() => onAccept(prompt.transferId)}
          >
            <Check size={16} />
            <span>Kabul Et ve İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { TransferHistoryItem } from '../types/transfer';
import { Clock, X, ArrowUpRight, ArrowDownLeft, Download, Trash2 } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  history: TransferHistoryItem[];
  onClose: () => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  history,
  onClose,
  onClearHistory
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <Clock size={18} color="var(--accent-primary-hover)" />
            <span>Transfer Geçmişi</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ alignItems: 'stretch' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <span>Henüz tamamlanmış bir transfer kaydı yok.</span>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => {
                const isSent = item.direction === 'sent';
                return (
                  <div key={item.id} className="history-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span className={`transfer-direction-badge ${isSent ? 'upload' : 'download'}`}>
                        {isSent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      </span>
                      <div className="history-meta">
                        <span className="history-name" title={item.fileName}>
                          {item.fileName}
                        </span>
                        <span className="history-subtext">
                          {formatFileSize(item.fileSize)} • {item.peerName} • {formatTime(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        download={item.fileName}
                        className="copy-icon-btn"
                        title="Tekrar İndir"
                      >
                        <Download size={16} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-actions">
          {history.length > 0 && (
            <button className="modal-btn secondary" onClick={onClearHistory} title="Tüm geçmişi temizle">
              <Trash2 size={16} />
              <span>Geçmişi Temizle</span>
            </button>
          )}
          <button className="modal-btn secondary" onClick={onClose}>
            <span>Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ActiveTransfer, MediaPreviewTarget } from '../types/transfer';
import {
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Download,
  Loader2,
  Pause,
  Play,
  ShieldCheck,
  Eye,
  Archive
} from 'lucide-react';

interface ActiveTransfersProps {
  transfers: ActiveTransfer[];
  onCancelTransfer: (transferId: string) => void;
  onPauseTransfer: (transferId: string) => void;
  onResumeTransfer: (transferId: string) => void;
  onPreviewMedia: (target: MediaPreviewTarget) => void;
  onDownloadAllAsZip?: () => void;
}

export const ActiveTransfers: React.FC<ActiveTransfersProps> = ({
  transfers,
  onCancelTransfer,
  onPauseTransfer,
  onResumeTransfer,
  onPreviewMedia,
  onDownloadAllAsZip
}) => {
  if (transfers.length === 0) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const isPreviewable = (mimeType: string, fileName: string): boolean => {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mp3|wav|ogg)$/i.test(fileName)
    );
  };

  const getStatusText = (transfer: ActiveTransfer): string => {
    switch (transfer.status) {
      case 'offering':
        return 'Onay bekleniyor...';
      case 'streaming':
        return transfer.estimatedRemainingSeconds > 0
          ? `Kalan: ~${Math.ceil(transfer.estimatedRemainingSeconds)} sn`
          : 'Aktarılıyor...';
      case 'paused':
        return 'Duraklatıldı';
      case 'verifying':
        return 'Doğrulanıyor...';
      case 'completed':
        return 'Tamamlandı';
      case 'rejected':
        return 'Karşı taraf reddetti';
      case 'cancelled':
        return 'İptal edildi';
      case 'failed':
        return transfer.error || 'Aktarım başarısız oldu';
      default:
        return '';
    }
  };

  const completedDownloads = transfers.filter(
    (t) => t.direction === 'download' && t.status === 'completed' && t.downloadBlobUrl
  );

  return (
    <div className="panel-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="card-title">
          <Loader2 size={16} className="spin-icon" />
          <span>Aktif Transferler ({transfers.length})</span>
        </div>
        {completedDownloads.length >= 2 && onDownloadAllAsZip && (
          <button
            className="action-btn"
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', color: 'var(--accent-primary-hover)' }}
            onClick={onDownloadAllAsZip}
            title="Tamamlanan dosyaları tek bir ZIP arşivi olarak indir"
          >
            <Archive size={13} />
            <span>Tümünü ZIP İndir</span>
          </button>
        )}
      </div>

      <div className="active-transfers-panel">
        {transfers.map((item) => {
          const isUpload = item.direction === 'upload';
          const isFinished = item.status === 'completed';
          const isPaused = item.status === 'paused';
          const isFailed = item.status === 'failed' || item.status === 'rejected' || item.status === 'cancelled';

          return (
            <div key={item.transferId} className="transfer-progress-card">
              <div className="transfer-title-row">
                <div className="transfer-meta">
                  <span className={`transfer-direction-badge ${item.direction}`}>
                    {isUpload ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    {isUpload ? 'Gönderiliyor' : 'Alınıyor'}
                  </span>

                  {item.isEncrypted && (
                    <span className="crypto-badge-mini" title="Uçtan Uca Şifreli">
                      <ShieldCheck size={11} />
                      <span>E2E</span>
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '120px'
                    }}
                    title={item.fileName}
                  >
                    {item.fileName}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isFinished && item.downloadBlobUrl && isPreviewable(item.mimeType, item.fileName) && (
                    <button
                      className="action-btn"
                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--accent-primary-hover)' }}
                      onClick={() =>
                        onPreviewMedia({
                          url: item.downloadBlobUrl!,
                          fileName: item.fileName,
                          mimeType: item.mimeType,
                          fileSize: item.fileSize
                        })
                      }
                      title="Önizle"
                    >
                      <Eye size={13} />
                      <span>Önizle</span>
                    </button>
                  )}

                  {item.downloadBlobUrl && (
                    <a
                      href={item.downloadBlobUrl}
                      download={item.fileName}
                      className="action-btn"
                      style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--accent-success)' }}
                      title="Dosyayı Kaydet"
                    >
                      <Download size={13} />
                      <span>Kaydet</span>
                    </a>
                  )}

                  {!isFinished && !isFailed && item.status === 'streaming' && (
                    <button
                      className="copy-icon-btn"
                      onClick={() => onPauseTransfer(item.transferId)}
                      title="Duraklat"
                    >
                      <Pause size={15} />
                    </button>
                  )}

                  {!isFinished && !isFailed && isPaused && (
                    <button
                      className="copy-icon-btn"
                      style={{ color: 'var(--accent-primary-hover)' }}
                      onClick={() => onResumeTransfer(item.transferId)}
                      title="Devam Et"
                    >
                      <Play size={15} />
                    </button>
                  )}

                  {!isFinished && !isFailed && (
                    <button
                      className="copy-icon-btn"
                      onClick={() => onCancelTransfer(item.transferId)}
                      title="Transferi İptal Et"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${isFinished ? 'completed' : ''}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, item.progress))}%`,
                    backgroundColor: isFailed ? 'var(--accent-danger)' : isPaused ? 'var(--accent-warning)' : undefined
                  }}
                />
              </div>

              <div className="transfer-metrics-row">
                <span>
                  {formatBytes(item.transferredBytes)} / {formatBytes(item.fileSize)}
                </span>
                <span>
                  {!isFinished && !isFailed && !isPaused && `${formatSpeed(item.speedBps)} • `}
                  {getStatusText(item)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

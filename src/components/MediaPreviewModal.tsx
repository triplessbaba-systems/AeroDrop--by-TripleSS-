import React from 'react';
import { MediaPreviewTarget } from '../types/transfer';
import { X, Download, FileText, Music, Video, Image as ImageIcon } from 'lucide-react';

interface MediaPreviewModalProps {
  preview: MediaPreviewTarget | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  preview,
  onClose
}) => {
  if (!preview) return null;

  const isImage = preview.mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(preview.fileName);
  const isVideo = preview.mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(preview.fileName);
  const isAudio = preview.mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(preview.fileName);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMediaHeaderIcon = () => {
    if (isImage) return <ImageIcon size={20} color="var(--accent-primary-hover)" />;
    if (isVideo) return <Video size={20} color="var(--accent-primary-hover)" />;
    if (isAudio) return <Music size={20} color="var(--accent-primary-hover)" />;
    return <FileText size={20} color="var(--accent-primary-hover)" />;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ maxWidth: '85%' }}>
            {getMediaHeaderIcon()}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={preview.fileName}
            >
              {preview.fileName}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Kapat">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '0.5rem 0' }}>
          {isImage && (
            <div className="media-preview-container">
              <img
                src={preview.url}
                alt={preview.fileName}
                className="media-preview-image"
              />
            </div>
          )}

          {isVideo && (
            <div className="media-preview-container">
              <video
                src={preview.url}
                controls
                autoPlay
                className="media-preview-video"
              />
            </div>
          )}

          {isAudio && (
            <div className="media-audio-container">
              <div className="audio-disc-icon">
                <Music size={36} />
              </div>
              <audio src={preview.url} controls autoPlay style={{ width: '100%' }} />
            </div>
          )}

          {!isImage && !isVideo && !isAudio && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <span>Bu dosya türü için doğrudan önizleme desteklenmiyor.</span>
            </div>
          )}

          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Boyut: {formatFileSize(preview.fileSize)} • Biçim: {preview.mimeType}
          </span>
        </div>

        <div className="modal-actions">
          <a
            href={preview.url}
            download={preview.fileName}
            className="modal-btn accept"
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            <span>Dosyayı İndir</span>
          </a>
          <button className="modal-btn secondary" onClick={onClose}>
            <span>Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

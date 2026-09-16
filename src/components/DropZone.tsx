import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, Send, FolderUp, Layers } from 'lucide-react';
import { PeerDevice, SelectedFileItem } from '../types/transfer';

interface DropZoneProps {
  peers: PeerDevice[];
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string) => void;
  onSendFiles: (files: File[], receiverId: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  peers,
  selectedPeerId,
  onSelectPeer,
  onSendFiles
}) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const addFilesToList = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: SelectedFileItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      newItems.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        path: (f as any).webkitRelativePath || undefined
      });
    }
    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(e.dataTransfer.files);
    }
  };

  const removeFileItem = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSendAll = () => {
    if (selectedFiles.length > 0 && selectedPeerId) {
      const rawFiles = selectedFiles.map((item) => item.file);
      onSendFiles(rawFiles, selectedPeerId);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const totalBytes = selectedFiles.reduce((acc, curr) => acc + curr.size, 0);
  const targetPeer = peers.find((p) => p.id === selectedPeerId);

  return (
    <div className="panel-card">
      <div
        className={`dropzone-container ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="dropzone-input"
          onChange={(e) => addFilesToList(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as any)}
          className="dropzone-input"
          onChange={(e) => addFilesToList(e.target.files)}
        />

        <div className="dropzone-icon">
          <UploadCloud size={24} />
        </div>
        <span className="dropzone-title">Dosya veya Klasör Sürükleyin</span>
        <span className="dropzone-desc">
          Çoklu dosya seçimi veya klasör aktarımı desteklenir
        </span>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Layers size={13} />
            <span>Dosya Seç</span>
          </button>
          <button
            className="action-btn"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderUp size={13} />
            <span>Klasör Seç</span>
          </button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span>{selectedFiles.length} Dosya Seçildi</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary-hover)' }}>
              Toplam: {formatFileSize(totalBytes)}
            </span>
          </div>

          <div className="batch-files-list">
            {selectedFiles.slice(0, 5).map((item) => (
              <div key={item.id} className="selected-file-preview" style={{ padding: '0.45rem 0.6rem' }}>
                <div className="file-meta-row">
                  <div className="file-icon-box" style={{ width: 28, height: 28 }}>
                    <File size={14} />
                  </div>
                  <div className="file-details">
                    <span className="file-name" style={{ fontSize: '0.76rem' }} title={item.name}>
                      {item.path || item.name}
                    </span>
                    <span className="file-size" style={{ fontSize: '0.68rem' }}>
                      {formatFileSize(item.size)}
                    </span>
                  </div>
                </div>
                <button
                  className="copy-icon-btn"
                  onClick={() => removeFileItem(item.id)}
                  title="Listeden Çıkar"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {selectedFiles.length > 5 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                + {selectedFiles.length - 5} dosya daha
              </span>
            )}
          </div>
        </div>
      )}

      <div className="target-selector">
        <label className="target-label">Hedef Cihaz</label>
        <select
          className="target-select-dropdown"
          value={selectedPeerId || ''}
          onChange={(e) => onSelectPeer(e.target.value)}
        >
          <option value="" disabled>
            {peers.length === 0 ? 'Ağda bağlı cihaz yok' : 'Cihaz seçin...'}
          </option>
          {peers.map((peer) => (
            <option key={peer.id} value={peer.id}>
              {peer.name} ({peer.ip})
            </option>
          ))}
        </select>
      </div>

      <button
        className="send-trigger-btn"
        disabled={selectedFiles.length === 0 || !selectedPeerId}
        onClick={handleSendAll}
      >
        <Send size={16} />
        <span>
          {targetPeer
            ? `${selectedFiles.length} Dosyayı ${targetPeer.name} Cihazına Gönder`
            : 'Dosyaları Gönder'}
        </span>
      </button>
    </div>
  );
};

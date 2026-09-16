import React, { useState } from 'react';
import { Clipboard, Send, Copy, Check, Sparkles } from 'lucide-react';
import { ClipboardItem } from '../types/transfer';

interface ClipboardSyncProps {
  items: ClipboardItem[];
  onShareText: (text: string) => void;
}

export const ClipboardSync: React.FC<ClipboardSyncProps> = ({
  items,
  onShareText
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = () => {
    if (inputText.trim()) {
      onShareText(inputText.trim());
      setInputText('');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch (err) {
      return;
    }
  };

  const handleCopyItem = async (item: ClipboardItem) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      return;
    }
  };

  return (
    <div className="panel-card">
      <div className="card-title">
        <Clipboard size={16} />
        <span>Pano (Clipboard) Senkronizasyonu</span>
      </div>

      <textarea
        className="clipboard-textarea"
        placeholder="Cihazlar arasında anında paylaşmak için metin, bağlantı veya kod parçası yazın..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />

      <div className="clipboard-btn-row">
        <button
          className="action-btn"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
          onClick={handlePasteFromClipboard}
          title="Sistem panosundan yapıştır"
        >
          <Sparkles size={14} />
          <span>Panodan Al</span>
        </button>

        <button
          className="action-btn primary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
          disabled={!inputText.trim()}
          onClick={handleShare}
        >
          <Send size={14} />
          <span>Ağa Gönder</span>
        </button>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Son Alınan Pano Kayıtları
          </span>
          <div className="clipboard-list">
            {items.map((item) => (
              <div key={item.id} className="clipboard-item-card">
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary-hover)' }}>
                    {item.senderName}
                  </span>
                  <span className="clipboard-text" title={item.text}>
                    {item.text}
                  </span>
                </div>
                <button
                  className="copy-icon-btn"
                  onClick={() => handleCopyItem(item)}
                  title="Panoya Kopyala"
                >
                  {copiedId === item.id ? <Check size={16} color="var(--accent-success)" /> : <Copy size={16} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

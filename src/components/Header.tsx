import React, { useState } from 'react';
import {
  Radio,
  QrCode,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  ShieldCheck
} from 'lucide-react';
import { PeerDevice, ServerInfo } from '../types/transfer';

interface HeaderProps {
  self: PeerDevice | null;
  serverInfo: ServerInfo | null;
  isConnected: boolean;
  isSoundEnabled: boolean;
  isNotificationEnabled: boolean;
  isEncryptedReady: boolean;
  onToggleSound: () => void;
  onRequestNotification: () => void;
  onOpenQR: () => void;
  onOpenHistory: () => void;
  onUpdateName: (newName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  self,
  serverInfo,
  isConnected,
  isSoundEnabled,
  isNotificationEnabled,
  isEncryptedReady,
  onToggleSound,
  onRequestNotification,
  onOpenQR,
  onOpenHistory,
  onUpdateName
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(self?.name || '');

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (tempName.trim() && tempName !== self?.name) {
      onUpdateName(tempName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    }
  };

  const renderDeviceIcon = () => {
    if (!self) return <Laptop size={14} />;
    if (self.deviceType === 'mobile') return <Smartphone size={14} />;
    if (self.deviceType === 'tablet') return <Tablet size={14} />;
    return <Laptop size={14} />;
  };

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <Radio size={22} />
        </div>
        <div className="brand-info">
          <div className="brand-title-row">
            <span className="brand-title">AeroDrop</span>
            <span className="brand-badge">LAN Pro</span>
            {isEncryptedReady && (
              <span
                className="crypto-badge"
                title="Tüm veri akışı istemcide türetilen AES-256-GCM ile uçtan uca şifrelenir"
              >
                <ShieldCheck size={12} />
                <span>E2E AES-256</span>
              </span>
            )}
          </div>
          <div className="device-identity">
            {renderDeviceIcon()}
            {isEditingName ? (
              <input
                type="text"
                className="device-name-input"
                value={tempName}
                autoFocus
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleKeyDown}
                maxLength={28}
              />
            ) : (
              <span
                style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border-medium)' }}
                onClick={() => {
                  setTempName(self?.name || '');
                  setIsEditingName(true);
                }}
                title="Cihaz adını değiştirmek için tıkla"
              >
                {self?.name || 'Yerel İstemci'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="header-actions">
        {serverInfo?.primaryIp && (
          <div className="network-badge" title="Yerel Ağ IP Adresi">
            <span className="pulse-dot" style={{ backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
            <span>{serverInfo.primaryIp}:{serverInfo.port}</span>
          </div>
        )}

        <button
          className={`icon-control-btn ${isSoundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={isSoundEnabled ? 'Sesleri Kapat' : 'Sesleri Aç'}
        >
          {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          className={`icon-control-btn ${isNotificationEnabled ? 'active' : ''}`}
          onClick={onRequestNotification}
          title={isNotificationEnabled ? 'Masaüstü Bildirimleri Aktif' : 'Masaüstü Bildirimlerini Aç'}
        >
          {isNotificationEnabled ? <Bell size={16} /> : <BellOff size={16} />}
        </button>

        <button className="action-btn" onClick={onOpenHistory} title="Transfer Geçmişini Gör">
          <Clock size={16} />
          <span>Geçmiş</span>
        </button>

        <button className="action-btn primary" onClick={onOpenQR} title="Telefondan Bağlanmak İçin QR Kod Göster">
          <QrCode size={16} />
          <span>Telefondan Bağlan</span>
        </button>
      </div>
    </header>
  );
};

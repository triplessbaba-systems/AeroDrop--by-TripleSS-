import React from 'react';
import { PeerDevice } from '../types/transfer';
import { Laptop, Smartphone, Tablet, Radar, ShieldCheck, Users } from 'lucide-react';

interface RadarViewProps {
  self: PeerDevice | null;
  peers: PeerDevice[];
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string) => void;
  onDropFileOnPeer: (peerId: string, files: FileList) => void;
  onOpenQR: () => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  self,
  peers,
  selectedPeerId,
  onSelectPeer,
  onDropFileOnPeer,
  onOpenQR
}) => {
  const getDeviceIcon = (deviceType: string, size = 20) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={size} />;
      case 'tablet':
        return <Tablet size={size} />;
      default:
        return <Laptop size={size} />;
    }
  };

  const calculatePeerPosition = (index: number, total: number) => {
    const angle = (index * (2 * Math.PI)) / total - Math.PI / 2;
    const radius = 135;
    const x = 50 + (radius / 3.8) * Math.cos(angle);
    const y = 50 + (radius / 3.8) * Math.sin(angle);
    return { left: `${x}%`, top: `${y}%` };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePeerDrop = (e: React.DragEvent, peerId: string) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFileOnPeer(peerId, e.dataTransfer.files);
    }
  };

  return (
    <div className="radar-card">
      <div className="radar-header">
        <div className="card-title">
          <Radar size={18} />
          <span>Yerel Ağ Cihaz Radarı</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
          <Users size={15} />
          <span>{peers.length} Aktif Cihaz</span>
        </div>
      </div>

      <div className="radar-screen">
        <div className="radar-rings">
          <div className="radar-ring r1" />
          <div className="radar-ring r2" />
          <div className="radar-ring r3" />
          <div className="radar-sweep" />
        </div>

        <div className="self-center-node">
          <div className="self-icon-disc">
            {getDeviceIcon(self?.deviceType || 'desktop', 28)}
          </div>
          <span className="self-node-label">
            {self?.name || 'Bu Cihaz'} (Siz)
          </span>
        </div>

        <div className="peers-orbit">
          {peers.map((peer, idx) => {
            const pos = calculatePeerPosition(idx, peers.length);
            const isSelected = selectedPeerId === peer.id;

            return (
              <div
                key={peer.id}
                className="peer-node-wrapper"
                style={pos}
                onDragOver={handleDragOver}
                onDrop={(e) => handlePeerDrop(e, peer.id)}
              >
                <button
                  className={`peer-node-button ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectPeer(peer.id)}
                  title={`${peer.name} (${peer.ip}) - Dosya göndermek için seç`}
                >
                  {getDeviceIcon(peer.deviceType, 24)}
                  <span className="peer-status-dot" />
                </button>
                <span className="peer-name-badge" title={peer.name}>
                  {peer.name}
                </span>
              </div>
            );
          })}
        </div>

        {peers.length === 0 && (
          <div className="no-peers-placeholder">
            <ShieldCheck size={16} color="var(--accent-primary-hover)" />
            <span>Ağda başka cihaz yok.</span>
            <button
              onClick={onOpenQR}
              style={{
                color: 'var(--accent-primary-hover)',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Telefondan QR ile Bağlan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

# AeroDrop 🚀 - Yerel Ağ (LAN) P2P Dosya & Pano Transfer İstasyonu

AeroDrop, aynı Wi-Fi veya Ethernet ağına bağlı bilgisayarlar ve mobil cihazlar (iPhone, Android, Mac, Windows) arasında **buluta yükleme yapmadan**, **internet kotası harcamadan** ve **alıcı cihaza hiçbir uygulama kurdurmadan** çalışan, uçtan uca şifreli yerel dosya ve pano aktarım istasyonudur.

---

## ⚡ Temel Özellikler

* **Sıfır Kurulum & Dinamik QR Kod:** Alıcı telefona hiçbir uygulama (APK / App Store) yükletmeniz gerekmez. Ekrana gelen QR kodu telefonun kamerasıyla okutmak yeterlidir.
* **Uçtan Uca Sıfır-Bilgi Şifreleme (E2E AES-256-GCM / ECDH P-256):** Tüm dosya parçaları ve pano verileri istemcide türetilen anahtarla şifrelenir; evdeki modem veya ağdaki üçüncü taraflar içeriği göremez.
* **Saf İkili (Raw Binary) Akış:** Base64 yerine doğrudan `ArrayBuffer` üzerinden çalışır. 1-2 GB'lık 4K videolarda telefonlarda bellek şişmesi (RAM crash) yaşanmaz.
* **Mobil Ekran Koruma (`navigator.wakeLock`):** Aktarım boyunca mobil cihaz ekranının kararmasını ve iOS'un arka planda bağlantıyı dondurmasını engeller.
* **Çoklu Dosya & Klasör Desteği:** Tek tek dosya seçmek yerine birden çok dosya veya tüm bir klasör seçilebilir.
* **Toplu ZIP Paketleme:** Alınan birden fazla dosya tek tıkla tek bir `.zip` arşivi olarak indirilebilir.
* **Sentezlenmiş Ses ve Masaüstü Bildirimleri:** Web Audio API ile sıfır harici varlıkla gelen transfer ve tamamlanma melodileri çalar, sekme arka plandayken bildirim balonu açar.
* **Medya Önizleme (Lightbox):** Aktarılan fotoğraflar, videolar ve sesler uygulama içinden anında tam ekran oynatılabilir.

---

## 📦 Kurulum ve Çalıştırma

### 1. Hazır Binary (.exe) ile Çalıştırma (Node.js Gerektirmez)
GitHub Releases sekmesinden `AeroDrop.exe` dosyasını indirin ve çift tıklayın. Sunucu otomatik başlar ve varsayılan tarayıcınızda açılır.

### 2. Kaynak Koddan Geliştirici Modunda Çalıştırma
```bash
# Bağımlılıkları yükleyin
npm install

# Derleyin ve başlatın
npm run build
npm start
```
* **Bilgisayarda:** [http://localhost:3000](http://localhost:3000)
* **Telefonda:** Ekranda beliren QR kodu okutun veya telefon tarayıcısına yerel IP adresini (ör: `http://192.168.1.5:3000`) yazın.

---

## 🏗️ Mimari Şema

```
┌─────────────────────────────────────────────────────────────┐
│                    Kullanıcı Arayüzü                        │
│  [Masaüstü Radar Paneli]  ◄──►  [Mobil Telefon Tarayıcısı]  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Binary WebSocket & HTTP Range
┌──────────────────────────────▼──────────────────────────────┐
│                 Uygulama & Güvenlik Katmanı                 │
│  - WebCrypto (ECDH P-256 + AES-256-GCM)                    │
│  - navigator.wakeLock Mobil Ekran Koruması                  │
│  - Web Audio Sentetik Bildirim Sentezleyicisi               │
│  - IndexedDB Parça Tamponu & Duraklat/Devam Et              │
│  - Yerel PKZIP Binary Arşivleyici                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Altyapı ve Veri Akışı                    │
│  - Node.js / caxa Standalone Windows Executable             │
│  - 0-Copy Binary Buffer Stream (Zero RAM Blowup)           │
│  - Yerel Ağ IP Otomatik Keşfi (os.networkInterfaces)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 Lisans
MIT License - Özgürce kullanılabilir, dağıtılabilir ve geliştirilebilir.

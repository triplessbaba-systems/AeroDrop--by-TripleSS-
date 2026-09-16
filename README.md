# AeroDrop

Bilgisayardan telefona ya da yerel ağdaki iki cihaz arasında dosya atarken WhatsApp'tan kendine mesaj atmakla, Google Drive'a yükleyip beklemekle veya karşı tarafa uygulama kurdurmakla uğraşmamak için geliştirilmiş yerel dosya ve pano transfer aracı.

AirDrop mantığıyla çalışır ancak platform bağımsızdır (Windows, iOS, Android, Linux, macOS). Karşı tarafın herhangi bir şey yüklemesine gerek yoktur; telefon kamerasını ekrandaki QR koda tutması yeterlidir.

---

## Neden Yapıldı?

* **Uygulama Kurulumu Yok:** Telefona APK, App Store uygulaması veya sürücü yükletmez. Cihazın kendi tarayıcısı (Safari / Chrome) üzerinden çalışır.
* **İnternet Kotası Harcamaz:** Dosyalar internete çıkmaz. Evdeki modemin veya kablolu ağın yerel bant genişliği üzerinden (30-60 MB/s) doğrudan akar.
* **Büyük Dosyalarda Çökmez:** Birçok web tabanlı transfer aracı dosyayı Base64'e çevirdiği için mobil tarayıcıların belleğini şişirir ve 500 MB üzeri videolarda sekmeyi kapatır. AeroDrop doğrudan `ArrayBuffer` ikili akışı (binary stream) kullanır, RAM tüketimi dosya boyutundan bağımsız 15-20 MB civarında sabit kalır.
* **Ekran Kapanma Koruması:** `navigator.wakeLock` API'si ile dosya inerken telefonun ekranının kararıp bağlantının donmasını (özellikle iOS Safari'nin arka plan kısıtını) engeller.
* **Uçtan Uca Şifreli:** WebCrypto (ECDH + AES-256-GCM) ile yerel ağdaki diğer cihazların paketleri dinlemesini önler.
* **Pano (Clipboard) Senkronizasyonu:** Bilgisayarda kopyalanan bir metin, link veya şifre tek tıkla telefonun ekranına düşer.

---

## Hızlı Başlangıç

### 1. Hazır Sürüm (Node.js Gerektirmez)
Releases bölümünden `AeroDrop.exe` dosyasını indirin ve çift tıklayın. Sunucu arka planda başlar ve varsayılan tarayıcınızda açılır.

### 2. Kaynak Koddan Çalıştırma
```bash
git clone https://github.com/triplessbaba-systems/AeroDrop--by-TripleSS-.git
cd AeroDrop--by-TripleSS-
npm install
npm run build
npm start
```

Tarayıcıdan `http://localhost:3000` adresine gidin. Telefondan bağlanmak için ekrandaki QR kodu okutun.

---

## Yapı ve Protokol

* **Arayüz:** React, TypeScript, Vite, Vanilla CSS (koyu tema, sıfır harici UI kütüphanesi).
* **Sunucu & Sinyalleşme:** Node.js, Express, WebSocket (`ws`).
* **Veri Akışı:** 40-byte başlıklı raw binary chunk iletimi.
* **İkili ZIP:** İstemci tarafında çalışan sıfır-bağımlılık PKZIP motoru.

---

## Lisans

MIT

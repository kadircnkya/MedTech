<h1 align="center">
  <br>
  ⚕️ MedTech Platform
  <br>
</h1>

<h4 align="center">Yeni Nesil Akıllı Sağlık, İlaç ve Randevu Yönetim Platformu</h4>

<p align="center">
  <a href="#özellikler">Özellikler</a> •
  <a href="#mimari">Mimari</a> •
  <a href="#kullanılan-teknolojiler">Kullanılan Teknolojiler</a> •
  <a href="#kurulum">Kurulum</a> •
  <a href="#katkıda-bulunma">Katkıda Bulunma</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
</p>

---

## 📌 Proje Hakkında

**MedTech**, hastaların kendi sağlık süreçlerini, ilaç takibini, randevularını ve laboratuvar sonuçlarını uçtan uca kontrol edebilmelerini sağlayan *kapsamlı bir SaaS sağlık platformudur.* Tamamen **mikroservis (microservices)** mimarisiyle tasarlanmış olup; güvenli, ölçeklenebilir ve olay güdümlü (event-driven) altyapıya sahiptir.

Yapay Zeka (AI) destekli tahlil analizi ve akıllı bildirim sistemi ile geleneksel sağlık uygulamalarından bir adım öndedir. Mobil uygulama tarafı ise Apple Health / Samsung Health seviyesinde **premium bir UX/UI** ile donatılmıştır.

## ✨ Özellikler

*   **📱 Premium Mobil Arayüz (React Native & Expo):** Karanlık/Aydınlık (Dark/Light) tema destekli, cam efekti (glassmorphism) ve akıcı mikro animasyonlarla tasarlanmış üst düzey kullanıcı deneyimi.
*   **💊 İlaç Takibi ve Hatırlatmalar:** İlaçlarınızı ekleyin, doz takvimleri oluşturun ve sistem size tam zamanında bildirim göndersin.
*   **🤖 Yapay Zeka (AI) Entegrasyonu:** Tahlil sonuçlarınızı yüklediğiniz an AI sizin için sonuçları yorumlar.
*   **🔔 Akıllı Bildirim Merkezi:** Sadece "Doz uyarısı", "Tahlil sonucu" ve "Randevu hatırlatması" gibi hayati önem taşıyan tıbbi bildirimleri filtreleyen profesyonel log merkezi.
*   **🔎 Hızlı İlaç Arama (Elasticsearch):** Milyonlarca ilaç verisi içerisinde anında arama yapma yeteneği.
*   **🔒 Yüksek Güvenlik:** Tüm hasta verileri veritabanı seviyesinde ayrıştırılmış ve AES-256 ile şifrelenmiştir.

## 🏗 Mimari & Sistem Tasarımı

MedTech tamamen dağıtık ve konteynerize edilmiş (Docker) bir **mikroservis** ağıdır.

### Mikroservisler:
*   `api-gateway` (Nginx üzerinden Rate Limiting & Routing)
*   `auth-service` (JWT, Kayıt, Giriş işlemleri)
*   `user-service` (Kullanıcı profili ve tercihleri)
*   `medication-service` (İlaç reçeteleri ve prospektüs verileri)
*   `tracking-service` (İlaç doz alım takibi ve compliance oranları)
*   `patient-service` (Kapsamlı sağlık geçmişi, alerjiler, randevular)
*   `scan-service` (Kamera/Barkod okuma ve belge tarama işlemleri)
*   `ai-service` (HuggingFace/LLM tabanlı tahlil & veri analiz servisi)
*   `notification-service` (Mobil cihazlara Push Notification yönetimi)
*   `search-service` (Elasticsearch ile Full-text indexleme)

### Asenkron İletişim (Event-Driven)
Servisler kendi aralarındaki haberleşmeyi **RabbitMQ** üzerinden sağlar (Örn: `Tracking` servisi doz atlandığında `Notification` servisine event fırlatır).

## 🛠 Kullanılan Teknolojiler

**Mobil Uygulama (Client):**
*   React Native, Expo, TypeScript
*   Expo Router / React Navigation
*   Zustand (Global State Management)
*   Axios, Expo Linear Gradient, Vector Icons

**Arka Plan (Backend):**
*   Node.js, Express.js, TypeScript
*   MongoDB, Mongoose (Her mikroservise özel bağımsız veritabanı - Database per Service pattern)
*   Redis (Caching ve Session yönetimi)
*   RabbitMQ (Message Broker)
*   Elasticsearch & Qdrant (Arama ve Vektör DB)

**Altyapı (DevOps):**
*   Docker & Docker Compose
*   Nginx (API Gateway)

---

## 🚀 Kurulum & Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin. (Docker ve Node.js'in kurulu olduğundan emin olun).

### 1. Backend (Mikroservisleri) Başlatma

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/kullanici-adiniz/medtech.git
   cd medtech
   ```
2. Tüm servisleri Docker Compose ile ayağa kaldırın:
   ```bash
   docker-compose up -d --build
   ```
3. API Gateway `http://localhost:80` (veya `127.0.0.1`) üzerinden tüm servislere erişebilirsiniz.

### 2. Mobil Uygulamayı (Expo) Başlatma

Mobil uygulamayı çalıştırmadan önce, API bağlantısı için bilgisayarınızın yerel IP adresini girdiğinizden emin olun (Örn: `192.168.1.xxx`).

1. Mobil dizine gidin:
   ```bash
   cd mobile
   ```
2. Bağımlılıkları yükleyin ve başlatın:
   ```bash
   npm install
   npx expo start
   ```

*iOS için Simulator, Android için Emulator kullanabilir veya telefonunuzdan Expo Go uygulaması ile QR kodu okutabilirsiniz.*

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak isterseniz Lütfen önce bir issue (sorun) oluşturun veya yapmak istediğiniz özelliği tartışalım.
1. Projeyi Fork'layın
2. Yeni bir Branch (dal) oluşturun (`git checkout -b feature/YeniOzellik`)
3. Değişikliklerinizi Commit'leyin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inize Push'layın (`git push origin feature/YeniOzellik`)
5. Bir Pull Request açın!

---
> Geliştirici: [Kadir Çankaya]

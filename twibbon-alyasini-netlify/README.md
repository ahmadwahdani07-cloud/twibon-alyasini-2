# Web Twibbon Pondok Pesantren Terpadu Al-Yasini
### Haul Masyayikh Ke-24 & Silatnas Insani Alyasini 2026

Aplikasi Web Twibbon resmi dengan sistem ganda: **Portal Admin (Halaman Pengelola)** dan **Halaman Pengunjung Publik (Hanya Pakai)** yang dilengkapi fitur geser dan cubit (*drag & zoom/pinch*) untuk merapikan foto di dalam bingkai transparan.

---

## 🌟 Fitur Utama

### 1. Portal Admin (Halaman Pengelola / Dapur Situs)
- **Diproteksi Login Aman**: Hanya panitia atau pengurus dengan username & password yang bisa masuk (password diamankan dengan enkripsi `PBKDF2-SHA512`).
  - **Akun Bawaan**:
    - **Username**: `admin`
    - **Password**: `alyasini2026`
- **Buat Kampanye Baru & Tautan Unik**: Admin dapat membuat tautan unik untuk setiap acara (misal: `http://localhost:3000/haul-24-alyasini`, `http://localhost:3000/kegiatan-agustus`, dll.).
- **Upload Desain Bingkai Twibbon**: Unggah file desain PNG dengan area tengah transparan langsung dari komputer atau HP. Desain otomatis muncul di tautan acara.
- **Pengaturan Caption & Hashtag**: Deskripsi acara, teks caption ucapan default, dan hashtag medsos yang otomatis disiapkan untuk disalin pengunjung.
- **Statistik Lengkap (Dashboard)**:
  - Jumlah total kampanye acara.
  - Jumlah tayangan/kunjungan (Views) secara real-time.
  - Jumlah pengunjung yang telah mengunduh hasil twibbon (Downloads).
  - Rasio konversi unduhan (%).
  - Tombol 1-klik "Salin Tautan Publik", tombol "Edit", dan "Hapus Kampanye".

### 2. Halaman Pengunjung (Situs Publik / Toko Depan)
- **Tampilan Sederhana & Bersih (Hanya Pakai)**: Pengunjung tidak melihat tombol pengaturan atau upload frame yang membingungkan. Langsung fokus memakai twibbon.
- **Upload Foto Mudah**: Mengambil foto dari galeri HP atau kamera langsung.
- **Fitur Drag & Zoom (Geser & Cubit)**:
  - **Di HP/Smartphone**: Geser dengan 1 jari, cubit (*pinch*) dengan 2 jari untuk zoom.
  - **Di Komputer/Laptop**: Geser dengan mouse drag, zoom dengan scroll wheel.
  - **Kontrol Tambahan**: Slider zoom presisi (`-` dan `+`), tombol putar 90° (`↺` & `↻`), dan tombol reset posisi.
  - Bingkai twibbon transparan berada di lapisan atas secara real-time sehingga pengunjung dapat memposisikan wajah mereka tepat di dalam lubang bingkai.
- **Unduh Twibbon Kualitas Tinggi (HD)**: Menggabungkan foto pengunjung dan bingkai transparan menjadi 1 gambar utuh resolusi tinggi (1080x1080 px) berformat PNG yang langsung tersimpan ke galeri HP / file download komputer.
- **Salin Caption 1-Klik & WhatsApp Share**: Tombol salin teks caption dan tautan instan untuk membagikan ke WhatsApp.

---

## 🎨 Branding & Identitas Visual
Sesuai **Pedoman Penggunaan Logo Haul Masyayikh Ke-24 Dan Silatnas Insani Alyasini 2026**:
- **Warna Utama**: Hijau Pesantren (`#006d4e`), Kuning Emas (`#FBCE07`).
- **Gradien & Supergrafis**: Gradien hijau `#60ff00` ke `#006d4e`, kuning `#fffa00` ke `#ffd600`, dan pita supergrafis geometris sudut 45 derajat.
- **Logo Resmi**: Terintegrasi pada navbar header, footer, portal admin, serta tertanam di bingkai twibbon resmi bawaan.

---

## 🚀 Cara Menjalankan

1. **Jalankan Server**:
   ```bash
   cd C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini
   agy-node server.js
   ```
   *Atau klik dua kali file `start.bat`.*

2. **Akses di Browser**:
   - **Katalog Beranda Publik**: [http://localhost:3000](http://localhost:3000)
   - **Twibbon Haul Ke-24 (Lingkaran Emas)**: [http://localhost:3000/haul-24-alyasini](http://localhost:3000/haul-24-alyasini)
   - **Twibbon Silatnas 2026 (Modern Squircle)**: [http://localhost:3000/silatnas-insani-2026](http://localhost:3000/silatnas-insani-2026)
   - **Portal Admin Panitia**: [http://localhost:3000/admin](http://localhost:3000/admin)

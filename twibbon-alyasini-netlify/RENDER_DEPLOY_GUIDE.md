# 🚀 Panduan Lengkap Deploy Web Twibbon ke Render.com
### Pondok Pesantren Terpadu Al-Yasini

Semua berkas konfigurasi untuk **Render.com** sudah disiapkan secara otomatis:
- ✅ `package.json` (Script start & penentu versi Node.js)
- ✅ `render.yaml` (Blueprint otomatis Render, region Singapore agar super cepat diakses dari Indonesia)
- ✅ `.nvmrc` (Pengunci versi Node.js 22 LTS yang memiliki built-in SQLite)
- ✅ `.gitignore` (Mencegah file cache terunggah)
- ✅ Berkas ZIP siap pakai: `twibbon-alyasini-siap-upload.zip`

---

## 📋 Langkah 1: Upload ke GitHub

1. Buka browser dan login ke **[GitHub.com](https://github.com)**.
2. Klik tombol hijau **"New"** (atau icon **+** di pojok kanan atas $\to$ **New repository**).
3. Beri nama repository, misalnya: `twibbon-alyasini`.
4. Pilih **Public** (atau Private jika mau), lalu klik **"Create repository"**.
5. Pada halaman baru tersebut, klik tautan:  
   👉 **"uploading an existing file"**
6. Buka file **`twibbon-alyasini-siap-upload.zip`** di komputer Anda, ekstrak isinya, lalu **tarik semua file & folder ke browser GitHub**.  
   *(Pastikan file seperti `server.js`, `package.json`, folder `public/`, dll. ikut terunggah)*.
7. Di bagian bawah, klik tombol hijau **"Commit changes"**.

---

## 📋 Langkah 2: Deploy di Render.com

1. Buka **[Render.com](https://render.com)** dan klik tombol **"Get Started"** atau **"Sign In"** menggunakan akun **GitHub**.
2. Di halaman Dashboard Render, klik tombol **"New +"** (di pojok kanan atas) $\to$ pilih **"Web Service"**.
3. Pilih opsi **"Build and deploy from a Git repository"** $\to$ klik **Next**.
4. Cari dan pilih repository **`twibbon-alyasini`** yang baru saja Anda buat di GitHub $\to$ klik **"Connect"**.
5. Render akan otomatis membaca file `render.yaml` dan `package.json` Anda. Pastikan detailnya sebagai berikut:
   - **Name:** `twibbon-alyasini` *(akan menjadi link web Anda)*
   - **Region:** `Singapore` *(paling dekat dengan Indonesia)*
   - **Branch:** `main` (atau `master`)
   - **Runtime:** `Node`
   - **Build Command:** *(biarkan kosong atau `echo OK`)*
   - **Start Command:** `npm start`
   - **Instance Type:** Pilih **Free ($0)**
6. Klik tombol **"Deploy Web Service"** di bagian paling bawah.
7. Tunggu sekitar **1–2 menit**. Setelah muncul tulisan hijau **"Live"**, web Anda sudah resmi aktif di seluruh dunia!
8. Alamat web Anda akan tampil di bagian atas dashboard Render, misalnya:  
   👉 `https://twibbon-alyasini.onrender.com`

---

## 📋 Langkah 3: Trik Rahasia Agar Web 100% Selalu Bangun (Anti-Sleep)

Paket gratis Render secara otomatis akan tidur (*sleep*) jika tidak ada pengunjung dalam 15 menit. Agar web Anda **selalu aktif 24 jam nonstop tanpa jeda**, pasang pemantau gratis berikut:

1. Buka situs gratis **[UptimeRobot.com](https://uptimerobot.com)** dan buat akun (gratis).
2. Di dashboard UptimeRobot, klik tombol **"+ Add New Monitor"**.
3. Isi data berikut:
   - **Monitor Type:** Pilih `HTTP(s)`
   - **Friendly Name:** `Twibbon Al-Yasini`
   - **URL (or IP):** Masukkan alamat web Render Anda (contoh: `https://twibbon-alyasini.onrender.com`)
   - **Monitoring Interval:** Pilih **Every 5 minutes** (atau 10 minutes)
4. Klik **"Create Monitor"**.

**Selesai!**  
UptimeRobot akan otomatis menge-ping web Anda setiap beberapa menit sekali sehingga server Render mengira web selalu ramai dan **tidak akan pernah tidur/mati**. Siapa pun yang membuka tautan twibbon dari WhatsApp akan langsung masuk secara instan!

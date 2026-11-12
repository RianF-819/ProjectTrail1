# TRAIL MX - Offroad Motorcycle Adventure

Game motocross offroad 3D berbasis browser dengan fisika raycast suspension, dibangun menggunakan **Three.js**, **Cannon-es**, dan **Express.js**.

Terinspirasi dari [KickMX.com](https://kickmx.com) — arcade dirt bike dengan suspensi raycast, handling responsif, dan rute offroad satu arah.

---

## 🎮 Fitur Utama

- **Raycast Suspension** — Suspensi 4 titik berpasangan di kedua roda dengan respons sesuai permukaan
- **Fisika Stabil** — Simulasi fixed-step, lean terasa pada kecepatan tinggi, slide dengan handbrake, pitch mengikuti lintasan, serta landing yang menunggu kontak roda stabil
- **Adventure Bike 3D** — Siluet rally touring terinspirasi Africa Twin, dengan fairing tricolor, windshield, lampu ganda, crash bar, pannier, ban bertapak, dan rider ber-armor
- **Mountain Pass** — Jalur satu arah sepanjang sekitar 2,4 km (di bawah batas 2,5 km), menanjak di sisi pegunungan dengan tikungan lebar, 100 m aspal di awal, lalu tanah, batu, pasir, dan lumpur
- **Handling & Grip** — Bobot dan momentum lebih terasa, handbrake mengurangi grip roda belakang tanpa menjadi rem penuh, serta traksi mengikuti permukaan
- **Sistem Audio** — Suara mesin sintetis Web Audio API, landing thud, boost chime
- **Partikel Debu** — Sistem partikel debu dari ban belakang saat melaju
- **Kamera Dinamis** — Chase camera dengan FOV bergantung kecepatan
- **Rute & Checkpoint** — Progres jarak dalam kilometer, timer perjalanan, checkpoint permukaan, dan finish satu arah
- **Clean Landing Boost** — Mendarat bersih memberikan boost kecepatan
- **Recovery (F)** — Mengembalikan motor jika terbalik atau terjebak
- **Low/High Range** — Gigi rendah untuk torsi tinggi, gigi tinggi untuk kecepatan
- **Mobile Controls** — Joystick sentuh dan tombol virtual untuk layar sentuh
- **Error Overlay** — Menampilkan error JavaScript di layar jika terjadi kegagalan

---

## 🚀 Cara Menjalankan Lokal

### Opsi 1: Live Server (VS Code) — Termudah

1. Install ekstensi **Live Server** di VS Code (Ritwick Dey)
2. Buka folder `d:\ProjectTrail` di VS Code
3. Klik kanan `public/index.html` → **"Open with Live Server"**
4. Browser terbuka otomatis di `http://127.0.0.1:5500/public/index.html`
5. **Klik tombol PLAY NOW** atau tekan **SPACE / ENTER** untuk memulai

### Opsi 2: Node.js + Express

Jika Node.js sudah terinstall:

```bash
cd d:\ProjectTrail
npm install
npm start
```

Buka browser: `http://localhost:3000`

---

## 🌐 Cara Publish ke Website

### Opsi A: Netlify (Gratis, Static Hosting)

1. Push kode ke GitHub/GitLab
2. Buka [Netlify](https://netlify.com), klik **"Add new site" → "Import an existing project"**
3. Pilih repository Anda
4. Build command: kosongkan (tidak perlu build)
5. Publish directory: `public`
6. Klik **Deploy Site**

File `netlify.toml` sudah dikonfigurasi untuk SPA redirect dan caching.

### Opsi B: Vercel (Gratis)

1. Push kode ke GitHub
2. Buka [Vercel](https://vercel.com), klik **"Add New" → "Project"**
3. Pilih repository Anda
4. Framework preset: **Other**
5. Build command: kosongkan
6. Output directory: `public`
7. Klik **Deploy**

File `vercel.json` sudah dikonfigurasi.

### Opsi C: Render (Gratis, Node.js Server)

1. Push kode ke GitHub
2. Buka [Render](https://render.com), klik **"New +" → "Web Service"**
3. Pilih repository Anda
4. Runtime: **Node**
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Klik **Create Web Service**

File `render.yaml` sudah dikonfigurasi.

---

## 🎯 Kontrol Permainan

| Tombol | Aksi |
|--------|------|
| **W / S** | Gas / Rem mundur |
| **A / D** | Belok & Badan miring |
| **Shift / Ctrl** | Pitch udara (naikkan/turunkan hidung) |
| **Spasi** | Handbrake / Drift |
| **R** | Ganti Low / High Range |
| **F** | Quick Recovery (jika motor terbalik) |
| **Enter / Spasi** | Mulai permainan (di layar awal) |

---

## 📁 Struktur Folder

```
ProjectTrail/
├── server.js              # Express server (untuk Node.js hosting)
├── package.json           # Dependensi Node.js
├── vercel.json            # Konfigurasi Vercel
├── netlify.toml           # Konfigurasi Netlify
├── render.yaml            # Konfigurasi Render
├── .gitignore
├── README.md
├── public/
│   ├── index.html         # Halaman utama game
│   ├── style.css          # Styling KickMX-style UI
│   ├── lib/
│   │   ├── three.module.js    # Three.js library
│   │   └── cannon-es.js       # Cannon-es physics library
│   └── src/
│       ├── main.js        # Game loop utama
│       ├── bikePhysics.js # Fisika motor & suspensi
│       ├── controls.js    # Input keyboard & sentuh
│       ├── hud.js         # HUD dash cluster
│       └── terrain.js     # Heightfield rute gunung dan permukaan beragam
```

---

## 🐛 Troubleshooting

**Game nggak bisa dimulai / loading terus?**
- Pastikan buka via **Live Server** atau **http://localhost:3000**, JANGAN buka file langsung (`file://`)
- Buka **F12 → Console** untuk melihat error merah jika ada

**Error CORS?**
- Ini karena membuka file langsung via `file://`. Harus pakai local server (Live Server / Node.js)

**Layar hitam / tidak ada motor?**
- Pastikan `public/lib/three.module.js` dan `public/lib/cannon-es.js` tersedia
- Jalankan `setup-libs.bat` untuk menyalin library otomatis

---

## 📄 Lisensi

MIT License — Bebas untuk digunakan dan dimodifikasi.
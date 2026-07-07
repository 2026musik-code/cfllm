# Deployment to Cloudflare Workers with Hono

Proyek ini telah dikonfigurasi agar dapat dideploy ke Cloudflare Workers menggunakan framework Hono, beserta penyimpanan data dan skrip menggunakan Cloudflare KV.

## Persiapan

1. Pastikan Anda telah menginstal Node.js dan NPM.
2. Pastikan Anda telah login ke akun Cloudflare melalui Wrangler CLI:
   ```bash
   npx wrangler login
   ```

## Struktur File Deployment
File yang telah kami siapkan:
1. `cloudflare-worker.ts`: File utama untuk Hono backend server. File ini menangani API Chat, manajemen pengguna ke KV, dan juga penyimpanan skrip generator ke KV.
2. `wrangler.toml`: Konfigurasi Wrangler yang berisi setting `kv_namespaces` yang Anda request (nama: `userkey`, id: `324786888f8a40318c2489d755443036`).

## Langkah-Langkah Deployment (Backend Hono)

1. Instal package Cloudflare Worker dan Wrangler jika belum:
   ```bash
   npm install -D wrangler
   npm install hono
   ```

2. Deploy worker ke Cloudflare:
   ```bash
   npx wrangler deploy cloudflare-worker.ts
   ```
   Setelah berhasil, Anda akan mendapatkan URL Worker dari Cloudflare (misal: `https://cflare-proxy.<username>.workers.dev`).

## Deployment Frontend (React/Vite)

Karena aplikasi ini terdiri dari Frontend (Vite/React) dan Backend (Hono), cara terbaik adalah mendeploy Frontend ke Cloudflare Pages, lalu mengatur agar requests ke `/api/*` diteruskan ke backend.

Atau, Anda dapat mendeploy semua sebagai **Cloudflare Pages with Functions**:
1. Build frontend Anda:
   ```bash
   npm run build
   ```
2. Pastikan URL Worker Anda di-set di frontend (jika di-hosting terpisah), atau gunakan fitur `_routes.json` pada Cloudflare Pages untuk mengikat Hono backend API.

## Pengaturan KV Namespace
KV namespace `userkey` digunakan untuk 2 hal dalam sistem ini:
- **`users_list`**: Menyimpan array data user (Account ID, Token, Model, dll).
- **`script_<id>`**: Menyimpan Python script secara temporer dengan TTL (waktu kedaluwarsa) 1 jam otomatis dari sisi server, sehingga script yang digenerate oleh user via web tidak memenuhi space KV selamanya.

Selamat Mendeploy!

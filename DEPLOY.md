# Deployment Full-Stack ke Cloudflare (Web + API)

Sekarang aplikasi telah dikonfigurasi menggunakan fitur **Cloudflare Workers with Assets**. Ini berarti Frontend (React) dan Backend API (Hono) digabung dan dideploy dalam satu perintah yang sama, dan berjalan di satu URL persis seperti Web Preview!

## Bagaimana ini Bekerja?
1. Saat Anda menjalankan perintah build (`npm run build`), Vite akan mem-build UI React ke dalam folder `dist/`.
2. Saat Anda menjalankan perintah deploy (`npx wrangler deploy`), Wrangler akan:
   - Mem-bundle backend API dari `cloudflare-worker.ts`
   - Mengunggah seluruh file UI React dari folder `dist/` sebagai Static Assets
   - Mengikat KV Namespace secara otomatis sesuai `wrangler.toml`.
3. Semua request API (`/api/*`) akan ditangani oleh skrip Worker.
4. Semua request lain (seperti `/` atau `/dashboard`) akan dilayani oleh Cloudflare Assets untuk memunculkan halaman React Anda!

## Langkah Deployment
Anda hanya perlu menjalankan:
```bash
npm run build
npx wrangler deploy
```

Jika Anda menggunakan CI/CD (seperti GitHub Actions) atau command otomatis dari platform, mereka sudah dikonfigurasi untuk menjalankan dua perintah di atas.

## Konfigurasi KV
Jika sebelumnya Anda mengalami error tentang KV, kami telah menstandarkan `wrangler.toml`:
```toml
name = "cfllm"
compatibility_date = "2024-03-20"
main = "cloudflare-worker.ts"

[assets]
directory = "./dist"
binding = "ASSETS"

[[kv_namespaces]]
binding = "userkey"
id = "324786888f8a40318c2489d755443036"
```

Selamat, aplikasi Anda sekarang sepenuhnya Full-Stack di Cloudflare!

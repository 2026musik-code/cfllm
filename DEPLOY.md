# Deployment ke Cloudflare Pages (Full-Stack Frontend + Backend API)

Agar aplikasi web (React) dan backend (Hono + KV) dapat berjalan di satu URL secara bersamaan tanpa mengalami halaman 404, kita mendeploy-nya sebagai **Cloudflare Pages with Functions / Advanced Mode**.

## Persiapan
1. Pastikan `wrangler` sudah login (`npx wrangler login`).
2. Pastikan file `package.json` Anda memiliki script `"build:cf"`. (Sudah ditambahkan otomatis).

## Langkah Deployment

**1. Jalankan Build Khusus Cloudflare**
Perintah ini akan melakukan build untuk UI React (`dist/`) dan mem-bundle `cloudflare-worker.ts` menjadi file spesial bernama `dist/_worker.js`.
```bash
npm run build:cf
```

**2. Deploy ke Cloudflare Pages**
Kita menggunakan fitur **Pages**, *bukan* workers. Jalankan perintah:
```bash
npx wrangler pages deploy dist --project-name cfllm
```

Jika ini pertama kalinya Anda membuat project Pages "cfllm", wrangler mungkin akan bertanya kepada Anda untuk mengonfirmasinya.

**3. Mengikat KV Namespace**
Karena ini menggunakan Cloudflare Pages, `wrangler.toml` (v3) sudah digunakan, tetapi Anda juga dapat memastikan bahwa KV terikat dengan perintah ini:
Jika gagal terdeteksi, periksa Dashboard Cloudflare -> Workers & Pages -> cfllm -> Settings -> Bindings -> Tambahkan KV Namespace dengan variabel name `userkey` dan arahkan ke KV Anda (`324786888f8a40318c2489d755443036`).

## Bagaimana ini Bekerja?
- Ketika pengunjung mengakses web `https://cfllm.pages.dev`, Cloudflare akan mengembalikan UI Website React.
- Ketika Aplikasi melakukan request chat/database ke URL `/api/...`, Cloudflare akan mengeksekusi Hono Backend yang terhubung dengan KV dan model AI Cloudflare Anda.
- Semuanya kini berjalan di satu Domain!

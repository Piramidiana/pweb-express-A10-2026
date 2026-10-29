# Panduan Bagian Piramidiana — Modul 4 MLBB Shop

Bagianmu: koordinator, repo, database Neon, setup project, schema Prisma + migrasi, middleware (Fitur 1), `/health`, README, dan pengumpulan link.

Folder `pweb-express-A10-2026/` sudah berisi semua file bagianmu dan sudah diuji: server jalan, `/health` membalas `Server dan database OK`, URL yang tidak terdaftar dibalas 404, dan JSON rusak dibalas 400.

## 1. Buat Database Neon

1. Buka [console.neon.tech](https://console.neon.tech), lalu buat project baru (region **Singapore**).
2. Klik **Connect** dan salin dua connection string:
   - **Connection pooling ON** → untuk `DATABASE_URL`
   - **Connection pooling OFF** → untuk `DATABASE_URL_UNPOOLED`

## 2. Buat Repo

1. Di GitHub, buat repo **public** bernama `pweb-express-A10-2026`. **Jangan** centang "Add a README".
2. Clone ke laptop:

```bash
git clone https://github.com/Piramidiana/pweb-express-A10-2026.git
cd pweb-express-A10-2026
```

3. Salin semua isi folder `pweb-express-A10-2026/` dari paket ini ke folder hasil clone.

## 3. Jalankan

```bash
npm install
cp .env.example .env
```

> PowerShell lama: pakai `copy .env.example .env`.

Isi `.env` dengan dua connection string dari langkah 1, lalu:

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

Cek hasilnya:

| Buka | Hasil yang benar |
| --- | --- |
| `http://localhost:3000/health` | `{"status":true,"message":"Server dan database OK"}` |
| `http://localhost:3000/api/ngawur` | `{"status":false,"message":"Endpoint GET /api/ngawur tidak ditemukan"}` |

Di terminal akan muncul log seperti `GET /health 200 - 110ms`. Buka juga `npx prisma studio` dan pastikan ada 4 tabel: Hero, Skin, Player, PlayerHero (masih kosong).

## 4. Commit & Push

```bash
git add package.json package-lock.json tsconfig.json .gitignore .env.example
git commit -m "chore: setup project express 5 + typescript"

git add prisma.config.ts prisma/schema.prisma prisma/migrations
git commit -m "feat: schema prisma mlbb shop (4 tabel, 4 enum) + migrasi init"

git add src README.md
git commit -m "feat: logger, error handler, notFound, dan endpoint /health"

git branch -M main
git push -u origin main
```

Lalu cek `git status`. Pastikan `.env` **tidak** ikut ter-push (seharusnya sudah tertahan oleh `.gitignore`).

## 5. Serahkan ke Tim

1. Undang Viko dan RayhanFa: repo → **Settings → Collaborators → Add people**.
2. Kirim isi `.env` lewat **chat pribadi** masing-masing, jangan di grup.
3. Kirim `BRIEF-TIM.md` ke grup.

## 6. Hari Minggu (Sebelum 23.59)

1. `git pull`, `npm install`, `npx prisma generate`
2. Seed ulang: `npx tsx prisma/seed.ts` (setelah bagian Viko masuk)
3. Bersama-sama jalankan testcase 01–28 dari koleksi asisten. Tabel hasil yang benar ada di `BRIEF-TIM.md`.
4. Kumpulkan link repo ke Google Form.

## 7. Persiapan Demo Bagianmu

### File dan isinya

| File | Isi |
| --- | --- |
| `package.json` | `"type": "module"` (Prisma 7 wajib ESM), script `dev` / `start` / `typecheck` |
| `tsconfig.json` | Sama seperti modul: `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true` |
| `.gitignore` | `node_modules`, `dist`, `.env`, `src/generated` |
| `prisma.config.ts` | Konfigurasi Prisma CLI: lokasi schema, folder migrasi, dan URL **direct** dari `DATABASE_URL_UNPOOLED` |
| `prisma/schema.prisma` | 4 enum dan 4 model sesuai gambar di soal |
| `src/config/prisma.ts` | `PrismaClient` dengan adapter `PrismaNeon` dan URL **pooled** (`DATABASE_URL`) |
| `src/index.ts` | Urutan middleware, `/health`, router `/api`, `notFound`, `errorHandler`, graceful shutdown |
| `src/middlewares/logger.ts` | Mencatat `METHOD URL STATUS - durasi` setelah response selesai (`res.on("finish")`) |
| `src/middlewares/error.ts` | `notFound` (404) dan `errorHandler` (HttpError, error Prisma P2002/P2025/P2003, JSON rusak, lainnya 500) |
| `src/utils/http-error.ts` | Class `HttpError` dengan properti `status` |
| `src/utils/response.ts` | `sendSuccess(res, status, message, data, metadata)` |
| `src/utils/parse.ts` | `parseId` untuk ID di URL yang harus bilangan bulat positif |

### Hal yang perlu bisa kamu jelaskan

1. **Alur request:** `logger` → `express.json()` → `express.urlencoded()` → `/health` atau router `/api` → controller. Kalau tidak ada route yang cocok → `notFound`. Kalau controller melempar error → `errorHandler`.
2. **Kenapa `notFound` dan `errorHandler` paling bawah?** Middleware dijalankan dari atas ke bawah. Kalau `notFound` diletakkan di atas, semua request jadi 404 sebelum sampai ke route.
3. **Kenapa `errorHandler` punya 4 parameter?** Express mengenali error middleware dari jumlah parameternya: `(err, req, res, next)`.
4. **Express 5 vs 4:** di Express 5, error di handler `async` otomatis diteruskan ke `errorHandler`. Jadi controller cukup `throw new HttpError(...)` tanpa `try/catch`.
5. **Dua connection string:** pooled untuk aplikasi (banyak koneksi singkat, lewat pooler), direct untuk Prisma CLI (migrasi butuh koneksi langsung).
6. **Schema:**
   - `@unique` pada `Hero.name` dan `Player.nickname`
   - `@@unique([playerId, heroId])` mencegah satu player punya hero yang sama dua kali
   - `@default(10000)` untuk `bp` dan `@default(0)` untuk `diamond`
   - `onDelete: Cascade` pada Skin → Hero dan PlayerHero → Player, jadi data anak ikut terhapus
   - `priceBP Int?`: tanda `?` berarti boleh kosong (null), dipakai untuk hero yang tidak bisa dibeli dengan BP seperti Freya
7. **Prisma 7 vs sebelumnya:** generator `prisma-client` + `output` wajib, URL database di `prisma.config.ts` (bukan di schema), driver adapter wajib, `.env` dimuat manual dengan `dotenv`, dan `prisma generate` tidak lagi otomatis.
8. **`/health`:** menjalankan `SELECT 1` ke database, sekaligus membangunkan Neon dari scale-to-zero. Itu sebabnya request pertama bisa lambat.
9. **Graceful shutdown:** saat Ctrl+C, server ditutup dan koneksi database diputus dengan rapi lewat `prisma.$disconnect()`.

### Kemungkinan code challenge

| Permintaan asisten | Yang diubah |
| --- | --- |
| Ubah format log, misalnya tambah jam | `logger.ts`: tambahkan `new Date().toISOString()` di `console.log` |
| Ubah saldo awal player jadi 5000 BP | `schema.prisma`: `@default(5000)`, lalu `npx prisma migrate dev --name ubah_saldo_awal` dan `npx prisma generate` |
| Tambah kolom baru, misalnya `level` di Player | `schema.prisma`: `level Int @default(1)`, lalu migrate + generate |
| Pesan 404 diganti | `error.ts`: ubah teks di `notFound` |
| `/health` menampilkan waktu server | `index.ts`: tambahkan `data: { time: new Date() }` di response `/health` |
| Ganti port | `.env`: `PORT=4000` |

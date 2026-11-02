# MLBB Shop API — Praktikum Pemrograman Web Modul 4

Backend sederhana untuk toko Mobile Legends: Diamond, Battle Point (BP), hero, dan skin. Dibuat oleh kelompok A10 untuk HMIT ITS dan Jamal.

## Anggota & Pembagian Tugas

| Anggota | Bagian |
| --- | --- |
| Piramidiana | Koordinator, repository, database Neon, setup project, schema Prisma, middleware (logger, error handler, notFound), endpoint `/health`, README |
| Viko | Dataset & seed, Fitur 2 Hero, Fitur 3 Skin, Fitur 7 Statistik |
| RayhanFa | Fitur 4 Player, Fitur 5 Top Up & Match, Fitur 6 Beli Hero |

## Tech Stack

- Express 5 + TypeScript (dijalankan dengan `tsx`)
- Prisma ORM 7 + `@prisma/adapter-neon`
- PostgreSQL di Neon

## Cara Menjalankan

Butuh Node.js 24 LTS atau 26 (minimal 22.12, syarat Prisma 7).

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan connection string dari Neon:

- `DATABASE_URL` → pooled (host mengandung `-pooler`), dipakai aplikasi
- `DATABASE_URL_UNPOOLED` → direct, dipakai Prisma CLI

```bash
npx prisma migrate dev --name init
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

Dataset sumber `data/heroes.csv` dan `data/skins.csv` dibaca langsung oleh seed.
Harga kosong pada CSV disimpan sebagai `null`.

Buka `http://localhost:3000/health`. Jika muncul `Server dan database OK`, server dan database sudah tersambung.

Seed selalu mengosongkan tabel lebih dulu (`TRUNCATE ... RESTART IDENTITY CASCADE`), jadi aman dijalankan ulang sebelum demo. Hasilnya 133 hero, 892 skin, 3 player, dan 4 data hero milik player.

## Struktur Folder

```
├── data/                  dataset hero & skin
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/prisma.ts   koneksi Prisma + Neon
│   ├── controllers/       logika tiap fitur
│   ├── middlewares/       logger.ts, error.ts
│   ├── routes/            index.ts + *.routes.ts
│   ├── utils/             http-error.ts, parse.ts, response.ts
│   └── index.ts
├── prisma.config.ts
└── tsconfig.json
```

## Aturan Diamond & BP

| Aturan | Nilai |
| --- | --- |
| Saldo awal player baru | 10.000 BP dan 0 Diamond |
| Top up | Diamond bertambah sebesar `amount` (bilangan bulat > 0) |
| Hadiah match | WIN +300 BP, LOSE +100 BP |
| Beli hero | Pakai `priceBP` atau `priceDiamond`. Harga `null` berarti tidak bisa dibeli dengan mata uang itu |
| Satu hero satu kali | Player tidak bisa membeli hero yang sudah dimiliki |

## Daftar Endpoint

| Fitur | Method | Endpoint | Keterangan |
| --- | --- | --- | --- |
| — | GET | `/health` | Cek server dan koneksi database |
| Hero | GET | `/api/heroes` | Query: `page`, `limit`, `search`, `role` |
| Hero | GET | `/api/heroes/:hero_id` | Detail hero beserta skin |
| Hero | POST | `/api/heroes` | Body: `name`, `role`, `lane`, `releaseYear`, `priceBP?`, `priceDiamond?` |
| Skin | GET | `/api/skins` | Query: `page`, `limit`, `heroId`, `rarity` |
| Skin | GET | `/api/skins/:skin_id` | Detail skin beserta hero |
| Player | POST | `/api/players` | Body: `nickname` |
| Player | GET | `/api/players/:player_id` | Detail player beserta hero miliknya |
| Player | PATCH | `/api/players/:player_id` | Body: `nickname` |
| Player | DELETE | `/api/players/:player_id` | Hapus player (hero miliknya ikut terhapus) |
| Top Up | POST | `/api/players/:player_id/topup` | Body: `amount` |
| Match | POST | `/api/players/:player_id/matches` | Body: `result` (`WIN` / `LOSE`) |
| Beli Hero | POST | `/api/players/:player_id/heroes` | Body: `heroId`, `currency` (`BP` / `DIAMOND`) |
| Statistik | GET | `/api/statistics` | Total player, hero dimiliki, total Diamond, hero terpopuler, hero per role |

### Format Response

Sukses:

```json
{
  "status": true,
  "message": "Berhasil mengambil data hero",
  "data": [],
  "metadata": { "currentPage": 1, "limit": 10, "totalItems": 133, "totalPages": 14 }
}
```

Gagal:

```json
{ "status": false, "message": "Hero tidak ditemukan" }
```

`metadata` hanya muncul di endpoint yang memakai pagination (`/api/heroes` dan `/api/skins`).

## Pengujian

Import koleksi testcase dari asisten ke Postman / Apidog, jalankan `npx tsx prisma/seed.ts`, lalu kirim request 01 sampai 28 secara berurutan.

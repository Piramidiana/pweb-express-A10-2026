# Brief Tim — Modul 4 MLBB Shop (Kelompok A10)

Repo: `pweb-express-A10-2026`. Fondasi (setup, schema + migrasi, middleware, `/health`) sudah dikerjakan Piramidiana dan sudah ada di repo. Tugas kalian adalah membangun fitur di atas fondasi itu.

## Pembagian

| Anggota | Tugas | Testcase yang harus lolos |
| --- | --- | --- |
| Viko | Dataset + seed, Fitur 2 Hero, Fitur 3 Skin, Fitur 7 Statistik | 02–11, 25 |
| RayhanFa | Fitur 4 Player, Fitur 5 Top Up & Match, Fitur 6 Beli Hero | 12–24, 26, 27 |

Target: **Viko selesai Jumat, RayhanFa selesai Sabtu.** Minggu kita seed ulang dan test 01–28 bareng.

## Persiapan (Sekali Saja)

```bash
git clone https://github.com/Piramidiana/pweb-express-A10-2026.git
cd pweb-express-A10-2026
npm install
```

Buat file `.env` di root, isi dengan kiriman Piramidiana lewat japri, lalu:

```bash
npx prisma generate
npm run dev
```

Cek `http://localhost:3000/health`. Kalau muncul `Server dan database OK`, kalian sudah tersambung ke database kelompok. **Tidak perlu** `prisma migrate dev`, karena tabelnya sudah dibuat.

## Aturan Main (WAJIB, supaya kode kita nyambung)

1. **Struktur file ikut modul:** logika di `src/controllers/namaController.ts`, URL di `src/routes/nama.routes.ts`, lalu daftarkan di `src/routes/index.ts`.
2. **Import Prisma dari** `src/config/prisma.ts`: `import prisma from "../config/prisma";`. Jangan membuat `new PrismaClient()` sendiri.
3. **Response sukses pakai** `sendSuccess(res, status, message, data, metadata)` dari `src/utils/response.ts`.
4. **Error cukup** `throw new HttpError(status, "pesan")` dari `src/utils/http-error.ts`. Tidak perlu `try/catch`, karena `errorHandler` yang membalas `{ status: false, message }`.
5. **ID di URL** divalidasi dengan `parseId(req.params.xxx)` dari `src/utils/parse.ts`. Helper baru (misalnya untuk pagination) boleh ditambahkan di file itu.
6. **Body request** dibaca dengan `req.body ?? {}`, karena di Express 5 `req.body` bisa `undefined`.
7. **Jangan mengubah** `schema.prisma`, `src/index.ts`, `src/middlewares/*`, atau `src/config/prisma.ts` tanpa bilang ke Piramidiana dulu.
8. **Nama parameter URL sesuai soal:** `:hero_id`, `:skin_id`, `:player_id`.
9. **Jangan commit `.env`.** Selalu `git pull` sebelum mulai kerja dan sebelum push.
10. **Commit beberapa kali** sesuai fitur (bukan satu commit besar), dan pakai nama sendiri di git.
11. **Pahami kode kalian sendiri.** Saat demo, asisten bisa meminta perubahan kecil langsung di kode.

## Database yang Sudah Ada

| Tabel | Kolom |
| --- | --- |
| `Hero` | `id`, `name` (unique), `role` (enum Role), `lane` (enum Lane), `releaseYear`, `priceBP` (boleh null), `priceDiamond` (boleh null) |
| `Skin` | `id`, `name`, `rarity` (enum Rarity), `priceDiamond` (boleh null), `heroId` → Hero (cascade) |
| `Player` | `id`, `nickname` (unique), `bp` (default 10000), `diamond` (default 0), `createdAt` |
| `PlayerHero` | `id`, `playerId` → Player (cascade), `heroId` → Hero, `currency` (enum Currency), `pricePaid`, unique (`playerId`, `heroId`) |

Enum: `Role` = TANK, FIGHTER, ASSASSIN, MAGE, MARKSMAN, SUPPORT · `Lane` = EXP, GOLD, MID, JUNGLE, ROAM · `Rarity` = COMMON, EXCEPTIONAL, DELUXE, EXQUISITE, GRAND, SUPREME · `Currency` = BP, DIAMOND.

Enum bisa di-import dari `src/generated/prisma/enums`, misalnya `import { Role } from "../generated/prisma/enums";`.

---

## Viko

### 1. Dataset & seed

- File di link Drive asisten berupa **CSV** (`heroes.csv`, `skins.csv`), bukan JSON seperti tertulis di soal. Taruh di folder `data/`. Untuk membaca CSV, salah satu caranya library `csv-parse`.
- Buat `prisma/seed.ts` sesuai urutan di soal: `TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`, lalu `createMany` hero, `createMany` skin, 3 player, dan 4 PlayerHero.
- Kolom yang dipakai: hero → `name`, `primaryRole` (simpan ke `role`), `primaryLane` (simpan ke `lane`), `releaseYear`, `priceBP`, `priceDiamond`. Skin → `name`, `heroId`, `rarity`, `priceDiamond`. **Harga kosong harus disimpan sebagai `null`.**
- Jalankan `npx tsx prisma/seed.ts`. Cek di `npx prisma studio`: **133 hero, 892 skin, 3 player, 4 PlayerHero**. Miya harus id 1 dan Hirara id 133.

### 2. Hero

| Endpoint | Ketentuan |
| --- | --- |
| `GET /api/heroes` | Query `page` & `limit` (default 1 & 10), `search` (nama mengandung kata, tidak peduli huruf besar/kecil), `role`. Response ada `metadata`: `currentPage`, `limit`, `totalItems`, `totalPages` |
| `GET /api/heroes/:hero_id` | Hero + daftar skin (pakai `include`). Tidak ada → 404 |
| `POST /api/heroes` | Body `name`, `role`, `lane`, `releaseYear`, `priceBP?`, `priceDiamond?`. Urutan: data wajib kosong → 400, nama sudah ada → 409, berhasil → 201 |

### 3. Skin

| Endpoint | Ketentuan |
| --- | --- |
| `GET /api/skins` | Skin + nama hero (`hero: { name }`). Query `page`, `limit`, `heroId`, `rarity`. Ada `metadata` |
| `GET /api/skins/:skin_id` | Skin + hero. Tidak ada → 404 |

### 4. Statistik — `GET /api/statistics`

| Field | Cara |
| --- | --- |
| `totalPlayers` | `count` Player |
| `totalHeroesOwned` | `count` PlayerHero |
| `totalDiamond` | `aggregate` dengan `_sum` diamond |
| `mostOwnedHero` | `groupBy` PlayerHero berdasarkan heroId, urutkan `_count` terbesar. Hasil: `{ heroId, name, owners }`. Kalau seri, ambil heroId terkecil (sesuai gambar soal: Miya) |
| `heroesPerRole` | `groupBy` Hero berdasarkan role. Hasil: `[{ role, total }]`, urut dari terbanyak |

---

## RayhanFa

### 1. Player

| Endpoint | Ketentuan |
| --- | --- |
| `POST /api/players` | Body hanya `nickname`. Kosong → 400, sudah dipakai → 409, berhasil → 201. Saldo otomatis 10000 BP dan 0 Diamond (dari default schema) |
| `GET /api/players/:player_id` | Data player + `heroes: [{ heroId, name, currency, pricePaid }]`. Tidak ada → 404 |
| `PATCH /api/players/:player_id` | Ganti `nickname`. Urutan: player tidak ada → 404, nickname kosong → 400, dipakai player **lain** → 409 |
| `DELETE /api/players/:player_id` | Hapus player (hero miliknya ikut terhapus karena cascade). Tidak ada → 404 |

### 2. Top Up & Match

| Endpoint | Ketentuan |
| --- | --- |
| `POST /api/players/:player_id/topup` | Body `amount`. Bukan bilangan bulat > 0 → 400, player tidak ada → 404. Tambah diamond pakai `increment`. Response `{ playerId, amount, diamond }` |
| `POST /api/players/:player_id/matches` | Body `result` (`WIN` / `LOSE`). Selain itu → 400, player tidak ada → 404. WIN +300 BP, LOSE +100 BP pakai `increment`. Response `{ playerId, result, bpEarned, bp }` |

### 3. Beli Hero — `POST /api/players/:player_id/heroes`

Body `heroId` dan `currency` (`BP` / `DIAMOND`). Periksa **berurutan** dan berhenti di pemeriksaan pertama yang gagal:

1. `heroId` kosong atau `currency` bukan BP/DIAMOND → 400
2. Player tidak ada → 404
3. Hero tidak ada → 404
4. Harga hero untuk currency itu `null` → 400, contoh pesan: "Hero Freya tidak bisa dibeli dengan BP"
5. Player sudah punya hero itu → 409
6. Saldo kurang dari harga → 400

Simpan dengan `prisma.$transaction([ ... ])` berisi dua query: kurangi saldo pakai `decrement`, lalu buat data PlayerHero (`currency`, `pricePaid`).

Response 201: `{ hero: { id, name }, currency, pricePaid, balance: { bp, diamond } }`.

---

## Hasil yang Harus Muncul (Testcase Asisten, Setelah Seed Ulang)

| # | Request | Status | Yang dicek |
| --- | --- | --- | --- |
| 01 | Health | 200 | |
| 02 | Hero role MARKSMAN limit 5 | 200 | totalItems 20, totalPages 4, isi Miya, Bruno, Clint, Layla, Moskov |
| 03 | Cari hero `la` | 200 | totalItems 10 |
| 04 | Detail Layla (18) | 200 | 11 skin |
| 05 | Hero 999 | 404 | |
| 06 | Tambah Collie | 201 | id 134 |
| 07 | Collie lagi | 409 | |
| 08 | Data kurang | 400 | |
| 09 | Skin heroId 18 | 200 | totalItems 11, skin pertama Green Flash |
| 10 | Skin GRAND | 200 | totalItems 98 |
| 11 | Skin 891 | 200 | Silverbolt Raiko, hero Selena |
| 12 | Buat JunglerMalam | 201 | id 4, BP 10000, Diamond 0 |
| 13 | Nickname ArekITS | 409 | |
| 14 | Top up 706 ke player 3 | 200 | diamond 706 |
| 15 | Top up -10 | 400 | |
| 16 | Match WIN player 3 | 200 | bp 10300 |
| 17 | Beli Freya (22) pakai BP | 400 | tidak punya harga BP |
| 18 | Beli Freya pakai DIAMOND | 201 | diamond 107 |
| 19 | Beli Layla pakai BP | 201 | bp 8300 |
| 20 | Beli Layla lagi | 409 | |
| 21 | Player 1 beli Hirara (133) pakai BP | 400 | BP kurang |
| 22 | Detail player 3 | 200 | heroes: Freya, Layla |
| 23 | PATCH nickname MageITS | 200 | |
| 24 | PATCH nickname ArekITS | 409 | |
| 25 | Statistik | 200 | totalPlayers 4, totalHeroesOwned 6, totalDiamond 3074, mostOwnedHero Layla (owners 2), MAGE 26 |
| 26 | Hapus player 4 | 200 | |
| 27 | Detail player 4 | 404 | |
| 28 | `/api/ngawur` | 404 | |

Kalau testcase kalian sudah cocok dengan tabel ini, kabari di grup lalu push.

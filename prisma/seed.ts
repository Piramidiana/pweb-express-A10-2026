import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import prisma from "../src/config/prisma";
import { Currency, Lane, Rarity, Role } from "../src/generated/prisma/client";

interface HeroCsvRow {
  id: string;
  name: string;
  primaryRole: string;
  primaryLane: string;
  releaseYear: string;
  priceBP: string;
  priceDiamond: string;
}

interface SkinCsvRow {
  id: string;
  name: string;
  heroId: string;
  rarity: string;
  priceDiamond: string;
}

interface RawHero {
  id: number;
  name: string;
  primaryRole: Role;
  primaryLane: Lane;
  releaseYear: number;
  priceBP: number | null;
  priceDiamond: number | null;
}

interface RawSkin {
  id: number;
  name: string;
  heroId: number;
  rarity: Rarity;
  priceDiamond: number | null;
}

async function main() {
  // Load and validate the source files before clearing existing database data.
  const heroesPath = path.join(process.cwd(), "data", "heroes.csv");
  const skinsPath = path.join(process.cwd(), "data", "skins.csv");
  const heroRows = parse<HeroCsvRow>(fs.readFileSync(heroesPath), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  });
  const skinRows = parse<SkinCsvRow>(fs.readFileSync(skinsPath), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  });

  const parseInteger = (value: string, field: string): number => {
    if (!/^\d+$/.test(value)) {
      throw new Error(`${field} harus berupa bilangan bulat, ditemukan "${value}"`);
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(`${field} di luar batas bilangan aman`);
    }

    return parsed;
  };
  const parseOptionalInteger = (
    value: string,
    field: string,
  ): number | null => (value === "" ? null : parseInteger(value, field));

  if (heroRows.length !== 133) {
    throw new Error(`Dataset hero harus berisi 133 data; ditemukan ${heroRows.length}`);
  }
  if (skinRows.length !== 892) {
    throw new Error(`Dataset skin harus berisi 892 data; ditemukan ${skinRows.length}`);
  }

  const rawHeroes: RawHero[] = heroRows.map((hero) => ({
    id: parseInteger(hero.id, "Hero id"),
    name: hero.name,
    primaryRole: hero.primaryRole as Role,
    primaryLane: hero.primaryLane as Lane,
    releaseYear: parseInteger(hero.releaseYear, "Hero releaseYear"),
    priceBP: parseOptionalInteger(hero.priceBP, "Hero priceBP"),
    priceDiamond: parseOptionalInteger(hero.priceDiamond, "Hero priceDiamond"),
  }));
  const rawSkins: RawSkin[] = skinRows.map((skin) => ({
    id: parseInteger(skin.id, "Skin id"),
    name: skin.name,
    heroId: parseInteger(skin.heroId, "Skin heroId"),
    rarity: skin.rarity as Rarity,
    priceDiamond: parseOptionalInteger(skin.priceDiamond, "Skin priceDiamond"),
  }));

  const heroIds = new Set(rawHeroes.map((hero) => hero.id));
  const validPrices = (value: number | null) =>
    value === null || (Number.isSafeInteger(value) && value >= 0);
  if (
    rawHeroes.some((hero, index) => hero.id !== index + 1) ||
    rawHeroes.some(
      (hero) =>
        !hero.name ||
        !Object.values(Role).includes(hero.primaryRole) ||
        !Object.values(Lane).includes(hero.primaryLane) ||
        !Number.isSafeInteger(hero.releaseYear) ||
        !validPrices(hero.priceBP) ||
        !validPrices(hero.priceDiamond),
    )
  ) {
    throw new Error("Dataset hero memiliki data yang tidak valid");
  }
  if (
    rawSkins.some((skin, index) => skin.id !== index + 1) ||
    rawSkins.some(
      (skin) =>
        !skin.name ||
        !heroIds.has(skin.heroId) ||
        !Object.values(Rarity).includes(skin.rarity) ||
        !validPrices(skin.priceDiamond),
    )
  ) {
    throw new Error("Dataset skin memiliki data yang tidak valid");
  }

  console.log("Mengosongkan tabel...");
  await prisma.$executeRawUnsafe(
    `TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`
  );

  // Insert heroes in source order so IDs match each skin's heroId.
  console.log("Memasukkan data Hero...");
  await prisma.hero.createMany({
    data: rawHeroes.map((h) => ({
      name: h.name,
      role: h.primaryRole,
      lane: h.primaryLane,
      releaseYear: h.releaseYear,
      priceBP: h.priceBP ?? null,
      priceDiamond: h.priceDiamond ?? null,
    })),
  });

  // Insert skins in source order.
  console.log("Memasukkan data Skin...");
  await prisma.skin.createMany({
    data: rawSkins.map((s) => ({
      name: s.name,
      heroId: s.heroId,
      rarity: s.rarity,
      priceDiamond: s.priceDiamond ?? null,
    })),
  });

  // 5. Masukkan 3 Player awal
  console.log("Memasukkan data Player...");
  await prisma.player.createMany({
    data: [
      { nickname: "ArekITS", bp: 1500, diamond: 75 },
      { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
      { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
    ],
  });

  // 6. Masukkan 4 data PlayerHero awal
  console.log("Memasukkan data PlayerHero...");
  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: Currency.BP, pricePaid: 2000 },      // Layla
      { playerId: 1, heroId: 1, currency: Currency.BP, pricePaid: 10800 },      // Miya
      { playerId: 2, heroId: 84, currency: Currency.DIAMOND, pricePaid: 599 },  // Ling
      { playerId: 2, heroId: 56, currency: Currency.BP, pricePaid: 32000 },     // Gusion
    ],
  });

  console.log("Seed selesai: 133 hero, 892 skin, 3 player, dan 4 playerHero berhasil dibuat!");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
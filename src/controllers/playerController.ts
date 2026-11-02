import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { Currency } from "../generated/prisma/client";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const INT_MAX = 2_147_483_647;

const MATCH_REWARD = { WIN: 300, LOSE: 100 } as const;
type MatchResult = keyof typeof MATCH_REWARD;

const getBody = (req: Request): Record<string, unknown> =>
  req.body !== null && typeof req.body === "object" && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : {};

const parseNickname = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "nickname wajib diisi");
  }
  return value.trim();
};

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

export const createPlayer = async (req: Request, res: Response): Promise<void> => {
  const nickname = parseNickname(getBody(req).nickname);

  const existing = await prisma.player.findUnique({ where: { nickname } });
  if (existing) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai`);
  }

  const player = await prisma.player.create({ data: { nickname } });

  sendSuccess(res, 201, "Player berhasil dibuat", player);
};

export const getPlayer = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      heroes: {
        orderBy: { id: "asc" },
        include: { hero: { select: { name: true } } },
      },
    },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil data player", {
    id: player.id,
    nickname: player.nickname,
    bp: player.bp,
    diamond: player.diamond,
    createdAt: player.createdAt,
    heroes: player.heroes.map((item) => ({
      heroId: item.heroId,
      name: item.hero.name,
      currency: item.currency,
      pricePaid: item.pricePaid,
    })),
  });
};

export const updatePlayer = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const nickname = parseNickname(getBody(req).nickname);

  const owner = await prisma.player.findUnique({ where: { nickname } });
  if (owner && owner.id !== playerId) {
    throw new HttpError(409, `Nickname ${nickname} sudah dipakai player lain`);
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { nickname },
  });

  sendSuccess(res, 200, "Nickname berhasil diubah", updated);
};

export const deletePlayer = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const deleted = await prisma.player.delete({ where: { id: playerId } });

  sendSuccess(res, 200, "Player berhasil dihapus", {
    id: deleted.id,
    nickname: deleted.nickname,
  });
};

export const topUp = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");

  const { amount: rawAmount } = getBody(req);
  if (typeof rawAmount !== "number" || !Number.isInteger(rawAmount) || rawAmount <= 0) {
    throw new HttpError(400, "amount harus berupa bilangan bulat lebih dari 0");
  }
  const amount = rawAmount;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { diamond: true },
  });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  if (player.diamond + amount > INT_MAX) {
    throw new HttpError(400, "amount terlalu besar, saldo Diamond melebihi batas");
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { diamond: { increment: amount } },
    select: { diamond: true },
  });

  sendSuccess(res, 200, "Top up berhasil", {
    playerId,
    amount,
    diamond: updated.diamond,
  });
};

export const recordMatch = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");

  const { result } = getBody(req);
  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "result harus WIN atau LOSE");
  }
  const matchResult: MatchResult = result;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const bpEarned = MATCH_REWARD[matchResult];
  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { bp: { increment: bpEarned } },
    select: { bp: true },
  });

  sendSuccess(res, 200, "Hadiah match berhasil ditambahkan", {
    playerId,
    result: matchResult,
    bpEarned,
    bp: updated.bp,
  });
};

export const buyHero = async (req: Request, res: Response): Promise<void> => {
  const playerId = parseId(req.params.player_id, "Player ID");
  const body = getBody(req);

  const heroId = toPositiveInt(body.heroId);
  if (heroId === null) {
    throw new HttpError(400, "heroId wajib diisi dengan bilangan bulat positif");
  }
  const currency = body.currency;
  if (currency !== Currency.BP && currency !== Currency.DIAMOND) {
    throw new HttpError(400, "currency harus BP atau DIAMOND");
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const hero = await prisma.hero.findUnique({ where: { id: heroId } });
  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  const price = currency === Currency.BP ? hero.priceBP : hero.priceDiamond;
  if (price === null) {
    throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
  }

  const alreadyOwned = await prisma.playerHero.findUnique({
    where: { playerId_heroId: { playerId, heroId } },
  });
  if (alreadyOwned) {
    throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
  }

  const balance = currency === Currency.BP ? player.bp : player.diamond;
  if (balance < price) {
    throw new HttpError(
      400,
      `Saldo ${currency} tidak cukup (butuh ${price}, saldo ${balance})`,
    );
  }

  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data:
        currency === Currency.BP
          ? { bp: { decrement: price } }
          : { diamond: { decrement: price } },
      select: { bp: true, diamond: true },
    }),
    prisma.playerHero.create({
      data: { playerId, heroId, currency, pricePaid: price },
    }),
  ]);

  sendSuccess(res, 201, "Hero berhasil dibeli", {
    hero: { id: hero.id, name: hero.name },
    currency,
    pricePaid: price,
    balance: { bp: updatedPlayer.bp, diamond: updatedPlayer.diamond },
  });
};
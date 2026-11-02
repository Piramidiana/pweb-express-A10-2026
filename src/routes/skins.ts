import { Router } from "express";
import prisma from "../config/prisma";
import { Prisma, Rarity } from "../generated/prisma/client";
import { HttpError } from "../utils/http-error";
import { parseId, parsePagination } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const skinRouter = Router();

// GET /api/skins
skinRouter.get("/", async (req, res) => {
  const { currentPage, limit, skip } = parsePagination(
    req.query.page,
    req.query.limit,
  );

  const heroIdParam = req.query.heroId;
  const rarityParam = typeof req.query.rarity === "string" ? req.query.rarity.toUpperCase() : undefined;

  const where: Prisma.SkinWhereInput = {};

  if (heroIdParam !== undefined && heroIdParam !== "") {
    where.heroId = parseId(heroIdParam, "Hero ID");
  }

  if (rarityParam) {
    if (!Object.values(Rarity).includes(rarityParam as Rarity)) {
      throw new HttpError(400, "Rarity tidak valid");
    }
    where.rarity = rarityParam as Rarity;
  }

  const [data, totalItems] = await Promise.all([
    prisma.skin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        hero: {
          select: { name: true },
        },
      },
    }),
    prisma.skin.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  sendSuccess(res, 200, "Berhasil mengambil data skin", data, {
    currentPage,
    limit,
    totalItems,
    totalPages,
  });
});

// GET /api/skins/:skin_id
skinRouter.get("/:skin_id", async (req, res) => {
  const skinId = parseId(req.params.skin_id, "Skin ID");

  const skin = await prisma.skin.findUnique({
    where: { id: skinId },
    include: { hero: true },
  });

  if (!skin) {
    throw new HttpError(404, "Skin tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil detail skin", skin);
});

export default skinRouter;
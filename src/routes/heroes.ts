import { Router } from "express";
import prisma from "../config/prisma";
import { Lane, Prisma, Role } from "../generated/prisma/client";
import { HttpError } from "../utils/http-error";
import { parseId, parsePagination } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const heroRouter = Router();

// GET /api/heroes
heroRouter.get("/", async (req, res) => {
  const { currentPage, limit, skip } = parsePagination(
    req.query.page,
    req.query.limit,
  );

  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const roleParam = typeof req.query.role === "string" ? req.query.role.toUpperCase() : undefined;

  const where: Prisma.HeroWhereInput = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (roleParam) {
    if (!Object.values(Role).includes(roleParam as Role)) {
      throw new HttpError(400, "Role tidak valid");
    }
    where.role = roleParam as Role;
  }

  const [data, totalItems] = await Promise.all([
    prisma.hero.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
    }),
    prisma.hero.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  sendSuccess(res, 200, "Berhasil mengambil data hero", data, {
    currentPage,
    limit,
    totalItems,
    totalPages,
  });
});

// GET /api/heroes/:hero_id
heroRouter.get("/:hero_id", async (req, res) => {
  const heroId = parseId(req.params.hero_id, "Hero ID");

  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
    include: { skins: true },
  });

  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil detail hero", hero);
});

// POST /api/heroes
heroRouter.post("/", async (req, res) => {
  const body: Record<string, unknown> =
    req.body !== null &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
      ? req.body
      : {};
  const { name, role, lane, releaseYear, priceBP, priceDiamond } = body;

  // 1. Periksa kelengkapan field wajib -> 400
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof role !== "string" ||
    !role ||
    typeof lane !== "string" ||
    !lane ||
    releaseYear === undefined ||
    releaseYear === null ||
    releaseYear === ""
  ) {
    throw new HttpError(400, "Field name, role, lane, dan releaseYear wajib diisi");
  }

  if (!Object.values(Role).includes(role as Role)) {
    throw new HttpError(400, "Role tidak valid");
  }

  if (!Object.values(Lane).includes(lane as Lane)) {
    throw new HttpError(400, "Lane tidak valid");
  }

  const parsedYear = Number(releaseYear);
  if (!Number.isInteger(parsedYear)) {
    throw new HttpError(400, "releaseYear harus berupa bilangan bulat");
  }

  const parsePrice = (value: unknown, label: string): number | null => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new HttpError(400, `${label} harus berupa bilangan bulat nonnegatif`);
    }

    return value;
  };
  const parsedPriceBP = parsePrice(priceBP, "priceBP");
  const parsedPriceDiamond = parsePrice(priceDiamond, "priceDiamond");

  // 2. Periksa apakah nama hero sudah ada -> 409
  const existingHero = await prisma.hero.findUnique({
    where: { name: name.trim() },
  });

  if (existingHero) {
    throw new HttpError(409, `Hero ${name.trim()} sudah ada`);
  }

  // 3. Simpan hero baru -> 201
  const newHero = await prisma.hero.create({
    data: {
      name: name.trim(),
      role: role as Role,
      lane: lane as Lane,
      releaseYear: parsedYear,
      priceBP: parsedPriceBP,
      priceDiamond: parsedPriceDiamond,
    },
  });

  sendSuccess(res, 201, "Hero berhasil ditambahkan", newHero);
});

export default heroRouter;
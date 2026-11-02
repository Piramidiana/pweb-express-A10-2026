import { Router } from "express";
import prisma from "../config/prisma";
import { sendSuccess } from "../utils/response";

const statisticsRouter = Router();

// GET /api/statistics
statisticsRouter.get("/", async (_req, res) => {
  const [totalPlayers, totalHeroesOwned, diamondAgg, topOwnedGroup, roleGroup] =
    await Promise.all([
      prisma.player.count(),
      prisma.playerHero.count(),
      prisma.player.aggregate({
        _sum: { diamond: true },
      }),
      prisma.playerHero.groupBy({
        by: ["heroId"],
        _count: { heroId: true },
        orderBy: [
          { _count: { heroId: "desc" } },
          { heroId: "asc" },
        ],
        take: 1,
      }),
      prisma.hero.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
    ]);

  let mostOwnedHero = null;
  if (topOwnedGroup.length > 0) {
    const topItem = topOwnedGroup[0];
    const hero = await prisma.hero.findUnique({
      where: { id: topItem.heroId },
      select: { name: true },
    });

    if (!hero) {
      throw new Error(
        `Hero ${topItem.heroId} referenced by PlayerHero was not found`,
      );
    }

    mostOwnedHero = {
      heroId: topItem.heroId,
      name: hero.name,
      owners: topItem._count.heroId,
    };
  }

  // Format heroesPerRole menjadi { role, total } dan urutkan dari total terbesar
  const heroesPerRole = roleGroup
    .map((item) => ({
      role: item.role,
      total: item._count._all,
    }))
    .sort((a, b) => b.total - a.total || a.role.localeCompare(b.role));

  sendSuccess(res, 200, "Berhasil mengambil statistik", {
    totalPlayers,
    totalHeroesOwned,
    totalDiamond: diamondAgg._sum.diamond ?? 0,
    mostOwnedHero,
    heroesPerRole,
  });
});

export default statisticsRouter;
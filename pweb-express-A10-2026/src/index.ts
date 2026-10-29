import "dotenv/config";
import express from "express";
import prisma from "./config/prisma";
import { errorHandler, notFound } from "./middlewares/error";
import { logger } from "./middlewares/logger";
import router from "./routes";

const app = express();

app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    status: true,
    message: "MLBB Shop API",
    data: {
      health: "/health",
      heroes: "/api/heroes",
      skins: "/api/skins",
      players: "/api/players",
      statistics: "/api/statistics",
    },
  });
});

app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: true, message: "Server dan database OK" });
});

app.use("/api", router);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  console.log("Database disconnected");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

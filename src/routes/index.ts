import { Router } from "express";
import heroRouter from "./heroes";
import skinRouter from "./skins";
import statisticsRouter from "./statistics";
// (biarkan import route players milik temanmu tetap ada)

const router = Router();

router.use("/heroes", heroRouter);
router.use("/skins", skinRouter);
router.use("/statistics", statisticsRouter);

export default router;
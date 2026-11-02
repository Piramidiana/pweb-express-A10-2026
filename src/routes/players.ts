import { Router } from "express";
import {
  buyHero,
  createPlayer,
  deletePlayer,
  getPlayer,
  recordMatch,
  topUp,
  updatePlayer,
} from "../controllers/playerController";

const playerRouter = Router();

playerRouter.post("/", createPlayer); 
playerRouter.get("/:player_id", getPlayer); 
playerRouter.patch("/:player_id", updatePlayer);  
playerRouter.delete("/:player_id", deletePlayer); 
 
playerRouter.post("/:player_id/topup", topUp); 
playerRouter.post("/:player_id/matches", recordMatch);

playerRouter.post("/:player_id/heroes", buyHero);
export default playerRouter;
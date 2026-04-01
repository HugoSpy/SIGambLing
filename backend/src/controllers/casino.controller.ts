import type { RequestHandler } from "express";
import { rouletteService } from "../services/roulette.service";

export const spinRouletteController: RequestHandler = async (request, response, next) => {
  try {
    const authUser = (request as { auth?: { id?: string } }).auth;

    if (!authUser?.id) {
      throw new Error("Missing authenticated user");
    }

    const result = await rouletteService.spin(authUser.id, request.body.bets);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

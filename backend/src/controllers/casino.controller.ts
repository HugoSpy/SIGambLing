import type { RequestHandler } from "express";
import { blackjackService } from "../services/blackjack.service";
import { rouletteService } from "../services/roulette.service";

function getAuthUserId(request: unknown): string {
  const authUser = (request as { auth?: { id?: string } }).auth;
  if (!authUser?.id) throw new Error("Missing authenticated user");
  return authUser.id;
}

export const spinRouletteController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await rouletteService.spin(userId, request.body.bets);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackDealController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.deal(userId, request.body.bet);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackHitController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.hit(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackStandController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.stand(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackDoubleController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.double(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackCurrentController: RequestHandler = (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = blackjackService.getCurrentGame(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackInsuranceController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.insure(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

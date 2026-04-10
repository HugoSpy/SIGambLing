import type { RequestHandler } from "express";
import { blackjackService } from "../services/blackjack.service";
import { hiloService } from "../services/hilo.service";
import { minesService } from "../services/mines.service";
import { ridethebusService } from "../services/ride-the-bus.service";
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

export const blackjackDeclineInsuranceController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.declineInsurance(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const blackjackSplitController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await blackjackService.splitHand(userId, request.body.game_id);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const hiloStartController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await hiloService.startSession(userId, request.body.betAmount);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const hiloPredictController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await hiloService.predict(userId, request.body.prediction);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const hiloSkipController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = hiloService.skip(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const hiloCashOutController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await hiloService.cashOut(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const hiloCurrentController: RequestHandler = (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = hiloService.getCurrent(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const ridethebusStartController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await ridethebusService.start(userId, request.body.betAmount);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const ridethebusAnswerController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await ridethebusService.answer(userId, request.body.step, request.body.answer);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const ridethebusCurrentController: RequestHandler = (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = ridethebusService.getCurrent(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const minesStartController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await minesService.start(userId, request.body.betAmount, request.body.minesCount);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const minesRevealController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await minesService.reveal(userId, request.body.cellIndex);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const minesCashoutController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = await minesService.cashout(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const minesCurrentController: RequestHandler = (request, response, next) => {
  try {
    const userId = getAuthUserId(request);
    const result = minesService.getCurrent(userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

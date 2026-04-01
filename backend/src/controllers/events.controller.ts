import type { RequestHandler } from "express";
import { adminEventsQuerySchema } from "../schemas/events.schemas";
import { eventService } from "../services/event.service";
import { AppError } from "../utils/app-error";

function getAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authUser = (request as { auth?: { id?: string } }).auth;

  if (!authUser?.id) {
    throw new AppError("Utilisateur non authentifie.", 401);
  }

  return authUser.id;
}

function getRouteParam(request: Parameters<RequestHandler>[0], key: string): string {
  const value = request.params[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new AppError("Parametre manquant.", 400);
  }

  return value;
}

export const listEventsController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const events = await eventService.listOpenEvents(userId);
    response.json({ events });
  } catch (error) {
    next(error);
  }
};

export const getEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.getEventById(userId, eventId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const placeEventBetController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const outcome = await eventService.placeBet(userId, eventId, request.body);
    response.status(201).json(outcome);
  } catch (error) {
    next(error);
  }
};

export const getMyEventBetController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const bet = await eventService.getMyBet(userId, eventId);
    response.json({ bet });
  } catch (error) {
    next(error);
  }
};

export const listAdminEventsController: RequestHandler = async (request, response, next) => {
  try {
    const parsedQuery = adminEventsQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      next(parsedQuery.error);
      return;
    }

    const events = await eventService.listAdminEvents(parsedQuery.data.status);
    response.json({ events });
  } catch (error) {
    next(error);
  }
};

export const createEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const event = await eventService.createEvent(userId, request.body);
    response.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

export const updateEventController: RequestHandler = async (request, response, next) => {
  try {
    const eventId = getRouteParam(request, "id");
    const event = await eventService.updateEvent(eventId, request.body);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const closeEventController: RequestHandler = async (request, response, next) => {
  try {
    const eventId = getRouteParam(request, "id");
    const event = await eventService.closeEvent(eventId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const resolveEventController: RequestHandler = async (request, response, next) => {
  try {
    const eventId = getRouteParam(request, "id");
    const event = await eventService.resolveEvent(eventId, request.body.resolved_option);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const cancelEventController: RequestHandler = async (request, response, next) => {
  try {
    const eventId = getRouteParam(request, "id");
    const event = await eventService.cancelEvent(eventId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

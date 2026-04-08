import type { RequestHandler } from "express";
import {
  adminEventsQuerySchema,
  adminProposalsQuerySchema,
} from "../schemas/events.schemas";
import { eventService } from "../services/event.service";
import { AppError } from "../utils/app-error";

type UploadedFile = { buffer: Buffer; mimetype: string; size: number };

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

export const getEventOddsHistoryController: RequestHandler = async (request, response, next) => {
  try {
    const eventId = getRouteParam(request, "id");
    const history = await eventService.getEventOddsHistory(eventId);
    response.json(history);
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

export const placeParlayBetController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const outcome = await eventService.placeParlayBet(userId, request.body);
    response.status(201).json(outcome);
  } catch (error) {
    next(error);
  }
};

export const placeSimpleBetsController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const outcome = await eventService.placeSimpleBets(userId, request.body);
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
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.updateEvent(userId, eventId, request.body);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const uploadEventImageController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const requestWithFile = request as typeof request & { file?: UploadedFile };
    const event = await eventService.uploadEventImage(userId, eventId, requestWithFile.file);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const closeEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.closeEvent(userId, eventId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const resolveEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.resolveEvent(userId, eventId, request.body.resolved_option);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const cancelEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.cancelEvent(userId, eventId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const rewindEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.rewindEvent(eventId, userId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const reopenEventController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const eventId = getRouteParam(request, "id");
    const event = await eventService.reopenEvent(eventId, userId);
    response.json(event);
  } catch (error) {
    next(error);
  }
};

export const createProposalController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const proposal = await eventService.createProposal(userId, request.body);
    response.status(201).json(proposal);
  } catch (error) {
    next(error);
  }
};

export const listMyProposalsController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const proposals = await eventService.listUserProposals(userId);
    response.json({ proposals });
  } catch (error) {
    next(error);
  }
};

export const listAdminProposalsController: RequestHandler = async (request, response, next) => {
  try {
    const parsedQuery = adminProposalsQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      next(parsedQuery.error);
      return;
    }

    const proposals = await eventService.listAdminProposals(parsedQuery.data.status);
    response.json({ proposals });
  } catch (error) {
    next(error);
  }
};

export const approveProposalController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const proposalId = getRouteParam(request, "proposalId");
    const proposal = await eventService.approveProposal(userId, proposalId);
    response.json(proposal);
  } catch (error) {
    next(error);
  }
};

export const rejectProposalController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const proposalId = getRouteParam(request, "proposalId");
    const proposal = await eventService.rejectProposal(userId, proposalId, request.body);
    response.json(proposal);
  } catch (error) {
    next(error);
  }
};

export const toggleSaveProposalController: RequestHandler = async (request, response, next) => {
  try {
    const proposalId = getRouteParam(request, "proposalId");
    const proposal = await eventService.toggleSaveProposal(proposalId);
    response.json(proposal);
  } catch (error) {
    next(error);
  }
};

export const listSavedProposalsController: RequestHandler = async (request, response, next) => {
  try {
    const proposals = await eventService.listSavedProposals();
    response.json({ proposals });
  } catch (error) {
    next(error);
  }
};

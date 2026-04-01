import type { ErrorRequestHandler } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  logger.error(error.message, { stack: error.stack });

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation error",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    response.status(401).json({
      message: "Token invalide ou expiré.",
    });
    return;
  }

  response.status(500).json({
    message: "Erreur interne du serveur.",
  });
};

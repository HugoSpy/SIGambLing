import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import { env } from "./config/env";
import { configurePassport } from "./config/passport";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";
import { authRouter } from "./routes/auth.routes";
import { casinoRouter } from "./routes/casino.routes";
import { adminEventsRouter, eventsRouter } from "./routes/events.routes";
import { healthRouter } from "./routes/health.routes";
import { userRouter } from "./routes/user.routes";

configurePassport();

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      optionsSuccessStatus: 200,
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());
  app.use(requestLogger);

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/casino", casinoRouter);
  app.use("/events", eventsRouter);
  app.use("/admin/events", adminEventsRouter);
  app.use("/users", userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

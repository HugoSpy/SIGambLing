import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import { env } from "./config/env";
import { configurePassport } from "./config/passport";
import { getCorsAllowedOrigins, isCorsOriginAllowed } from "./config/security";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";
import { authRouter } from "./routes/auth.routes";
import { casinoRouter } from "./routes/casino.routes";
import { adminEventsRouter, eventsRouter } from "./routes/events.routes";
import { gamificationRouter } from "./routes/gamification.routes";
import { healthRouter } from "./routes/health.routes";
import { adminStatisticsRouter, publicStatsRouter } from "./routes/admin.routes";
import { chatRouter } from "./routes/chat.routes";
import { userRouter } from "./routes/user.routes";

configurePassport();

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const allowedOrigins = getCorsAllowedOrigins(env.FRONTEND_URL, env.CORS_ALLOWED_ORIGINS);
  
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isCorsOriginAllowed(origin, allowedOrigins));
      },
      credentials: true,
      optionsSuccessStatus: 200,
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());
  app.use(requestLogger);

  // Serve avatar files from local storage
  app.use("/avatars", (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  }, express.static(env.AVATAR_STORAGE_DIR, {
    maxAge: "1h",
    immutable: false,
  }));

  app.use("/health", healthRouter);
  app.use("/stats", publicStatsRouter);
  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);
  app.use("/casino", casinoRouter);
  app.use("/events", eventsRouter);
  app.use("/admin/events", adminEventsRouter);
  app.use("/admin/statistics", adminStatisticsRouter);
  app.use("/rewards", gamificationRouter);
  app.use("/users", userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createStore } from "./store.js";

dotenv.config();

const app = express();
const store = createStore();
const port = Number(process.env.PORT || 8787);
const corsOrigin = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((entry) => entry.trim());

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "SIGambling API", date: new Date().toISOString() });
});

app.post("/api/auth/login", (request, response, next) => {
  try {
    response.json({ user: store.authenticate(request.body) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", (request, response, next) => {
  try {
    response.status(201).json({ user: store.register(request.body) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:userId/profile", (request, response, next) => {
  try {
    response.json({ user: store.getProfile(request.params.userId) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/rewards/daily", (request, response, next) => {
  try {
    response.json(store.claimDailyReward(request.body.userId));
  } catch (error) {
    next(error);
  }
});

app.get("/api/events", (request, response, next) => {
  try {
    response.json({ events: store.getEvents({ status: request.query.status || "active", category: request.query.category || "all" }) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/events", (request, response, next) => {
  try {
    response.status(201).json(store.createEvent(request.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/events/:eventId/resolve", (request, response, next) => {
  try {
    response.json(store.resolveEvent(request.params.eventId, request.body.winningOutcome));
  } catch (error) {
    next(error);
  }
});

app.post("/api/bets", (request, response, next) => {
  try {
    response.status(201).json(store.placeBet(request.body));
  } catch (error) {
    next(error);
  }
});

app.get("/api/leaderboard", (_request, response, next) => {
  try {
    response.json({ users: store.getLeaderboard() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/game", (request, response, next) => {
  try {
    response.json(store.playGame(request.body));
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.status || 500).json({ error: error.message || "Erreur interne du serveur." });
});

app.listen(port, () => {
  console.log(`SIGambling API ready on http://localhost:${port}`);
});

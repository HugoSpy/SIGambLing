const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue.");
  }

  return data;
}

export const api = {
  getEvents(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return request(`/events${query ? `?${query}` : ""}`);
  },
  createEvent(payload) {
    return request("/events", { method: "POST", body: JSON.stringify(payload) });
  },
  resolveEvent(payload) {
    return request(`/events/${payload.eventId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ winningOutcome: payload.winningOutcome }),
    });
  },
  placeBet(payload) {
    return request("/bets", { method: "POST", body: JSON.stringify(payload) });
  },
  getLeaderboard() {
    return request("/leaderboard");
  },
  login(payload) {
    return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  register(payload) {
    return request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  },
  claimDailyReward(userId) {
    return request("/rewards/daily", { method: "POST", body: JSON.stringify({ userId }) });
  },
  getProfile(userId) {
    return request(`/users/${userId}/profile`);
  },
  playGame(payload) {
    return request("/game", { method: "POST", body: JSON.stringify(payload) });
  },
};

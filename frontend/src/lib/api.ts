import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";
import type {
  AdminBadgeCatalogItem,
  AdminEventView,
  AdminUserLookup,
  CreateProposalPayload,
  CreateEventPayload,
  EventBetView,
  EventOddsHistoryView,
  OddsConflictDetails,
  EventProposalView,
  EventStatus,
  EventView,
  ProposalStatus,
  UpdateEventPayload,
} from "../types/event";
import type {
  ClaimDailyRewardResponse,
  GamificationState,
  JackpotState,
  LeaderboardView,
} from "../types/gamification";
import type {
  AuthUser,
  MicrosoftRedirectResponse,
  RefreshSessionResponse,
} from "../types/auth";

export interface PublicStats {
  totalUsers: number;
  totalBets: number;
  totalTokens: number;
  eventVolume: number;
  casinoVolume: number;
}

export interface StatisticsOverview {
  totalBets: { value: number; percentageChange: number; trend: "up" | "down" };
  activeUsers: { total: number; online: number };
  totalVolume: { value: number; formatted: string };
}

export interface LeaderboardEvent {
  rank: number;
  eventId: string;
  title: string;
  totalVolume: number;
  betCount: number;
}

export interface ApiErrorDetails {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

export class ApiError<TDetails = ApiErrorDetails> extends Error {
  readonly status?: number;
  readonly details?: TDetails;

  constructor(message: string, options?: { status?: number; details?: TDetails }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

export function isOddsConflictError(error: unknown): error is ApiError<OddsConflictDetails> {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.details === "object" &&
    error.details !== null &&
    "code" in error.details &&
    error.details.code === "ODDS_CHANGED"
  );
}

const baseURL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

function toApiError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Une erreur inconnue est survenue.");
}

async function performRefresh() {
  const response = await refreshClient.post<RefreshSessionResponse>("/auth/refresh");
  const token = response.data.access_token;

  if (!token) {
    throw new Error("Aucun access token renvoyé par le serveur.");
  }

  useAuthStore.getState().setAccessToken(token);

  return token;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function fetchCurrentUser() {
  const response = await api.get<AuthUser>("/users/me");
  return response.data;
}

export async function getMaintenanceStatus(): Promise<{ maintenanceMode: boolean }> {
  const response = await axios.get<{ maintenanceMode: boolean }>(
    `${baseURL}/config/maintenance`,
    { withCredentials: false },
  );
  return response.data;
}

export async function setMaintenanceMode(enabled: boolean): Promise<{ maintenanceMode: boolean }> {
  const response = await api.post<{ maintenanceMode: boolean }>(
    "/admin/config/maintenance",
    { enabled },
  );
  return response.data;
}

export async function fetchGamificationState() {
  const response = await api.get<GamificationState>("/rewards/me");
  return response.data;
}

export async function claimDailyReward() {
  const response = await api.post<ClaimDailyRewardResponse>("/rewards/daily");
  return response.data;
}

export async function fetchJackpotState() {
  const response = await api.get<JackpotState>("/rewards/jackpot");
  return response.data;
}

export async function claimBadgeReward(badgeType: string): Promise<{ reward: number; newBalance: number }> {
  const response = await api.post<{ reward: number; newBalance: number }>(
    `/rewards/badges/${encodeURIComponent(badgeType)}/claim`,
  );
  return response.data;
}

export async function fetchLeaderboard(scope: "global" | "casino", limit: number) {
  const response = await api.get<LeaderboardView>("/rewards/leaderboard", {
    params: { scope, limit },
  });
  return response.data;
}

export async function triggerAdminJackpotPayout(winnerUserId: string) {
  const response = await api.post<JackpotState["last_result"]>("/rewards/jackpot/payout", {
    winner_user_id: winnerUserId,
  });
  return response.data;
}

export async function updateCurrentUserProfile(payload: {
  pseudo?: string;
  accept_odds_changes?: boolean;
  theme_preference?: "dark" | "light";
}) {
  const response = await api.patch<AuthUser>("/users/me", payload);
  return response.data;
}

export async function resetChatPreferences() {
  await api.delete("/users/me/chat-preferences");
}

export async function uploadCurrentUserAvatar(formData: FormData) {
  const response = await api.post<AuthUser>("/users/me/avatar", formData);
  return response.data;
}

export async function fetchEvents() {
  const response = await api.get<{ events: EventView[] }>("/events");
  return response.data.events;
}

export async function fetchEventById(eventId: string) {
  const response = await api.get<EventView>(`/events/${eventId}`);
  return response.data;
}

export async function fetchMyEventBet(eventId: string) {
  const response = await api.get<{ bet: EventBetView | null }>(`/events/${eventId}/my-bet`);
  return response.data.bet;
}

export async function fetchEventOddsHistory(eventId: string) {
  const response = await api.get<EventOddsHistoryView>(`/events/${eventId}/odds-history`);
  return response.data;
}

export async function placeEventBet(
  eventId: string,
  payload: {
    chosen_option: string;
    amount: number;
    expected_odds?: number;
    accept_any_odds_change?: boolean;
    persist_accept_odds_changes?: boolean;
  },
) {
  const response = await api.post<{ bet: EventBetView; new_balance: number }>(
    `/events/${eventId}/bet`,
    payload,
  );
  return response.data;
}

export async function placeSimpleBets(
  payload: {
    bets: Array<{ eventId: string; chosenOption: string; amount: number; expectedOdds?: number }>;
    accept_any_odds_change?: boolean;
    persist_accept_odds_changes?: boolean;
  },
) {
  const response = await api.post<{ bets: EventBetView[]; new_balance: number }>(
    "/events/bets",
    payload,
  );
  return response.data;
}

export async function placeParlayBet(payload: {
  legs: Array<{ eventId: string; chosenOption: string; expectedOdds?: number }>;
  stake: number;
  accept_any_odds_change?: boolean;
  persist_accept_odds_changes?: boolean;
}) {
  const response = await api.post<{ bet: EventBetView; new_balance: number }>(
    "/events/parlay",
    payload,
  );
  return response.data;
}

export async function fetchMyEventBets() {
  const response = await api.get<{ bets: EventBetView[] }>("/users/me/bets");
  return response.data.bets;
}

export async function searchUsers(query: string) {
  const response = await api.get<{ users: AdminUserLookup[] }>("/users", {
    params: { search: query },
  });
  return response.data.users;
}

export async function fetchAdminBadgeCatalog() {
  const response = await api.get<{ badges: AdminBadgeCatalogItem[] }>("/users/badges/catalog");
  return response.data.badges;
}

export async function adjustAdminUserBalance(
  userId: string,
  payload: { amount: number; reason: string },
) {
  const response = await api.patch<{ user: AdminUserLookup }>(`/users/${userId}/balance`, payload);
  return response.data.user;
}

export async function unlockAdminUserBadge(userId: string, badgeKey: string) {
  const response = await api.post<{ user: AdminUserLookup; already_unlocked: boolean }>(
    `/users/${userId}/badges`,
    { badge_key: badgeKey },
  );
  return response.data;
}

export async function updateAdminUserReward(userId: string, action: "reset" | "mark_claimed") {
  const response = await api.patch<{ user: AdminUserLookup }>(`/users/${userId}/reward`, { action });
  return response.data.user;
}

export async function fetchAdminEvents(status?: EventStatus) {
  const response = await api.get<{ events: AdminEventView[] }>("/admin/events", {
    params: status ? { status } : undefined,
  });
  return response.data.events;
}

export async function createAdminEvent(payload: CreateEventPayload) {
  const response = await api.post<AdminEventView>("/admin/events", payload);
  return response.data;
}

export async function updateAdminEvent(eventId: string, payload: UpdateEventPayload) {
  const response = await api.patch<AdminEventView>(`/admin/events/${eventId}`, payload);
  return response.data;
}

export async function uploadAdminEventImage(eventId: string, formData: FormData) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/image`, formData);
  return response.data;
}

export async function closeAdminEvent(eventId: string) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/close`);
  return response.data;
}

export async function resolveAdminEvent(eventId: string, resolvedOption: string) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/resolve`, {
    resolved_option: resolvedOption,
  });
  return response.data;
}

export async function cancelAdminEvent(eventId: string) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/cancel`);
  return response.data;
}

export async function rewindAdminEvent(eventId: string) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/rewind`);
  return response.data;
}

export async function reopenAdminEvent(eventId: string) {
  const response = await api.post<AdminEventView>(`/admin/events/${eventId}/reopen`);
  return response.data;
}

export async function createProposal(payload: CreateProposalPayload) {
  const response = await api.post<EventProposalView>("/events/proposals", payload);
  return response.data;
}

export async function fetchMyProposals() {
  const response = await api.get<{ proposals: EventProposalView[] }>("/events/proposals/me");
  return response.data.proposals;
}

export async function fetchAdminProposals(status?: ProposalStatus) {
  const response = await api.get<{ proposals: EventProposalView[] }>("/admin/events/proposals", {
    params: status ? { status } : undefined,
  });
  return response.data.proposals;
}

export async function approveAdminProposal(proposalId: string) {
  const response = await api.post<EventProposalView>(
    `/admin/events/proposals/${proposalId}/approve`,
  );
  return response.data;
}

export async function rejectAdminProposal(proposalId: string, reason: string) {
  const response = await api.post<EventProposalView>(
    `/admin/events/proposals/${proposalId}/reject`,
    { reason },
  );
  return response.data;
}

export async function toggleSaveAdminProposal(proposalId: string) {
  const response = await api.patch<EventProposalView>(
    `/admin/events/proposals/${proposalId}/save`,
  );
  return response.data;
}

export async function fetchSavedAdminProposals() {
  const response = await api.get<{ proposals: EventProposalView[] }>(
    "/admin/events/proposals/saved",
  );
  return response.data.proposals;
}

export async function fetchAdminStatisticsOverview(): Promise<StatisticsOverview> {
  const response = await api.get<StatisticsOverview>("/admin/statistics/overview");
  return response.data;
}

export async function fetchPublicStats(): Promise<PublicStats> {
  const baseURL = import.meta.env.VITE_API_URL;
  const response = await axios.get<PublicStats>(`${baseURL}/stats`);
  return response.data;
}


export async function requestMicrosoftRedirect() {
  const response = await api.post<MicrosoftRedirectResponse>("/auth/microsoft");
  return response.data.redirect_url;
}

export async function logoutRequest() {
  try {
    await refreshClient.post("/auth/logout");
  } finally {
    useAuthStore.getState().clearSession();
  }
}

export interface StatisticsOverview {
  totalBets: {
    value: number;
    percentageChange: number;
    trend: "up" | "down";
  };
  activeUsers: {
    total: number;
    online: number;
  };
  totalVolume: {
    value: number;
    formatted: string;
  };
}

export interface LeaderboardEvent {
  rank: number;
  eventId: string;
  title: string;
  totalVolume: number;
  betCount: number;
}

export async function fetchAdminEventsLeaderboard() {
  const response = await api.get<{ leaderboard: LeaderboardEvent[] }>(
    "/admin/statistics/events/leaderboard",
  );
  return response.data.leaderboard;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url).includes("/auth/refresh");

    if (shouldRefresh && originalRequest) {
      originalRequest._retry = true;
      const token = await refreshSession();

      if (token) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }
    }

    const payload = error.response?.data;

    if (payload && typeof payload === "object" && "message" in payload) {
      return Promise.reject(
        new ApiError(String(payload.message), {
          status: error.response?.status,
          details: ("details" in payload ? payload.details : undefined) as unknown,
        }),
      );
    }

    return Promise.reject(toApiError(error));
  },
);

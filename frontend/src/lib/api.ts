import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";
import type {
  AdminEventView,
  CreateEventPayload,
  EventBetHistoryItem,
  EventBetView,
  EventSearchUser,
  EventStatus,
  EventView,
  UpdateEventPayload,
} from "../types/event";
import type { AuthTokens, AuthUser, MicrosoftRedirectResponse } from "../types/auth";

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
  const response = await refreshClient.post<AuthTokens>("/auth/refresh");
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

export async function updateCurrentUserProfile(payload: { pseudo: string }) {
  const response = await api.patch<AuthUser>("/users/me", payload);
  return response.data;
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

export async function placeEventBet(
  eventId: string,
  payload: { chosen_option: string; amount: number },
) {
  const response = await api.post<{ bet: EventBetView; new_balance: number }>(
    `/events/${eventId}/bet`,
    payload,
  );
  return response.data;
}

export async function fetchMyEventBets() {
  const response = await api.get<{ bets: EventBetHistoryItem[] }>("/users/me/bets");
  return response.data.bets;
}

export async function searchUsers(query: string) {
  const response = await api.get<{ users: EventSearchUser[] }>("/users", {
    params: { search: query },
  });
  return response.data.users;
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

    return Promise.reject(
      toApiError(
        error.response?.data && typeof error.response.data === "object" && "message" in error.response.data
          ? new Error(String(error.response.data.message))
          : error,
      ),
    );
  },
);

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";
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

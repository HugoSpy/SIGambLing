import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth-store";
import { useChatStore } from "../store/chat-store";

export interface ChatMessageData {
  id: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
  mentionedUserIds?: string[];
  user: {
    id: string;
    pseudo: string;
    avatarUrl: string | null;
  };
}

interface UseChatStreamOptions {
  onMessage: (msg: ChatMessageData) => void;
  enabled: boolean;
  /** Return true when the scroll container is near the bottom (< 80px away) */
  isNearBottom: () => boolean;
}

export function useChatStream({ onMessage, enabled, isNearBottom }: UseChatStreamOptions) {
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");

  const connect = useCallback(async () => {
    if (!enabled) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL as string;
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${baseURL}/chat/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferRef.current += decoder.decode(value, { stream: true });

        // Process complete SSE events delimited by double newline
        const parts = bufferRef.current.split("\n\n");
        bufferRef.current = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line || line.startsWith(":")) continue; // heartbeat / comment
          if (line.startsWith("data:")) {
            const json = line.slice("data:".length).trim();
            try {
              const msg = JSON.parse(json) as ChatMessageData;
              onMessage(msg);

              // Count unread when the chat is closed or user scrolled up
              const { isOpen, addUnread } = useChatStore.getState();
              const currentUserId = useAuthStore.getState().user?.id;
              if (!isOpen || !isNearBottom()) {
                const isMention =
                  currentUserId != null &&
                  (msg.mentionedUserIds?.includes(currentUserId) ?? false);
                addUnread(isMention);
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (err) {
      // AbortError is expected on cleanup
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Reconnect after 3 s on unexpected disconnect
      setTimeout(() => void connect(), 3000);
    }
  }, [enabled, onMessage, isNearBottom]);

  useEffect(() => {
    if (!enabled) return;
    void connect();
    return () => {
      abortRef.current?.abort();
      readerRef.current?.cancel().catch(() => {});
    };
  }, [connect, enabled]);
}

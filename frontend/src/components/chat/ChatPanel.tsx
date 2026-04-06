import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageSquare, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Howl } from "howler";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth-store";
import { useChatStore } from "../../store/chat-store";
import { ChatMessage } from "./ChatMessage";
import { MentionDropdown } from "./MentionDropdown";
import type { ChatMessageData } from "../../hooks/useChatStream";
import { useChatStream } from "../../hooks/useChatStream";

// ─── Constants ─────────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 3000;
const RATE_LIMIT_MAX = 3;
const MIN_WIDTH = 240;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 340;

// Ping sound — silent failure if file not found
const pingSound = new Howl({
  src: ["/sounds/ping.mp3"],
  volume: 0.3,
  preload: true,
  onloaderror: () => undefined,
});

// ─── Debounce helper ───────────────────────────────────────────────────────────
function useDebounced<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay],
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BanStatus {
  permanent: boolean;
  mutedUntil: string | null;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  initialWidth?: number | null;
}

export function ChatPanel({ open, onClose, initialWidth }: ChatPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { clearUnread, isOpen: storeIsOpen } = useChatStore();

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Resize
  const [width, setWidth] = useState(initialWidth ?? DEFAULT_WIDTH);
  const isResizingRef = useRef(false);

  // Mention
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchorPos, setMentionAnchorPos] = useState(0);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const msgTimestampsRef = useRef<number[]>([]);

  // ─── isNearBottom helper ────────────────────────────────────────────────────
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (force || isNearBottom()) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollBtn(false);
      } else {
        setShowScrollBtn(true);
      }
    },
    [isNearBottom],
  );

  // ─── Load history + ban status on open ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    clearUnread();
    Promise.all([
      api.get<ChatMessageData[]>("/chat/history"),
      api.get<BanStatus | null>("/chat/ban-status"),
    ])
      .then(([historyRes, banRes]) => {
        setMessages(historyRes.data);
        setBanStatus(banRes.data);
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView();
          setShowScrollBtn(false);
        });
      })
      .catch(() => {});
  }, [open, clearUnread]);

  // Clear unread when open + user is at bottom
  useEffect(() => {
    if (storeIsOpen && isNearBottom()) {
      clearUnread();
    }
  }, [storeIsOpen, isNearBottom, clearUnread]);

  // ─── SSE incoming messages ──────────────────────────────────────────────────
  const handleIncoming = useCallback(
    (msg: ChatMessageData) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Ping sound when chat is closed and user is mentioned
      const chatOpen = useChatStore.getState().isOpen;
      if (!chatOpen) {
        const isMention =
          currentUser != null && (msg.mentionedUserIds?.includes(currentUser.id) ?? false);
        if (isMention) pingSound.play();
      }

      scrollToBottom(false);
    },
    [currentUser, scrollToBottom],
  );

  useChatStream({ onMessage: handleIncoming, enabled: open, isNearBottom });

  // ─── Scroll handler — clear unread when reaching bottom ─────────────────────
  const handleScroll = useCallback(() => {
    if (isNearBottom()) {
      setShowScrollBtn(false);
      clearUnread();
    }
  }, [isNearBottom, clearUnread]);

  // ─── Shake animation ─────────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    const el = shakeRef.current;
    if (!el) return;
    el.animate(
      {
        transform: [
          "translateX(0)",
          "translateX(-8px)",
          "translateX(8px)",
          "translateX(-6px)",
          "translateX(6px)",
          "translateX(0)",
        ],
      },
      { duration: 400, easing: "ease-in-out" },
    );
  }, []);

  // ─── Client-side rate limit ───────────────────────────────────────────────────
  function clientRateLimitOk(): boolean {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    msgTimestampsRef.current = msgTimestampsRef.current.filter((t) => t > cutoff);
    if (msgTimestampsRef.current.length >= RATE_LIMIT_MAX) return false;
    msgTimestampsRef.current.push(now);
    return true;
  }

  // ─── Muted state ─────────────────────────────────────────────────────────────
  const mutedUntilDate = banStatus?.mutedUntil ? new Date(banStatus.mutedUntil) : null;
  const isMuted = mutedUntilDate ? mutedUntilDate > new Date() : false;
  const mutedLabel = mutedUntilDate
    ? `Muté jusqu'à ${mutedUntilDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  // ─── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setMentionQuery(null);

    if (!clientRateLimitOk()) {
      triggerShake();
      toast("Doucement ! Tu envoies trop vite 🐢", { icon: "🐢" });
      return;
    }

    setSending(true);
    try {
      await api.post("/chat/message", { content });
      setInput("");
      scrollToBottom(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string; mutedUntil?: string } };
      };
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;

      if (status === 429) {
        triggerShake();
        toast("Doucement ! Tu envoies trop vite 🐢", { icon: "🐢" });
      } else if (status === 403 && msg === "permanently_banned") {
        setBanStatus({ permanent: true, mutedUntil: null });
      } else if (status === 403 && msg === "muted") {
        setBanStatus({ permanent: false, mutedUntil: error?.response?.data?.mutedUntil ?? null });
      } else if (status === 403 && msg === "banword_detected") {
        setBanStatus({ permanent: false, mutedUntil: error?.response?.data?.mutedUntil ?? null });
        toast.error("Message inapproprié détecté. Tu es muté temporairement.");
      } else {
        toast.error("Impossible d'envoyer le message.");
      }
    } finally {
      setSending(false);
    }
  }

  // ─── Input change — mention detection ────────────────────────────────────────
  function handleInputChange(val: string) {
    setInput(val);
    const cursor = inputRef.current?.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchorPos(cursor - match[0].length);
      setMentionSelectedIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function selectMention(pseudo: string) {
    const selStart = inputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, mentionAnchorPos);
    const after = input.slice(selStart);
    setInput(`${before}@${pseudo} ${after}`);
    setMentionQuery(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // ─── Keyboard navigation ─────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((i) => i + 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // ─── Resize drag ──────────────────────────────────────────────────────────────
  const saveWidthDebounced = useDebounced((w: number) => {
    api.patch("/users/me/chat-preferences", { chatPanelWidth: w }).catch(() => {});
  }, 800);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
      saveWidthDebounced(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function startResizeTouch(e: React.TouchEvent) {
    isResizingRef.current = true;
    const startX = e.touches[0].clientX;
    const startWidth = width;

    const onTouchMove = (ev: TouchEvent) => {
      if (!isResizingRef.current) return;
      const delta = startX - ev.touches[0].clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
      saveWidthDebounced(newWidth);
    };

    const onTouchEnd = () => {
      isResizingRef.current = false;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };

    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onTouchEnd);
  }

  const inputDisabled = sending || isMuted || !!banStatus?.permanent;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ x: 0, opacity: 1 }}
          className="fixed bottom-0 right-0 z-50 flex flex-col rounded-tl-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          exit={{ x: "100%", opacity: 0 }}
          initial={{ x: "100%", opacity: 0 }}
          style={{ width, height: 500 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Resize handle — left edge */}
          <div
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize rounded-tl-2xl transition-colors hover:bg-blue-500/40"
            onMouseDown={startResize}
            onTouchStart={startResizeTouch}
            title="Redimensionner le chat"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-100">Chat</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            </div>
            <button
              aria-label="Fermer le chat"
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="relative flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <p className="mt-8 text-center text-xs text-zinc-600">
                Aucun message. Sois le premier à parler ! 👋
              </p>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser?.id}
                  currentUserPseudo={currentUser?.pseudo}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Floating "new messages" button */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                onClick={() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  setShowScrollBtn(false);
                  clearUnread();
                }}
                type="button"
              >
                <ChevronDown className="h-3 w-3" />
                Nouveaux messages
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="border-t border-zinc-700 p-3" ref={shakeRef}>
            {banStatus?.permanent ? (
              <p className="py-2 text-center text-xs text-red-400">
                Tu es banni définitivement du chat.
              </p>
            ) : isMuted ? (
              <p className="py-2 text-center text-xs text-amber-400">{mutedLabel}</p>
            ) : (
              <div className="relative flex items-center gap-2">
                {mentionQuery !== null && (
                  <MentionDropdown
                    query={mentionQuery}
                    onSelect={selectMention}
                    onClose={() => setMentionQuery(null)}
                    selectedIndex={mentionSelectedIndex}
                    onSelectedIndexChange={setMentionSelectedIndex}
                  />
                )}
                <input
                  ref={inputRef}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                  disabled={inputDisabled}
                  maxLength={300}
                  placeholder="Écris un message…"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="text"
                />
                <button
                  aria-label="Envoyer"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
                  disabled={inputDisabled || !input.trim()}
                  onClick={() => void handleSend()}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            <p
              className={`mt-1 text-right text-[9px] ${input.length > 250 ? "text-amber-400" : "text-zinc-600"}`}
            >
              {input.length}/300
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

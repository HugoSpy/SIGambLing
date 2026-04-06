import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth-store";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessageData } from "../../hooks/useChatStream";
import { useChatStream } from "../../hooks/useChatStream";

const RATE_LIMIT_WINDOW_MS = 3000;
const RATE_LIMIT_MAX = 3;

interface BanStatus {
  permanent: boolean;
  mutedUntil: string | null;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const msgTimestampsRef = useRef<number[]>([]);

  // ─── Load history + ban status on open ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get<ChatMessageData[]>("/chat/history"),
      api.get<BanStatus | null>("/chat/ban-status"),
    ])
      .then(([historyRes, banRes]) => {
        setMessages(historyRes.data);
        setBanStatus(banRes.data);
      })
      .catch(() => {});
  }, [open]);

  // ─── SSE incoming messages ────────────────────────────────────────────────
  const handleIncoming = useCallback((msg: ChatMessageData) => {
    setMessages((prev) => {
      // Deduplicate by id
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useChatStream({ onMessage: handleIncoming, enabled: open });

  // ─── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // ─── Shake animation helper ───────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    const el = shakeRef.current;
    if (!el) return;
    el.animate(
      { transform: ["translateX(0)", "translateX(-8px)", "translateX(8px)", "translateX(-6px)", "translateX(6px)", "translateX(0)"] },
      { duration: 400, easing: "ease-in-out" },
    );
  }, []);

  // ─── Client-side rate limit check ─────────────────────────────────────────
  function clientRateLimitOk(): boolean {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    msgTimestampsRef.current = msgTimestampsRef.current.filter((t) => t > cutoff);
    if (msgTimestampsRef.current.length >= RATE_LIMIT_MAX) return false;
    msgTimestampsRef.current.push(now);
    return true;
  }

  // ─── Muted badge ──────────────────────────────────────────────────────────
  const mutedUntilDate = banStatus?.mutedUntil ? new Date(banStatus.mutedUntil) : null;
  const isMuted = mutedUntilDate ? mutedUntilDate > new Date() : false;
  const mutedLabel = mutedUntilDate
    ? `Muté jusqu'à ${mutedUntilDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  // ─── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    if (!clientRateLimitOk()) {
      triggerShake();
      toast("Doucement ! Tu envoies trop vite 🐢", { icon: "🐢" });
      return;
    }

    setSending(true);
    try {
      await api.post("/chat/message", { content });
      setInput("");
      inputRef.current?.focus();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string; mutedUntil?: string } } };
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;

      if (status === 429) {
        triggerShake();
        toast("Doucement ! Tu envoies trop vite 🐢", { icon: "🐢" });
      } else if (status === 403 && msg === "permanently_banned") {
        setBanStatus({ permanent: true, mutedUntil: null });
      } else if (status === 403 && msg === "muted") {
        const until = error?.response?.data?.mutedUntil ?? null;
        setBanStatus({ permanent: false, mutedUntil: until });
      } else if (status === 403 && msg === "banword_detected") {
        const until = error?.response?.data?.mutedUntil ?? null;
        setBanStatus({ permanent: false, mutedUntil: until });
        toast.error("Message inapproprié détecté. Tu es muté temporairement.");
      } else {
        toast.error("Impossible d'envoyer le message.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const inputDisabled = sending || isMuted || !!banStatus?.permanent;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ x: 0, opacity: 1 }}
          className="fixed bottom-0 right-0 z-50 flex h-[500px] w-80 flex-col rounded-tl-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          exit={{ x: "100%", opacity: 0 }}
          initial={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-100">Chat</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <button
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={onClose}
              type="button"
              aria-label="Fermer le chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
            ref={scrollRef}
          >
            {messages.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 mt-8">
                Aucun message. Sois le premier à parler ! 👋
              </p>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser?.id}
                />
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-700 p-3" ref={shakeRef}>
            {banStatus?.permanent ? (
              <p className="text-center text-xs text-red-400 py-2">
                Tu es banni définitivement du chat.
              </p>
            ) : isMuted ? (
              <p className="text-center text-xs text-amber-400 py-2">{mutedLabel}</p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                  disabled={inputDisabled}
                  maxLength={300}
                  placeholder="Écris un message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="text"
                />
                <button
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
                  disabled={inputDisabled || !input.trim()}
                  onClick={() => void handleSend()}
                  type="button"
                  aria-label="Envoyer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className={`mt-1 text-right text-[9px] text-zinc-600 ${input.length > 250 ? "text-amber-400" : ""}`}>
              {input.length}/300
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

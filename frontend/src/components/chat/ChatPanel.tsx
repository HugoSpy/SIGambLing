import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageSquare, Minus, Plus, Send, X, ZoomIn } from "lucide-react";
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

const MIN_WIDTH  = 240;
const MAX_WIDTH  = 800;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 900;
const MIN_ZOOM   = 75;   // %
const MAX_ZOOM   = 150;  // %
const ZOOM_STEPS = [75, 90, 100, 110, 125, 150];

const DEFAULT_WIDTH  = 340;
const DEFAULT_HEIGHT = 500;
const DEFAULT_ZOOM   = 100;

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

interface ChatPrefs {
  width:  number | null;
  height: number | null;
  x:      number | null;
  y:      number | null;
  zoom:   number | null;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  initialPrefs?: ChatPrefs;
}

export function ChatPanel({ open, onClose, initialPrefs }: ChatPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { clearUnread, isOpen: storeIsOpen } = useChatStore();

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // ─── Layout state ────────────────────────────────────────────────────────────
  const [width,  setWidth]  = useState(initialPrefs?.width  ?? DEFAULT_WIDTH);
  const [height, setHeight] = useState(initialPrefs?.height ?? DEFAULT_HEIGHT);
  // position: null means "use default anchoring (bottom-right)"
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    initialPrefs?.x != null && initialPrefs?.y != null
      ? { x: initialPrefs.x, y: initialPrefs.y }
      : null,
  );
  const [zoom, setZoom]     = useState(initialPrefs?.zoom ?? DEFAULT_ZOOM);
  const [zoomOpen, setZoomOpen] = useState(false);

  const isResizingRef = useRef(false);
  const isDraggingRef = useRef(false);

  // ─── Mention state ───────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery]           = useState<string | null>(null);
  const [mentionAnchorPos, setMentionAnchorPos]   = useState(0);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const shakeRef    = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const msgTimestampsRef = useRef<number[]>([]);

  // ─── Debounced save ──────────────────────────────────────────────────────────
  const savePrefs = useDebounced(
    (data: Partial<Record<string, number>>) => {
      api.patch("/users/me/chat-preferences", data).catch(() => {});
    },
    800,
  );

  // ─── isNearBottom ────────────────────────────────────────────────────────────
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

  // ─── Load history + ban status ───────────────────────────────────────────────
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

  useEffect(() => {
    if (storeIsOpen && isNearBottom()) clearUnread();
  }, [storeIsOpen, isNearBottom, clearUnread]);

  // ─── SSE messages ────────────────────────────────────────────────────────────
  const handleIncoming = useCallback(
    (msg: ChatMessageData) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      const chatIsOpen = useChatStore.getState().isOpen;
      if (!chatIsOpen) {
        const isMention = currentUser != null && (msg.mentionedUserIds?.includes(currentUser.id) ?? false);
        if (isMention) pingSound.play();
      }
      scrollToBottom(false);
    },
    [currentUser, scrollToBottom],
  );

  useChatStream({ onMessage: handleIncoming, enabled: open, isNearBottom });

  // ─── Scroll handler ──────────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (isNearBottom()) {
      setShowScrollBtn(false);
      clearUnread();
    }
  }, [isNearBottom, clearUnread]);

  // ─── Shake ───────────────────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    shakeRef.current?.animate(
      { transform: ["translateX(0)", "translateX(-8px)", "translateX(8px)", "translateX(-6px)", "translateX(6px)", "translateX(0)"] },
      { duration: 400, easing: "ease-in-out" },
    );
  }, []);

  // ─── Client rate limit ───────────────────────────────────────────────────────
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

  // ─── Send ─────────────────────────────────────────────────────────────────────
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
      const error = err as { response?: { status?: number; data?: { message?: string; mutedUntil?: string } } };
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      if (status === 429) { triggerShake(); toast("Doucement ! Tu envoies trop vite 🐢", { icon: "🐢" }); }
      else if (status === 403 && msg === "permanently_banned") setBanStatus({ permanent: true, mutedUntil: null });
      else if (status === 403 && msg === "muted")              setBanStatus({ permanent: false, mutedUntil: error?.response?.data?.mutedUntil ?? null });
      else if (status === 403 && msg === "banword_detected") { setBanStatus({ permanent: false, mutedUntil: error?.response?.data?.mutedUntil ?? null }); toast.error("Message inapproprié détecté. Tu es muté temporairement."); }
      else toast.error("Impossible d'envoyer le message.");
    } finally { setSending(false); }
  }

  // ─── Mention detection ────────────────────────────────────────────────────────
  function handleInputChange(val: string) {
    setInput(val);
    const cursor = inputRef.current?.selectionStart ?? val.length;
    const match = val.slice(0, cursor).match(/@(\w*)$/);
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
    setInput(`${input.slice(0, mentionAnchorPos)}@${pseudo} ${input.slice(selStart)}`);
    setMentionQuery(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionSelectedIndex((i) => i + 1); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionSelectedIndex((i) => Math.max(0, i - 1)); return; }
      if (e.key === "Escape")    { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  // ─── Zoom ─────────────────────────────────────────────────────────────────────
  function applyZoom(z: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    setZoom(clamped);
    setZoomOpen(false);
    savePrefs({ chatZoom: clamped });
  }

  // ─── Drag (move) ──────────────────────────────────────────────────────────────
  function startDrag(e: React.MouseEvent<HTMLDivElement>) {
    // Only drag on the header bar itself, not child buttons
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    isDraggingRef.current = true;

    const rect = panelRef.current!.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = ev.clientX - offX;
      const newY = ev.clientY - offY;
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = (ev: MouseEvent) => {
      isDraggingRef.current = false;
      const newX = ev.clientX - offX;
      const newY = ev.clientY - offY;
      savePrefs({ chatPanelX: newX, chatPanelY: newY });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // ─── Generic resize factory ───────────────────────────────────────────────────
  type ResizeMode = "left" | "top" | "top-left";

  function startResizeGeneric(e: React.MouseEvent, mode: ResizeMode) {
    e.preventDefault();
    isResizingRef.current = true;

    const startX    = e.clientX;
    const startY    = e.clientY;
    const startW    = width;
    const startH    = height;
    const startPos  = pos ?? { x: window.innerWidth - width, y: window.innerHeight - height };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dx = startX - ev.clientX; // left handle grows right→left
      const dy = startY - ev.clientY; // top handle grows bottom→top

      // Compute new dimensions
      let newX = startPos.x;
      let newY = startPos.y;

      if (mode === "left" || mode === "top-left") {
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + dx));
        setWidth(newWidth);
        // Anchor right edge: compute x directly from startPos to avoid cumulative drift
        newX = startPos.x - (newWidth - startW);
      }
      if (mode === "top" || mode === "top-left") {
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + dy));
        setHeight(newHeight);
        // Anchor bottom edge: compute y directly from startPos to avoid cumulative drift
        newY = startPos.y - (newHeight - startH);
      }
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = (ev: MouseEvent) => {
      isResizingRef.current = false;
      const dx = startX - ev.clientX;
      const dy = startY - ev.clientY;
      const finalW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (mode !== "top" ? dx : 0)));
      const finalH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + (mode !== "left" ? dy : 0)));
      const finalX = startPos.x - (mode !== "top" ? finalW - startW : 0);
      const finalY = startPos.y - (mode !== "left" ? finalH - startH : 0);
      savePrefs({ chatPanelWidth: finalW, chatPanelHeight: finalH, chatPanelX: finalX, chatPanelY: finalY });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  const inputDisabled = sending || isMuted || !!banStatus?.permanent;

  // ─── Positioning style ────────────────────────────────────────────────────────
  const positionStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
    : { position: "fixed", bottom: 0, right: 0 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          animate={{ scale: 1, opacity: 1 }}
          className="z-50 flex flex-col rounded-tl-2xl rounded-tr-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          exit={{ scale: 0.95, opacity: 0 }}
          initial={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            ...positionStyle,
            width,
            height,
            zoom: zoom / 100,
          }}
        >
          {/* ── Resize handle: top edge ──────────────────────────────────── */}
          <div
            className="absolute left-2 right-2 top-0 h-1.5 cursor-row-resize rounded-full transition-colors hover:bg-blue-500/40"
            onMouseDown={(e) => startResizeGeneric(e, "top")}
            title="Redimensionner (hauteur)"
          />

          {/* ── Resize handle: left edge ─────────────────────────────────── */}
          <div
            className="absolute bottom-2 left-0 top-6 w-1.5 cursor-col-resize transition-colors hover:bg-blue-500/40"
            onMouseDown={(e) => startResizeGeneric(e, "left")}
            title="Redimensionner (largeur)"
          />

          {/* ── Resize handle: top-left corner ───────────────────────────── */}
          <div
            className="absolute left-0 top-0 h-4 w-4 cursor-nwse-resize transition-colors hover:bg-blue-500/40 rounded-tl-2xl"
            onMouseDown={(e) => startResizeGeneric(e, "top-left")}
            title="Redimensionner"
          />

          {/* ── Header (drag zone) ───────────────────────────────────────── */}
          <div
            className="flex cursor-grab items-center justify-between border-b border-zinc-700 px-4 py-3 active:cursor-grabbing select-none"
            onMouseDown={startDrag}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-100">Chat</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            </div>

            <div className="flex items-center gap-1">
              {/* Zoom control */}
              <div className="relative">
                <button
                  aria-label="Zoom"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => setZoomOpen((v) => !v)}
                  onMouseDown={(e) => e.stopPropagation()}
                  type="button"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  {zoom}%
                </button>
                {zoomOpen && (
                  <div
                    className="absolute right-0 top-full z-10 mt-1 w-32 rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 px-2 pb-1 mb-1">
                      <button
                        className="rounded p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                        disabled={zoom <= MIN_ZOOM}
                        onClick={() => applyZoom(ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(zoom) - 1)] ?? MIN_ZOOM)}
                        type="button"
                        aria-label="Zoom -"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs text-zinc-300">{zoom}%</span>
                      <button
                        className="rounded p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
                        disabled={zoom >= MAX_ZOOM}
                        onClick={() => applyZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(zoom) + 1)] ?? MAX_ZOOM)}
                        type="button"
                        aria-label="Zoom +"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {ZOOM_STEPS.map((z) => (
                      <button
                        key={z}
                        className={`w-full px-3 py-1 text-left text-xs hover:bg-zinc-800 ${zoom === z ? "text-emerald-400 font-semibold" : "text-zinc-300"}`}
                        onClick={() => applyZoom(z)}
                        type="button"
                      >
                        {z}%{z === 100 ? " (défaut)" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                aria-label="Fermer le chat"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Messages ─────────────────────────────────────────────────── */}
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

          {/* ── Floating "new messages" button ───────────────────────────── */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                onClick={() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollBtn(false); clearUnread(); }}
                type="button"
              >
                <ChevronDown className="h-3 w-3" />
                Nouveaux messages
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Input area ───────────────────────────────────────────────── */}
          <div className="border-t border-zinc-700 p-3" ref={shakeRef}>
            {banStatus?.permanent ? (
              <p className="py-2 text-center text-xs text-red-400">Tu es banni définitivement du chat.</p>
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
            <p className={`mt-1 text-right text-[9px] ${input.length > 250 ? "text-amber-400" : "text-zinc-600"}`}>
              {input.length}/300
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function relativeTime(dateStr: string): string {
  const diff = (new Date(dateStr).getTime() - Date.now()) / 1000; // negative = past
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      pseudo: string;
      avatarUrl: string | null;
    };
  };
  currentUserId?: string;
}

export function ChatMessage({ message, currentUserId }: ChatMessageProps) {
  const isOwn = message.user.id === currentUserId;
  const initials = message.user.pseudo
    .split(" ")
    .filter(Boolean)
    .map((c) => c[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {message.user.avatarUrl ? (
        <img
          alt={message.user.pseudo}
          className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          src={message.user.avatarUrl}
          onError={(e) => {
            e.currentTarget.src = "/default-avatar.svg";
          }}
        />
      ) : (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
          {initials}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
        <span className="text-[10px] text-zinc-500">{message.user.pseudo}</span>
        <div
          className={`rounded-xl px-3 py-1.5 text-sm break-words ${
            isOwn
              ? "bg-emerald-600/20 text-emerald-100"
              : "bg-zinc-800 text-zinc-100"
          }`}
        >
          {message.content}
        </div>
        <span className="text-[9px] text-zinc-600">
          {relativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

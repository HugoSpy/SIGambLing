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
  currentUserPseudo?: string;
}

function renderContent(text: string, currentUserPseudo: string | undefined) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const pseudo = part.slice(1);
      const isMentioned = pseudo.toLowerCase() === currentUserPseudo?.toLowerCase();
      return (
        <span
          key={i}
          className={`rounded px-0.5 font-semibold ${
            isMentioned ? "bg-yellow-400/30 text-yellow-300" : "text-blue-400"
          }`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessage({ message, currentUserId, currentUserPseudo }: ChatMessageProps) {
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
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          src={message.user.avatarUrl}
          onError={(e) => {
            e.currentTarget.src = "/default-avatar.svg";
          }}
        />
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
          {initials}
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
        <span className="text-xs text-zinc-400">{message.user.pseudo}</span>
        <div
          className={`rounded-xl px-3 py-2 text-[15px] leading-snug break-words ${
            isOwn
              ? "bg-emerald-600/20 text-emerald-100"
              : "bg-zinc-800 text-zinc-100"
          }`}
        >
          {renderContent(message.content, currentUserPseudo)}
        </div>
        <span className="text-[10px] text-zinc-500">
          {relativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

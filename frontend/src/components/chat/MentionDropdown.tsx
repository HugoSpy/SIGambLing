import { useEffect, useRef } from "react";
import { api } from "../../lib/api";
import { useQuery } from "@tanstack/react-query";

interface MentionUser {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
}

interface MentionDropdownProps {
  query: string;
  onSelect: (pseudo: string) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

async function fetchMentionUsers(q: string): Promise<MentionUser[]> {
  if (!q) return [];
  const res = await api.get<{ users: MentionUser[] }>(`/users/mention-search?q=${encodeURIComponent(q)}`);
  return res.data.users;
}

export function MentionDropdown({
  query,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
}: MentionDropdownProps) {
  const { data: users = [] } = useQuery({
    queryKey: ["mention-search", query],
    queryFn: () => fetchMentionUsers(query),
    enabled: query.length > 0,
    staleTime: 5000,
  });

  const listRef = useRef<HTMLUListElement>(null);

  // Keyboard navigation is handled in the parent via selectedIndex/onSelectedIndexChange.
  // This component simply renders and exposes the user list.

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (users.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden">
      <ul ref={listRef} className="max-h-48 overflow-y-auto py-1" role="listbox">
        {users.map((user, idx) => {
          const initials = user.pseudo
            .split(" ")
            .filter(Boolean)
            .map((c) => c[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <li
              key={user.id}
              role="option"
              aria-selected={idx === selectedIndex}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${
                idx === selectedIndex
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
              onMouseEnter={() => onSelectedIndexChange(idx)}
              onMouseDown={(e) => {
                // Prevent the input from losing focus
                e.preventDefault();
                onSelect(user.pseudo);
              }}
            >
              {user.avatarUrl ? (
                <img
                  alt={user.pseudo}
                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                  src={user.avatarUrl}
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.svg";
                  }}
                />
              ) : (
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
                  {initials}
                </div>
              )}
              <span>@{user.pseudo}</span>
            </li>
          );
        })}
      </ul>
      <p className="px-3 py-1.5 text-[10px] text-zinc-600 border-t border-zinc-800">
        ↑↓ naviguer · Enter sélectionner · Esc fermer
      </p>
    </div>
  );
}

export type { MentionUser };

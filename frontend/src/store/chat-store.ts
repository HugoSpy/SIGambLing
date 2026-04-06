import { create } from "zustand";

interface ChatStore {
  isOpen: boolean;
  unreadCount: number;
  unreadMentions: number;
  resetKey: number;
  setOpen: (open: boolean) => void;
  addUnread: (isMention: boolean) => void;
  clearUnread: () => void;
  triggerReset: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  isOpen: false,
  unreadCount: 0,
  unreadMentions: 0,
  resetKey: 0,
  setOpen: (open) => set({ isOpen: open }),
  addUnread: (isMention) =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
      unreadMentions: isMention ? state.unreadMentions + 1 : state.unreadMentions,
    })),
  clearUnread: () => set({ unreadCount: 0, unreadMentions: 0 }),
  triggerReset: () => set((state) => ({ resetKey: state.resetKey + 1 })),
}));

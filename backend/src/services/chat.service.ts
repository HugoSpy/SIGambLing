import type { Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { containsBanword } from "../utils/banword-loader";
import { gamificationService } from "./gamification.service";

// ─── SSE clients ──────────────────────────────────────────────────────────────

const chatClients = new Set<Response>();

function broadcastMessage(msg: object): void {
  const payload = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of chatClients) {
    try {
      res.write(payload);
    } catch {
      chatClients.delete(res);
    }
  }
}

export function addChatClient(res: Response): void {
  chatClients.add(res);
}

export function removeChatClient(res: Response): void {
  chatClients.delete(res);
}

// ─── Sliding-window rate limiter ──────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 3000;
const RATE_LIMIT_MAX = 3;

const messageTimestamps = new Map<string, number[]>();

// Purge stale entries every minute to avoid memory growth
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [userId, timestamps] of messageTimestamps) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      messageTimestamps.delete(userId);
    } else {
      messageTimestamps.set(userId, filtered);
    }
  }
}, 60_000);

/** Returns true when the user is within the allowed rate, records the attempt. */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const prev = (messageTimestamps.get(userId) ?? []).filter((t) => t > cutoff);
  if (prev.length >= RATE_LIMIT_MAX) return false;
  messageTimestamps.set(userId, [...prev, now]);
  return true;
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory() {
  const rows = await prisma.chatMessage.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, pseudo: true, avatarUrl: true },
      },
    },
  });
  // Return chronological order (oldest first)
  return rows.reverse();
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMessage(userId: string, content: string, role?: string, options?: { isSystem?: boolean }) {
  const isAdmin = role === "admin";
  const isSystem = options?.isSystem ?? false;

  if (!isAdmin) {
    // Rate limit
    if (!checkRateLimit(userId)) {
      throw new AppError("rate_limited", 429);
    }

    // Check ban/mute
    const ban = await prisma.chatBan.findUnique({ where: { userId } });
    if (ban?.permanent) {
      throw new AppError("permanently_banned", 403);
    }
    if (ban?.mutedUntil && ban.mutedUntil > new Date()) {
      throw new AppError("muted", 403, { mutedUntil: ban.mutedUntil.toISOString() });
    }
  }

  // Check banwords
  if (!isAdmin && containsBanword(content)) {
    // Increment ban count; escalate if needed
    const updated = await prisma.chatBan.upsert({
      where: { userId },
      create: { userId, banCount: 1, mutedUntil: new Date(Date.now() + 60 * 60 * 1000) },
      update: {
        banCount: { increment: 1 },
        mutedUntil: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    if (updated.banCount >= 3) {
      await prisma.chatBan.update({ where: { userId }, data: { permanent: true } });
      throw new AppError("permanently_banned", 403);
    }
    throw new AppError("banword_detected", 403, { mutedUntil: updated.mutedUntil?.toISOString() });
  }

  const message = await prisma.chatMessage.create({
    data: { userId, content: content.trim(), isSystem },
    include: {
      user: {
        select: { id: true, pseudo: true, avatarUrl: true },
      },
    },
  });

  // Extract @mentions and resolve to user ids for the SSE payload
  const mentionedPseudos = [...content.matchAll(/@(\w+)/g)].map((m) => m[1]);
  let mentionedUserIds: string[] = [];
  if (mentionedPseudos.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { pseudo: { in: mentionedPseudos } },
      select: { id: true },
    });
    mentionedUserIds = mentionedUsers.map((u) => u.id);
  }

  broadcastMessage({ ...message, mentionedUserIds });

  if (!isSystem) {
    gamificationService.synchronizeUserBadges(userId).catch(() => {
      // Non-blocking: badge sync failure should not fail the chat message
    });
  }

  return message;
}

// ─── Ban status ───────────────────────────────────────────────────────────────

export async function getBanStatus(userId: string) {
  return prisma.chatBan.findUnique({ where: { userId } });
}

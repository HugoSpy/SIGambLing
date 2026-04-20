import { prisma } from './prisma.service';
import { AppError } from '../utils/app-error';
import * as chatService from './chat.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSystemUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return admin?.id ?? null;
}

async function sendChatSystemMessage(content: string): Promise<void> {
  try {
    const userId = await getSystemUserId();
    if (!userId) return;
    await chatService.sendMessage(userId, content, 'admin', { isSystem: true });
  } catch {
    // Non-blocking
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getRobinHoodCandidates() {
  return prisma.user.findMany({
    where: { balance: { gte: 2_000_000 } },
    select: { id: true, pseudo: true, avatarUrl: true, balance: true },
    orderBy: { balance: 'desc' },
  });
}

export async function createWeeklyEvent(): Promise<void> {
  const candidates = await getRobinHoodCandidates();
  if (candidates.length === 0) return;

  const now = new Date();
  const voteEndAt = new Date(now.getTime() + 10 * 60 * 60 * 1000);       // +10h
  const eventEndAt = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000); // +23h59m

  await prisma.robinHoodEvent.create({
    data: {
      status: 'VOTE',
      voteStartAt: now,
      voteEndAt,
      eventEndAt,
    },
  });
}

export async function closeVoteAndActivate(eventId: string): Promise<void> {
  const event = await prisma.robinHoodEvent.findUnique({
    where: { id: eventId },
    include: { votes: true },
  });
  if (!event || event.status !== 'VOTE') return;

  const candidates = await getRobinHoodCandidates();
  if (candidates.length === 0) {
    await prisma.robinHoodEvent.update({ where: { id: eventId }, data: { status: 'SKIPPED' } });
    return;
  }

  let victimIds: string[] = [];

  if (event.votes.length === 0) {
    // No votes — random pick
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) victimIds = [pick.id];
  } else {
    // Count votes per target
    const counts = new Map<string, number>();
    for (const v of event.votes) {
      counts.set(v.targetId, (counts.get(v.targetId) ?? 0) + 1);
    }
    const max = Math.max(...counts.values());
    victimIds = [...counts.entries()].filter(([, c]) => c === max).map(([id]) => id);
  }

  // Deduct tokens from each victim and build pool
  let totalPool = 0;
  const victimData: Array<{ userId: string; amountTaken: number }> = [];

  for (const uid of victimIds) {
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { balance: true } });
    if (!user) continue;
    const taken = Math.min(user.balance, 1_000_000);
    await prisma.user.update({ where: { id: uid }, data: { balance: { decrement: taken } } });
    victimData.push({ userId: uid, amountTaken: taken });
    totalPool += taken;
  }

  // Persist victims + activate event
  await prisma.$transaction([
    ...victimData.map((v) =>
      prisma.robinHoodVictim.create({
        data: { eventId, userId: v.userId, amountTaken: v.amountTaken },
      }),
    ),
    prisma.robinHoodEvent.update({
      where: { id: eventId },
      data: { status: 'ACTIVE', initialPool: totalPool, currentPool: totalPool },
    }),
  ]);

  // Resolve pseudos for chat message
  const users = await prisma.user.findMany({
    where: { id: { in: victimIds } },
    select: { pseudo: true },
  });
  const pseudos = users.map((u) => u.pseudo).join(', ');
  await sendChatSystemMessage(
    `🏹 Robin de Vegas est en cours ! ${pseudos} a été désigné(e) victime. La cagnotte s'élève à ${totalPool.toLocaleString('fr-FR')} tokens. Bonne chasse ! @everyone`,
  );
}

export async function closeEvent(eventId: string): Promise<void> {
  const event = await prisma.robinHoodEvent.findUnique({
    where: { id: eventId },
    include: { victims: true },
  });
  if (!event || event.status !== 'ACTIVE') return;

  const remaining = Math.max(0, event.currentPool);
  const victimCount = event.victims.length;
  const returnPerVictim = victimCount > 0 ? Math.floor(remaining / victimCount) : 0;

  const now = new Date();
  await prisma.$transaction([
    ...event.victims.map((v) =>
      prisma.robinHoodVictim.update({
        where: { id: v.id },
        data: { amountReturned: returnPerVictim, returnedAt: now },
      }),
    ),
    prisma.robinHoodEvent.update({
      where: { id: eventId },
      data: { status: 'COMPLETED', currentPool: 0 },
    }),
  ]);

  // Return tokens to victims
  if (returnPerVictim > 0) {
    for (const v of event.victims) {
      await prisma.user.update({
        where: { id: v.userId },
        data: { balance: { increment: returnPerVictim } },
      });
    }
  }

  await sendChatSystemMessage(
    `🏹 Robin de Vegas terminé ! La cagnotte restante (${remaining.toLocaleString('fr-FR')} tokens) a été restituée.`,
  );
}

export async function castVote(eventId: string, voterId: string, targetId: string): Promise<void> {
  const event = await prisma.robinHoodEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'VOTE') {
    throw new AppError('Aucun vote en cours.', 400);
  }

  const candidates = await getRobinHoodCandidates();
  const isEligible = candidates.some((c) => c.id === targetId);
  if (!isEligible) {
    throw new AppError('Ce joueur n\'est pas éligible.', 400);
  }

  await prisma.robinHoodVote.create({
    data: { eventId, voterId, targetId },
  });
}

export async function getCurrentEvent() {
  const event = await prisma.robinHoodEvent.findFirst({
    where: { status: { in: ['VOTE', 'ACTIVE'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      victims: {
        include: { user: { select: { pseudo: true, avatarUrl: true } } },
      },
      votes: {
        select: { targetId: true, voterId: true },
      },
    },
  });
  if (!event) return null;

  // Aggregate vote counts per target
  const voteCounts = new Map<string, number>();
  for (const v of event.votes) {
    voteCounts.set(v.targetId, (voteCounts.get(v.targetId) ?? 0) + 1);
  }

  const candidates = event.status === 'VOTE' ? await getRobinHoodCandidates() : [];

  const voteCountsWithInfo = await Promise.all(
    [...voteCounts.entries()].map(async ([userId, count]) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pseudo: true, avatarUrl: true, balance: true },
      });
      return { userId, pseudo: user?.pseudo ?? '', avatarUrl: user?.avatarUrl ?? null, balance: user?.balance ?? 0, voteCount: count };
    }),
  );

  return {
    id: event.id,
    status: event.status,
    voteStartAt: event.voteStartAt,
    voteEndAt: event.voteEndAt,
    eventEndAt: event.eventEndAt,
    currentPool: event.currentPool,
    initialPool: event.initialPool,
    victims: event.victims.map((v) => ({
      userId: v.userId,
      pseudo: v.user.pseudo,
      avatarUrl: v.user.avatarUrl,
      amountTaken: v.amountTaken,
      amountReturned: v.amountReturned,
    })),
    voteCounts: voteCountsWithInfo.sort((a, b) => b.voteCount - a.voteCount),
    candidates,
    votes: event.votes,
  };
}

export async function deductFromPool(eventId: string, amount: number): Promise<number> {
  const event = await prisma.robinHoodEvent.findUnique({
    where: { id: eventId },
    select: { currentPool: true, status: true },
  });
  if (!event || event.status !== 'ACTIVE') return 0;

  const actualPaid = Math.min(amount, event.currentPool);
  const newPool = event.currentPool - actualPaid;

  await prisma.robinHoodEvent.update({
    where: { id: eventId },
    data: { currentPool: newPool },
  });

  if (newPool <= 0) {
    // Close asynchronously to avoid nested transactions
    setImmediate(() => closeEvent(eventId).catch(() => {}));
  }

  return actualPaid;
}

export async function addToPool(eventId: string, amount: number): Promise<void> {
  await prisma.robinHoodEvent.update({
    where: { id: eventId },
    data: { currentPool: { increment: amount } },
  });
}

export async function getActiveEvent() {
  return prisma.robinHoodEvent.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, status: true, currentPool: true },
  });
}

export async function getHistory() {
  return prisma.robinHoodEvent.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      victims: {
        include: { user: { select: { pseudo: true, avatarUrl: true } } },
      },
    },
  });
}

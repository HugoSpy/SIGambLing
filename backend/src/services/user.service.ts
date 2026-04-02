import sharp from "sharp";
import { AppError } from "../utils/app-error";
import { serializeUser } from "../utils/user-serializer";
import { gamificationService } from "./gamification.service";
import type {
  AdjustUserBalanceInput,
  UnlockUserBadgeInput,
  UpdateUserProfileInput,
} from "../schemas/user.schemas";
import type { UploadedFile } from "../types/upload";
import { prisma } from "./prisma.service";
import { storageService } from "./storage.service";

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function serializeAdminUserSummary(user: {
  id: string;
  email: string;
  pseudo: string;
  avatarUrl: string | null;
  balance: number;
  role: string;
  streakDays: number;
  lastRewardAt: Date | null;
  createdAt: Date;
  badges?: Array<{ badgeType: string }>;
}) {
  return {
    id: user.id,
    email: user.email,
    pseudo: user.pseudo,
    avatar_url: user.avatarUrl,
    balance: user.balance,
    role: user.role,
    streak_days: user.streakDays,
    last_reward_at: user.lastRewardAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    badges: (user.badges ?? []).map((badge) => badge.badgeType).sort(),
  };
}

class UserService {
  private async requireActiveUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return user;
  }

  async getCurrentUser(userId: string) {
    await gamificationService.synchronizeUserBadges(userId);
    const user = await this.requireActiveUser(userId);

    return serializeUser(user);
  }

  async updateCurrentUser(userId: string, input: UpdateUserProfileInput) {
    await this.requireActiveUser(userId);

    const pseudo = input.pseudo.trim();

    const existingPseudo = await prisma.user.findFirst({
      where: {
        pseudo,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existingPseudo) {
      throw new AppError("Ce pseudo est déjà utilisé.", 409);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { pseudo },
    });

    await gamificationService.synchronizeUserBadges(userId);

    return serializeUser(updatedUser);
  }

  async uploadAvatar(userId: string, file?: UploadedFile) {
    if (!file) {
      throw new AppError("Aucun fichier reçu.", 400);
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new AppError("Format non supporté.", 400);
    }

    if (file.size > MAX_AVATAR_SIZE) {
      throw new AppError("Fichier trop volumineux (max 2MB).", 400);
    }

    await this.requireActiveUser(userId);

    const normalizedImage = await sharp(file.buffer)
      .rotate()
      .resize(200, 200, {
        fit: "cover",
        position: "attention",
      })
      .webp({ quality: 88 })
      .toBuffer();

    const avatarUrl = await storageService.uploadAvatar(userId, normalizedImage);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    await gamificationService.synchronizeUserBadges(userId);

    return serializeUser(updatedUser);
  }

  async searchAdminUsers(search: string) {
    const query = search.trim();

    if (!query) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [
          {
            pseudo: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        pseudo: "asc",
      },
      take: 10,
      select: {
        id: true,
        pseudo: true,
        email: true,
        avatarUrl: true,
        balance: true,
        role: true,
        streakDays: true,
        lastRewardAt: true,
        createdAt: true,
        badges: {
          select: {
            badgeType: true,
          },
          orderBy: {
            unlockedAt: "desc",
          },
        },
      },
    });

    return users.map((user) => serializeAdminUserSummary(user));
  }

  async adjustUserBalance(adminId: string, userId: string, input: AdjustUserBalanceInput) {
    const updatedUser = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            select: {
              badgeType: true,
            },
          },
        },
      });

      if (!user || user.isBanned) {
        throw new AppError("Utilisateur introuvable.", 404);
      }

      const nextBalance = user.balance + input.amount;

      if (nextBalance < 0) {
        throw new AppError("Le solde ne peut pas devenir negatif.", 400);
      }

      const persistedUser = await transaction.user.update({
        where: { id: userId },
        data: {
          balance: nextBalance,
        },
        include: {
          badges: {
            select: {
              badgeType: true,
            },
          },
        },
      });

      await transaction.adminLog.create({
        data: {
          adminId,
          actionType: "user_balance_adjusted",
          targetId: userId,
          details: {
            amount: input.amount,
            reason: input.reason,
            previous_balance: user.balance,
            new_balance: nextBalance,
          },
        },
      });

      await gamificationService.synchronizeUserBadges(userId, transaction);

      const refreshedUser = await transaction.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            select: {
              badgeType: true,
            },
            orderBy: {
              unlockedAt: "desc",
            },
          },
        },
      });

      if (!refreshedUser) {
        throw new AppError("Utilisateur introuvable.", 404);
      }

      return refreshedUser;
    });

    return serializeAdminUserSummary(updatedUser);
  }

  async unlockUserBadge(adminId: string, userId: string, input: UnlockUserBadgeInput) {
    const badge = gamificationService.getBadgeDefinition(input.badge_key);

    if (!badge) {
      throw new AppError("Badge introuvable.", 404);
    }

    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.isBanned) {
        throw new AppError("Utilisateur introuvable.", 404);
      }

      const existingBadge = await transaction.badge.findUnique({
        where: {
          userId_badgeType: {
            userId,
            badgeType: badge.key,
          },
        },
      });

      if (!existingBadge) {
        await transaction.badge.create({
          data: {
            userId,
            badgeType: badge.key,
          },
        });

        await transaction.adminLog.create({
          data: {
            adminId,
            actionType: "user_badge_unlocked",
            targetId: userId,
            details: {
              badge_key: badge.key,
            },
          },
        });
      }

      const refreshedUser = await transaction.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            select: {
              badgeType: true,
            },
            orderBy: {
              unlockedAt: "desc",
            },
          },
        },
      });

      if (!refreshedUser) {
        throw new AppError("Utilisateur introuvable.", 404);
      }

      return {
        user: serializeAdminUserSummary(refreshedUser),
        already_unlocked: existingBadge !== null,
      };
    });
  }

  listAvailableBadges() {
    return gamificationService.listBadgeCatalog();
  }
}

export const userService = new UserService();

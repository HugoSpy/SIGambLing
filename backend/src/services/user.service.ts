import sharp from "sharp";
import { AppError } from "../utils/app-error";
import { serializeUser } from "../utils/user-serializer";
import type { UpdateUserProfileInput } from "../schemas/user.schemas";
import { prisma } from "./prisma.service";
import { storageService } from "./storage.service";

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

class UserService {
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    return serializeUser(user);
  }

  async updateCurrentUser(userId: string, input: UpdateUserProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

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

    return serializeUser(updatedUser);
  }

  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new AppError("Aucun fichier reçu.", 400);
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new AppError("Format non supporté.", 400);
    }

    if (file.size > MAX_AVATAR_SIZE) {
      throw new AppError("Fichier trop volumineux (max 2MB).", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

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

    return serializeUser(updatedUser);
  }
}

export const userService = new UserService();

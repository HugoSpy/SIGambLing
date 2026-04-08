import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

class StorageService {
  private storageDir: string;
  private publicBaseUrl: string;

  constructor() {
    this.storageDir = env.AVATAR_STORAGE_DIR;
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.mkdirSync(path.join(this.storageDir, "events"), { recursive: true });

    // Resolve relative base URL against API_BASE_URL to guarantee absolute URLs
    const raw = env.AVATAR_PUBLIC_BASE_URL.replace(/\/+$/, "");
    this.publicBaseUrl = raw.startsWith("http") ? raw : `${env.API_BASE_URL.replace(/\/+$/, "")}${raw}`;
  }

  async uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
    const filename = `${userId}.webp`;
    const filePath = path.join(this.storageDir, filename);

    try {
      await fs.promises.writeFile(filePath, buffer);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOSPC") {
        throw new AppError("Espace de stockage temporairement indisponible.", 507);
      }
      throw new AppError("Impossible d'enregistrer la photo de profil.", 502);
    }

    return `${this.publicBaseUrl}/${filename}?v=${Date.now()}`;
  }

  async uploadEventImage(eventId: string, buffer: Buffer): Promise<string> {
    const filename = `events/${eventId}.webp`;
    const filePath = path.join(this.storageDir, filename);

    try {
      await fs.promises.writeFile(filePath, buffer);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOSPC") {
        throw new AppError("Espace de stockage temporairement indisponible.", 507);
      }
      throw new AppError("Impossible d'enregistrer l'image de l'événement.", 502);
    }

    return `${this.publicBaseUrl}/${filename}?v=${Date.now()}`;
  }
}

export const storageService = new StorageService();

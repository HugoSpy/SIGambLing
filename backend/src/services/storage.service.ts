import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

function deriveSupabaseUrl(databaseUrl: string) {
  try {
    const host = new URL(databaseUrl).hostname;
    const match = host.match(/^db\.([^.]+)\.supabase\.co$/);

    if (!match) {
      return undefined;
    }

    return `https://${match[1]}.supabase.co`;
  } catch {
    return undefined;
  }
}

class StorageService {
  private client: SupabaseClient | null = null;

  private getSupabaseUrl() {
    return env.SUPABASE_URL ?? deriveSupabaseUrl(env.DATABASE_URL);
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const url = this.getSupabaseUrl();
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new AppError("Le service photo est temporairement indisponible.", 503);
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.client;
  }

  async uploadAvatar(userId: string, buffer: Buffer) {
    const client = this.getClient();
    const path = `${userId}.webp`;
    const bucket = env.SUPABASE_AVATARS_BUCKET;

    const { error } = await client.storage.from(bucket).upload(path, buffer, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: true,
    });

    if (error) {
      const status = Number(
        (error as { statusCode?: number | string; status?: number | string }).statusCode ??
          (error as { status?: number | string }).status,
      );
      const message = error.message ?? "";

      if (
        status === 413 ||
        /413|quota|storage|capacity|limit|payload/i.test(message)
      ) {
        throw new AppError("Espace de stockage temporairement indisponible.", 507);
      }

      throw new AppError("Impossible d'enregistrer la photo de profil.", 502);
    }

    const { data } = client.storage.from(bucket).getPublicUrl(path);

    if (!data.publicUrl) {
      throw new AppError("Impossible de publier la photo de profil.", 500);
    }

    return `${data.publicUrl}?v=${Date.now()}`;
  }
}

export const storageService = new StorageService();

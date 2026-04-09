import http from "http";
import https from "https";
import { env } from "../config/env";
import { logger } from "../utils/logger";

type NotifyEventCreatedInput = {
  eventId: string;
  title: string;
  description: string | null;
  closingAt: string | null;
  minBet: number;
  maxBet: number | null;
  createdByPseudo: string | null;
  options: string[];
};

const MAX_DISCORD_CONTENT_LENGTH = 1900;
const DEFAULT_TIMEOUT_MS = 3000;

type DiscordWebhookResponse = {
  body: string;
  statusCode: number;
  statusText: string;
};

function buildEventUrl(eventId: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/events/${eventId}`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function postJson(
  urlValue: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
) {
  return new Promise<DiscordWebhookResponse>((resolve, reject) => {
    let webhookUrl: URL;

    try {
      webhookUrl = new URL(urlValue);
    } catch (error) {
      reject(error);
      return;
    }

    const client =
      webhookUrl.protocol === "https:"
        ? https
        : webhookUrl.protocol === "http:"
          ? http
          : null;

    if (!client) {
      reject(new Error(`Unsupported Discord webhook protocol: ${webhookUrl.protocol}`));
      return;
    }

    const body = JSON.stringify(payload);
    const request = client.request(
      webhookUrl,
      {
        method: "POST",
        headers: {
          "Content-Length": Buffer.byteLength(body),
          "Content-Type": "application/json",
        },
      },
      (response) => {
        const chunks: string[] = [];

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            body: chunks.join(""),
            statusCode: response.statusCode ?? 0,
            statusText: response.statusMessage ?? "",
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function buildDiscordContent(input: NotifyEventCreatedInput) {
  const optionsPreview = input.options
    .map((option, index) => `💸 **${index + 1}.** ${option}`)
    .join("\n");

  const lines = [
    "## :boom::money_with_wings: NOUVEL ÉVÉNEMENT DISPONIBLE SUR SIGAMBLING :money_with_wings::boom:",
    "",
    `# 🏆 **${input.title.toUpperCase()}** 🏆`,
    input.description ? `> 🔥 ${truncate(input.description, 180)} 🔥` : null,
    "",
    "## :game_die: Choix proposés :",
    optionsPreview,
    "",
    input.closingAt ? `**⏰ Clôture :** ${input.closingAt}` : null,
    "",
    `## 🚀💰 [Rejoindre l'événement maintenant](${buildEventUrl(input.eventId)}) 💰🚀`,
    "",
    "<@&1363082435868364820>",
  ].filter((line): line is string => Boolean(line));

  return truncate(lines.join("\n"), MAX_DISCORD_CONTENT_LENGTH);
}


class DiscordService {
  private warnedMissingWebhook = false;

  private getWebhookUrl() {
    const value =
      env.DISCORD_EVENTS_WEBHOOK_URL ??
      env.DISCORD_WEBHOOK_URL ??
      env.DISCORD_WEBHOOK;

    if (!value || value.trim().length === 0) {
      return null;
    }

    return value;
  }

  async notifyEventCreated(input: NotifyEventCreatedInput) {
    const webhookUrl = this.getWebhookUrl();

    if (!webhookUrl) {
      if (!this.warnedMissingWebhook) {
        this.warnedMissingWebhook = true;
        logger.warn(
          "Discord webhook notifications are disabled because no webhook URL is configured",
        );
      }

      return;
    }

    const timeoutMs = env.DISCORD_WEBHOOK_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;

    try {
      const response = await postJson(
        webhookUrl,
        {
          content: buildDiscordContent(input),
          allowed_mentions: { parse: [] },
        },
        timeoutMs,
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        logger.warn("Discord webhook returned non-success status", {
          status: response.statusCode,
          statusText: response.statusText,
          responseBody: truncate(response.body, 400),
          eventId: input.eventId,
        });
      }
    } catch (error) {
      logger.warn("Discord webhook notification failed", {
        eventId: input.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const discordService = new DiscordService();

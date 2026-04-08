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

function buildEventUrl(eventId: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/events/${eventId}`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildDiscordContent(input: NotifyEventCreatedInput) {
  const optionsPreview = input.options.map((option, index) => `${index + 1}. ${option}`).join("\n");

  const lines = [
    "New market created",
    `Title: ${input.title}`,
    input.description ? `Description: ${truncate(input.description, 240)}` : null,
    `Closing at: ${input.closingAt ?? "not set"}`,
    `Min bet: ${input.minBet}`,
    `Max bet: ${input.maxBet ?? "not set"}`,
    `Created by: ${input.createdByPseudo ?? "unknown"}`,
    "Options:",
    optionsPreview,
    `Open: ${buildEventUrl(input.eventId)}`,
  ].filter((line): line is string => Boolean(line));

  return truncate(lines.join("\n"), MAX_DISCORD_CONTENT_LENGTH);
}

class DiscordService {
  private getWebhookUrl() {
    const value = env.DISCORD_EVENTS_WEBHOOK_URL;

    if (!value || value.trim().length === 0) {
      return null;
    }

    return value;
  }

  async notifyEventCreated(input: NotifyEventCreatedInput) {
    const webhookUrl = this.getWebhookUrl();

    if (!webhookUrl) {
      return;
    }

    const timeoutMs = env.DISCORD_WEBHOOK_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: buildDiscordContent(input),
          allowed_mentions: { parse: [] },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn("Discord webhook returned non-success status", {
          status: response.status,
          statusText: response.statusText,
          responseBody: truncate(body, 400),
          eventId: input.eventId,
        });
      }
    } catch (error) {
      logger.warn("Discord webhook notification failed", {
        eventId: input.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

export const discordService = new DiscordService();

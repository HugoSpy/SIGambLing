import { readFileSync } from "node:fs";
import { join } from "node:path";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");
}

function loadBanwords(): string[] {
  try {
    const filePath = join(process.cwd(), "banwords.txt");
    const raw = readFileSync(filePath, "utf-8");
    return raw
      .split("\n")
      .map((line) => normalize(line.trim()))
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

const BANWORDS = loadBanwords();

export function containsBanword(text: string): boolean {
  const normalized = normalize(text);
  return BANWORDS.some((word) => {
    // Use word-boundary regex for short words, includes for longer ones
    if (word.length <= 4) {
      try {
        return new RegExp(`\\b${word}\\b`).test(normalized);
      } catch {
        return normalized.includes(word);
      }
    }
    return normalized.includes(word);
  });
}

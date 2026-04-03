const MAX_PSEUDO_LENGTH = 24;
const MIN_PSEUDO_LENGTH = 3;
const EPITA_EMAIL_DOMAIN = "@epita.fr";

function capitalizeWord(segment: string) {
  if (!segment) {
    return "";
  }

  return segment[0].toUpperCase() + segment.slice(1).toLowerCase();
}

function stripUnsafePseudoChars(input: string) {
  return input.replace(/[^A-Za-z0-9]/g, "");
}

function truncatePseudo(input: string) {
  return input.slice(0, MAX_PSEUDO_LENGTH);
}

function ensurePseudoLength(input: string) {
  if (input.length >= MIN_PSEUDO_LENGTH) {
    return input;
  }

  return truncatePseudo(`EPITA${input}`);
}

export function normalizePseudo(input: string) {
  const sanitized = truncatePseudo(stripUnsafePseudoChars(input));
  return ensurePseudoLength(sanitized);
}

export function buildPseudoFromEpitaEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.endsWith(EPITA_EMAIL_DOMAIN)
    ? normalizedEmail.slice(0, -EPITA_EMAIL_DOMAIN.length)
    : normalizedEmail.split("@")[0] ?? "";

  const formatted = localPart
    .split(".")
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("-")
        .filter(Boolean)
        .map(capitalizeWord)
        .join(""),
    )
    .join("");

  return normalizePseudo(formatted || localPart || "player");
}

export async function ensureUniquePseudo(
  basePseudo: string,
  pseudoExists: (candidate: string) => Promise<boolean>,
) {
  const normalizedBase = normalizePseudo(basePseudo);

  if (!(await pseudoExists(normalizedBase))) {
    return normalizedBase;
  }

  let suffix = 2;

  while (suffix < Number.MAX_SAFE_INTEGER) {
    const suffixText = String(suffix);
    const trimmedBase = normalizedBase.slice(0, MAX_PSEUDO_LENGTH - suffixText.length);
    const candidate = `${trimmedBase}${suffixText}`;

    if (!(await pseudoExists(candidate))) {
      return candidate;
    }

    suffix += 1;
  }

  throw new Error("Unable to generate a unique pseudo.");
}

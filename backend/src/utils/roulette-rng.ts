import crypto from "node:crypto";

export function generateRandomNumber(min: number, max: number) {
  return crypto.randomInt(min, max + 1);
}

export function spinRoulette() {
  return generateRandomNumber(0, 36);
}

export function generateProvablyFairSpin(
  clientSeed: string,
  serverSeed: string,
  nonce: number,
) {
  const hash = crypto
    .createHash("sha256")
    .update(`${clientSeed}:${serverSeed}:${nonce}`)
    .digest("hex");

  return parseInt(hash.slice(0, 8), 16) % 37;
}

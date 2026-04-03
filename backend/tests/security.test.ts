import test from "node:test";
import assert from "node:assert/strict";
import {
  getCorsAllowedOrigins,
  isCorsOriginAllowed,
  resolveRefreshCookieSameSite,
} from "../src/config/security";

test("getCorsAllowedOrigins normalizes the configured frontend and extras", () => {
  const origins = getCorsAllowedOrigins(
    "https://frontend.example.com/login",
    "https://preview.example.com/path, https://frontend.example.com",
  );

  assert.deepEqual([...origins].sort(), [
    "https://frontend.example.com",
    "https://preview.example.com",
  ]);
});

test("isCorsOriginAllowed only allows configured origins and same-origin server calls", () => {
  const origins = new Set(["https://frontend.example.com"]);

  assert.equal(isCorsOriginAllowed(undefined, origins), true);
  assert.equal(isCorsOriginAllowed("https://frontend.example.com", origins), true);
  assert.equal(isCorsOriginAllowed("https://attacker.example.com", origins), false);
});

test("resolveRefreshCookieSameSite keeps non-production cookies same-site by default", () => {
  const sameSite = resolveRefreshCookieSameSite({
    frontendUrl: "http://localhost:5173",
    apiBaseUrl: "http://localhost:3001",
    isProduction: false,
  });

  assert.equal(sameSite, "lax");
});

test("resolveRefreshCookieSameSite defaults to none for split production hosts", () => {
  const sameSite = resolveRefreshCookieSameSite({
    frontendUrl: "https://sigambling.vercel.app",
    apiBaseUrl: "https://api.sigambling.vercel.app",
    isProduction: true,
  });

  assert.equal(sameSite, "none");
});

test("resolveRefreshCookieSameSite honors an explicit override", () => {
  const sameSite = resolveRefreshCookieSameSite({
    frontendUrl: "https://app.sigambling.example",
    apiBaseUrl: "https://api.sigambling.example",
    isProduction: true,
    explicitPolicy: "lax",
  });

  assert.equal(sameSite, "lax");
});

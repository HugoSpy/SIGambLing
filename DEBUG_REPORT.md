# Debug Report

## Database Recovery

Issue: [SIG-14](/SIG/issues/SIG-14)

### Summary

The live PostgreSQL schema is already aligned with `backend/prisma/schema.prisma`, including the jackpot-backed `JackpotRound` and `JackpotEntry` tables. The backend also regenerates Prisma client successfully and boots against the real `backend/.env` without Prisma table-missing errors.

### Root Cause

The repo has no committed `backend/prisma/migrations/` history even though the runtime schema already contains the latest jackpot models. That means database rollout happened outside versioned Prisma migrations, leaving the codebase without an auditable schema-apply path.

This is a deployment/process parity problem, not an active live-schema mismatch:

- `npx prisma db pull --print` shows `JackpotRound` and `JackpotEntry` in the live database.
- `npm run prisma:generate` completes successfully against the current schema.
- `npm run build` completes successfully.
- Boot verification against the real workspace env returns `GET /health -> {"status":"ok","service":"SIGambling API",...}`.

### Commands Run

From `backend/`:

```bash
npm run qa:validate-env
npm run prisma:generate
npx prisma db pull --print
npm run build
npm run dev
curl http://127.0.0.1:3001/health
```

### Findings

- Environment validation passed with non-blocking warnings only:
  - `DATABASE_URL` and `DIRECT_URL` differ
  - `SUPABASE_SERVICE_ROLE_KEY` is not set
- No missing jackpot tables were observed in the current live database.
- No Prisma client generation failure was observed.
- No backend startup failure was observed during verification.

### Reproducible Schema Rollout Path

Because migration files are absent, the current reproducible schema apply command for this repo is:

```bash
cd backend
npm run prisma:push
npm run prisma:generate
```

This reflects the current repository reality. A follow-up should add committed Prisma migrations so schema history is preserved and future restores do not depend on implicit manual state.

### Remaining Risk

- Any new environment restored from git alone will not inherit the jackpot schema unless `prisma db push` is run explicitly.
- Without committed migrations, it remains hard to audit exactly when jackpot tables were introduced.

## Gamification And Jackpot Recovery

Issue: [SIG-16](/SIG/issues/SIG-16)

### Summary

Profile and casino failures were not limited to a single `/rewards/*` read path. Jackpot persistence was wired into three critical backend flows:

- `userService.getCurrentUser()` calls `gamificationService.synchronizeUserBadges()`, which reads jackpot entry stats.
- `gamificationService.getState()` reads both jackpot stats and jackpot round state for `/rewards/me` and `/rewards/jackpot`.
- `rouletteService` and `blackjackService` record jackpot contributions inside casino transactions.

If jackpot storage is absent or partially drifted, those paths can raise Prisma `P2021`/`P2022` errors and surface as 500s on profile refresh, reward reads, and casino play.

### Root Cause

The gamification layer assumed jackpot tables were always available. That assumption was too strong for the current repo reality, where schema rollout is not preserved in committed Prisma migrations.

- `backend/src/services/gamification.service.ts` queried `prisma.jackpotEntry` directly while synchronizing badges and building stats.
- `backend/src/services/jackpot.service.ts` created/read jackpot rows without a degraded fallback path.
- Casino transaction flows depended on jackpot writes succeeding, so a missing jackpot table could abort otherwise valid roulette or blackjack requests.

### Fix

Implemented backend-only recovery in the active TypeScript services:

- added jackpot-storage degradation detection for Prisma missing-table / missing-column errors (`P2021`, `P2022`)
- zeroed jackpot metrics in gamification badge/stat aggregation when jackpot storage is unavailable
- returned a neutral fallback jackpot payload instead of throwing on `/rewards/*` jackpot reads
- made casino jackpot contribution writes non-fatal when jackpot persistence is unavailable, so core casino gameplay can still complete

No legacy JavaScript prototype paths were touched.

### Verification

From `backend/`:

```bash
npm run test:unit
npm run test:integration
npm run build
```

Added regression coverage for:

- gamification state fallback when jackpot tables are unavailable
- casino jackpot contribution degradation when jackpot persistence is unavailable

### Remaining Risk

- Degraded mode keeps profile, rewards, and casino endpoints alive, but jackpot stats remain zeroed until storage is restored.
- This is an operational safety net, not a substitute for committed Prisma migrations and reproducible schema rollout.

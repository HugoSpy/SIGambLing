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

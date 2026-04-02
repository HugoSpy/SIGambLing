# DEBUG_REPORT

## Scope

Issue: [SIG-15](/SIG/issues/SIG-15)

Backend stabilization focus:

- profile and gamification state routes
- jackpot-backed casino contribution flows
- admin event settlement and proposal coverage
- regression coverage for event and betting paths

## Findings

- The configured database in this workspace has live `JackpotRound` and `JackpotEntry` tables, so the current local environment is not in the original jackpot-schema-outage state.
- The main remaining risk was schema drift: profile, rewards, and casino flows were still coupled to jackpot persistence and could surface 500s if jackpot tables disappeared or drifted.
- Existing controller coverage was already green for admin event resolution, roulette spin, rewards, and admin balance paths, but runtime hardening needed to ensure those routes degrade cleanly when jackpot storage is unavailable.

## Fixes Landed

- Added degraded-mode handling in jackpot persistence reads and writes so roulette/blackjack contributions and jackpot state reads no longer fail hard on missing jackpot tables.
- Zeroed jackpot-derived gamification stats when jackpot storage is unavailable so `/users/me`, `/rewards/me`, and badge synchronization stop bubbling jackpot storage failures into 500s.
- Extended regression coverage around:
  - proposal-to-event approval flow
  - expired event basket rejection
  - jackpot storage fallback in gamification state
  - jackpot contribution fallback for casino flows

## Verification

- `cd backend && npm test`
- `cd backend && npm run build`
- Live DB probe:
  - `jackpotRound.count() = 1`
  - `user.count() = 4`
- Live route probe:
  - `GET /rewards/me` returned `200` with authenticated real data
- Clean backend start:
  - `cd backend && timeout 15s npm run dev`
  - server booted successfully before timeout

## Notes

- `supertest` integration coverage is available in-repo and runnable; it is no longer a blocker for realistic backend verification.
- The git worktree contains unrelated frontend churn and legacy cleanup outside this issue. Only the backend stabilization slice for this issue should be staged and preserved.

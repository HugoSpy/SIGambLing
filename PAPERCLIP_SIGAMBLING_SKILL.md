# SIGambling Codebase Context

## Project Location
`C:\Users\hugos\Documents\EPITA\s8\projet\SIGambLing`

Active product surface:
- Frontend: `frontend/src/main.tsx` -> `frontend/src/RouterApp.tsx`
- Backend: `backend/src/index.ts` -> `backend/src/app.ts`

Important repo reality:
- The active application is the TypeScript React frontend plus the TypeScript Express backend.
- The repo still contains legacy prototypes:
  - `frontend/src/*.jsx`, `frontend/src/App.tsx`, `frontend/src/main.jsx`
  - `backend/main.py`, `backend/auth.py`, `backend/database.py`, `backend/models.py`, `backend/routers/*.py`
  - `backend/src/server.js`, `backend/src/store.js`, `backend/src/gameEngine.js`, `backend/src/mockData.js`
- `docs/Frontend to follow/` is reference material, not the running frontend.

## Directory Structure
Tree below is intentionally trimmed to the main application, key subdirectories, and important files.

```text
SIGambLing/
|-- README.md
|-- package.json
|-- package-lock.json
|-- .env
|-- .env.example
|-- requirements.txt
|-- start.py
|-- frontend/
|   |-- package.json
|   |-- tsconfig.json
|   |-- vite.config.ts
|   |-- tailwind.config.ts
|   |-- postcss.config.cjs
|   |-- .env
|   |-- .env.example
|   |-- src/
|   |   |-- main.tsx
|   |   |-- RouterApp.tsx
|   |   |-- App.tsx                     # legacy TS router prototype
|   |   |-- main.jsx                    # legacy JSX entrypoint
|   |   |-- api.js                      # legacy API wrapper
|   |   |-- components/
|   |   |   |-- casino/
|   |   |   |   |-- BettingGrid.tsx
|   |   |   |   |-- BlackjackGame.tsx
|   |   |   |   |-- RouletteControls.tsx
|   |   |   |   |-- RouletteGame.tsx
|   |   |   |   |-- RouletteHistory.tsx
|   |   |   |   |-- RouletteStats.tsx
|   |   |   |   |-- RouletteWheel.tsx
|   |   |   |   |-- RouletteBetGrid.tsx # present but not used by active page
|   |   |   |   `-- RouletteChip.tsx    # present but not used by active page
|   |   |   |-- layout/
|   |   |   `-- ui/
|   |   |-- hooks/
|   |   |   |-- useAuthenticatedUser.ts
|   |   |   `-- useSessionBootstrap.ts
|   |   |-- lib/
|   |   |   |-- api.ts
|   |   |   |-- utils.ts
|   |   |   `-- casino/
|   |   |       |-- rouletteEngine.ts
|   |   |       |-- resultResolver.ts
|   |   |       |-- soundManager.ts
|   |   |       |-- canvas/
|   |   |       |   `-- ResultOverlay.ts
|   |   |       `-- three/              # empty placeholder
|   |   |-- pages/
|   |   |   |-- LoginPage.tsx
|   |   |   |-- AuthCallbackPage.tsx
|   |   |   |-- DashboardPage.tsx
|   |   |   |-- EventsMarketsPage.tsx
|   |   |   |-- EventDetailPage.tsx
|   |   |   |-- CasinoPage.tsx
|   |   |   |-- AccountProfilePage.tsx
|   |   |   |-- admin/
|   |   |   |   `-- AdminEventsPage.tsx
|   |   |   |-- AuthPage.jsx           # legacy
|   |   |   |-- EventsPage.jsx         # legacy
|   |   |   |-- GamesPage.jsx          # legacy
|   |   |   |-- HomePage.jsx           # legacy
|   |   |   |-- LeaderboardPage.jsx    # legacy
|   |   |   `-- ProfilePage.jsx        # legacy
|   |   |-- routes/
|   |   |   |-- ProtectedRoute.tsx
|   |   |   `-- AdminRoute.tsx
|   |   |-- store/
|   |   |   |-- auth-store.ts
|   |   |   `-- bet-cart-store.ts
|   |   |-- styles/
|   |   |-- types/
|   |   `-- index.css
|   |-- public/
|   |-- static/
|   `-- dist/
|-- backend/
|   |-- package.json
|   |-- tsconfig.json
|   |-- .env
|   |-- .env.example
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   |-- src/
|   |   |-- app.ts
|   |   |-- index.ts
|   |   |-- config/
|   |   |   |-- env.ts
|   |   |   `-- passport.ts
|   |   |-- controllers/
|   |   |   |-- auth.controller.ts
|   |   |   |-- casino.controller.ts
|   |   |   |-- events.controller.ts
|   |   |   |-- health.controller.ts
|   |   |   `-- user.controller.ts
|   |   |-- lib/
|   |   |   `-- prisma.ts
|   |   |-- middleware/
|   |   |   |-- error-handler.ts
|   |   |   |-- not-found.ts
|   |   |   |-- request-logger.ts
|   |   |   |-- require-auth.ts
|   |   |   |-- require-role.ts
|   |   |   `-- validate.ts
|   |   |-- routes/
|   |   |   |-- auth.routes.ts
|   |   |   |-- casino.routes.ts
|   |   |   |-- events.routes.ts
|   |   |   |-- health.routes.ts
|   |   |   `-- user.routes.ts
|   |   |-- schemas/
|   |   |   |-- auth.schemas.ts
|   |   |   |-- casino.schemas.ts
|   |   |   |-- events.schemas.ts
|   |   |   `-- user.schemas.ts
|   |   |-- services/
|   |   |   |-- auth.service.ts
|   |   |   |-- blackjack.service.ts
|   |   |   |-- event.service.ts
|   |   |   |-- prisma.service.ts
|   |   |   |-- roulette.service.ts
|   |   |   |-- storage.service.ts
|   |   |   `-- user.service.ts
|   |   |-- types/
|   |   |   `-- express.d.ts
|   |   `-- utils/
|   |       |-- logger.ts
|   |       |-- roulette-rng.ts
|   |       `-- user-serializer.ts
|   |-- main.py                        # legacy FastAPI backend
|   |-- auth.py                        # legacy FastAPI backend
|   |-- database.py                    # legacy FastAPI backend
|   |-- models.py                      # legacy FastAPI backend
|   |-- routers/                       # legacy FastAPI backend routes
|   |-- src/server.js                  # legacy JS mock backend
|   |-- src/store.js                   # legacy JS mock backend data store
|   |-- src/gameEngine.js              # legacy JS mock backend casino logic
|   `-- dist/
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- BETTING_SYSTEM.md
|   |-- BLACKJACK_GUIDE.md
|   |-- PRODUCT_BRIEF.md
|   |-- ROADMAP.md
|   |-- ROULETTE_GUIDE.md
|   |-- SPECS_EVENT.md
|   `-- Frontend to follow/
|       |-- app/
|       |-- components/
|       `-- styles/
`-- node_modules/
```

## Tech Stack

### Frontend
Package file: `frontend/package.json`

Runtime dependencies:
- `@fontsource/inter` `^5.0.18`
- `@fontsource/space-grotesk` `^5.0.18`
- `@hookform/resolvers` `^4.1.0`
- `@tanstack/react-query` `^5.66.9`
- `axios` `^1.8.1`
- `class-variance-authority` `^0.7.1`
- `clsx` `^2.1.1`
- `framer-motion` `^12.4.7`
- `gsap` `^3.12.7`
- `howler` `^2.2.4`
- `lucide-react` `^0.479.0`
- `react` `^19.0.0`
- `react-dom` `^19.0.0`
- `react-hook-form` `^7.54.2`
- `react-hot-toast` `^2.5.2`
- `react-router-dom` `^7.0.0`
- `tailwind-merge` `^3.0.2`
- `zod` `^3.24.2`
- `zustand` `^5.0.3`

Dev/build dependencies:
- `@types/howler` `^2.2.12`
- `@types/react` `^19.0.10`
- `@types/react-dom` `^19.0.4`
- `@vitejs/plugin-react` `^4.4.1`
- `autoprefixer` `^10.4.20`
- `postcss` `^8.5.3`
- `tailwindcss` `^3.4.17`
- `typescript` `^5.7.3`
- `vite` `^6.0.0`

Key libraries actually used by the active TypeScript app:
- React `19`
- TypeScript `5.7`
- Build tool: Vite (`frontend/vite.config.ts`)
- Styling: Tailwind CSS + custom utility classes in `frontend/src/index.css`
- Routing: `react-router-dom` `7`
- Server state: TanStack React Query
- Local state: Zustand
- HTTP client: Axios with auth refresh interceptor
- Animation: Framer Motion
- Audio: Howler
- Icons: Lucide React

Notes:
- `gsap`, `react-hook-form`, `@hookform/resolvers`, and `zod` are installed in the frontend but are not prominent in the active TS pages yet.
- There is no `three` dependency in the current frontend package; `frontend/src/lib/casino/three/` exists but is empty.

### Backend
Package file: `backend/package.json`

Runtime dependencies:
- `@prisma/client` `^6.4.1`
- `@supabase/supabase-js` `^2.101.1`
- `bcrypt` `^5.1.1`
- `cookie-parser` `^1.4.7`
- `cors` `^2.8.5`
- `dotenv` `^16.4.5`
- `express` `^4.21.2`
- `express-rate-limit` `^7.5.0`
- `helmet` `^8.0.0`
- `jsonwebtoken` `^9.0.2`
- `multer` `^2.1.1`
- `passport` `^0.7.0`
- `passport-microsoft` `^2.1.0`
- `sharp` `^0.34.5`
- `winston` `^3.17.0`
- `zod` `^3.24.2`

Dev/build dependencies:
- `@types/cookie-parser` `^1.4.8`
- `@types/cors` `^2.8.17`
- `@types/express` `^5.0.0`
- `@types/jsonwebtoken` `^9.0.9`
- `@types/node` `^22.13.5`
- `@types/passport` `^1.0.17`
- `@types/passport-microsoft` `^2.1.1`
- `nodemon` `^3.1.9`
- `prisma` `^6.4.1`
- `ts-node` `^10.9.2`
- `typescript` `^5.7.3`

Key backend libraries actually used:
- Framework: Express
- ORM: Prisma
- Database driver target: PostgreSQL
- Auth: Passport Microsoft + JWT access/refresh tokens
- Validation: Zod
- Upload/image processing: Multer + Sharp
- Logging: Winston
- Storage: Supabase Storage

Node.js version note:
- The docs target Node `20`, but the repo does not pin a version via `engines`, `.nvmrc`, or `.node-version`.

### Infrastructure
- Database: PostgreSQL via Prisma (`backend/prisma/schema.prisma`) using `DATABASE_URL` and `DIRECT_URL`; deployment/docs point to Supabase Postgres.
- Auth provider: Microsoft OAuth via `passport-microsoft`, restricted to `@epita.fr` addresses in `backend/src/config/passport.ts`.
- Session strategy: short-lived JWT access token plus long-lived refresh token cookie/body fallback.
- Storage: Supabase Storage in `backend/src/services/storage.service.ts`, default bucket `avatars`.
- Logging: Winston console + file logs (`combined.log`, `error.log`).
- Frontend API base URL: `VITE_API_URL`.
- Build orchestration: npm workspaces at repo root plus `concurrently` for local multi-service dev.

## Database Schema
Schema file: `backend/prisma/schema.prisma`

Database provider:
- `postgresql`

Enums:
- `UserRole`: `user`, `validator`, `admin`
- `EventCategory`: `sports`, `politics`, `culture`, `epita`
- `EventStatus`: `OPEN @map("active")`, `CLOSED @map("pending")`, `RESOLVED @map("resolved")`, `CANCELLED @map("cancelled")`
- `BetStatus`: `pending`, `won`, `lost`, `cancelled`
- `BetType`: `SIMPLE`, `PARLAY`
- `ProposalStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `CasinoGameType`: `roulette`, `blackjack`
- `CasinoGameResult`: `win`, `loss`, `push`

### `User`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `email` | `String` (`VarChar(255)`) | Unique |
| `microsoftId` | `String?` (`VarChar(255)`) | Unique, nullable |
| `pseudo` | `String` (`VarChar(50)`) | Unique |
| `avatarUrl` | `String?` (`VarChar(500)`) | Nullable |
| `balance` | `Int` | Default `1000` |
| `role` | `UserRole` | Default `user` |
| `isBanned` | `Boolean` | Default `false` |
| `sessionVersion` | `Int` | Default `0` |
| `lastRewardAt` | `DateTime?` | Nullable |
| `streakDays` | `Int` | Default `0` |
| `createdAt` | `DateTime` | Default `now()` |
| `updatedAt` | `DateTime` | Auto-updated via `@updatedAt` |

Relations:
- `bets -> Bet[]`
- `casinoGames -> CasinoGame[]`
- `badges -> Badge[]`
- `createdEvents -> Event[]` via relation `"EventCreator"`
- `validatedEvents -> Event[]` via relation `"EventValidator"`
- `excludedEvents -> EventExclusion[]`
- `adminLogs -> AdminLog[]` via relation `"AdminActor"`
- `proposals -> EventProposal[]`
- `reviewedProposals -> EventProposal[]` via relation `"ProposalReviewer"`

Indexes and constraints:
- `@unique(email)`
- `@unique(microsoftId)`
- `@unique(pseudo)`
- `@@index([email])`
- `@@index([balance(sort: Desc)])`

### `Event`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `title` | `String` (`VarChar(200)`) | Unique |
| `description` | `String?` (`Text`) | Nullable |
| `category` | `EventCategory` | Required |
| `imageUrl` | `String?` (`VarChar(500)`) | Nullable |
| `options` | `Json` | Stored event options and initial odds |
| `poolByOption` | `Json` | Default `"{}"` |
| `totalPool` | `Int` | Default `0` |
| `status` | `EventStatus` | Default `OPEN` |
| `resolvedOption` | `String?` (`VarChar(50)`) | DB column mapped to `resultOption`, nullable |
| `closingAt` | `DateTime?` | DB column mapped to `resolutionDate`, nullable |
| `resolvedAt` | `DateTime?` | Nullable |
| `createdAt` | `DateTime` | Default `now()` |
| `updatedAt` | `DateTime` | Default `now()`, auto-updated |
| `minBet` | `Int` | Default `10` |
| `maxBet` | `Int?` | Nullable |
| `createdById` | `String?` (`Uuid`) | DB column mapped to `creatorId`, nullable |
| `validatorId` | `String?` (`Uuid`) | Nullable |
| `validatedAt` | `DateTime?` | Nullable |

Relations:
- `createdBy -> User?` via `"EventCreator"` (`onDelete: SetNull`)
- `validator -> User?` via `"EventValidator"` (`onDelete: SetNull`)
- `excludedUsers -> EventExclusion[]`
- `bets -> Bet[]`
- `oddsHistories -> OddsHistory[]`
- `betLegs -> BetLeg[]`

Indexes and constraints:
- `@unique(title)`
- `@@index([status])`
- `@@index([category])`
- `@@index([closingAt])`
- `@@index([createdAt(sort: Desc)])`

### `Bet`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `userId` | `String` (`Uuid`) | Required foreign key |
| `eventId` | `String?` (`Uuid`) | Nullable foreign key; null for parlay container bets |
| `chosenOption` | `String?` (`VarChar(100)`) | DB column mapped to `selectedOption`, nullable |
| `amount` | `Int` | Required |
| `oddAtBet` | `Decimal?` (`Decimal(8,4)`) | DB column mapped to `oddsAtBet`, nullable |
| `status` | `BetStatus` | Default `pending` |
| `type` | `BetType` | Default `SIMPLE` |
| `potentialWin` | `Int` | Default `0` |
| `payout` | `Int` | DB column mapped to `actualWin`, default `0` |
| `createdAt` | `DateTime` | Default `now()` |
| `resolvedAt` | `DateTime?` | Nullable |

Relations:
- `user -> User` (`onDelete: Cascade`)
- `event -> Event?` (`onDelete: Cascade`)
- `legs -> BetLeg[]`

Indexes and constraints:
- `@@index([userId])`
- `@@index([eventId])`
- `@@index([type, status])`
- `@@index([createdAt(sort: Desc)])`

### `BetLeg`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `betId` | `String` (`Uuid`) | Required foreign key |
| `eventId` | `String` (`Uuid`) | Required foreign key |
| `chosenOption` | `String` (`VarChar(100)`) | Required |
| `oddsAtBet` | `Decimal` (`Decimal(8,4)`) | Required |
| `status` | `BetStatus` | Default `pending` |

Relations:
- `bet -> Bet` (`onDelete: Cascade`)
- `event -> Event`

Indexes and constraints:
- `@@index([betId])`
- `@@index([eventId])`

### `OddsHistory`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `eventId` | `String` (`Uuid`) | Required foreign key |
| `option` | `String` (`VarChar(100)`) | Required |
| `odds` | `Decimal` (`Decimal(8,4)`) | Required |
| `totalStaked` | `Int` | Required |
| `timestamp` | `DateTime` | Default `now()` |

Relations:
- `event -> Event` (`onDelete: Cascade`)

Indexes and constraints:
- `@@index([eventId, option])`
- `@@index([timestamp(sort: Desc)])`

### `EventProposal`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `userId` | `String` (`Uuid`) | Required foreign key |
| `title` | `String` (`VarChar(200)`) | Required |
| `description` | `String?` (`Text`) | Nullable |
| `category` | `EventCategory` | Required |
| `suggestedDate` | `DateTime?` | Nullable |
| `status` | `ProposalStatus` | Default `PENDING` |
| `reviewedById` | `String?` (`Uuid`) | Nullable foreign key |
| `reviewedAt` | `DateTime?` | Nullable |
| `rejectionReason` | `String?` (`Text`) | Nullable |
| `createdAt` | `DateTime` | Default `now()` |

Relations:
- `user -> User` (`onDelete: Cascade`)
- `reviewer -> User?` via `"ProposalReviewer"` (`onDelete: SetNull`)

Indexes and constraints:
- `@@index([userId])`
- `@@index([status])`

### `EventExclusion`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `eventId` | `String` (`Uuid`) | Required foreign key |
| `userId` | `String` (`Uuid`) | Required foreign key |

Relations:
- `event -> Event` (`onDelete: Cascade`)
- `user -> User` (`onDelete: Cascade`)

Indexes and constraints:
- `@@unique([eventId, userId])`
- `@@index([userId])`

### `CasinoGame`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `userId` | `String` (`Uuid`) | Required foreign key |
| `gameType` | `CasinoGameType` | Required |
| `betAmount` | `Int` | Required |
| `result` | `CasinoGameResult` | Required |
| `payout` | `Int` | Default `0` |
| `gameData` | `Json` | Required |
| `createdAt` | `DateTime` | Default `now()` |

Relations:
- `user -> User` (`onDelete: Cascade`)

Indexes and constraints:
- `@@index([userId])`
- `@@index([createdAt(sort: Desc)])`

### `Badge`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `userId` | `String` (`Uuid`) | Required foreign key |
| `badgeType` | `String` (`VarChar(50)`) | Required |
| `unlockedAt` | `DateTime` | Default `now()` |

Relations:
- `user -> User` (`onDelete: Cascade`)

Indexes and constraints:
- `@@unique([userId, badgeType])`
- `@@index([userId])`

### `AdminLog`

| Field | Type | Notes / Defaults |
|---|---|---|
| `id` | `String` (`Uuid`) | Primary key, default `uuid()` |
| `adminId` | `String?` (`Uuid`) | Nullable foreign key |
| `actionType` | `String` (`VarChar(50)`) | Required |
| `targetId` | `String?` (`Uuid`) | Nullable |
| `details` | `Json?` | Nullable |
| `createdAt` | `DateTime` | Default `now()` |

Relations:
- `admin -> User?` via `"AdminActor"` (`onDelete: SetNull`)

Indexes and constraints:
- `@@index([adminId])`
- `@@index([createdAt(sort: Desc)])`

Seed data from `backend/prisma/seed.ts`:
- Admin user: `admin@epita.fr` / pseudo `HouseMaster` / role `admin` / balance `5000`
- Standard user: `student@epita.fr` / pseudo `SigmaStudent` / role `user` / balance `2400`
- Three seed events are created, including two `OPEN` events and one `CLOSED` event.
- Odds history rows are seeded.
- One pending event proposal is seeded with a fixed UUID.

## Implemented Features

### Authentication and Session Management
- Description: Microsoft OAuth login, EPITA email restriction, JWT access token, refresh token rotation, persisted frontend session bootstrap, protected routes, logout.
- Status: fully implemented
- Key files:
  - `backend/src/config/passport.ts`
  - `backend/src/controllers/auth.controller.ts`
  - `backend/src/services/auth.service.ts`
  - `backend/src/routes/auth.routes.ts`
  - `backend/src/middleware/require-auth.ts`
  - `frontend/src/pages/LoginPage.tsx`
  - `frontend/src/pages/AuthCallbackPage.tsx`
  - `frontend/src/store/auth-store.ts`
  - `frontend/src/hooks/useSessionBootstrap.ts`
  - `frontend/src/routes/ProtectedRoute.tsx`
  - `frontend/src/routes/AdminRoute.tsx`
- API endpoints:
  - `POST /auth/microsoft`
  - `GET /auth/microsoft`
  - `GET /auth/microsoft/callback`
  - `POST /auth/refresh`
  - `POST /auth/logout`
- Components/pages:
  - `LoginPage.tsx`
  - `AuthCallbackPage.tsx`
  - `ProtectedRoute.tsx`
  - `AdminRoute.tsx`
- Notes:
  - `LoginPage.tsx` currently redirects straight to `${VITE_API_URL}/auth/microsoft`.
  - `frontend/src/lib/api.ts` also exports `requestMicrosoftRedirect()`, but the active login page does not use it.
  - `passport.ts` hardcodes the admin allowlist to `maxence.larche@epita.fr`.

### Dashboard and Navigation Shell
- Description: authenticated dashboard showing user overview, active events, open positions, balance, quick navigation, and the shared app shell.
- Status: fully implemented
- Key files:
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/components/layout/DashboardShell.tsx`
  - `frontend/src/hooks/useAuthenticatedUser.ts`
  - `frontend/src/lib/api.ts`
- API endpoints:
  - `GET /users/me`
  - `GET /events`
  - `GET /users/me/bets`
- Components/pages:
  - `DashboardPage.tsx`
  - `DashboardShell.tsx`
  - `LoadingScreen.tsx`
  - `AppErrorBoundary.tsx`

### Event Browsing, Detail Pages, and Live Odds History
- Description: list open events, search/filter client-side, inspect event details, view current odds, pool information, personal bets, and history chart polling.
- Status: partial
- Key files:
  - `backend/src/routes/events.routes.ts`
  - `backend/src/controllers/events.controller.ts`
  - `backend/src/services/event.service.ts`
  - `frontend/src/pages/EventsMarketsPage.tsx`
  - `frontend/src/pages/EventDetailPage.tsx`
  - `frontend/src/components/EventCard.tsx`
  - `frontend/src/components/OddsHistoryChart.tsx`
- API endpoints:
  - `GET /events`
  - `GET /events/:id`
  - `GET /events/:id/odds-history`
  - `GET /events/:id/my-bet`
- Components/pages:
  - `EventsMarketsPage.tsx`
  - `EventDetailPage.tsx`
  - `EventCard.tsx`
  - `OddsHistoryChart.tsx`
- Why status is partial:
  - The frontend exposes category and status filters.
  - `eventService.listOpenEvents()` only returns `OPEN` events, so the UI status filter cannot truly surface `CLOSED`, `RESOLVED`, or `CANCELLED` markets from the public list.

### Event Betting Engine
- Description: single-event bets, multi-simple ticket bets, parlay bets, balance debits, odds snapshots, payouts, odds history writes, and user bet retrieval.
- Status: fully implemented
- Key files:
  - `backend/src/services/event.service.ts`
  - `backend/src/schemas/events.schemas.ts`
  - `frontend/src/components/BetDrawer.tsx`
  - `frontend/src/components/BetCartDrawer.tsx`
  - `frontend/src/store/bet-cart-store.ts`
  - `frontend/src/lib/api.ts`
- API endpoints:
  - `POST /events/:id/bet`
  - `POST /events/bets`
  - `POST /events/parlay`
  - `GET /users/me/bets`
- Components/pages:
  - `BetDrawer.tsx`
  - `BetCartDrawer.tsx`
  - `EventDetailPage.tsx`
  - `EventsMarketsPage.tsx`
- Notes:
  - `event.service.ts` retries Prisma serializable transaction failures (`P2034`) and centralizes odds recalculation and settlement logic.
  - API payloads and responses are normalized to snake_case.

### Event Proposal Workflow
- Description: authenticated users can propose events; admins can review, approve, or reject proposals.
- Status: fully implemented
- Key files:
  - `backend/src/services/event.service.ts`
  - `backend/src/routes/events.routes.ts`
  - `frontend/src/pages/EventsMarketsPage.tsx`
  - `frontend/src/pages/admin/AdminEventsPage.tsx`
- API endpoints:
  - `POST /events/proposals`
  - `GET /events/proposals/me`
  - `GET /admin/events/proposals`
  - `POST /admin/events/proposals/:proposalId/approve`
  - `POST /admin/events/proposals/:proposalId/reject`
- Components/pages:
  - Proposal modal in `EventsMarketsPage.tsx`
  - Proposal review section in `AdminEventsPage.tsx`

### Admin Event Operations
- Description: admins can create events, update open events, search users for exclusion lists, close events, resolve events, cancel events, and review proposal queues.
- Status: fully implemented
- Key files:
  - `backend/src/routes/events.routes.ts`
  - `backend/src/controllers/events.controller.ts`
  - `backend/src/services/event.service.ts`
  - `frontend/src/pages/admin/AdminEventsPage.tsx`
- API endpoints:
  - `GET /admin/events`
  - `POST /admin/events`
  - `PATCH /admin/events/:id`
  - `POST /admin/events/:id/close`
  - `POST /admin/events/:id/resolve`
  - `POST /admin/events/:id/cancel`
  - `GET /users` (admin-only search used for exclusions)
- Components/pages:
  - `AdminEventsPage.tsx`
- Notes:
  - Admin audit entries are written through `logAdminAction()` into `AdminLog`.
  - There is no active admin analytics, logs UI, or user moderation UI despite schema support and roadmap plans.

### Profile Management and Avatar Upload
- Description: users can fetch their profile, update their pseudo, and upload an avatar image that is resized and stored remotely.
- Status: partial
- Key files:
  - `backend/src/routes/user.routes.ts`
  - `backend/src/services/user.service.ts`
  - `backend/src/services/storage.service.ts`
  - `frontend/src/pages/AccountProfilePage.tsx`
  - `frontend/src/lib/api.ts`
- API endpoints:
  - `GET /users/me`
  - `PATCH /users/me`
  - `POST /users/me/avatar`
- Components/pages:
  - `AccountProfilePage.tsx`
- Why status is partial:
  - The code path is implemented end-to-end.
  - `storage.service.ts` expects `SUPABASE_SERVICE_ROLE_KEY`, but the checked-in `backend/.env` uses `SUPABASE_SERVICE_KEY`, so avatar upload will fail unless env naming is corrected.

### Roulette Casino Game
- Description: authenticated roulette with server-authoritative spin resolution, multiple bet shapes, payout calculation, history/stat widgets, animated wheel, and sound hooks.
- Status: fully implemented
- Key files:
  - `backend/src/routes/casino.routes.ts`
  - `backend/src/controllers/casino.controller.ts`
  - `backend/src/services/roulette.service.ts`
  - `backend/src/utils/roulette-rng.ts`
  - `frontend/src/components/casino/RouletteGame.tsx`
  - `frontend/src/components/casino/RouletteWheel.tsx`
  - `frontend/src/components/casino/BettingGrid.tsx`
  - `frontend/src/lib/casino/rouletteEngine.ts`
  - `frontend/src/lib/casino/resultResolver.ts`
- API endpoints:
  - `POST /casino/roulette/spin`
- Components/pages:
  - `CasinoPage.tsx`
  - `RouletteGame.tsx`
  - `RouletteWheel.tsx`
  - `BettingGrid.tsx`
  - `RouletteControls.tsx`
  - `RouletteHistory.tsx`
  - `RouletteStats.tsx`
- Notes:
  - Backend RNG uses `crypto.randomInt`.
  - `generateProvablyFairSpin()` exists in `roulette-rng.ts` but is not used.
  - `soundManager.ts` references sound files, but no audio assets were found in `frontend/public` or `frontend/src`.

### Blackjack Casino Game
- Description: authenticated blackjack with deal, hit, stand, and double actions, in-memory active sessions, server-side dealer resolution, and frontend table UI.
- Status: fully implemented
- Key files:
  - `backend/src/routes/casino.routes.ts`
  - `backend/src/controllers/casino.controller.ts`
  - `backend/src/services/blackjack.service.ts`
  - `frontend/src/components/casino/BlackjackGame.tsx`
- API endpoints:
  - `POST /casino/blackjack/deal`
  - `POST /casino/blackjack/hit`
  - `POST /casino/blackjack/stand`
  - `POST /casino/blackjack/double`
- Components/pages:
  - `CasinoPage.tsx`
  - `BlackjackGame.tsx`

### Legacy or Not-Yet-Activated Systems
- Description: functionality that exists only in legacy JSX/JS/Python prototypes, database fields, or docs, but not in the active TS product flow.
- Status: planned or legacy-only
- Areas found:
  - Leaderboard UI/routes in legacy frontend and mock backend, but no active TS leaderboard page or Express leaderboard endpoint.
  - Daily reward fields (`lastRewardAt`, `streakDays`) exist in Prisma and legacy prototypes, but there is no active TS route/controller/service for claiming rewards.
  - Badges exist in Prisma and legacy code, but there is no active unlock/display flow in the TS app.
  - `validator` role exists in Prisma, but current admin protection uses `requireRole(["admin"])`; no active validator-specific workflow was found.
  - The repo contains outdated Python/FastAPI and JS mock backends that should not be treated as production runtime.

## API Patterns

### Route Structure
- Express app composition lives in `backend/src/app.ts`.
- Routers are mounted by product area:
  - `/health`
  - `/auth`
  - `/casino`
  - `/events`
  - `/admin/events`
  - `/users`
- Public/auth-init routes are isolated under `/auth`; most feature routes require auth.
- Admin event routes are on a dedicated `adminEventsRouter`, not mixed into the user-facing router.

Actual mount pattern from `backend/src/app.ts`:

```ts
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/casino", casinoRouter);
app.use("/events", eventsRouter);
app.use("/admin/events", adminEventsRouter);
app.use("/users", userRouter);
```

### Middleware Usage
- Global middleware:
  - `cors({ origin: env.FRONTEND_URL, credentials: true })`
  - `helmet()`
  - `cookieParser()`
  - `express.json()`
  - `passport.initialize()`
  - `requestLogger`
- Auth enforcement:
  - `requireAuth` verifies bearer access tokens, loads the user, checks `isBanned`, and validates `sessionVersion`.
- Role enforcement:
  - `requireRole(["admin"])` protects admin-only endpoints.
- Validation:
  - `validateBody(schema)` runs `schema.safeParse(request.body ?? {})` and replaces `request.body` with parsed data.
  - Query validation is sometimes done inside controllers instead of via reusable middleware, for example `searchUsersController`.
- Rate limiting:
  - Auth routes have an auth limiter.
  - Betting routes use `betLimiter`.
  - Admin events use `adminLimiter`.
  - User profile/avatar endpoints use `userLimiter`.
- File uploads:
  - Avatar uploads use Multer memory storage with a `2 MB` file-size cap.

Actual route pattern from `backend/src/routes/events.routes.ts`:

```ts
eventsRouter.use(requireAuth);
eventsRouter.get("/", listEventsController);
eventsRouter.post("/bets", betLimiter, validateBody(placeSimpleBetsSchema), placeSimpleBetsController);
eventsRouter.post("/parlay", betLimiter, validateBody(placeParlayBetSchema), placeParlayBetController);

adminEventsRouter.use(requireAuth, requireRole(["admin"]), adminLimiter);
adminEventsRouter.post("/", validateBody(createEventSchema), createEventController);
adminEventsRouter.post("/:id/resolve", validateBody(resolveEventSchema), resolveEventController);
```

### Controller Pattern
- Controllers are thin wrappers around services.
- The common shape is:
  - extract authenticated user or params
  - call a service
  - `response.json(...)`
  - `catch` and `next(error)`
- There is no complex business logic in controllers; domain logic sits in services.

Actual controller pattern from `backend/src/controllers/user.controller.ts`:

```ts
export const updateCurrentUserController: RequestHandler = async (request, response, next) => {
  try {
    const userId = getAuthenticatedUserId(request);
    const updatedUser = await userService.updateCurrentUser(userId, request.body);
    response.json(updatedUser);
  } catch (error) {
    next(error);
  }
};
```

### Service Pattern
- Backend services are the true domain layer.
- `event.service.ts` is the heaviest service and owns:
  - validation beyond Zod
  - odds math
  - payout/settlement
  - admin logging
  - serializing Prisma records into API DTOs
  - transaction boundaries
- `roulette.service.ts`, `blackjack.service.ts`, `user.service.ts`, and `auth.service.ts` follow the same pattern: services return ready-to-serialize API objects or domain DTOs.
- Transaction-heavy paths use Prisma serializable transactions with retry logic.

Actual transaction wrapper from `backend/src/services/event.service.ts`:

```ts
private async withSerializableTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError("La transaction evenement a echoue.", 500);
}
```

### Response Formats
- JSON keys are mostly snake_case at the API boundary, even though the TypeScript code uses camelCase internally.
- User serialization example from `backend/src/utils/user-serializer.ts`:
  - `avatar_url`
  - `streak_days`
  - `last_reward_at`
  - `created_at`
- Auth responses return:
  - `redirect_url`
  - `access_token`
  - `refresh_token`
- Betting/casino responses return keys like:
  - `new_balance`
  - `bet_amount`
  - `result_number`
  - `winning_bets`
- Event service serializers also normalize event/bet/proposal payloads to snake_case.

Actual auth response example from `backend/src/controllers/auth.controller.ts`:

```ts
response.json({
  redirect_url: redirectUrl.toString(),
});
```

### Error Handling Approach
- Centralized in `backend/src/middleware/error-handler.ts`.
- Error classes and outcomes:
  - `AppError` -> custom HTTP status + optional `details`
  - `ZodError` -> `400` with flattened validation details
  - JWT errors -> `401`
  - fallback -> `500`
- Unknown routes hit `notFoundHandler` and return `{ message: "Route introuvable." }`.
- Request logging is done after response completion via `requestLogger`.

Actual error-handler pattern:

```ts
if (error instanceof AppError) {
  response.status(error.statusCode).json({
    message: error.message,
    details: error.details,
  });
  return;
}
```

## Code Quality Standards

### TypeScript Configuration
- Frontend (`frontend/tsconfig.json`):
  - `strict: true`
  - `target: ES2020`
  - `module: ESNext`
  - `moduleResolution: Bundler`
  - `jsx: react-jsx`
  - `allowJs: false`
  - `noEmit: true`
- Backend (`backend/tsconfig.json`):
  - `strict: true`
  - `module: commonjs`
  - `target: es2020`
  - `rootDir: "."`
  - `outDir: "dist"`

### Linting and Formatting
- No ESLint config was found.
- No Prettier config was found.
- The codebase relies on convention rather than enforced lint/format tooling at the moment.

### Observed Code Style Conventions
- Active code prefers TypeScript over JavaScript.
- Backend is layered as `routes -> controllers -> services -> Prisma/helpers`.
- Validation schemas are grouped by domain in `backend/src/schemas`.
- API DTOs are intentionally serialized to snake_case.
- Frontend uses:
  - React function components
  - React Query for server data
  - Zustand for auth/cart state
  - Tailwind utility classes and shared UI primitives
- Comments are relatively sparse in the active code; the repo relies more on naming and extracted helpers than on inline explanation.
- Some files and docs contain mojibake or encoding artifacts such as `Ã©` / `Ã¨`.

### Testing Approach
- No automated test files or test runner config were found.
- No Jest, Vitest, Playwright, Cypress, or other test config files were found.
- Current confidence comes mostly from buildability and manual flows, not automated regression coverage.

### Build/Compile Status
- `npm run build --workspace backend` passes.
- `npm run build --workspace frontend` passes.

## Environment Variables

Observed sources:
- Root: `.env`, `.env.example`
- Backend: `backend/.env`, `backend/.env.example`
- Frontend: `frontend/.env`, `frontend/.env.example`

Do not copy secret values into agent notes. Only variable names and usage belong here.

| Variable | Seen in repo | Purpose | Used in |
|---|---|---|---|
| `VITE_API_URL` | root `.env.example`, frontend `.env`, frontend `.env.example` | Frontend API base URL | `frontend/src/lib/api.ts`, `frontend/src/pages/LoginPage.tsx` |
| `VITE_SENTRY_DSN` | root `.env.example`, frontend `.env.example` | Planned frontend Sentry DSN | No active usage found |
| `VITE_MICROSOFT_CLIENT_ID` | frontend `.env` | Legacy/planned frontend-only Microsoft config | No active usage found |
| `PORT` | backend `.env`, expected by backend env schema | Express listen port | `backend/src/index.ts`, `backend/src/config/env.ts` |
| `NODE_ENV` | root env files, backend env files | Environment mode for runtime behavior | `backend/src/config/env.ts`, cookie behavior in `auth.service.ts` |
| `DATABASE_URL` | root env files, backend env files | Prisma primary DB connection string | `backend/prisma/schema.prisma`, `backend/src/config/env.ts`, `backend/src/services/storage.service.ts` |
| `DIRECT_URL` | root env files, backend env files | Direct Postgres connection for Prisma | `backend/prisma/schema.prisma`, `backend/src/config/env.ts` |
| `JWT_SECRET` | root env files, backend env files | Access token signing secret | `backend/src/config/env.ts`, `backend/src/services/auth.service.ts`, `backend/src/middleware/require-auth.ts` |
| `JWT_REFRESH_SECRET` | root env files, backend env files | Refresh token signing secret | `backend/src/config/env.ts`, `backend/src/services/auth.service.ts` |
| `MICROSOFT_CLIENT_ID` | root env files, backend env files | Microsoft OAuth app config | `backend/src/config/env.ts`, `backend/src/config/passport.ts` |
| `MICROSOFT_CLIENT_SECRET` | root env files, backend env files | Microsoft OAuth app secret | `backend/src/config/env.ts`, `backend/src/config/passport.ts` |
| `MICROSOFT_TENANT_ID` | root env files, backend env files | Microsoft tenant selection | `backend/src/config/env.ts`, `backend/src/config/passport.ts` |
| `MICROSOFT_CALLBACK_URL` | root env files, backend env files | OAuth callback URL | `backend/src/config/env.ts`, `backend/src/config/passport.ts` |
| `FRONTEND_URL` | root env files, backend env files | CORS allowlist and OAuth callback redirect target | `backend/src/app.ts`, `backend/src/controllers/auth.controller.ts` |
| `API_BASE_URL` | root env files, backend env files | Backend absolute base URL for redirect construction | `backend/src/config/env.ts`, `backend/src/controllers/auth.controller.ts` |
| `COOKIE_DOMAIN` | root env files, backend env files | Refresh-cookie domain scoping | `backend/src/config/env.ts`, `backend/src/services/auth.service.ts` |
| `SENTRY_DSN` | root env files, backend env files | Planned backend Sentry DSN | Validated in `backend/src/config/env.ts`; no active Sentry init found |
| `SUPABASE_URL` | backend `.env`, optional in backend env schema | Explicit Supabase Storage URL override | `backend/src/config/env.ts`, `backend/src/services/storage.service.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | expected by backend env schema and storage service | Supabase service-role key for avatar uploads | `backend/src/config/env.ts`, `backend/src/services/storage.service.ts` |
| `SUPABASE_AVATARS_BUCKET` | optional in backend env schema | Storage bucket name, defaults to `avatars` | `backend/src/config/env.ts`, `backend/src/services/storage.service.ts` |
| `SUPABASE_SERVICE_KEY` | backend `.env` only | Local env naming mismatch; legacy alias not read by current TS code | Not consumed by active backend code |

Important env caveats:
- `backend/src/config/env.ts` expects `SUPABASE_SERVICE_ROLE_KEY`, but `backend/.env` currently contains `SUPABASE_SERVICE_KEY`.
- `backend/.env.example` does not document every Supabase storage variable currently used by code.
- `VITE_SENTRY_DSN`, `SENTRY_DSN`, and `VITE_MICROSOFT_CLIENT_ID` appear to be placeholders or leftovers rather than active runtime requirements.

## Features TODO

No meaningful active-source `TODO` / `FIXME` markers were found. The main backlog comes from `docs/ROADMAP.md`, `docs/PRODUCT_BRIEF.md`, and older architecture/spec docs.

### High-Priority Gaps Still Missing in the Active TS App
- Leaderboard:
  - Mentioned in roadmap/product docs and legacy JSX app.
  - No active TS page, no active Express leaderboard endpoint.
- Daily reward:
  - Roadmap marks it as MVP-critical.
  - Prisma fields exist, but there is no active claim endpoint or frontend flow.
- Badges/gamification:
  - Prisma `Badge` model exists.
  - No active unlock logic or frontend rendering in the TS app.
- Admin user management and analytics:
  - Roadmap expects user bans, role updates, balance resets, analytics, and audit log views.
  - Current TS app only exposes admin event management and user search for exclusions.
- Email notifications for event validation/rejection:
  - Planned in docs.
  - No Nodemailer/SendGrid implementation in active code.

### Medium-Priority Reality Fixes
- Public event list filters need backend support for non-`OPEN` statuses.
- Avatar upload env naming should be corrected so Supabase storage can work reliably.
- Sentry env vars are present, but monitoring is not wired up.
- Missing audio assets should be added if roulette sounds are expected in production.

### Nice-to-Have / Phase-2 Style Work from Docs
- Advanced blackjack features such as split or insurance
- Richer admin analytics charts
- Better leaderboard/gamification polish
- Additional casino polish, confetti, and richer animation
- Deployment/QA hardening and smoke-test coverage

Roadmap caution:
- `docs/ROADMAP.md` is a planning checklist, not a source of truth for implementation status.
- Many roadmap items are still unchecked even though the code already implements them.

## Important Notes

- Target audience:
  - `docs/PRODUCT_BRIEF.md` positions the product for roughly 60 EPITA students, specifically the SIGL 2027 cohort.
- Business constraints:
  - Virtual tokens only; no real-money gambling.
  - Authentication is restricted to Microsoft accounts with `@epita.fr` emails.
  - Mobile usability is part of the MVP expectations.
- Deadlines mentioned in docs:
  - Sprint window in `docs/ROADMAP.md`: `2026-04-01` to `2026-04-07`
  - Goal: MVP deployed and usable during that week
  - Product brief mentions an intensive one-week build and a Friday launch target
- Documentation drift to watch for:
  - Some docs and README snippets still mention backend port `3000`, but the current env examples and active frontend/backend integration use `3001`.
  - Docs mention React `18`, Router `6`, Azure AD B2C, and sometimes Vercel-serverless assumptions; the active code uses React `19`, `react-router-dom` `7`, `passport-microsoft`, and a conventional Express server.
  - `docs/ROULETTE_GUIDE.md` assumes a Three.js direction, but the active roulette UI uses custom DOM/canvas animation and there is no installed Three.js dependency.
  - `docs/SPECS_EVENT.md` does not perfectly match the active service rules and settlement logic.
- Operational guidance for agents:
  - Treat the TypeScript frontend and TypeScript Express backend as the source of truth.
  - Treat legacy JSX, JS backend, Python backend, and `docs/Frontend to follow/` as reference-only unless a task explicitly targets them.
  - Preserve the snake_case API contract when adding backend endpoints or frontend DTOs.
  - Be careful with env drift around Supabase storage and with mixed-encoding files.
- Current repo health snapshot:
  - Root workspace scripts orchestrate frontend and backend together.
  - Both active workspaces build successfully.
  - There is no automated test suite or lint gate yet, so manual verification remains important.

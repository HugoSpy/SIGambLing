# PROJECT_MEMORY.md — SIGambling Living Documentation

**Last Updated:** 2026-04-06  
**Last Updated By:** Claude (session recap 06/04/2026)

---

## 1. Project Overview

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Name**          | SIGambling                                                                |
| **Purpose**       | Casino & sports-betting platform with virtual currency for EPITA students |
| **Target Users**  | ~60 EPITA SIGL 2027 students                                              |
| **Currency**      | Virtual tokens (starting balance: 1,000 tokens/user)                      |
| **Current Phase** | Production — fully deployed & feature-complete                            |
| **Repository**    | https://github.com/HugoSpy/SIGambLing                                     |

---

## 2. Architecture

### Frontend

| Property             | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| **Framework**        | React 19                                                         |
| **Language**         | TypeScript 5.7                                                   |
| **Build Tool**       | Vite 6                                                           |
| **Routing**          | React Router DOM v7                                              |
| **Styling**          | Tailwind CSS 3.4                                                 |
| **State Management** | Zustand 5 (client state) + TanStack React Query 5 (server state) |
| **Animation**        | Framer Motion 12 + GSAP 3.12                                     |
| **Forms**            | React Hook Form + Zod validation                                 |
| **HTTP Client**      | Axios 1.8                                                        |
| **Notifications**    | React Hot Toast                                                  |
| **Icons**            | Lucide React                                                     |
| **Fonts**            | Inter + Space Grotesk (via @fontsource)                          |
| **Audio**            | Howler.js                                                        |

**Location:** `/frontend`  
**Entry Point:** `frontend/src/main.tsx`  
**Dev Port:** `5173`

**Key Dependencies:**

```json
"react": "^19.0.0",
"react-router-dom": "^7.0.0",
"zustand": "^5.0.3",
"@tanstack/react-query": "^5.66.9",
"framer-motion": "^12.4.7",
"gsap": "^3.12.7",
"zod": "^3.24.2",
"axios": "^1.8.1",
"howler": "^2.2.4",
"canvas-confetti": "^1.9.4",
"@vercel/analytics": "^2.0.1"
```

### Backend

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Framework**        | Express 4.21                                      |
| **Language**         | TypeScript 5.7                                    |
| **Runtime**          | Node.js (see `.nvmrc` / engines)                  |
| **ORM**              | Prisma 6.4                                        |
| **Validation**       | Zod 3.24                                          |
| **Authentication**   | Passport.js + passport-microsoft                  |
| **Token Strategy**   | JWT (access 15m + refresh 30d)                    |
| **File Storage**     | Local disk on NAS (`/var/www/sigambling/avatars`) |
| **Image Processing** | Sharp                                             |
| **Logging**          | Winston                                           |
| **Rate Limiting**    | express-rate-limit                                |
| **Security Headers** | Helmet                                            |

**Location:** `/backend`  
**Entry Point:** `backend/src/index.ts`  
**Dev Port:** `3001`

**Key Dependencies:**

```json
"express": "^4.21.2",
"@prisma/client": "^6.4.1",
"passport": "^0.7.0",
"passport-microsoft": "^2.1.0",
"jsonwebtoken": "^9.0.2",
"bcrypt": "^5.1.1",
"helmet": "^8.0.0",
"express-rate-limit": "^7.5.0",
"zod": "^3.24.2",
"winston": "^3.17.0"
```

### Database

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| **Provider**        | PostgreSQL 15                        |
| **Host**            | VM Ubuntu NAS (local 127.0.0.1:5432) |
| **ORM**             | Prisma 6                             |
| **Schema Location** | `backend/prisma/schema.prisma`       |

**Key Models:** `User`, `Event`, `Bet`, `BetLeg`, `CasinoGame`, `Badge`, `Jackpot`, `JackpotContribution`, `EventProposal`, `EventExclusion`, `OddsHistory`, `AdminLog`, `ChatMessage`, `ChatBan`

### Deployment

**Frontend:**

- Platform: Vercel
- URL: https://www.sigambling.fr (domaine custom via Cloudflare)
- Status: ✅ Live
- Config: `frontend/vercel.json` — SPA rewrites (toutes les routes → `/index.html`)

**Backend:**

- Platform: VM Ubuntu 24 hébergée sur Proxmox
- URL: https://api.sigambling.fr (exposé via Cloudflare Tunnel)
- Status: ✅ Live
- Process manager: PM2 (auto-restart au boot via systemd)
- SSH: `ssh sigambling` (alias dans `~/.ssh/config` via Cloudflare Tunnel — `ssh.sigambling.fr`)

**Env vars prod notables:**

```env
COOKIE_DOMAIN=.sigambling.fr   # point devant pour cross-subdomain (www + api)
FRONTEND_URL=https://www.sigambling.fr
NODE_ENV=production
```

**Infrastructure Diagram:**

```
Users (EPITA SIGL 2027)
        │
        ▼ HTTPS
┌───────────────────┐
│  React SPA        │  Vite + React 19 + Tailwind
│  Vercel + CDN     │  https://www.sigambling.fr
└───────────┬───────┘
            │ REST API (Bearer JWT)
            ▼ HTTPS
┌───────────────────┐    ┌──────────────────────┐
│  Cloudflare       │───▶│  Express API          │
│  Tunnel           │    │  VM Ubuntu 24/Proxmox │  PM2 + systemd
└───────────────────┘    │  https://api.sigambling.fr
                         └───────────┬──────────┘
                                     │
                         ┌───────────┴──────────┐
                         │                      │
                         ▼ PostgreSQL            ▼ Filesystem
              ┌───────────────────┐   ┌───────────────────────┐
              │  PostgreSQL 15    │   │  Local avatar storage │
              │  127.0.0.1:5432   │   │  /var/www/sigambling/ │
              │  DB: sigambling   │   │  avatars/             │
              └───────────────────┘   └───────────────────────┘
                         │
                         ▼ OAuth2
              ┌───────────────────┐
              │  Microsoft Azure  │  passport-microsoft
              │  (EPITA tenant)   │  scope: openid, profile, email
              └───────────────────┘
```

**Notes infra:**

- `app.set('trust proxy', 1)` dans `app.ts` → express-rate-limit fonctionne correctement derrière Cloudflare
- `cloudflared` service systemd : `After=network-online.target` ajouté pour fix démarrage
- Réseau VM : bridge vmbr0 → bridge isolé `10.10.10.x` (IP statique via netplan) ; gateway manquante sur nouveau bridge → cloudflared passe via le host Proxmox

---

## 3. Authentication & Security

### OAuth Flow

| Property           | Value                                             |
| ------------------ | ------------------------------------------------- |
| **Provider**       | Microsoft (Azure AD)                              |
| **Strategy**       | passport-microsoft                                |
| **Allowed Domain** | `@epita.fr` only (enforced in passport config)    |
| **Tenant**         | `MICROSOFT_TENANT_ID` env var (default: `common`) |
| **Scopes**         | `openid`, `profile`, `email`, `User.Read`         |
| **Admin Accounts** | Managed in DB (`role` field) — no hardcoded list  |

### Token Management

| Token             | Lifetime   | Storage                                   |
| ----------------- | ---------- | ----------------------------------------- |
| **Access Token**  | 15 minutes | `Authorization: Bearer` header            |
| **Refresh Token** | 30 days    | HttpOnly cookie                           |
| **OAuth State**   | 10 minutes | HttpOnly cookie (`microsoft_oauth_state`) |

**Refresh strategy:** Access token sent in header, refresh token in HttpOnly cookie. `sessionVersion` field in DB invalidates all sessions on forced logout.

### Security Checklist

- [x] OAuth CSRF protection (JWT-signed state parameter in cookie)
- [x] PKCE-style state nonce validation (`verifyMicrosoftOAuthState`)
- [x] HttpOnly cookies for refresh token and OAuth state
- [x] No tokens in localStorage (Bearer in-memory only)
- [x] Refresh token rotation via `sessionVersion`
- [x] CORS allowlist (`FRONTEND_URL` env var only)
- [x] SameSite cookie policy (Lax dev / None+Secure prod)
- [x] Input validation (Zod schemas on all routes)
- [x] SQL injection protection (Prisma parameterized queries)
- [x] XSS protection (Helmet + HttpOnly cookies)
- [x] Rate limiting (per-route, per-user limiters)
- [x] Helmet security headers
- [x] Domain restriction (@epita.fr email enforced)
- [x] File upload size limit (2 MB avatar cap)
- [ ] PKCE full implementation (state parameter used, not full PKCE code_challenge)
- [ ] Sentry error tracking (env var slot exists, optional)

**Recent Security Commits:**

- `4e48fe8` — Remove token from OAuth callback URLs
- `2b4aa40` — Harden Microsoft OAuth state validation

---

## 4. Features

### Implemented

**Games:**

- [x] **Roulette** — Full European roulette with straight, split, street, corner, six-line, dozen, column, and even-money bets. Server-side RNG (`roulette-rng.ts`). Jackpot contribution on each spin.
- [x] **Blackjack** — Deal, Hit, Stand, Double Down, Insurance, Split. Multi-phase state machine (`blackjack.service.ts`). Jackpot contribution.
  - Modal résultat centré style Stake (GAGNÉ/PERDU/ÉGALITÉ + montant, sans flou)
  - Ring coloré autour de la table selon résultat (emerald/red/orange)
  - Boutons d’action sur la table (Tirer/Rester/Doubler/Assurance)
  - Split complet (deux mains, résolution indépendante, split d’As)
  - Déclin d’assurance explicite (`POST /casino/blackjack/decline-insurance`)
  - Restauration de partie après refresh (`GET /casino/blackjack/current`)
  - Fix bust → toujours DÉFAITE même si dealer bust aussi
- [x] **Casino hub page** (`CasinoPage.tsx`)

**Betting System:**

- [x] Simple bets on events (single option)
- [x] Parlay (combined/accumulator) bets (`BetLeg` model)
- [x] Live pari-mutuel odds calculation
- [x] Odds-change confirmation modal before bet placement
- [x] Odds history chart per event

**User Features:**

- [x] Microsoft OAuth login (EPITA @epita.fr only)
- [x] Auto-generated pseudo from EPITA email
- [x] User profile & avatar upload (local NAS storage, 2MB limit, processed with Sharp)
- [x] Balance management
- [x] Balance navbar temps réel via Zustand (`liveBalance` dans `DashboardShell`)
- [x] Personal bet history (`/users/me/bets`) + page `/history` complète (paginated + filtres)
- [x] Daily reward claiming with streak system
- [x] Streak tiers: Bronze (1d), Silver (3d), Gold (7d), Lumineux (14d), Mythique (30d)
- [x] Leaderboard
- [x] Badge/gamification system (10+ badge types)
- [x] Event proposals (users can suggest new events)
- [x] ScrollToTop au changement de route

**Admin Features:**

- [x] Admin event management (create, update, close, resolve, cancel)
- [x] Event proposal review (approve/reject with reason)
- [x] User search
- [x] Manual balance adjustment
- [x] Manual badge unlock
- [x] Statistics overview (vraies données DB via `getStatisticsOverview`)
- [x] Events leaderboard admin (top 5 par volume via `getEventsLeaderboard`)
- [x] Jackpot manual payout trigger
- [x] AdminLog model for audit trail
- [x] Sections événements collapsées (ouverts visibles, terminés repliés)
- [x] Sliders de cotes liés lors de création d’événement (total = 100%)
- [x] Badge notification sur onglet « Propositions » si pending

**Jackpot System:**

- [x] Progressive jackpot fed by casino game wagers (1% / 100 bps contribution rate)
- [x] Jackpot state per user (libellé « Jackpot » — anciennement « Pot permanent »)
- [x] Admin-triggered payout

**Betting:**

- [x] Rate limit 30s par `(userId, eventId)` sur placement de pari (anti-spam)
- [x] « Événements populaires » 🔥 (top 5 par `totalPool`) dans le dashboard
- [x] « Mes positions » filtre PENDING sur événements OPEN/CLOSED uniquement

**Gamification :**

- [x] Pastille verte `animate-pulse` sur bouton Profil sidebar si récompense disponible
- [x] Modal récompense quotidienne au clic sur Profil (avant navigation)
- [x] Fix `streakAlive` pour nouveaux utilisateurs (`lastRewardAt === null` → `claim_available`)

**Chat System (temps réel) :**

- [x] SSE-based real-time chat (`/chat/stream` endpoint, heartbeat 15s)
- [x] Envoi de messages (`POST /chat/message`, max 300 chars)
- [x] Historique (derniers 50 messages au chargement)
- [x] Rate limiting : 3 msgs / 3s (serveur + client), admins exemptés
- [x] Banwords filter (`banwords.txt`) + mute escalation (1h/offense, permanent à 3)
- [x] @mentions avec autocomplete (`MentionDropdown`, `GET /users/mention-search?q=`)
- [x] Highlight mentions (jaune = mention d'un autre, bleu = mention de soi)
- [x] Notification sonore Howler pour mentions quand chat fermé
- [x] Badge unread + unread mentions (Zustand `chat-store`)
- [x] Panel drag (header mousedown), resize (left/top/top-left handles)
- [x] Zoom chat : 75/90/100/110/125/150%
- [x] Toutes les préférences panel persistées en DB (`PATCH /users/me/chat-preferences`)
- [x] Ban status endpoint (`GET /chat/ban-status`)
- [x] Admins bypass toutes les restrictions (rate limit, ban, mute, banwords)

**Login & Analytics :**

- [x] LoginPage redesignée : hero "Pariez sur l'avenir", feature cards 4 colonnes, stats publiques
- [x] Endpoint public `GET /stats` (stats affichées sur la login page)
- [x] Vercel Analytics intégré (`@vercel/analytics` injecté dans `main.tsx`)

**Pages ajoutées :**

- [x] RewardsPage (`/rewards`) — page dédiée récompenses quotidiennes, countdown HH:MM:SS, confetti (`canvas-confetti`)

**Backend Maintenance :**

- [x] Cron job quotidien (02:00) — purge `odds_history` des événements resolved/cancelled > 24h
- [x] Winston log rotation : `DailyRotateFile` (50MB/14j combinés, 20MB/30j erreurs)
- [x] Banword loader (`banword-loader.ts`) — normalisation unicode, matching intelligent (word-boundary pour mots courts)

### Planned / Optionnel

- Slots game (mentionné dans `CasinoGameType` enum — pas prioritaire, pourrait changer)
- Full Sentry error tracking (env var slot existe)

---

## 5. API Routes

All routes proxied via Vite dev server from port 5173 → 3001.

### Health & Public

```
GET  /health
GET  /stats                       — Public statistics (login page)
```

### Authentication (`/auth`)

```
POST /auth/microsoft              — Get Microsoft OAuth redirect URL
GET  /auth/microsoft              — Initiate Microsoft OAuth flow
GET  /auth/microsoft/callback     — OAuth callback handler
POST /auth/refresh                — Refresh access token (strictLimiter: 10/min)
POST /auth/logout                 — Logout (strictLimiter: 10/min)
```

### Users (`/users`) — requires auth

```
GET    /users/me                  — Get current user profile
GET    /users/me/bets             — List current user event bets
PATCH  /users/me                  — Update profile (pseudo, etc.)
POST   /users/me/avatar           — Upload avatar (multipart, 2MB limit)
GET    /users                     — Search users (admin only)
GET    /users/badges/catalog      — List available badges (admin only)
GET    /users/mention-search      — Mention autocomplete (?q=)
PATCH  /users/me/chat-preferences — Persist chat panel state (width, height, x, y, zoom)
PATCH  /users/:id/balance         — Adjust user balance (admin only)
POST   /users/:id/badges          — Unlock badge for user (admin only)
```

### Chat (`/chat`) — requires auth

```
GET    /chat/history              — Last 50 messages (chronological)
GET    /chat/ban-status           — Get user's ban/mute record
POST   /chat/message              — Send message (max 300 chars)
GET    /chat/stream               — SSE real-time stream (heartbeat 15s)
```

### Events (`/events`) — requires auth

```
GET    /events                    — List events
GET    /events/proposals/me       — List my proposals
POST   /events/proposals          — Submit event proposal
POST   /events/bets               — Place simple bet(s)
POST   /events/parlay             — Place parlay (accumulator) bet
GET    /events/:id                — Get event details
GET    /events/:id/odds-history   — Get odds history for event
GET    /events/:id/my-bet         — Get my bet on this event
POST   /events/:id/bet            — Place bet on event
```

### Admin Events (`/admin/events`) — requires auth + admin role

```
GET    /admin/events                              — List all events (admin view)
GET    /admin/events/proposals                    — List all proposals
POST   /admin/events/proposals/:proposalId/approve
POST   /admin/events/proposals/:proposalId/reject
POST   /admin/events                              — Create event
PATCH  /admin/events/:id                          — Update event
POST   /admin/events/:id/close                    — Close event
POST   /admin/events/:id/resolve                  — Resolve event
POST   /admin/events/:id/cancel                   — Cancel event
```

### Admin Statistics (`/admin/statistics`) — requires auth + admin role

```
GET  /admin/statistics/overview             — Statistics overview (totalBets, activeUsers, totalVolume)
GET  /admin/statistics/events/leaderboard   — Top 5 événements par volume
```

> `adminStatisticsRouter` monté dans `app.ts` sur `/admin/statistics`. ✅ Fonctionnel en prod.

### Casino (`/casino`) — requires auth

```
GET  /casino/blackjack/current        — Restaurer partie en cours après refresh
POST /casino/roulette/spin            — Spin roulette (casinoLimiter: 60/min)
POST /casino/blackjack/deal           — Deal blackjack hand
POST /casino/blackjack/hit            — Hit
POST /casino/blackjack/stand          — Stand
POST /casino/blackjack/insurance      — Insurance decision
POST /casino/blackjack/double         — Double down
POST /casino/blackjack/split          — Split (deux mains)
POST /casino/blackjack/decline-insurance — Refus assurance explicite
```

### Rewards/Gamification (`/rewards`) — requires auth

```
GET  /rewards/me                 — Get gamification state (badges, streak, etc.)
GET  /rewards/jackpot            — Get jackpot state
GET  /rewards/leaderboard        — Get leaderboard
POST /rewards/daily              — Claim daily reward (rewardLimiter: 10/min)
POST /rewards/jackpot/payout     — Trigger jackpot payout (admin only)
```

---

## 6. Database Schema

**Provider:** PostgreSQL 15 on VM Ubuntu NAS (127.0.0.1:5432)  
**Schema:** `backend/prisma/schema.prisma`

### Enums

```
UserRole:        user | validator | admin
EventStatus:     OPEN | CLOSED | RESOLVED | CANCELLED
BetStatus:       pending | won | lost | cancelled
BetType:         SIMPLE | PARLAY
ProposalStatus:  PENDING | APPROVED | REJECTED
CasinoGameType:  roulette | blackjack
CasinoGameResult: win | loss | push
```

### User

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique          -- @epita.fr only
  microsoftId     String?   @unique
  pseudo          String    @unique          -- auto-generated from email
  avatarUrl       String?
  balance         Int       @default(1000)  -- virtual tokens
  role            UserRole  @default(user)
  isBanned        Boolean   @default(false)
  sessionVersion  Int       @default(0)     -- token invalidation
  lastRewardAt    DateTime?
  streakDays      Int       @default(0)
  acceptOddsChanges Boolean @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  // Chat panel preferences
  chatPanelWidth  Int?
  chatPanelHeight Int?
  chatPanelX      Int?
  chatPanelY      Int?
  chatZoom        Int?
  lastSeenAt      DateTime?
  // indexes: email, balance(desc) for leaderboard
}
```

### Event

```prisma
model Event {
  id             String      @id @default(uuid())
  title          String      @unique
  description    String?
  imageUrl       String?
  options        Json        -- array of option names
  poolByOption   Json        -- { optionName: Int } pari-mutuel pool
  totalPool      Int         @default(0)
  status         EventStatus @default(OPEN)
  resolvedOption String?
  closingAt      DateTime?
  resolvedAt     DateTime?
  minBet         Int         @default(10)
  maxBet         Int?
  createdById    String?
  validatorId    String?
  // indexes: status, closingAt, createdAt(desc)
}
```

### Bet

```prisma
model Bet {
  id           String    @id @default(uuid())
  userId       String
  eventId      String?
  chosenOption String?
  amount       Int
  oddAtBet     Decimal?
  status       BetStatus @default(pending)
  type         BetType   @default(SIMPLE)
  potentialWin Int       @default(0)
  payout       Int       @default(0)
  createdAt    DateTime  @default(now())
  resolvedAt   DateTime?
  legs         BetLeg[]  -- for parlay bets
}
```

### BetLeg (Parlay)

```prisma
model BetLeg {
  id           String    @id @default(uuid())
  betId        String    -- parent Bet
  eventId      String
  chosenOption String
  oddsAtBet    Decimal
  status       BetStatus @default(pending)
}
```

### CasinoGame

```prisma
model CasinoGame {
  id        String           @id @default(uuid())
  userId    String
  gameType  CasinoGameType   -- roulette | blackjack
  betAmount Int
  result    CasinoGameResult -- win | loss | push
  payout    Int
  gameData  Json             -- full game state snapshot
  createdAt DateTime
}
```

### Jackpot

```prisma
model Jackpot {
  id                  String   @id @default(cuid())
  currentAmount       Int      @default(0)
  contributionRateBps Int      @default(100)  -- 100 bps = 1%
  totalContributed    Int
  lastWinnerId        String?
  lastWinAmount       Int?
  lastWinAt           DateTime?
}
```

### Other Models

- **Badge** — `(userId, badgeType)` unique constraint, stores `unlockedAt`
- **EventProposal** — user-submitted event suggestions with PENDING/APPROVED/REJECTED status
- **EventExclusion** — excludes specific users from specific events
- **OddsHistory** — time-series of odds per event option
- **AdminLog** — audit log for admin actions (actionType, targetId, details JSON)
- **JackpotContribution** — per-wager contribution records
- **ChatMessage** — real-time chat messages (userId, content, createdAt)
- **ChatBan** — user ban/mute tracking (mutedUntil, banCount, escalating)

**Database Indexes (key):**

- `User`: email, balance DESC (leaderboard)
- `Event`: status, closingAt, createdAt DESC
- `Bet`: userId, eventId, (type, status), createdAt DESC
- `CasinoGame`: userId, createdAt DESC
- `AdminLog`: adminId, createdAt DESC

---

## 7. Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_SENTRY_DSN=                     # optional
```

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3001

# Database (PostgreSQL on NAS)
DATABASE_URL=postgresql://sigambling:<password>@127.0.0.1:5432/sigambling?schema=public
DIRECT_URL=postgresql://sigambling:<password>@127.0.0.1:5432/sigambling?schema=public

# JWT
JWT_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret

# Microsoft OAuth (Azure AD)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_CALLBACK_URL=http://localhost:3001/auth/microsoft/callback

# CORS & URLs
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:3001
COOKIE_DOMAIN=                        # empty for localhost

# Avatar Storage (local NAS disk)
AVATAR_STORAGE_DIR=/var/www/sigambling/avatars
AVATAR_PUBLIC_BASE_URL=/avatars

# Error tracking (optional)
SENTRY_DSN=
```

> **Required** (validation fails at startup if missing): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL`, `FRONTEND_URL`, `API_BASE_URL`

---

## 8. Known Issues

**No active critical bugs.**

- ~~Avatar upload 503~~ — fixé (migration vers stockage local NAS terminée)
- ~~Admin Statistics Route Not Mounted~~ — fixé
- ~~Session loader infini en prod~~ — fixé
- ~~Refresh token manquant en prod~~ — fixé
- ~~Blackjack bust affiché comme victoire~~ — fixé
- ~~Dealer As → résolution immédiate sans assurance~~ — fixé
- ~~Balance non mise à jour en temps réel~~ — fixé
- ~~Paris sur événements terminés dans « Mes positions »~~ — fixé
- ~~Noms d’événements « Pari simple »~~ — fixé
- ~~Winston logs sans rotation~~ — fixé (DailyRotateFile 50MB/14j + 20MB/30j)

**Remaining known trade-offs:**

- `sessionVersion` adds one DB query per authenticated request (security vs. performance)
- GitHub onboarding bonus feature was reverted (unstable)
- Chat uses SSE (server → client only), no full WebSocket duplex
- `validator` role gives event management access but not user/stats/jackpot management

---

## 9. Recent Changes

### Session 06/04/2026 — Migration hors Supabase (terminée)

**Migration base de données :**

- PostgreSQL n'utilise plus Supabase — migré vers PostgreSQL auto-hébergé sur la VM Ubuntu du NAS
- Base cible : `sigambling`, utilisateur PostgreSQL : `sigambling`
- Connexion backend → DB via `127.0.0.1:5432` (local sur la VM)
- Prisma fonctionne sur cette base PostgreSQL NAS
- Les tables métier ont été restaurées depuis le dump Supabase et validées
- DataGrip fonctionne via tunnel SSH pour l'administration
- PostgreSQL écoute en local uniquement sur la VM (tunnel SSH pour l'accès externe)

**Migration storage avatars :**

- Supabase Storage n'est plus utilisé
- `@supabase/supabase-js` supprimé du backend (package.json + code source)
- `storage.service.ts` réécrit : utilise `fs` + `path` pour écriture disque local
- Avatars stockés dans `/var/www/sigambling/avatars` sur le NAS
- Avatars servis publiquement via `/avatars/...` (express.static dans `app.ts`)
- Header `Cross-Origin-Resource-Policy: cross-origin` posé sur `/avatars` pour compatibilité frontend cross-origin
- URL avatar absolue (résolution de `AVATAR_PUBLIC_BASE_URL` relatif contre `API_BASE_URL`)
- `env.ts` et `validate-env.ts` adaptés : variables `SUPABASE_*` supprimées, `AVATAR_STORAGE_DIR` et `AVATAR_PUBLIC_BASE_URL` ajoutées
- `.env` et `.env.example` mis à jour
- Les anciennes `avatarUrl` Supabase déjà en base restent tolérées (pas de migration destructrice)
- Un upload avatar testé avec succès — fichier `.webp` présent sur le NAS

**Variables d'environnement ajoutées :**

```env
AVATAR_STORAGE_DIR=/var/www/sigambling/avatars
AVATAR_PUBLIC_BASE_URL=/avatars
```

**Variables d'environnement supprimées :**

```env
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_KEY)
SUPABASE_AVATARS_BUCKET
```

**Surveillance post-migration :**

- Vérifier les permissions du dossier `/var/www/sigambling/avatars` après changement d'utilisateur PM2
- Sauvegarder régulièrement la base PostgreSQL du NAS et le dossier avatars
- Les anciens avatars Supabase restent visibles tant que leurs URLs historiques existent en base
- Si besoin futur, un script SQL pourra réécrire les anciennes `avatarUrl`
- Les logs PM2 peuvent contenir d'anciennes erreurs Supabase sans impact courant

### Session 05/04 → 06/04/2026

**Chat system (complet) :**

- SSE real-time chat avec broadcast à tous les clients connectés
- Rate limiting 3 msgs/3s, banwords filter + mute escalation (1h → permanent à 3)
- @mentions avec autocomplete, highlight jaune/bleu, son Howler
- Panel drag/resize/zoom (75-150%) persisté en DB
- Models Prisma : `ChatMessage`, `ChatBan` + 5 champs User (chat preferences)
- 3 migrations appliquées en prod

**Login & Analytics :**

- LoginPage redesignée (hero, feature cards, stats publiques)
- Endpoint `GET /stats` (public)
- Vercel Analytics intégré (`@vercel/analytics`)
- `canvas-confetti` ajouté pour animations

**RewardsPage :**

- Page dédiée `/rewards` avec countdown, confetti, claim direct

**Backend :**

- Cron job purge `odds_history` (quotidien 02:00)
- Winston `DailyRotateFile` (rotation logs)
- `banword-loader.ts` (normalisation unicode, matching intelligent)
- Admin hardcode `ADMIN_EMAILS` supprimé → rôle admin géré uniquement en DB

**Admin :**

- Saved proposals (bookmark)
- Event exclusion UI
- User reward management (reset/mark claimed)

**Statistiques admin :**

- 6 cards : Weekly bets, Active users, Total volume, Event tokens, Casino tokens, Circulating tokens
- Auto-refresh 30s, 3 APIs en parallèle
- Events leaderboard

**Bugs fixés :**

- Avatar upload 503 (migré vers stockage local NAS)
- Winston logs sans rotation

### Session 04/04 → 05/04/2026 (déploiement + features)

**Déploiement prod :**

- Frontend déployé sur Vercel : `https://www.sigambling.fr` (domaine custom via Cloudflare)
- Backend déployé sur VM Ubuntu 24 (Proxmox) via Cloudflare Tunnel : `https://api.sigambling.fr`
- PM2 + systemd pour auto-restart ; `trust proxy = 1` pour express-rate-limit
- Fix `COOKIE_DOMAIN=.sigambling.fr` pour cross-subdomain cookies
- Fix CORS `FRONTEND_URL=https://www.sigambling.fr`

**Blackjack :**

- Split d’As et split classique (`POST /casino/blackjack/split`)
- Déclin assurance explicite (`POST /casino/blackjack/decline-insurance`)
- Restauration de partie après refresh (`GET /casino/blackjack/current`)
- Modal résultat style Stake + ring de couleur selon issue
- Fix bust → toujours DÉFAITE
- Dealer As → assurance proposée avant résolution

**Dashboard :**

- Section « Événements populaires » 🔥 (top 5 `totalPool`)
- « Mes positions » : filtrage PENDING sur événements OPEN/CLOSED
- Historique des paris (5 derniers + page `/history` avec pagination et filtres)
- « Pot permanent » renommé en « Jackpot »
- ScrollToTop au changement de route
- Balance navbar temps réel (`liveBalance` dans Zustand)

**Admin :**

- Onglet « Statistiques » avec vraies données DB
- Événements collapsés (ouverts visibles, terminés repliés)
- Sliders de cotes liés (creéation événement, total = 100%)
- Badge notification si proposals pending

**Gamification :**

- Pastille verte animate-pulse sur bouton Profil si récompense disponible
- Modal récompense quotidienne au clic Profil
- Fix `streakAlive` pour nouveaux utilisateurs (`lastRewardAt === null`)

**Bugs fixés :**

- Session loader infini en prod (race condition `cancelled=true`)
- `/admin/statistics` 404 (dist/ stale, tsconfig excluait les fichiers de test)
- Noms d’événements affichés comme « Pari simple »

### Commits précédents (avant 04/04/2026)

**Security Fixes:**

- `4e48fe8` — Remove token from OAuth callback URLs
- `2b4aa40` — Harden Microsoft OAuth state validation

**Features Added:**

- `3c14c64` — Add blackjack insurance flow and card faces
- `c02375b` — Add leaderboard and active bets surfaces
- `3ec0196` — Add expandable combined bet details
- `c9d9434` — Implement EPITA default pseudo generation
- `cd3c9f8` — Implement odds-change confirmation flow for bets
- `2273638` — Harden event odds smoothing

**Earlier Milestones:**

- `2a85ba8` — Roulette implemented
- `1ec3e58` — Blackjack V1
- `81f79c3` — Events feature added
- `d881d5a` — Initial project setup

---

## 10. Development Workflow

### Setup

**Backend:**

```bash
cd backend
npm install
cp .env.example .env      # fill in values
npx prisma generate
npx prisma db push
npx prisma db seed        # optional: seed test data
npm run dev               # nodemon on port 3001
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env      # fill in VITE_API_URL
npm run dev               # vite on port 5173
```

### Testing

```bash
# Backend unit tests
cd backend && npm run test:unit

# Backend integration tests
cd backend && npm run test:integration

# All backend tests
cd backend && npm test

# Validate env vars
cd backend && npm run qa:validate-env
```

Test files: `backend/tests/*.test.ts`, `backend/src/**/*.integration.test.ts`

### Build & Deploy

```bash
# Frontend
cd frontend && npm run build   # tsc --noEmit check + vite build

# Backend
cd backend && npm run build    # tsc -p tsconfig.json
cd backend && npm start        # node dist/src/index.js
```

---

## 11. Key Decisions & Trade-offs

**Technology Choices:**

| Decision                      | Rationale                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Vite over CRA                 | Faster dev server, better ESM support, smaller bundles                               |
| Prisma over TypeORM           | Type-safe query builder, better DX, migrations, PostgreSQL compatibility             |
| Microsoft OAuth only          | EPITA provides Azure AD — no password management needed, guaranteed @epita.fr domain |
| Virtual currency only         | Legal compliance — no real money gambling, educational context                       |
| Bearer JWT + HttpOnly refresh | Security best practice: no tokens in localStorage, auto-rotation via sessionVersion  |
| Pari-mutuel odds              | Fair odds system — pool redistributes to winners proportionally                      |
| Self-hosted PostgreSQL + NAS  | Full control, no external dependency, avatar storage on local disk                   |
| Zustand + React Query split   | Zustand for auth/UI state, React Query for server state caching                      |

**Trade-offs:**

- `sessionVersion` adds one DB query per authenticated request (security vs. performance)
- GitHub onboarding bonus feature was reverted (unstable)
- Chat SSE = unidirectional (server → client). HTTP POST for sending messages
- `validator` role in DB enum — reserved but not yet used

---

## 12. Performance Optimizations

**Frontend:**

- Lazy loading for all page components (`React.lazy` + `Suspense` in `RouterApp.tsx`)
- Manual Vite code splitting chunks:
  - `react-vendor`: react, react-dom, react-router-dom, zustand
  - `query-vendor`: @tanstack/react-query, axios, zod
  - `motion-vendor`: framer-motion, gsap, lucide-react

**Backend:**

- Database indexes on all high-frequency query fields (email, userId, eventId, status, createdAt)
- `balance DESC` index for leaderboard queries
- Per-route rate limiting to prevent abuse

**Database:**

- Composite indexes on `(type, status)` for bet queries
- `(eventId, option)` index on OddsHistory for time-series queries

---

## 13. Project File Structure

```
SIGambling/
├── PROJECT_MEMORY.md          ← this file
├── README.md
├── CLEANUP_SUMMARY.md
├── DEBUG_REPORT.md
├── package.json               ← root (workspace scripts)
├── requirements.txt           ← Python deps (legacy/unused?)
├── start.py                   ← legacy startup script?
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRODUCT_BRIEF.md
│   └── PROJECT_MEMORY.md      ← this file (living documentation)
│
├── frontend/
│   ├── vercel.json                ← SPA rewrites (toutes routes → /index.html)
│   ├── vite.config.ts         ← proxy config, port 5173
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx           ← entry point
│       ├── RouterApp.tsx      ← route definitions + lazy loading + ScrollToTop
│       ├── index.css
│       ├── components/
│       │   ├── admin/
│       │   │   └── StatisticsTab.tsx    ← onglet stats admin (6 cards, auto-refresh 30s)
│       │   ├── casino/        ← Roulette + Blackjack UI components
│       │   ├── chat/          ← ChatPanel, ChatMessage, MentionDropdown
│       │   ├── layout/        ← DashboardShell, ErrorBoundary, LoadingScreen
│       │   └── ui/            ← design system primitives
│       ├── hooks/
│       │   ├── useAuthenticatedUser.ts
│       │   ├── useChatStream.ts       ← SSE hook, unread counting
│       │   ├── useGamificationState.ts
│       │   └── useSessionBootstrap.ts
│       ├── lib/
│       │   ├── api.ts         ← axios instance
│       │   ├── utils.ts
│       │   ├── event-utils.ts
│       │   ├── notifications.ts
│       │   └── casino/        ← casino-specific helpers
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── CasinoPage.tsx
│       │   ├── EventsMarketsPage.tsx
│       │   ├── EventDetailPage.tsx
│       │   ├── LeaderboardPage.tsx
│       │   ├── JackpotPage.tsx
│       │   ├── HistoryPage.tsx          ← historique des paris paginé
│       │   ├── AccountProfilePage.tsx
│       │   ├── AuthCallbackPage.tsx
│       │   ├── RewardsPage.tsx          ← récompenses quotidiennes + confetti
│       │   └── admin/
│       │       ├── AdminEventsPage.tsx
│       │       └── AdminStatisticsPage.tsx  ← page stats standalone
│       ├── routes/
│       │   └── ProtectedRoute.tsx
│       ├── store/
│       │   ├── auth-store.ts      ← Zustand auth state
│       │   ├── bet-cart-store.ts  ← Zustand bet cart
│       │   └── chat-store.ts     ← Zustand chat (isOpen, unreadCount, unreadMentions)
│       └── types/
│
└── backend/
    ├── prisma/
    │   ├── schema.prisma      ← single source of truth for DB
    │   └── seed.ts            ← test data seeder
    ├── src/
    │   ├── index.ts           ← server entry (listen on PORT)
    │   ├── app.ts             ← express factory (createApp)
    │   ├── config/
    │   │   ├── env.ts         ← Zod-validated env schema
    │   │   └── passport.ts    ← Microsoft OAuth strategy
    │   ├── routes/            ← express routers
    │   ├── controllers/       ← request handlers
    │   ├── services/          ← business logic
    │   │   ├── blackjack.service.ts
    │   │   ├── roulette.service.ts
    │   │   ├── chat.service.ts       ← SSE broadcast, rate limiting, banwords, mentions
    │   │   ├── event.service.ts
    │   │   ├── casino.service.ts
    │   │   ├── gamification.service.ts
    │   │   ├── jackpot.service.ts
    │   │   ├── auth.service.ts
    │   │   ├── user.service.ts
    │   │   ├── storage.service.ts ← Local disk avatar storage (NAS)
    │   │   └── prisma.service.ts
    │   ├── middleware/
    │   │   ├── require-auth.ts    ← JWT validation + sessionVersion check
    │   │   ├── require-role.ts    ← RBAC
    │   │   ├── validate.ts        ← Zod body validation
    │   │   ├── error-handler.ts
    │   │   ├── request-logger.ts
    │   │   └── not-found.ts
    │   ├── schemas/           ← Zod input schemas
    │   ├── utils/
    │   │   ├── jwt.ts             ← sign/verify access+refresh tokens
    │   │   ├── oauth-state.ts     ← CSRF state cookie helpers
    │   │   ├── roulette-rng.ts    ← server-side RNG
    │   │   ├── pseudo.ts          ← EPITA email → pseudo generation
    │   │   ├── banword-loader.ts  ← banwords.txt loader + matching
    │   │   ├── cron.ts            ← odds_history cleanup (daily 02:00)
    │   │   ├── app-error.ts
    │   │   ├── logger.ts          ← Winston + DailyRotateFile
    │   │   └── user-serializer.ts
    │   └── types/
    └── tests/
        ├── blackjack.service.test.ts
        ├── event.service.test.ts
        ├── gamification.service.test.ts
        └── pseudo.test.ts
```

---

## 14. Quick Reference

### Start Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Access Points (Dev)

| Service       | URL                             |
| ------------- | ------------------------------- |
| Frontend      | http://localhost:5173           |
| Backend API   | http://localhost:3001           |
| Health check  | http://localhost:3001/health    |
| Prisma Studio | `npx prisma studio` (port 5555) |

### Access Points (Production)

| Service     | URL                                                          |
| ----------- | ------------------------------------------------------------ |
| Frontend    | https://www.sigambling.fr                                    |
| Backend API | https://api.sigambling.fr                                    |
| SSH (prod)  | `ssh sigambling` (via Cloudflare Tunnel `ssh.sigambling.fr`) |

### Common Commands

```bash
# Validate all env vars (backend)
cd backend && npm run qa:validate-env

# Reset database (DESTRUCTIVE)
cd backend && npx prisma migrate reset

# Re-generate Prisma client after schema changes
cd backend && npx prisma generate

# Push schema changes to DB (no migration file)
cd backend && npx prisma db push

# Seed test data
cd backend && npx prisma db seed

# View/edit database in browser
cd backend && npx prisma studio

# TypeScript check (frontend)
cd frontend && npx tsc --noEmit

# Run all backend tests
cd backend && npm test
```

### Admin Access

- Role: `admin` (stored in DB, managed via DB only — no hardcoded list)
- First admin must be set manually in DB: `UPDATE "User" SET role = 'admin' WHERE email = '...'`
- Currently: `maxence.larche@epita.fr`

### User Roles

| Role        | Capabilities                                                                               |
| ----------- | ------------------------------------------------------------------------------------------ |
| `user`      | Login, bet, play casino, propose events, claim daily reward, chat                          |
| `validator` | All user capabilities + manage events (CRUD, resolve, close, cancel, proposals)            |
| `admin`     | All validator capabilities + manage users (balance, badges, reward), stats, jackpot payout |

---

## 15. Contact & Resources

**Repository:** https://github.com/HugoSpy/SIGambLing  
**Branch:** `main`  
**Team:** EPITA SIGL 2027 students + `maxence.larche@epita.fr` (admin)

**Documentation:**

- [Architecture](docs/ARCHITECTURE.md)
- [Product Brief](docs/PRODUCT_BRIEF.md)

---

## How to Update This File

This is a living document. Update it when:

- ✅ Implementing new features
- ✅ Fixing bugs or security issues
- ✅ Changing architecture or deployment
- ✅ Adding/removing dependencies
- ✅ Updating environment variables
- ✅ Adding new API routes
- ✅ Changing DB schema

**Quick update via Copilot:**

```
@workspace update PROJECT_MEMORY.md based on recent changes
```

**Last Updated By:** GitHub Copilot  
**Last Updated Date:** 2026-04-06

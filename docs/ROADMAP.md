# 📅 SIGambling - Roadmap Sprint Semaine 1

**Sprint :** 01/04/2026 - 07/04/2026 (7 jours)  
**Objectif :** MVP déployé et utilisable par la promo

---

## 📊 Vue d'ensemble

```
Jour 1-2 : Setup & Auth          ████████████░░░░░░░░░░░░  40%
Jour 3-4 : Features Core         ░░░░░░░░░░░░████████████  40%
Jour 5   : Casino                ░░░░░░░░░░░░░░░░░░░░████  10%
Jour 6   : Leaderboard & Polish  ░░░░░░░░░░░░░░░░░░░░░░██  5%
Jour 7   : Deploy & Testing      ░░░░░░░░░░░░░░░░░░░░░░██  5%
```

**Méthode :**

- ✅ = Fait
- 🔄 = En cours
- ❌ = Bloqué
- ⏸️ = En pause (attente dépendance)

---

## 🗓️ JOUR 1 - Lundi (Setup Infrastructure)

**Objectif :** Projet initialisé, DB setup, design system de base

### Frontend Setup (3h)

- [ ] Init projet React + Vite + TypeScript

  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  ```

- [ ] Install dépendances

  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npm install react-router-dom zustand @tanstack/react-query
  npm install framer-motion react-hot-toast
  npm install zod react-hook-form @hookform/resolvers
  ```

- [ ] Config Tailwind + Design tokens
  - [ ] `tailwind.config.js` avec color palette custom
  - [ ] Fonts (Inter + Space Grotesk via CDN)
  - [ ] CSS variables dans `index.css`

- [ ] Structure folders

  ```
  src/
  ├── components/
  │   ├── ui/          # Button, Input, Card, Modal
  │   └── layout/      # Navbar, Sidebar, Footer
  ├── pages/
  ├── hooks/
  ├── lib/
  │   ├── api.ts
  │   └── utils.ts
  ├── store/
  └── types/
  ```

- [ ] Composants UI de base
  - [ ] `Button.tsx` (variants: primary, secondary, danger)
  - [ ] `Card.tsx` (avec glassmorphism)
  - [ ] `Input.tsx`
  - [ ] `Modal.tsx`

### Backend Setup (3h)

- [ ] Init projet Node.js + TypeScript

  ```bash
  mkdir backend && cd backend
  npm init -y
  npm install -D typescript @types/node ts-node nodemon
  npx tsc --init
  ```

- [ ] Install dépendances

  ```bash
  npm install express cors dotenv
  npm install @prisma/client prisma
  npm install passport passport-microsoft jsonwebtoken bcrypt
  npm install zod winston
  npm install -D @types/express @types/cors @types/passport @types/jsonwebtoken
  ```

- [ ] Structure folders

  ```
  src/
  ├── routes/
  ├── controllers/
  ├── middleware/
  ├── services/
  ├── utils/
  └── types/
  ```

- [ ] Config Express basique
  - [ ] `src/index.ts` avec CORS + middleware
  - [ ] Route test `GET /health`
  - [ ] Error handler global

### Database Setup (2h)

- [ ] Créer projet Supabase (gratuit)
  - [ ] Note: `DATABASE_URL` et `DIRECT_URL`

- [ ] Init Prisma

  ```bash
  npx prisma init
  ```

- [ ] Créer schema Prisma (`prisma/schema.prisma`)
  - [ ] Model `User`
  - [ ] Model `Event`
  - [ ] Model `Bet`
  - [ ] Model `CasinoGame`
  - [ ] Model `Badge`
  - [ ] Model `AdminLog`

- [ ] Push schema à Supabase

  ```bash
  npx prisma db push
  npx prisma generate
  ```

- [ ] Seed data (admin user + 2-3 events test)
  - [ ] `prisma/seed.ts`
  - [ ] Run: `npx prisma db seed`

**Total Jour 1 :** 8h

---

## 🗓️ JOUR 2 - Mardi (Auth Microsoft)

**Objectif :** Auth Microsoft fonctionnelle, session persistante, middleware protection routes

### Azure AD B2C Setup (2h)

- [ ] Créer app Azure AD
  - Portal: https://portal.azure.com
  - [ ] App Registration → New registration
  - [ ] Redirect URI: `http://localhost:3000/auth/microsoft/callback` (dev)
  - [ ] Note: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`

- [ ] Config scopes
  - [ ] `openid`
  - [ ] `profile`
  - [ ] `email`

- [ ] Test flow OAuth manuel (Postman)

### Backend Auth (4h)

- [ ] Setup Passport.js
  - [ ] Strategy Microsoft (`passport-microsoft`)
  - [ ] Serialize/deserialize user

- [ ] Routes Auth
  - [ ] `POST /auth/microsoft` (initiate OAuth)
  - [ ] `GET /auth/microsoft/callback`
  - [ ] `POST /auth/refresh`
  - [ ] `POST /auth/logout`

- [ ] JWT Utils
  - [ ] Generate access token (15min)
  - [ ] Generate refresh token (30 days)
  - [ ] Verify token middleware

- [ ] Middleware `requireAuth`

  ```typescript
  // Vérifie JWT + injecte req.user
  ```

- [ ] Middleware `requireRole(['admin', 'validator'])`

- [ ] Validation email `@epita.fr`
  - Check dans callback OAuth
  - Reject si pas EPITA

### Frontend Auth (2h)

- [ ] Auth Context (Zustand store)

  ```typescript
  interface AuthState {
    user: User | null;
    accessToken: string | null;
    login: (token: string) => void;
    logout: () => void;
  }
  ```

- [ ] Pages Auth
  - [ ] `LoginPage.tsx` (bouton "Se connecter avec Microsoft")
  - [ ] Redirect handler OAuth callback

- [ ] Protected Route wrapper

  ```typescript
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
  ```

- [ ] Axios instance avec interceptor
  - Auto-inject `Authorization: Bearer ${token}`
  - Refresh token si 401

**Total Jour 2 :** 8h

---

## 🗓️ JOUR 3 - Mercredi (Événements)

**Objectif :** CRUD événements, validation admin, système de paris basique

### Backend Events (4h)

- [ ] Routes Events
  - [ ] `GET /events` (avec filtres status/category)
  - [ ] `GET /events/:id`
  - [ ] `POST /events` (create)
  - [ ] `DELETE /events/:id`

- [ ] Routes Admin Events
  - [ ] `GET /admin/events/pending`
  - [ ] `POST /admin/events/:id/validate`
  - [ ] `POST /admin/events/:id/reject`
  - [ ] `POST /admin/events/:id/resolve`

- [ ] Service `EventService`
  - [ ] `calculateOdds(event)` (répartition paris)
  - [ ] `validateEventData(data)` (Zod schema)
  - [ ] `resolveEvent(eventId, resultOption)` (transaction)

- [ ] Email notification (simple)
  - [ ] Setup Nodemailer (Gmail SMTP ou SendGrid)
  - [ ] Template validation/reject event

### Backend Bets (2h)

- [ ] Routes Bets
  - [ ] `POST /bets` (place bet)
  - [ ] `GET /bets/my-bets`

- [ ] Service `BetService`
  - [ ] `placeBet(userId, eventId, amount, option)` (transaction atomique)
  - [ ] `checkBalance(userId, amount)`

- [ ] Transaction Prisma
  ```typescript
  await prisma.$transaction(async (tx) => {
    // Debit user balance
    // Create bet
    // Update event total_pool
  });
  ```

### Frontend Events (2h)

- [ ] Pages Events
  - [ ] `EventsPage.tsx` (liste + filtres)
  - [ ] `EventDetailPage.tsx`
  - [ ] `CreateEventPage.tsx` (formulaire)

- [ ] Components Events
  - [ ] `EventCard.tsx`
  - [ ] `EventFilters.tsx` (category, status)
  - [ ] `PlaceBetModal.tsx`

- [ ] React Query hooks
  ```typescript
  useEvents(filters);
  useEvent(id);
  useCreateEvent();
  usePlaceBet();
  ```

**Total Jour 3 :** 8h

---

## 🗓️ JOUR 4 - Jeudi (Admin Panel + Polish Events)

**Objectif :** Admin panel fonctionnel, résolution événements, stats

### Backend Admin (3h)

- [ ] Routes Admin Users
  - [ ] `GET /admin/users`
  - [ ] `PATCH /admin/users/:id/role`
  - [ ] `POST /admin/users/:id/ban`
  - [ ] `POST /admin/users/:id/reset-balance`

- [ ] Routes Admin Analytics
  - [ ] `GET /admin/analytics` (stats globales)
  - [ ] `GET /admin/logs` (audit log)

- [ ] Service `AdminService`
  - [ ] `logAction(adminId, action, targetId, details)`
  - [ ] `getAnalytics()` (aggregate queries)

### Frontend Admin Panel (3h)

- [ ] Pages Admin
  - [ ] `AdminDashboard.tsx` (overview stats)
  - [ ] `PendingEventsPage.tsx` (validation queue)
  - [ ] `UsersManagementPage.tsx`
  - [ ] `AdminLogsPage.tsx`

- [ ] Components Admin
  - [ ] `EventValidationCard.tsx` (approve/reject)
  - [ ] `UserRoleSelect.tsx`
  - [ ] `AnalyticsCharts.tsx` (simple bars Chart.js)

- [ ] Protected Admin routes
  ```typescript
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
  ```

### Frontend Polish Events (2h)

- [ ] Animations Framer Motion
  - [ ] Page transitions
  - [ ] Card hover effects
  - [ ] Modal enter/exit

- [ ] Loading states
  - [ ] Skeleton loaders (`EventCardSkeleton.tsx`)
  - [ ] Spinner pendant API calls

- [ ] Toast notifications
  - [ ] Success: "Pari placé avec succès !"
  - [ ] Error: "Balance insuffisante"

**Total Jour 4 :** 8h

---

## 🗓️ JOUR 5 - Vendredi (Casino Games)

**Objectif :** Roulette + Blackjack fonctionnels

### Backend Casino (4h)

- [ ] Routes Casino
  - [ ] `POST /casino/roulette/spin`
  - [ ] `POST /casino/blackjack/start`
  - [ ] `POST /casino/blackjack/:gameId/action`
  - [ ] `GET /casino/history`

- [ ] Service `RouletteService`
  - [ ] `spin(betType, amount)` (RNG serveur)
  - [ ] `calculatePayout(betType, result)`
  - [ ] Logic:
    ```typescript
    const result = Math.floor(Math.random() * 37); // 0-36
    const color = getColor(result); // red/black/green
    const isWin = checkWin(betType, result, color);
    const payout = isWin ? amount * multiplier : 0;
    ```

- [ ] Service `BlackjackService`
  - [ ] `startGame(betAmount)` (deal cards)
  - [ ] `hit(gameId)` (draw card)
  - [ ] `stand(gameId)` (dealer plays)
  - [ ] `double(gameId)` (double bet + hit)
  - [ ] Card deck shuffle (52 cards)

- [ ] RNG Validation
  - [ ] Unit tests (fair odds)
  - [ ] House edge roulette ~2.7% (verte 0)

### Frontend Casino (4h)

- [ ] Pages Casino
  - [ ] `CasinoPage.tsx` (choix roulette/blackjack)
  - [ ] `RoulettePage.tsx`
  - [ ] `BlackjackPage.tsx`

- [ ] Component Roulette
  - [ ] `RouletteWheel.tsx` (animation canvas)
  - [ ] `RouletteBetGrid.tsx` (bet options)
  - [ ] Animation spin (rotation + slow down)

- [ ] Component Blackjack
  - [ ] `BlackjackTable.tsx`
  - [ ] `PlayingCard.tsx` (SVG cartes)
  - [ ] `BlackjackActions.tsx` (hit/stand/double buttons)

- [ ] Animations
  - [ ] Roulette spin (3 secondes)
  - [ ] Cartes deal (slide + flip)
  - [ ] Confetti si gros gain (>100 tokens)

**Total Jour 5 :** 8h

---

## 🗓️ JOUR 6 - Samedi (Leaderboard & Gamification)

**Objectif :** Leaderboard, daily reward, badges, profil user

### Backend Gamification (3h)

- [ ] Routes User
  - [ ] `GET /users/me`
  - [ ] `PATCH /users/me` (update pseudo)
  - [ ] `POST /users/me/claim-daily-reward`
  - [ ] `GET /users/me/history`

- [ ] Routes Leaderboard
  - [ ] `GET /leaderboard`

- [ ] Service `GamificationService`
  - [ ] `checkDailyReward(userId)` (eligibility)
  - [ ] `claimDailyReward(userId)` (transaction)
  - [ ] `checkBadgeUnlock(userId)` (check conditions)
  - [ ] `unlockBadge(userId, badgeType)`

- [ ] Cron job daily reward reset
  - [ ] Vercel Cron (`vercel.json`)

  ```json
  {
    "crons": [
      {
        "path": "/api/cron/reset-daily-rewards",
        "schedule": "0 0 * * *"
      }
    ]
  }
  ```

- [ ] Materialized View Leaderboard
  - [ ] Refresh toutes les 5min (pg_cron Supabase)

### Frontend Leaderboard (2h)

- [ ] Pages
  - [ ] `LeaderboardPage.tsx`
  - [ ] `ProfilePage.tsx` (user own profile)

- [ ] Components
  - [ ] `LeaderboardTable.tsx` (top 50 + pagination)
  - [ ] `UserStatsCard.tsx` (wins, losses, win rate)
  - [ ] `BadgesList.tsx` (badges débloqués)

- [ ] Daily Reward
  - [ ] Modal "Claim 100 tokens" au login (si eligible)
  - [ ] Confetti animation

### Frontend Global Polish (3h)

- [ ] Layout
  - [ ] `Navbar.tsx` (logo, navigation, user balance, logout)
  - [ ] `Sidebar.tsx` desktop (collapsable)
  - [ ] `BottomNav.tsx` mobile

- [ ] Responsive
  - [ ] Breakpoints Tailwind (mobile-first)
  - [ ] Test sur iPhone/Android simulators

- [ ] Error handling
  - [ ] `ErrorBoundary.tsx`
  - [ ] Page 404
  - [ ] Page 500

- [ ] SEO basique
  - [ ] Meta tags (`<Helmet>`)
  - [ ] Favicon
  - [ ] OG image

**Total Jour 6 :** 8h

---

## 🗓️ JOUR 7 - Dimanche (Deploy & Testing)

**Objectif :** Production deploy, testing avec users, fix bugs critiques

### Deploy Production (3h)

- [ ] Vercel Setup
  - [ ] Link repo GitHub
  - [ ] Config env vars (Vercel dashboard)
  - [ ] Deploy frontend
  - [ ] Deploy backend (serverless functions)

- [ ] Supabase Production
  - [ ] Vérifier quotas (500MB OK)
  - [ ] Row Level Security (si temps)

- [ ] Domain Setup
  - [ ] Acheter nom de domaine (5€/an)
  - [ ] Config DNS Vercel
  - [ ] SSL auto (Vercel)

- [ ] Azure AD Prod
  - [ ] Update redirect URI production
  - [ ] Test OAuth flow prod

### Testing (3h)

- [ ] Smoke tests
  - [ ] Auth flow (login → dashboard)
  - [ ] Create event → validate → place bet
  - [ ] Roulette spin
  - [ ] Blackjack game
  - [ ] Leaderboard load
  - [ ] Admin validate event

- [ ] Invite 5-10 early testers (potes EPITA)
  - [ ] Send lien + instructions
  - [ ] Google Form feedback

- [ ] Fix bugs critiques
  - [ ] Balance négatif check
  - [ ] Crash roulette
  - [ ] Auth loop
  - [ ] Mobile UI cassé

### Marketing Promo (2h)

- [ ] Préparer annonce Discord/Slack

  ```
  🚀 SIGambling est LIVE !

  Paris virtuels + casino pour la promo
  100 tokens offerts au signup 🎁

  ➡️ https://sigambling.vercel.app

  Auth EPITA direct, qui sera #1 ? 🏆
  ```

- [ ] Screenshots pour annonce
  - [ ] Dashboard home
  - [ ] Event page
  - [ ] Leaderboard

- [ ] Créer 3-5 événements seed
  - [ ] Mix catégories (sports, EPITA custom)
  - [ ] Cotes attractives

**Total Jour 7 :** 8h

---

## 🎯 Critères d'Acceptation MVP

### Must-Have (bloquant launch)

- [ ] ✅ Auth Microsoft fonctionne
- [ ] ✅ User peut créer compte + login
- [ ] ✅ User peut proposer événement
- [ ] ✅ Admin peut valider/rejeter événement
- [ ] ✅ User peut parier sur événement actif
- [ ] ✅ Admin peut résoudre événement (distribution gains)
- [ ] ✅ Roulette fonctionne (spin + payout correct)
- [ ] ✅ Blackjack fonctionne (basic game)
- [ ] ✅ Leaderboard affiche top users
- [ ] ✅ Daily reward claimable (100 tokens)
- [ ] ✅ Balance user update correct (pas de négatif)
- [ ] ✅ Site responsive mobile
- [ ] ✅ Aucun crash sur happy path

### Nice-to-Have (drop si retard)

- [ ] 🔄 Blackjack avancé (split, insurance)
- [ ] 🔄 Historique roulette (derniers 10 numéros)
- [ ] 🔄 Badges auto-unlock
- [ ] 🔄 Animations Framer Motion élaborées
- [ ] 🔄 Charts analytics admin (Chart.js)
- [ ] 🔄 Email notifications (validation event)

---

## 🚨 Risques & Mitigations

### Risque 1: Auth Microsoft bloqué

**Probabilité :** Moyenne  
**Impact :** Critique

**Mitigation :**

- Tester Jour 2 matin (early)
- Fallback: Email/password temporaire + validation manuelle `@epita.fr`

### Risque 2: Retard scope (trop de features)

**Probabilité :** Élevée  
**Impact :** Moyen

**Mitigation :**

- Priorisation stricte (Must-Have only)
- Drop Blackjack si retard Jour 5 (roulette suffit)
- Skip animations élaborées si retard Jour 6

### Risque 3: Bugs bloquants Jour 7

**Probabilité :** Moyenne  
**Impact :** Élevé

**Mitigation :**

- Testing continu Jours 1-6 (pas tout le testing Jour 7)
- Early testers dès Jour 6 soir
- Buffer 2h Jour 7 pour hot fixes

### Risque 4: Supabase quotas dépassés

**Probabilité :** Faible (60 users max)  
**Impact :** Moyen

**Mitigation :**

- Monitor dashboard Supabase
- Upgrade Supabase Pro (25$/mois) si dépassement
- Optimize queries (indexes, materialized views)

---

## 📊 Métriques de Succès Sprint

**Objectif primaire :** MVP deployed & usable

**Métriques :**

- [ ] Site accessible en prod (uptime >95%)
- [ ] 10+ early testers ont créé compte
- [ ] 5+ paris placés
- [ ] 5+ games casino joués
- [ ] 0 bug critique non résolu
- [ ] Feedback majoritairement positif (>70%)

---

## 📝 Notes Post-Sprint

**À remplir après Jour 7 :**

### Ce qui a bien marché

-

### Difficultés rencontrées

-

### Bugs connus (non-bloquants)

-

### Idées features Phase 2

-

---

**Document de travail - cocher les tasks au fur et à mesure** ✅

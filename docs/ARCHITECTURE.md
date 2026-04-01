# 🏗️ SIGambling - Architecture Technique

**Dernière mise à jour :** 01/04/2026  
**Version :** 1.0

---

## 📐 Architecture Globale

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React SPA (TypeScript + Tailwind)                   │   │
│  │  - Zustand (state management)                        │   │
│  │  - React Query (server state)                        │   │
│  │  - React Router (routing)                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (REST API)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express API (Node.js + TypeScript)                  │   │
│  │  - Passport.js (OAuth)                               │   │
│  │  - Prisma Client (ORM)                               │   │
│  │  - Zod (validation)                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ PostgreSQL Protocol
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 15                                       │   │
│  │  - Row Level Security                                │   │
│  │  - Real-time subscriptions (unused V1)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (External services)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Azure AD B2C (Microsoft OAuth)                             │
│  Sentry (Error tracking)                                    │
│  Vercel Analytics (Performance)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schéma de Base de Données

### Diagramme ERD

```
┌─────────────────┐         ┌──────────────────┐
│     users       │◄────────┤      bets        │
├─────────────────┤  1    * ├──────────────────┤
│ id (PK)         │         │ id (PK)          │
│ email           │         │ user_id (FK)     │
│ pseudo          │         │ event_id (FK)    │
│ balance         │         │ amount           │
│ role            │         │ selected_option  │
│ last_reward_at  │         │ odds_at_bet      │
│ created_at      │         │ status           │
│ updated_at      │         │ potential_win    │
└─────────────────┘         │ actual_win       │
        │                   │ created_at       │
        │                   │ resolved_at      │
        │                   └──────────────────┘
        │                            │
        │                            │ *
        │                            │
        │                            ↓
        │                   ┌──────────────────┐
        │              *    │     events       │
        ├───────────────────┤                  │
        │                   ├──────────────────┤
        │                   │ id (PK)          │
        │                   │ creator_id (FK)  │
        │                   │ validator_id (FK)│
        │                   │ title            │
        │                   │ description      │
        │                   │ category         │
        │                   │ options (JSON)   │
        │                   │ status           │
        │                   │ result_option    │
        │                   │ total_pool       │
        │                   │ resolution_date  │
        │                   │ created_at       │
        │                   │ validated_at     │
        │                   │ resolved_at      │
        │                   └──────────────────┘
        │
        │
        │  1          *
        ├───────────────────┐
        │                   │
        ↓                   ↓
┌─────────────────┐ ┌──────────────────┐
│  casino_games   │ │     badges       │
├─────────────────┤ ├──────────────────┤
│ id (PK)         │ │ id (PK)          │
│ user_id (FK)    │ │ user_id (FK)     │
│ game_type       │ │ badge_type       │
│ bet_amount      │ │ unlocked_at      │
│ result          │ └──────────────────┘
│ payout          │
│ game_data (JSON)│
│ created_at      │
└─────────────────┘

┌─────────────────┐
│  admin_logs     │
├─────────────────┤
│ id (PK)         │
│ admin_id (FK)   │
│ action_type     │
│ target_id       │
│ details (JSON)  │
│ created_at      │
└─────────────────┘
```

### Tables Détaillées

#### `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  pseudo VARCHAR(50) NOT NULL,
  balance INTEGER DEFAULT 1000, -- tokens virtuels
  role VARCHAR(20) DEFAULT 'user', -- 'user' | 'validator' | 'admin'
  last_reward_at TIMESTAMP,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_balance ON users(balance DESC); -- pour leaderboard
```

**Contraintes :**

- Email doit finir par `@epita.fr` (check constraint)
- Balance ne peut pas être négatif (check constraint)
- Pseudo unique (unique constraint)

---

#### `events`

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  validator_id UUID REFERENCES users(id) ON DELETE SET NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'sports' | 'politics' | 'culture' | 'epita'

  options JSONB NOT NULL, -- [{ id, label, total_bets, odds }]

  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'active' | 'resolved' | 'cancelled'
  result_option VARCHAR(50), -- id de l'option gagnante

  total_pool INTEGER DEFAULT 0, -- somme de tous les paris

  resolution_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  validated_at TIMESTAMP,
  resolved_at TIMESTAMP,

  CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')),
  CHECK (category IN ('sports', 'politics', 'culture', 'epita'))
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
```

**Format `options` (JSONB) :**

```json
[
  {
    "id": "option_1",
    "label": "Équipe A gagne",
    "total_bets": 5000,
    "odds": 1.85
  },
  {
    "id": "option_2",
    "label": "Équipe B gagne",
    "total_bets": 3000,
    "odds": 2.1
  }
]
```

---

#### `bets`

```sql
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  amount INTEGER NOT NULL,
  selected_option VARCHAR(50) NOT NULL, -- id de l'option choisie
  odds_at_bet DECIMAL(5,2) NOT NULL, -- cote au moment du pari (fixe)

  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'won' | 'lost' | 'cancelled'

  potential_win INTEGER NOT NULL, -- amount * odds_at_bet
  actual_win INTEGER DEFAULT 0, -- rempli à la résolution

  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  CHECK (amount > 0),
  CHECK (status IN ('pending', 'won', 'lost', 'cancelled'))
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_event_id ON bets(event_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_created_at ON bets(created_at DESC);
```

---

#### `casino_games`

```sql
CREATE TABLE casino_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  game_type VARCHAR(20) NOT NULL, -- 'roulette' | 'blackjack'
  bet_amount INTEGER NOT NULL,
  result VARCHAR(20) NOT NULL, -- 'win' | 'loss' | 'push'
  payout INTEGER DEFAULT 0, -- gain net (peut être négatif)

  game_data JSONB NOT NULL, -- détails du game (numéro roulette, cartes blackjack, etc.)

  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (game_type IN ('roulette', 'blackjack')),
  CHECK (result IN ('win', 'loss', 'push'))
);

CREATE INDEX idx_casino_user_id ON casino_games(user_id);
CREATE INDEX idx_casino_created_at ON casino_games(created_at DESC);
```

**Format `game_data` exemples :**

```json
// Roulette
{
  "bet_type": "red",
  "result_number": 17,
  "result_color": "black"
}

// Blackjack
{
  "player_hand": ["AS", "10H"],
  "dealer_hand": ["KD", "9C"],
  "player_total": 21,
  "dealer_total": 19,
  "action": "stand"
}
```

---

#### `badges`

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  badge_type VARCHAR(50) NOT NULL, -- 'high_roller' | 'roulette_king' | etc.
  unlocked_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, badge_type) -- un user ne peut débloquer un badge qu'une fois
);

CREATE INDEX idx_badges_user_id ON badges(user_id);
```

**Types de badges :**

- `high_roller` : >5000 tokens accumulés
- `roulette_king` : 10+ wins consécutifs roulette
- `prophecy_master` : 5+ paris événements gagnés d'affilée
- `early_adopter` : parmi les 10 premiers inscrits
- `daily_grinder` : 30 jours streak connexion
- Custom badges admin

---

#### `admin_logs`

```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action_type VARCHAR(50) NOT NULL, -- 'validate_event' | 'reject_event' | 'ban_user' | etc.
  target_id UUID, -- id de l'entité ciblée (event, user, etc.)

  details JSONB, -- contexte additionnel (raison ban, feedback validation, etc.)

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
```

---

### Vues Calculées (pour performance)

#### `v_leaderboard`

```sql
CREATE MATERIALIZED VIEW v_leaderboard AS
SELECT
  u.id,
  u.pseudo,
  u.balance,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'won') as wins,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'lost') as losses,
  COALESCE(
    ROUND(
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'won')::DECIMAL /
      NULLIF(COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('won', 'lost')), 0) * 100
    , 2)
  , 0) as win_rate,
  ARRAY_AGG(DISTINCT bg.badge_type) as badges
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
LEFT JOIN badges bg ON u.id = bg.user_id
GROUP BY u.id, u.pseudo, u.balance
ORDER BY u.balance DESC;

CREATE UNIQUE INDEX idx_leaderboard_id ON v_leaderboard(id);

-- Refresh automatique toutes les 5 minutes
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Cron job (via pg_cron extension Supabase)
SELECT cron.schedule('refresh-leaderboard', '*/5 * * * *', 'SELECT refresh_leaderboard()');
```

---

## 🔌 API Endpoints

### Base URL

```
Production: https://api.sigambling.vercel.app
Development: http://localhost:3000
```

### Authentification

Toutes les routes (sauf `/auth/*`) nécessitent un JWT dans le header :

```
Authorization: Bearer <jwt_token>
```

---

### 🔐 Auth Routes

#### `POST /auth/microsoft`

**Description :** Initie le flow OAuth Microsoft  
**Response :**

```json
{
  "redirect_url": "https://login.microsoftonline.com/..."
}
```

#### `GET /auth/microsoft/callback`

**Description :** Callback OAuth Microsoft  
**Query params :**

- `code` : Authorization code

**Response :**

```json
{
  "user": {
    "id": "uuid",
    "email": "hugo.spy@epita.fr",
    "pseudo": "HugoSpy",
    "balance": 1000,
    "role": "user"
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc..."
}
```

**Errors :**

- `400` : Email non `@epita.fr`
- `401` : Code invalid
- `500` : Erreur serveur

#### `POST /auth/refresh`

**Description :** Refresh access token  
**Body :**

```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response :**

```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc..."
}
```

#### `POST /auth/logout`

**Description :** Invalide les tokens  
**Response :**

```json
{
  "message": "Logged out successfully"
}
```

---

### 👤 User Routes

#### `GET /users/me`

**Description :** Récupère profil user connecté  
**Response :**

```json
{
  "id": "uuid",
  "email": "hugo.spy@epita.fr",
  "pseudo": "HugoSpy",
  "balance": 1380,
  "role": "user",
  "streak_days": 5,
  "last_reward_at": "2026-04-01T08:00:00Z",
  "stats": {
    "total_bets": 42,
    "wins": 18,
    "losses": 20,
    "pending": 4,
    "win_rate": 47.37,
    "total_wagered": 5200,
    "total_won": 6800,
    "net_profit": 1600
  },
  "badges": ["early_adopter", "high_roller"],
  "created_at": "2026-03-28T12:00:00Z"
}
```

#### `PATCH /users/me`

**Description :** Update pseudo (seul champ modifiable)  
**Body :**

```json
{
  "pseudo": "NovaRook"
}
```

**Response :**

```json
{
  "id": "uuid",
  "pseudo": "NovaRook",
  "updated_at": "2026-04-01T14:30:00Z"
}
```

**Errors :**

- `400` : Pseudo déjà pris
- `400` : Pseudo invalid (3-20 chars alphanumeric)

#### `POST /users/me/claim-daily-reward`

**Description :** Claim daily reward (100 tokens)  
**Response :**

```json
{
  "claimed": true,
  "amount": 100,
  "new_balance": 1480,
  "streak_days": 6,
  "next_claim_at": "2026-04-02T00:00:00Z"
}
```

**Errors :**

- `400` : Already claimed today

#### `GET /users/me/history`

**Description :** Historique paris + casino games  
**Query params :**

- `type` : `bets` | `casino` | `all` (default: `all`)
- `limit` : nombre résultats (default: 20, max: 100)
- `offset` : pagination

**Response :**

```json
{
  "items": [
    {
      "type": "bet",
      "id": "uuid",
      "event_title": "Finale Champions League 2026",
      "amount": 50,
      "selected_option": "Équipe A",
      "odds": 1.85,
      "status": "won",
      "payout": 93,
      "created_at": "2026-04-01T10:00:00Z"
    },
    {
      "type": "casino",
      "id": "uuid",
      "game_type": "roulette",
      "bet_amount": 25,
      "result": "win",
      "payout": 50,
      "created_at": "2026-04-01T09:30:00Z"
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

---

### 🏆 Leaderboard Routes

#### `GET /leaderboard`

**Description :** Classement global  
**Query params :**

- `limit` : nombre résultats (default: 50, max: 100)
- `offset` : pagination

**Response :**

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "uuid",
      "pseudo": "HouseMaster",
      "balance": 2430,
      "wins": 45,
      "losses": 12,
      "win_rate": 78.95,
      "badges": ["admin", "high_roller", "prophecy_master"]
    },
    {
      "rank": 2,
      "pseudo": "ClaireSpin",
      "balance": 1920,
      "wins": 32,
      "losses": 18,
      "win_rate": 64.0,
      "badges": ["roulette_king"]
    }
  ],
  "total": 60,
  "user_rank": 15, // rank du user connecté
  "limit": 50,
  "offset": 0
}
```

---

### 🎲 Events Routes

#### `GET /events`

**Description :** Liste événements  
**Query params :**

- `status` : `pending` | `active` | `resolved` | `all` (default: `active`)
- `category` : `sports` | `politics` | `culture` | `epita` | `all` (default: `all`)
- `limit` : nombre résultats (default: 20, max: 100)
- `offset` : pagination

**Response :**

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Finale Champions League 2026",
      "description": "Qui remportera la finale ?",
      "category": "sports",
      "status": "active",
      "options": [
        {
          "id": "option_1",
          "label": "Équipe A",
          "total_bets": 5000,
          "odds": 1.85
        },
        {
          "id": "option_2",
          "label": "Équipe B",
          "total_bets": 3000,
          "odds": 2.1
        }
      ],
      "total_pool": 8000,
      "resolution_date": "2026-05-30T20:00:00Z",
      "created_at": "2026-04-01T12:00:00Z",
      "creator": {
        "id": "uuid",
        "pseudo": "HouseMaster"
      }
    }
  ],
  "total": 12,
  "limit": 20,
  "offset": 0
}
```

#### `GET /events/:id`

**Description :** Détails événement  
**Response :**

```json
{
  "id": "uuid",
  "title": "Finale Champions League 2026",
  "description": "Description complète...",
  "category": "sports",
  "status": "active",
  "options": [...],
  "total_pool": 8000,
  "resolution_date": "2026-05-30T20:00:00Z",
  "created_at": "2026-04-01T12:00:00Z",
  "validated_at": "2026-04-01T13:00:00Z",
  "creator": {
    "id": "uuid",
    "pseudo": "HouseMaster",
    "role": "admin"
  },
  "validator": {
    "id": "uuid",
    "pseudo": "HouseMaster"
  },
  "my_bets": [ // paris du user connecté sur cet event
    {
      "id": "uuid",
      "amount": 50,
      "selected_option": "option_1",
      "odds_at_bet": 1.85,
      "potential_win": 93,
      "status": "pending",
      "created_at": "2026-04-01T14:00:00Z"
    }
  ]
}
```

#### `POST /events`

**Description :** Créer un événement (users propose, admins créent directement)  
**Body :**

```json
{
  "title": "Nombre de questions TD ARCL aujourd'hui",
  "description": "Combien de questions seront posées pendant le TD ARCL de 14h ?",
  "category": "epita",
  "options": [
    { "label": "0-5 questions" },
    { "label": "6-10 questions" },
    { "label": "11+ questions" }
  ],
  "resolution_date": "2026-04-01T16:00:00Z"
}
```

**Response (si user):**

```json
{
  "id": "uuid",
  "status": "pending",
  "message": "Événement soumis pour validation"
}
```

**Response (si admin):**

```json
{
  "id": "uuid",
  "status": "active",
  "message": "Événement créé et actif"
}
```

**Errors :**

- `400` : Champs manquants/invalides
- `400` : Moins de 2 options ou plus de 5
- `400` : resolution_date dans le passé
- `429` : User a déjà 3 events pending

#### `DELETE /events/:id`

**Description :** Supprimer événement (creator si pending, admin si any)  
**Response :**

```json
{
  "message": "Événement supprimé",
  "refunded_bets": 3, // nombre de paris remboursés si event actif
  "refunded_amount": 150
}
```

**Errors :**

- `403` : Pas le creator ni admin
- `400` : Event déjà resolved

---

### 💰 Bets Routes

#### `POST /bets`

**Description :** Placer un pari  
**Body :**

```json
{
  "event_id": "uuid",
  "selected_option": "option_1",
  "amount": 50
}
```

**Response :**

```json
{
  "bet": {
    "id": "uuid",
    "event_id": "uuid",
    "selected_option": "option_1",
    "amount": 50,
    "odds_at_bet": 1.85,
    "potential_win": 93,
    "status": "pending",
    "created_at": "2026-04-01T14:30:00Z"
  },
  "new_balance": 1330
}
```

**Errors :**

- `400` : Balance insuffisante
- `400` : Montant < 10 tokens
- `400` : Event non actif
- `404` : Event ou option inexistante

#### `GET /bets/my-bets`

**Description :** Liste paris du user  
**Query params :**

- `status` : `pending` | `won` | `lost` | `all` (default: `all`)
- `limit`, `offset`

**Response :**

```json
{
  "bets": [
    {
      "id": "uuid",
      "event": {
        "id": "uuid",
        "title": "Finale Champions League",
        "category": "sports"
      },
      "amount": 50,
      "selected_option": "Équipe A",
      "odds_at_bet": 1.85,
      "potential_win": 93,
      "status": "pending",
      "created_at": "2026-04-01T14:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### 🎰 Casino Routes

#### `POST /casino/roulette/spin`

**Description :** Jouer à la roulette  
**Body :**

```json
{
  "bet_type": "red", // 'red' | 'black' | 'even' | 'odd' | '1-18' | '19-36' | 'dozen_1' | 'dozen_2' | 'dozen_3' | 'number_X'
  "amount": 25
}
```

**Response :**

```json
{
  "game_id": "uuid",
  "result_number": 17,
  "result_color": "black",
  "result": "loss",
  "bet_amount": 25,
  "payout": 0,
  "new_balance": 1305
}
```

**Errors :**

- `400` : Balance insuffisante
- `400` : Montant < 10 tokens

#### `POST /casino/blackjack/start`

**Description :** Démarrer partie blackjack  
**Body :**

```json
{
  "bet_amount": 20
}
```

**Response :**

```json
{
  "game_id": "uuid",
  "player_hand": ["AS", "7H"],
  "dealer_visible": "KD",
  "player_total": 18,
  "actions": ["hit", "stand", "double"], // 'double' si first turn
  "new_balance": 1285
}
```

#### `POST /casino/blackjack/:gameId/action`

**Description :** Action blackjack  
**Body :**

```json
{
  "action": "stand" // 'hit' | 'stand' | 'double'
}
```

**Response (si stand ou bust/blackjack):**

```json
{
  "game_id": "uuid",
  "player_hand": ["AS", "7H"],
  "dealer_hand": ["KD", "9C"],
  "player_total": 18,
  "dealer_total": 19,
  "result": "loss",
  "payout": 0,
  "new_balance": 1285,
  "game_over": true
}
```

**Response (si hit et continue):**

```json
{
  "game_id": "uuid",
  "player_hand": ["AS", "7H", "3D"],
  "dealer_visible": "KD",
  "player_total": 21,
  "actions": ["stand"],
  "game_over": false
}
```

#### `GET /casino/history`

**Description :** Historique casino games  
**Query params :**

- `game_type` : `roulette` | `blackjack` | `all`
- `limit`, `offset`

**Response :**

```json
{
  "games": [
    {
      "id": "uuid",
      "game_type": "roulette",
      "bet_amount": 25,
      "result": "win",
      "payout": 50,
      "game_data": {
        "bet_type": "red",
        "result_number": 19,
        "result_color": "red"
      },
      "created_at": "2026-04-01T15:00:00Z"
    }
  ],
  "total": 87,
  "limit": 20,
  "offset": 0
}
```

---

### 👑 Admin Routes

**Toutes les routes admin nécessitent `role = 'admin'` ou `'validator'`**

#### `GET /admin/events/pending`

**Description :** Liste événements en attente validation  
**Response :**

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Nombre de questions TD ARCL",
      "description": "...",
      "category": "epita",
      "options": [...],
      "creator": {
        "id": "uuid",
        "pseudo": "NovaRook",
        "created_events_count": 5,
        "validated_events_count": 3,
        "rejected_events_count": 1
      },
      "created_at": "2026-04-01T14:00:00Z"
    }
  ],
  "total": 7
}
```

#### `POST /admin/events/:id/validate`

**Description :** Valider un événement  
**Body (optionnel) :**

```json
{
  "feedback": "Event validé, bonne idée !"
}
```

**Response :**

```json
{
  "event_id": "uuid",
  "status": "active",
  "validated_at": "2026-04-01T15:30:00Z",
  "message": "Événement validé et actif"
}
```

#### `POST /admin/events/:id/reject`

**Description :** Rejeter un événement  
**Body :**

```json
{
  "reason": "Événement trop vague, précise les critères"
}
```

**Response :**

```json
{
  "event_id": "uuid",
  "status": "cancelled",
  "message": "Événement rejeté, email envoyé au créateur"
}
```

#### `POST /admin/events/:id/resolve`

**Description :** Résoudre un événement (annoncer résultat)  
**Body :**

```json
{
  "result_option": "option_2" // id de l'option gagnante
}
```

**Response :**

```json
{
  "event_id": "uuid",
  "result_option": "option_2",
  "total_winners": 12,
  "total_payout": 8400,
  "resolved_at": "2026-05-30T21:00:00Z"
}
```

**Logic résolution :**

1. Update event status → `resolved`
2. Update tous bets sur cet event :
   - Si `selected_option == result_option` → status `won`, calcul `actual_win`
   - Sinon → status `lost`
3. Update balance users gagnants (transaction atomique)

#### `GET /admin/users`

**Description :** Liste users avec filtres  
**Query params :**

- `role` : `user` | `validator` | `admin` | `all`
- `sort_by` : `balance` | `created_at` | `wins`
- `limit`, `offset`

**Response :**

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "hugo.spy@epita.fr",
      "pseudo": "HugoSpy",
      "balance": 1380,
      "role": "admin",
      "stats": {
        "total_bets": 42,
        "wins": 18,
        "win_rate": 42.86
      },
      "created_at": "2026-03-28T12:00:00Z"
    }
  ],
  "total": 60
}
```

#### `PATCH /admin/users/:id/role`

**Description :** Changer rôle user (admin only)  
**Body :**

```json
{
  "role": "validator" // 'user' | 'validator'
}
```

**Response :**

```json
{
  "user_id": "uuid",
  "new_role": "validator",
  "updated_at": "2026-04-01T16:00:00Z"
}
```

**Errors :**

- `403` : Seul admin peut change roles
- `400` : Cannot set role to 'admin' (manual DB edit only)

#### `POST /admin/users/:id/ban`

**Description :** Ban user  
**Body :**

```json
{
  "reason": "Spam événements"
}
```

**Response :**

```json
{
  "user_id": "uuid",
  "banned": true,
  "reason": "Spam événements"
}
```

**Effect :** User ne peut plus se connecter, tous ses paris pending sont cancelled

#### `POST /admin/users/:id/reset-balance`

**Description :** Reset balance user à 1000 tokens  
**Body :**

```json
{
  "reason": "Bug exploité"
}
```

**Response :**

```json
{
  "user_id": "uuid",
  "old_balance": 15000,
  "new_balance": 1000
}
```

#### `GET /admin/analytics`

**Description :** Analytics globales  
**Response :**

```json
{
  "users": {
    "total": 60,
    "active_today": 23,
    "active_week": 47
  },
  "events": {
    "total": 45,
    "pending": 7,
    "active": 12,
    "resolved": 26
  },
  "bets": {
    "total": 1247,
    "total_wagered": 52340,
    "avg_bet_size": 42
  },
  "casino": {
    "total_games": 3421,
    "total_wagered": 87650,
    "house_edge_actual": 2.3
  },
  "top_events": [
    {
      "id": "uuid",
      "title": "Finale Champions League",
      "total_bets": 42,
      "total_pool": 8400
    }
  ]
}
```

#### `GET /admin/logs`

**Description :** Logs actions admin  
**Query params :**

- `action_type` : type d'action (optionnel)
- `admin_id` : filter par admin (optionnel)
- `limit`, `offset`

**Response :**

```json
{
  "logs": [
    {
      "id": "uuid",
      "admin": {
        "id": "uuid",
        "pseudo": "HouseMaster"
      },
      "action_type": "validate_event",
      "target_id": "event_uuid",
      "details": {
        "event_title": "Finale Champions League",
        "feedback": "Event validé"
      },
      "created_at": "2026-04-01T15:30:00Z"
    }
  ],
  "total": 156
}
```

---

## 🔄 Flux de Données Critiques

### 1. Placement d'un pari

```
CLIENT                    API                    DATABASE
  │                        │                        │
  │  POST /bets           │                        │
  ├──────────────────────>│                        │
  │  { event_id,          │                        │
  │    amount: 50,        │                        │
  │    option: "A" }      │                        │
  │                        │                        │
  │                        │  BEGIN TRANSACTION    │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  SELECT balance       │
  │                        │  FROM users           │
  │                        │  WHERE id = user_id   │
  │                        │  FOR UPDATE           │
  │                        ├──────────────────────>│
  │                        │<──────────────────────┤
  │                        │  balance = 1380       │
  │                        │                        │
  │                        │  CHECK: 1380 >= 50 ✅  │
  │                        │                        │
  │                        │  UPDATE users         │
  │                        │  SET balance = 1330   │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  SELECT event         │
  │                        │  + calculate odds     │
  │                        ├──────────────────────>│
  │                        │<──────────────────────┤
  │                        │  odds = 1.85          │
  │                        │                        │
  │                        │  INSERT INTO bets     │
  │                        │  (amount: 50,         │
  │                        │   odds: 1.85,         │
  │                        │   potential_win: 93)  │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  UPDATE events        │
  │                        │  SET options[A].      │
  │                        │    total_bets += 50   │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  COMMIT               │
  │                        ├──────────────────────>│
  │                        │<──────────────────────┤
  │                        │                        │
  │<──────────────────────┤                        │
  │  { bet_id,            │                        │
  │    new_balance: 1330, │                        │
  │    potential_win: 93} │                        │
```

**Points critiques :**

- Transaction atomique (balance débit + bet creation)
- Lock row user (`FOR UPDATE`) pour éviter race conditions
- Calcul odds au moment du pari (pas recalculé après)

---

### 2. Résolution événement

```
ADMIN                     API                    DATABASE
  │                        │                        │
  │  POST /admin/events/   │                        │
  │       :id/resolve      │                        │
  ├──────────────────────>│                        │
  │  { result_option: "A"}│                        │
  │                        │                        │
  │                        │  BEGIN TRANSACTION    │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  UPDATE events        │
  │                        │  SET status=resolved, │
  │                        │      result_option=A  │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  SELECT all bets      │
  │                        │  WHERE event_id = X   │
  │                        ├──────────────────────>│
  │                        │<──────────────────────┤
  │                        │  [bet1, bet2, ...]    │
  │                        │                        │
  │                        │  FOR EACH bet:        │
  │                        │    IF option == A:    │
  │                        │      UPDATE bets      │
  │                        │      SET status=won,  │
  │                        │      actual_win = X   │
  │                        │                        │
  │                        │      UPDATE users     │
  │                        │      SET balance +=   │
  │                        │          actual_win   │
  │                        │    ELSE:              │
  │                        │      UPDATE bets      │
  │                        │      SET status=lost  │
  │                        ├──────────────────────>│
  │                        │                        │
  │                        │  COMMIT               │
  │                        ├──────────────────────>│
  │                        │                        │
  │<──────────────────────┤                        │
  │  { winners: 12,       │                        │
  │    total_payout: 8400}│                        │
```

**Points critiques :**

- Transaction pour consistency (tous les paris resolved ensemble)
- Batch update users balance (optimisé vs N queries)

---

### 3. Daily Reward

```
CRON JOB                  API                    DATABASE
  │                        │                        │
  │  Every day 00:00 UTC   │                        │
  │                        │                        │
  │  POST /cron/           │                        │
  │    reset-daily-rewards │                        │
  ├──────────────────────>│                        │
  │                        │                        │
  │                        │  UPDATE users         │
  │                        │  SET last_reward_at   │
  │                        │    = NULL             │
  │                        │  WHERE last_reward_at │
  │                        │    < TODAY            │
  │                        ├──────────────────────>│
  │                        │                        │
  │<──────────────────────┤                        │
  │  { reset_count: 60 }  │                        │
  │                        │                        │

USER                      API                    DATABASE
  │                        │                        │
  │  Logs in at 08:00     │                        │
  │                        │                        │
  │  GET /users/me        │                        │
  ├──────────────────────>│                        │
  │                        │                        │
  │                        │  SELECT user          │
  │                        ├──────────────────────>│
  │                        │<──────────────────────┤
  │                        │  last_reward_at=NULL  │
  │                        │                        │
  │<──────────────────────┤                        │
  │  { can_claim_reward:  │                        │
  │    true }             │                        │
  │                        │                        │
  │  POST /users/me/      │                        │
  │    claim-daily-reward │                        │
  ├──────────────────────>│                        │
  │                        │                        │
  │                        │  UPDATE users         │
  │                        │  SET balance += 100,  │
  │                        │      last_reward_at   │
  │                        │        = NOW(),       │
  │                        │      streak_days += 1 │
  │                        │  WHERE id = user_id   │
  │                        │    AND last_reward_at │
  │                        │      IS NULL          │
  │                        ├──────────────────────>│
  │                        │                        │
  │<──────────────────────┤                        │
  │  { claimed: true,     │                        │
  │    new_balance: 1480, │                        │
  │    streak_days: 6 }   │                        │
```

**Points critiques :**

- Cron job reset eligibility (pas de check timezone complexe)
- Atomic check + claim (WHERE last_reward_at IS NULL prevents double claim)

---

## 🔒 Sécurité

### Authentification JWT

**Access Token :**

- Durée : 15 minutes
- Payload : `{ user_id, email, role }`
- Signature : HS256 avec secret env

**Refresh Token :**

- Durée : 30 jours
- Stocké en `httpOnly` cookie
- Rotation à chaque refresh

### Rate Limiting

```javascript
// Par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests
  message: "Too many requests",
});

// Par user (endpoints sensibles)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.user.id,
});

app.use("/api/", limiter);
app.use("/api/bets", strictLimiter);
app.use("/api/casino", strictLimiter);
```

### Validation Input

**Toutes les entrées validées avec Zod :**

```typescript
const PlaceBetSchema = z.object({
  event_id: z.string().uuid(),
  selected_option: z.string().min(1).max(50),
  amount: z.number().int().min(10).max(10000),
});

app.post("/bets", async (req, res) => {
  const validated = PlaceBetSchema.parse(req.body);
  // ...
});
```

### SQL Injection Protection

**Prisma ORM = requêtes paramétrées par défaut**

```typescript
// ✅ Safe (Prisma)
await prisma.user.findUnique({
  where: { email: userEmail },
});

// ❌ JAMAIS ça
await prisma.$queryRaw(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### CORS

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL, // https://sigambling.vercel.app
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

---

## 📊 Monitoring & Observabilité

### Logging (Winston)

```javascript
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Usage
logger.info("Bet placed", { userId, eventId, amount });
logger.error("DB connection failed", { error });
```

### Error Tracking (Sentry)

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring

**Vercel Analytics** (automatique)

- Page load times
- API response times
- Core Web Vitals

**Custom metrics :**

```javascript
// Middleware timing
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("Request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
});
```

---

## 🚀 Déploiement

### Variables d'Environnement

**Frontend (.env)**

```bash
VITE_API_URL=https://api.sigambling.vercel.app
VITE_MICROSOFT_CLIENT_ID=xxx
VITE_SENTRY_DSN=xxx
```

**Backend (.env)**

```bash
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
DIRECT_URL=postgresql://user:pass@db.supabase.co:5432/postgres

JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx

MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_TENANT_ID=xxx
MICROSOFT_CALLBACK_URL=https://api.sigambling.vercel.app/auth/microsoft/callback

FRONTEND_URL=https://sigambling.vercel.app

SENTRY_DSN=xxx

NODE_ENV=production
```

### CI/CD Pipeline

**GitHub Actions (`.github/workflows/deploy.yml`)**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci

      - name: Run tests
        run: |
          cd backend && npm test

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Database Migrations

**Prisma Migrate**

```bash
# Development
npx prisma migrate dev --name add_badges_table

# Production
npx prisma migrate deploy
```

**Migrations automatiques sur deploy :**

```json
// package.json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && npm run build"
  }
}
```

---

## 📚 Ressources Techniques

### Documentation Stack

- [Express.js Docs](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Passport.js Docs](http://www.passportjs.org/docs/)
- [Zod Docs](https://zod.dev/)

### Tools

- **Postman** : Test API endpoints
- **Prisma Studio** : GUI DB (localhost:5555)
- **pgAdmin** : PostgreSQL admin (si besoin)

---

**Document vivant - sera mis à jour avec l'implémentation**

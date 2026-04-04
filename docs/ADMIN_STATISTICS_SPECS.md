# Admin Statistics Dashboard - Implementation Spec

## Overview

Implement a fully functional admin statistics page matching the Figma design with real data from the PostgreSQL database.

**Page:** `/admin/statistics`  
**Auth:** Admin role required  
**Design reference:** Figma screenshot provided

---

## UI Layout (from Figma)

### Header

```
Panneau d'administration
Gérer les événements, les utilisateurs et voir les statistiques
```

### Tabs

```
[Événements] [Utilisateurs] [Statistiques] ← Active tab
```

### Stats Cards (3 cards horizontal)

**Card 1 - Total Paris**

- Icon: 📈 (green trending up)
- Value: `12 847` (large, bold)
- Subtext: `+23% par rapport à la semaine dernière` (green, smaller)

**Card 2 - Utilisateurs Actifs**

- Icon: 👥 (blue users icon)
- Value: `58` (large, bold)
- Subtext: `4 en ligne maintenant` (blue, smaller)

**Card 3 - Volume Total**

- Icon: 📊 (purple chart icon)
- Value: `2.4M` (large, bold)
- Subtext: `tokens pariés` (gray, smaller)

### Events Leaderboard Table

**Title:** Événements les plus populaires

**Table columns:**

- Rank (1, 2, 3, 4, 5)
- Event title + category badge (Crypto, Esports, Météo, Académique, Politique)
- Tokens bet (right-aligned, bold)

**Example rows (from design):**

1. Le Bitcoin atteindra-t-il 100k$ d'ici fin avril 2026 ? | Crypto | **21370** tokens
2. Prochain vainqueur du CS2 Major | Esports | **17650** tokens
3. Va-t-il pleuvoir le 10 avril ? | Météo | **9100** tokens
4. Moyenne de l'examen final | Académique | **13840** tokens
5. Élection du conseil étudiant | Politique | **17050** tokens

---

## Data Requirements

### Database Queries

#### Card 1: Total Paris

```sql
-- Current week total bets
SELECT COUNT(*) as current_week_bets
FROM "Bet"
WHERE "createdAt" >= DATE_TRUNC('week', CURRENT_DATE);

-- Previous week total bets
SELECT COUNT(*) as previous_week_bets
FROM "Bet"
WHERE "createdAt" >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
  AND "createdAt" < DATE_TRUNC('week', CURRENT_DATE);

-- Calculate percentage change
-- percentage = ((current - previous) / previous) * 100
```

#### Card 2: Utilisateurs Actifs

```sql
-- Total registered users
SELECT COUNT(*) as total_users
FROM "User";

-- Users online now (last activity < 5 minutes)
SELECT COUNT(*) as users_online
FROM "User"
WHERE "lastActivity" >= NOW() - INTERVAL '5 minutes';
```

**Note:** Add `lastActivity` field to User model if not exists.

#### Card 3: Volume Total

```sql
-- Total tokens bet across all bets
SELECT SUM("amount") as total_volume
FROM "Bet";
```

**Format:** If > 1,000,000 display as "X.XM", if > 1,000 display as "X.XK"

#### Events Leaderboard

```sql
-- Top 5 events by total bet volume
SELECT
  e.id,
  e.title,
  e.category,
  SUM(b.amount) as total_bet_volume,
  COUNT(b.id) as bet_count
FROM "Event" e
LEFT JOIN "Bet" b ON b."eventId" = e.id
GROUP BY e.id, e.title, e.category
ORDER BY total_bet_volume DESC
LIMIT 5;
```

---

## Implementation Tasks

### Backend API Routes

**File:** `backend/src/routes/admin.routes.ts`

```typescript
// New routes to add
router.get(
  "/admin/statistics/overview",
  requireAuth,
  requireAdmin,
  getStatisticsOverview,
);
router.get(
  "/admin/statistics/events/leaderboard",
  requireAuth,
  requireAdmin,
  getEventsLeaderboard,
);
```

**File:** `backend/src/controllers/admin.controller.ts`

```typescript
export const getStatisticsOverview = async (req: Request, res: Response) => {
  // Query total bets (current week + previous week)
  const currentWeekStart = /* ... */;
  const previousWeekStart = /* ... */;

  const currentWeekBets = await db.bet.count({
    where: { createdAt: { gte: currentWeekStart } }
  });

  const previousWeekBets = await db.bet.count({
    where: {
      createdAt: {
        gte: previousWeekStart,
        lt: currentWeekStart
      }
    }
  });

  const percentageChange = previousWeekBets > 0
    ? ((currentWeekBets - previousWeekBets) / previousWeekBets) * 100
    : 0;

  // Query active users
  const totalUsers = await db.user.count();

  const usersOnline = await db.user.count({
    where: {
      lastActivity: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
      }
    }
  });

  // Query total volume
  const volumeResult = await db.bet.aggregate({
    _sum: { amount: true }
  });

  const totalVolume = volumeResult._sum.amount || 0;

  res.json({
    totalBets: {
      value: currentWeekBets,
      percentageChange: Math.round(percentageChange),
      trend: percentageChange >= 0 ? 'up' : 'down'
    },
    activeUsers: {
      total: totalUsers,
      online: usersOnline
    },
    totalVolume: {
      value: totalVolume,
      formatted: formatVolume(totalVolume) // "2.4M"
    }
  });
};

export const getEventsLeaderboard = async (req: Request, res: Response) => {
  const topEvents = await db.event.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      _count: {
        select: { bets: true }
      },
      bets: {
        select: { amount: true }
      }
    },
    orderBy: {
      bets: {
        _count: 'desc'
      }
    },
    take: 5
  });

  const leaderboard = topEvents.map((event, index) => {
    const totalVolume = event.bets.reduce((sum, bet) => sum + bet.amount, 0);

    return {
      rank: index + 1,
      eventId: event.id,
      title: event.title,
      category: event.category,
      totalVolume: totalVolume,
      betCount: event._count.bets
    };
  });

  res.json({ leaderboard });
};

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(1) + 'M';
  }
  if (volume >= 1_000) {
    return (volume / 1_000).toFixed(1) + 'K';
  }
  return volume.toString();
}
```

### Database Schema Update

**File:** `backend/prisma/schema.prisma`

```prisma
model User {
  // ... existing fields
  lastActivity DateTime @default(now()) // Add this field
}
```

**Migration:**

```bash
cd backend
npx prisma migrate dev --name add-user-last-activity
```

### Frontend Components

**File:** `frontend/src/pages/AdminStatisticsPage.tsx`

```tsx
import { useEffect, useState } from "react";
import { apiClient } from "../config/api";

interface StatisticsOverview {
  totalBets: {
    value: number;
    percentageChange: number;
    trend: "up" | "down";
  };
  activeUsers: {
    total: number;
    online: number;
  };
  totalVolume: {
    value: number;
    formatted: string;
  };
}

interface LeaderboardEvent {
  rank: number;
  eventId: string;
  title: string;
  category: string;
  totalVolume: number;
  betCount: number;
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, leaderboardRes] = await Promise.all([
          apiClient.get("/admin/statistics/overview"),
          apiClient.get("/admin/statistics/events/leaderboard"),
        ]);

        setStats(overviewRes.data);
        setLeaderboard(leaderboardRes.data.leaderboard);
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (!stats) return <div>Erreur de chargement</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Panneau d'administration</h1>
        <p className="text-gray-400">
          Gérer les événements, les utilisateurs et voir les statistiques
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-700">
        <button className="pb-2 text-gray-400 hover:text-white">
          Événements
        </button>
        <button className="pb-2 text-gray-400 hover:text-white">
          Utilisateurs
        </button>
        <button className="pb-2 border-b-2 border-cyan-500 text-cyan-500">
          Statistiques
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Paris */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <svg className="w-6 h-6 text-green-500" /* trending up icon */ />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-sm mb-1">Total paris</p>
              <p className="text-3xl font-bold">
                {stats.totalBets.value.toLocaleString()}
              </p>
              <p
                className={`text-sm mt-2 ${stats.totalBets.trend === "up" ? "text-green-500" : "text-red-500"}`}
              >
                {stats.totalBets.percentageChange > 0 ? "+" : ""}
                {stats.totalBets.percentageChange}% par rapport à la semaine
                dernière
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Utilisateurs Actifs */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <svg className="w-6 h-6 text-blue-500" /* users icon */ />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-sm mb-1">Utilisateurs actifs</p>
              <p className="text-3xl font-bold">{stats.activeUsers.total}</p>
              <p className="text-sm mt-2 text-blue-500">
                {stats.activeUsers.online} en ligne maintenant
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Volume Total */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <svg className="w-6 h-6 text-purple-500" /* chart icon */ />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-sm mb-1">Volume total</p>
              <p className="text-3xl font-bold">
                {stats.totalVolume.formatted}
              </p>
              <p className="text-sm mt-2 text-gray-400">tokens pariés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Events Leaderboard */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          Événements les plus populaires
        </h2>

        <div className="space-y-4">
          {leaderboard.map((event) => (
            <div
              key={event.eventId}
              className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition"
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="text-2xl font-bold text-gray-500">
                  {event.rank}
                </span>
              </div>

              {/* Event info */}
              <div className="flex-1">
                <h3 className="font-medium mb-1">{event.title}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${getCategoryColor(event.category)}`}
                >
                  {event.category}
                </span>
              </div>

              {/* Volume */}
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {event.totalVolume.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">tokens</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Crypto: "bg-orange-500/20 text-orange-400",
    Esports: "bg-purple-500/20 text-purple-400",
    Météo: "bg-blue-500/20 text-blue-400",
    Académique: "bg-green-500/20 text-green-400",
    Politique: "bg-red-500/20 text-red-400",
  };

  return colors[category] || "bg-gray-500/20 text-gray-400";
}
```

### Middleware: Update lastActivity

**File:** `backend/src/middleware/require-auth.ts`

```typescript
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // ... existing auth logic

    // Update lastActivity on every authenticated request
    await db.user.update({
      where: { id: req.auth!.id },
      data: { lastActivity: new Date() },
    });

    next();
  } catch (error) {
    // ... error handling
  }
};
```

### Router Integration

**File:** `frontend/src/routes/RouterApp.tsx`

```tsx
// Add route
<Route
  path="/admin/statistics"
  element={
    <ProtectedRoute requireAdmin>
      <AdminStatisticsPage />
    </ProtectedRoute>
  }
/>
```

---

## Testing Checklist

### Backend Tests

- [ ] `GET /admin/statistics/overview` returns correct data structure
- [ ] `GET /admin/statistics/events/leaderboard` returns top 5 events
- [ ] Percentage calculation is accurate
- [ ] Volume formatting works (M, K)
- [ ] Users online count is real-time accurate
- [ ] Non-admin users get 403 Forbidden

### Frontend Tests

- [ ] Stats cards display correct values
- [ ] Percentage change shows correct color (green/red)
- [ ] Leaderboard displays all 5 events
- [ ] Category badges have correct colors
- [ ] Data refreshes every 30 seconds
- [ ] Loading state displays
- [ ] Error state displays if API fails
- [ ] Responsive on mobile (cards stack vertically)

### Integration Tests

- [ ] Create 10 bets → total bets increments by 10
- [ ] User activity < 5min → shows in "online now"
- [ ] Create event + bets → appears in leaderboard
- [ ] Week change → percentage recalculates

---

## Design Specifications

### Colors (from Figma)

- Background: `#0a0a0a` (dark)
- Cards: `rgba(31, 41, 55, 0.5)` (gray-800/50)
- Text primary: `#ffffff`
- Text secondary: `#9ca3af` (gray-400)
- Green (positive): `#10b981`
- Blue (info): `#3b82f6`
- Purple (accent): `#8b5cf6`
- Red (negative): `#ef4444`

### Typography

- Page title: `text-3xl font-bold`
- Card values: `text-3xl font-bold`
- Card labels: `text-sm text-gray-400`
- Table titles: `text-xl font-bold`
- Event titles: `font-medium`
- Volumes: `text-2xl font-bold`

### Spacing

- Page padding: `p-8`
- Card padding: `p-6`
- Gap between cards: `gap-6`
- Card inner gap: `gap-4`

---

## Acceptance Criteria

✅ Admin statistics page accessible at `/admin/statistics`  
✅ Only users with `role: 'admin'` can access  
✅ Three stat cards display real-time data from database  
✅ Percentage change calculates week-over-week correctly  
✅ Users online updates every request (via lastActivity)  
✅ Volume formats correctly (2.4M, 15.2K)  
✅ Leaderboard shows top 5 events by bet volume  
✅ Category badges match Figma colors  
✅ Data auto-refreshes every 30 seconds  
✅ Responsive design (mobile + desktop)  
✅ All queries optimized (use indexes if needed)  
✅ Error handling for failed API calls  
✅ Loading states during data fetch

---

## Performance Considerations

- Add database index on `Bet.createdAt` for week queries
- Add index on `User.lastActivity` for online users query
- Consider caching stats for 1 minute (Redis or in-memory)
- Use `COUNT(*)` instead of fetching all records
- Limit leaderboard to 5 events (already done with `LIMIT 5`)

---

## Future Enhancements (Optional)

- [ ] Export statistics as CSV
- [ ] Date range filter (week/month/year)
- [ ] Charts/graphs using recharts
- [ ] Real-time websocket updates (instead of 30s polling)
- [ ] More granular filters (by category, user type)
- [ ] Admin activity logs

---

## Dependencies

**Backend:**

- Existing: Prisma, Express, Zod
- No new dependencies needed

**Frontend:**

- Existing: React, React Router, Tailwind
- Optional: recharts (if adding charts later)

---

## Deployment Notes

1. Run Prisma migration to add `lastActivity` field
2. Deploy backend changes first
3. Deploy frontend changes
4. Test in production with real admin account
5. Monitor query performance in production

---

## Files to Create/Modify

**Backend:**

- `backend/prisma/schema.prisma` (add lastActivity)
- `backend/src/routes/admin.routes.ts` (new routes)
- `backend/src/controllers/admin.controller.ts` (new controllers)
- `backend/src/middleware/require-auth.ts` (update lastActivity)

**Frontend:**

- `frontend/src/pages/AdminStatisticsPage.tsx` (new page)
- `frontend/src/routes/RouterApp.tsx` (add route)

**Total:** 6 files (1 schema update, 5 code files)

---

**Estimated development time:** 3-4 hours  
**Priority:** MEDIUM (nice-to-have for admin UX)  
**Complexity:** Medium (backend queries + frontend styling)

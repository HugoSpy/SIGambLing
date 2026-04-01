import { startTransition, useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Shell } from "./components/Shell";
import { api } from "./api";
import { AuthPage } from "./pages/AuthPage";
import { EventsPage } from "./pages/EventsPage";
import { GamesPage } from "./pages/GamesPage";
import { HomePage } from "./pages/HomePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfilePage } from "./pages/ProfilePage";

function App() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(() => localStorage.getItem("sigambling_user_id") || "");
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function refreshCoreData(activeUserId = userId) {
    const [eventsData, pendingData, leaderboardData] = await Promise.all([
      api.getEvents(),
      api.getEvents({ status: "pending" }),
      api.getLeaderboard(),
    ]);

    startTransition(() => {
      setEvents(eventsData.events);
      setPendingEvents(pendingData.events);
      setLeaderboard(leaderboardData.users);
    });

    if (activeUserId) {
      const profile = await api.getProfile(activeUserId);
      setUser(profile.user);
    } else {
      setUser(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        await refreshCoreData(userId);
      } catch (error) {
        if (mounted) {
          setNotice(error.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(payload) {
    const response = await api.login(payload);
    localStorage.setItem("sigambling_user_id", response.user.id);
    setUserId(response.user.id);
    const reward = await api.claimDailyReward(response.user.id);
    await refreshCoreData(response.user.id);
    setNotice(reward.claimed ? `Connexion reussie. +${reward.reward} tokens ajoutes.` : "Connexion reussie. Reward deja recupere aujourd'hui.");
    navigate("/");
  }

  async function handleRegister(payload) {
    const response = await api.register(payload);
    localStorage.setItem("sigambling_user_id", response.user.id);
    setUserId(response.user.id);
    await refreshCoreData(response.user.id);
    setNotice("Compte cree avec succes.");
    navigate("/");
  }

  function handleLogout() {
    localStorage.removeItem("sigambling_user_id");
    setUserId("");
    setUser(null);
    setNotice("Session fermee.");
    navigate("/");
  }

  async function handleBet(payload) {
    if (!userId) {
      navigate("/auth");
      return;
    }
    const response = await api.placeBet({ userId, ...payload });
    await refreshCoreData(userId);
    setNotice(response.message);
  }

  async function handleCreateEvent(payload) {
    if (!userId) {
      navigate("/auth");
      return;
    }
    const response = await api.createEvent({ userId, ...payload });
    await refreshCoreData(userId);
    setNotice(response.message);
  }

  async function handleResolveEvent(payload) {
    const response = await api.resolveEvent(payload);
    await refreshCoreData(userId);
    setNotice(response.message);
  }

  async function handleGame(payload) {
    if (!userId) {
      navigate("/auth");
      return null;
    }
    const response = await api.playGame({ userId, ...payload });
    await refreshCoreData(userId);
    if (response.message) {
      setNotice(response.message);
    }
    return response;
  }

  return (
    <Shell user={user} notice={notice} onCloseNotice={() => setNotice("")} onLogout={handleLogout}>
      {loading ? (
        <section className="loading-card">
          <p>Preparation du dashboard et chargement des evenements...</p>
        </section>
      ) : (
        <Routes>
          <Route path="/" element={<HomePage events={events} leaderboard={leaderboard} user={user} />} />
          <Route path="/events" element={<EventsPage events={events} onPlaceBet={handleBet} onCreateEvent={handleCreateEvent} user={user} />} />
          <Route path="/games" element={<GamesPage user={user} onRoulette={(payload) => handleGame({ game: "roulette", ...payload })} onBlackjack={(payload) => handleGame({ game: "blackjack", ...payload })} />} />
          <Route path="/leaderboard" element={<LeaderboardPage leaderboard={leaderboard} />} />
          <Route path="/profile" element={<ProfilePage user={user} pendingEvents={pendingEvents} activeEvents={events} onResolveEvent={handleResolveEvent} />} />
          <Route path="/auth" element={<AuthPage onLogin={handleLogin} onRegister={handleRegister} />} />
        </Routes>
      )}
    </Shell>
  );
}

export default App;

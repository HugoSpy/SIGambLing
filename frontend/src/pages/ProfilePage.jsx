import { useEffect, useState } from "react";
import { MetricCard } from "../components/MetricCard";

export function ProfilePage({ user, pendingEvents, activeEvents, onResolveEvent }) {
  const safePendingEvents = pendingEvents ?? [];
  const safeActiveEvents = activeEvents ?? [];
  const [resolution, setResolution] = useState({
    eventId: pendingEvents?.[0]?.id || activeEvents?.[0]?.id || "",
    winningOutcome: "",
  });

  const selectableEvents = [...safePendingEvents, ...safeActiveEvents];
  const targetEvent = selectableEvents.find((item) => item.id === resolution.eventId);

  useEffect(() => {
    if (!resolution.eventId) {
      const fallbackId = pendingEvents?.[0]?.id || activeEvents?.[0]?.id || "";
      setResolution((current) => ({ ...current, eventId: fallbackId }));
    }
  }, [pendingEvents, activeEvents, resolution.eventId]);

  useEffect(() => {
    if (targetEvent?.outcomes?.length) {
      setResolution((current) => ({ ...current, winningOutcome: targetEvent.outcomes[0].label }));
    }
  }, [targetEvent?.id]);

  async function submitResolution(event) {
    event.preventDefault();
    await onResolveEvent({ eventId: resolution.eventId, winningOutcome: resolution.winningOutcome });
  }

  if (!user) {
    return (
      <section className="panel">
        <h1>Profil</h1>
        <p>Connecte-toi pour consulter les statistiques, badges et challenges.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="profile-hero">
        <div className="avatar-ring">{user.avatar}</div>
        <div>
          <p className="eyebrow">Profil utilisateur</p>
          <h1>{user.username}</h1>
          <p>{user.email}</p>
        </div>
        <div className="token-pill large">
          <strong>{user.tokens}</strong>
          <small>tokens</small>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard label="Paris gagnes" value={user.stats.eventWins} />
        <MetricCard label="Paris perdus" value={user.stats.eventLosses} />
        <MetricCard label="Jeux joues" value={user.stats.gamesPlayed} />
        <MetricCard label="Events crees" value={user.stats.eventsCreated} />
      </div>

      <section className="split-panels">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Badges et niveaux</p>
              <h2>Progression</h2>
            </div>
          </div>
          <div className="badge-row">
            {(user?.badges ?? []).map((badge) => (
              <span key={badge} className="badge">
                {badge}
              </span>
            ))}
          </div>
          <p className="helper">Niveau actuel: {user.level}</p>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Challenges</p>
              <h2>Objectifs actifs</h2>
            </div>
          </div>
          <div className="stack">
            {(user?.challenges ?? []).map((challenge) => (
              <article key={challenge.id} className="challenge-card">
                <strong>{challenge.title}</strong>
                <p>{challenge.description}</p>
                <small>
                  {challenge.progress}/{challenge.goal} pour {challenge.reward} tokens
                </small>
              </article>
            ))}
          </div>
        </div>
      </section>

      {user.role === "admin" ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Administration</p>
              <h2>Valider ou resoudre un evenement</h2>
            </div>
          </div>
          <form className="stack" onSubmit={submitResolution}>
            <label>
              Evenement
              <select value={resolution.eventId} onChange={(event) => setResolution({ ...resolution, eventId: event.target.value })}>
                {selectableEvents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.status})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Outcome gagnant
              <select value={resolution.winningOutcome} onChange={(event) => setResolution({ ...resolution, winningOutcome: event.target.value })}>
                {(targetEvent?.outcomes ?? []).map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Valider la resolution
            </button>
          </form>
        </section>
      ) : null}
    </section>
  );
}

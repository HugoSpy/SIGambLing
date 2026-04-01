import { Link } from "react-router-dom";
import { EventPreview } from "../components/EventPreview";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { MetricCard } from "../components/MetricCard";

export function HomePage({ events, leaderboard, user }) {
  const isLoading = events == null || leaderboard == null;
  const featuredEvents = events?.slice(0, 3) ?? [];
  const featuredLeaderboard = leaderboard?.slice(0, 5) ?? [];

  return (
    <section className="stack">
      <div className="hero">
        <div>
          <p className="eyebrow">Paris fantasy, casino, progression</p>
          <h1>
            Une base MVP pour lancer <span>paris, challenges et leaderboard</span>
          </h1>
          <p className="hero-copy">
            Les utilisateurs recoivent 100 tokens au depart, revendiquent un bonus quotidien,
            placent des paris sur des evenements et jouent a la roulette ou au blackjack.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/events">
              Explorer les evenements
            </Link>
            <Link className="secondary-button" to="/games">
              Ouvrir le casino
            </Link>
          </div>
        </div>

        <div className="hero-grid">
          <MetricCard label="Evenements actifs" value={events?.length ?? 0} />
          <MetricCard label="Reward quotidien" value="100" note="tokens / jour" />
          <MetricCard label="Gain max roulette" value="35:1" />
          <MetricCard label="Solde utilisateur" value={user ? user.tokens : "--"} note={user ? user.username : "Connecte-toi pour jouer"} />
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Evenements populaires</p>
            <h2>Selection rapide</h2>
          </div>
          <Link to="/events" className="text-link">
            Voir tout
          </Link>
        </div>
        <div className="card-grid">
          {featuredEvents.map((event) => (
            <EventPreview key={event.id} event={event} />
          ))}
        </div>
        {isLoading ? <p className="helper">Chargement des evenements...</p> : null}
      </section>

      <section className="panel panel-contrast">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Roadmap produit</p>
            <h2>De la demo locale au branchement Firebase</h2>
          </div>
        </div>
        <div className="timeline">
          <article>
            <strong>Phase 1</strong>
            <p>Frontend React, auth de demo, API Express et structure de donnees.</p>
          </article>
          <article>
            <strong>Phase 2</strong>
            <p>Logique de paris, roulette, blackjack et resolution des evenements.</p>
          </article>
          <article>
            <strong>Phase 3</strong>
            <p>Challenges, badges, leaderboard et recompense quotidienne.</p>
          </article>
          <article>
            <strong>Phase 4</strong>
            <p>Remplacement du store memoire par Firestore et auth Firebase.</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Classement</p>
            <h2>Top joueurs</h2>
          </div>
          <Link to="/leaderboard" className="text-link">
            Ouvrir le leaderboard
          </Link>
        </div>
        <LeaderboardTable leaderboard={featuredLeaderboard} />
        {isLoading ? <p className="helper">Chargement du classement...</p> : null}
      </section>
    </section>
  );
}

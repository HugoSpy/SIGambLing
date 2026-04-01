import { LeaderboardTable } from "../components/LeaderboardTable";

export function LeaderboardPage({ leaderboard }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Classement global</p>
          <h1>Leaderboard</h1>
        </div>
      </div>
      <LeaderboardTable leaderboard={leaderboard} />
    </section>
  );
}

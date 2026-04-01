export function LeaderboardTable({ leaderboard }) {
  return (
    <div className="leaderboard-table">
      {(leaderboard ?? []).map((user) => (
        <article key={user.id} className="leaderboard-row">
          <div className="leaderboard-rank">#{user.position}</div>
          <div>
            <strong>{user.username}</strong>
            <p>{user.badges?.[0] || "Nouveau joueur"}</p>
          </div>
          <div className="leaderboard-score">
            <strong>{user.tokens}</strong>
            <small>tokens</small>
          </div>
        </article>
      ))}
    </div>
  );
}

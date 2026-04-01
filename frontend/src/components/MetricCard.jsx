export function MetricCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <small>{label}</small>
      <strong>{value}</strong>
      {note ? <span>{note}</span> : null}
    </article>
  );
}


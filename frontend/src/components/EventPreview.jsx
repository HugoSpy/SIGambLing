export function EventPreview({ event }) {
  return (
    <article className="preview-card">
      <div className="event-meta">
        <span className="pill">{event.category}</span>
        <span className="pill">{event.status}</span>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="odds-inline">
        {(event?.outcomes ?? []).slice(0, 3).map((outcome) => (
          <span key={outcome.label}>
            {outcome.label} x{outcome.odds}
          </span>
        ))}
      </div>
    </article>
  );
}

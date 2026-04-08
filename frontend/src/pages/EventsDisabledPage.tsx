export default function EventsDisabledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">📅</div>
        <h1 className="font-display text-4xl font-bold text-brand-text">
          Événements indisponibles
        </h1>
        <p className="mt-4 text-base leading-7 text-brand-muted">
          Les événements sont temporairement indisponibles.
          <br />
          Revenez bientôt !
        </p>
      </div>
    </div>
  );
}

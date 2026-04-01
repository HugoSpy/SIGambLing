import { useDeferredValue, useEffect, useState } from "react";
import { EVENT_CATEGORIES, formatDate } from "../constants";

export function EventsPage({ events, onPlaceBet, onCreateEvent, user }) {
  const safeEvents = events ?? [];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(events?.[0]?.id ?? "");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [betAmount, setBetAmount] = useState(50);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    category: "sports",
    dateEnd: "",
    outcomes: ["", ""],
  });

  useEffect(() => {
    if ((safeEvents?.length ?? 0) && !safeEvents.find((event) => event.id === selectedEventId)) {
      setSelectedEventId(safeEvents[0].id);
    }
  }, [safeEvents, selectedEventId]);

  const deferredQuery = useDeferredValue(query);
  const filteredEvents = safeEvents.filter((event) => {
    const matchCategory = category === "all" || event.category === category;
    const matchQuery =
      !deferredQuery ||
      event.title.toLowerCase().includes(deferredQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(deferredQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) || filteredEvents[0];

  useEffect(() => {
    if (selectedEvent?.outcomes?.length) {
      setSelectedOutcome(selectedEvent.outcomes[0].label);
    }
  }, [selectedEvent?.id]);

  async function submitBet(event) {
    event.preventDefault();
    if (!selectedEvent) {
      return;
    }

    await onPlaceBet({
      eventId: selectedEvent.id,
      amount: Number(betAmount),
      outcomeChoice: selectedOutcome,
    });
  }

  async function submitEvent(event) {
    event.preventDefault();
    await onCreateEvent({
      title: createForm.title,
      description: createForm.description,
      category: createForm.category,
      dateEnd: createForm.dateEnd,
      outcomes: createForm.outcomes.filter(Boolean),
    });

    setCreateForm({
      title: "",
      description: "",
      category: "sports",
      dateEnd: "",
      outcomes: ["", ""],
    });
  }

  return (
    <section className="stack">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Place de marche</p>
            <h1>Evenements ouverts aux paris</h1>
          </div>
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un evenement" />
        </div>

        <div className="chip-row">
          {EVENT_CATEGORIES.map((item) => (
            <button key={item.id} className={item.id === category ? "chip active" : "chip"} onClick={() => setCategory(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="events-layout">
          <div className="events-list">
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                className={selectedEvent?.id === event.id ? "event-tile active" : "event-tile"}
                onClick={() => setSelectedEventId(event.id)}
              >
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                </div>
                <small>{formatDate(event.dateEnd)}</small>
              </button>
            ))}
          </div>

          <div className="panel inset-panel">
            {selectedEvent ? (
              <>
                <div className="event-meta">
                  <span className="pill">{selectedEvent.category}</span>
                  <span className="pill">{selectedEvent.status}</span>
                </div>
                <h3>{selectedEvent.title}</h3>
                <p>{selectedEvent.description}</p>
                <div className="odds-grid">
                  {(selectedEvent?.outcomes ?? []).map((outcome) => (
                    <button
                      key={outcome.label}
                      className={selectedOutcome === outcome.label ? "odd-card active" : "odd-card"}
                      onClick={() => setSelectedOutcome(outcome.label)}
                    >
                      <strong>{outcome.label}</strong>
                      <small>x{outcome.odds}</small>
                    </button>
                  ))}
                </div>
                <form className="inline-form" onSubmit={submitBet}>
                  <label>
                    Mise
                    <input type="number" min="1" value={betAmount} onChange={(event) => setBetAmount(event.target.value)} />
                  </label>
                  <button className="primary-button" type="submit">
                    {user ? "Confirmer le pari" : "Se connecter pour parier"}
                  </button>
                </form>
                <p className="helper">Solde actuel: {user ? `${user.tokens} tokens` : "utilisateur non connecte"}</p>
              </>
            ) : (
              <p>Aucun evenement ne correspond au filtre en cours.</p>
            )}
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Creation communautaire</p>
            <h2>Soumettre un evenement</h2>
          </div>
        </div>
        <form className="stack" onSubmit={submitEvent}>
          <label>
            Titre
            <input value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} required />
          </label>
          <label>
            Description
            <textarea rows="4" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} />
          </label>
          <div className="split-grid">
            <label>
              Categorie
              <select value={createForm.category} onChange={(event) => setCreateForm({ ...createForm, category: event.target.value })}>
                {EVENT_CATEGORIES.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date de cloture
              <input type="datetime-local" value={createForm.dateEnd} onChange={(event) => setCreateForm({ ...createForm, dateEnd: event.target.value })} />
            </label>
          </div>
          <div className="split-grid">
            {createForm.outcomes.map((value, index) => (
              <label key={index}>
                Issue {index + 1}
                <input
                  value={value}
                  onChange={(event) => {
                    const outcomes = [...createForm.outcomes];
                    outcomes[index] = event.target.value;
                    setCreateForm({ ...createForm, outcomes });
                  }}
                  required={index < 2}
                />
              </label>
            ))}
          </div>
          <div className="panel-actions">
            <button className="ghost-button" type="button" onClick={() => setCreateForm({ ...createForm, outcomes: [...createForm.outcomes, ""] })}>
              Ajouter une issue
            </button>
            <button className="primary-button" type="submit">
              Envoyer pour validation
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

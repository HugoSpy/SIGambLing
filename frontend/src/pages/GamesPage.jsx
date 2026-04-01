import { useState } from "react";
import { ROULETTE_OPTIONS } from "../constants";

export function GamesPage({ user, onRoulette, onBlackjack }) {
  const [rouletteAmount, setRouletteAmount] = useState(25);
  const [rouletteSelection, setRouletteSelection] = useState(ROULETTE_OPTIONS[0]);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [blackjackAmount, setBlackjackAmount] = useState(20);
  const [blackjackSession, setBlackjackSession] = useState(null);

  async function spinRoulette() {
    const response = await onRoulette({
      amount: Number(rouletteAmount),
      selectionType: rouletteSelection.selectionType,
      selectionValue: rouletteSelection.selectionValue,
    });

    if (response) {
      setRouletteResult(response);
    }
  }

  async function blackjackAction(mode) {
    const response = await onBlackjack({
      mode,
      amount: Number(blackjackAmount),
      sessionId: blackjackSession?.sessionId,
    });

    if (response) {
      setBlackjackSession(response);
    }
  }

  return (
    <section className="stack">
      <div className="split-panels">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Roulette</p>
              <h2>Pari instantane</h2>
            </div>
          </div>
          <div className="stack">
            <label>
              Mise
              <input type="number" min="1" value={rouletteAmount} onChange={(event) => setRouletteAmount(event.target.value)} />
            </label>
            <div className="odds-grid">
              {ROULETTE_OPTIONS.map((option) => (
                <button
                  key={`${option.selectionType}-${option.selectionValue}`}
                  className={rouletteSelection.selectionType === option.selectionType && rouletteSelection.selectionValue === option.selectionValue ? "odd-card active" : "odd-card"}
                  onClick={() => setRouletteSelection(option)}
                >
                  <strong>{option.label}</strong>
                  <small>{option.odds}</small>
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={spinRoulette}>
              Lancer la roue
            </button>
            {rouletteResult ? (
              <div className="result-card">
                <strong>Numero sorti: {rouletteResult.result.number}</strong>
                <p>{rouletteResult.message}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Blackjack</p>
              <h2>Session serveur simplifiee</h2>
            </div>
          </div>
          <div className="stack">
            <label>
              Mise de depart
              <input type="number" min="1" value={blackjackAmount} onChange={(event) => setBlackjackAmount(event.target.value)} />
            </label>
            <div className="panel-actions">
              <button className="primary-button" onClick={() => blackjackAction("start")}>
                Nouvelle main
              </button>
              <button className="ghost-button" onClick={() => blackjackAction("hit")}>
                Tirer
              </button>
              <button className="ghost-button" onClick={() => blackjackAction("stand")}>
                Rester
              </button>
              <button className="ghost-button" onClick={() => blackjackAction("double")}>
                Doubler
              </button>
            </div>
            {blackjackSession ? (
              <div className="blackjack-board">
                <div>
                  <p className="eyebrow">Joueur</p>
                  <strong>{blackjackSession.playerHand?.join(" ")}</strong>
                  <p>Total: {blackjackSession.playerValue}</p>
                </div>
                <div>
                  <p className="eyebrow">Croupier</p>
                  <strong>{blackjackSession.dealerHand?.join(" ")}</strong>
                  <p>Total: {blackjackSession.dealerValue}</p>
                </div>
                <div className="result-card">
                  <strong>Etat: {blackjackSession.status}</strong>
                  <p>{blackjackSession.message || "Main en cours."}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel panel-contrast">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Rappel produit</p>
            <h2>Gamification incluse</h2>
          </div>
        </div>
        <div className="timeline">
          <article>
            <strong>Daily reward</strong>
            <p>100 tokens accordes une fois par jour a la connexion.</p>
          </article>
          <article>
            <strong>Badges</strong>
            <p>Attribues selon le nombre de gains, le niveau et les tokens accumules.</p>
          </article>
          <article>
            <strong>Challenges</strong>
            <p>Progression quotidienne et hebdomadaire exposee dans le profil.</p>
          </article>
        </div>
        <p className="helper">Solde visible: {user ? `${user.tokens} tokens` : "connecte-toi pour jouer"}</p>
      </section>
    </section>
  );
}


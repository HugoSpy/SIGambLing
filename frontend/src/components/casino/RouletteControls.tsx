import { History, Volume2, VolumeX } from "lucide-react";
import { QUICK_BET_AMOUNTS } from "../../lib/casino/rouletteConstants";
import { formatTokens } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

interface RouletteControlsProps {
  balance: number;
  betAmount: number;
  totalBet: number;
  maxPotentialWin: number;
  disabled: boolean;
  soundEnabled: boolean;
  phase: "idle" | "betting" | "spinning" | "resolving" | "payout";
  hasLastBets: boolean;
  onBetAmountChange: (amount: number) => void;
  onSpin: () => void;
  onClearBets: () => void;
  onToggleSound: () => void;
  onRebet: () => void;
  onDoubleBets: () => void;
  onHalveBets: () => void;
}

export function RouletteControls({
  balance,
  betAmount,
  totalBet,
  maxPotentialWin,
  disabled,
  soundEnabled,
  phase,
  hasLastBets,
  onBetAmountChange,
  onSpin,
  onClearBets,
  onToggleSound,
  onRebet,
  onDoubleBets,
  onHalveBets,
}: RouletteControlsProps) {
  return (
    <Card accent="cyan">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-cyan">Panneau de jeu</p>
          <h2 className="mt-3 font-display text-3xl text-brand-text">Placez vos jetons</h2>
          <p className="mt-3 text-sm leading-7 text-brand-muted">
            Choisissez un montant, posez vos mises puis lancez la roue quand tout est en place.
          </p>
        </div>
        <button
          aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-brand-text transition hover:border-brand-cyan/40 hover:bg-white/10"
          onClick={onToggleSound}
          type="button"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Solde disponible</p>
          <p className="mt-3 font-display text-4xl text-brand-text">{formatTokens(balance)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Mise totale</p>
            <p className="mt-2 font-display text-2xl text-brand-text">{formatTokens(totalBet)}</p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-muted">Retour possible</p>
            <p className="mt-2 font-display text-2xl text-brand-text">
              {formatTokens(maxPotentialWin)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Input
          label="Montant par jeton"
          min={1}
          onChange={(event) => {
            const raw = event.target.value.replace(/^0+(?=\d)/, "");
            onBetAmountChange(Number(raw) || 0);
          }}
          placeholder="1"
          step={1}
          type="number"
          value={betAmount || ""}
        />
      </div>

      <p className="mt-3 text-sm text-brand-muted">
        Mise minimum : 1 token. Les paris sont bloqués pendant la rotation.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_BET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
              betAmount === amount
                ? "border-brand-orange bg-brand-orange text-slate-950"
                : "border-white/10 bg-white/5 text-brand-text hover:border-brand-cyan/45 hover:bg-white/10"
            }`}
            disabled={disabled}
            onClick={() => onBetAmountChange(amount)}
            type="button"
          >
            {amount}
          </button>
        ))}
        <button
          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
            betAmount === balance
              ? "border-red-400 bg-red-500 text-white"
              : "border-red-500/50 bg-red-500/10 text-red-400 hover:border-red-400 hover:bg-red-500/20"
          }`}
          disabled={disabled || balance < 10}
          onClick={() => onBetAmountChange(balance)}
          type="button"
        >
          All-in
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {phase === "idle" && (
          <button
            aria-label="Rejouer les mises précédentes"
            className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 border-white/10 bg-white/5 text-brand-text hover:border-brand-cyan/45 hover:bg-white/10 disabled:hover:border-white/10 disabled:hover:bg-white/5"
            disabled={!hasLastBets}
            onClick={onRebet}
            type="button"
          >
            <History className="h-3.5 w-3.5" />
            Rebet
          </button>
        )}
        <button
          className="rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 border-white/10 bg-white/5 text-brand-text hover:border-brand-cyan/45 hover:bg-white/10 disabled:hover:border-white/10 disabled:hover:bg-white/5"
          disabled={disabled || totalBet === 0}
          onClick={onDoubleBets}
          type="button"
        >
          ×2
        </button>
        <button
          className="rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 border-white/10 bg-white/5 text-brand-text hover:border-brand-cyan/45 hover:bg-white/10 disabled:hover:border-white/10 disabled:hover:bg-white/5"
          disabled={disabled || totalBet === 0}
          onClick={onHalveBets}
          type="button"
        >
          ÷2
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <Button disabled={disabled || totalBet === 0} fullWidth onClick={onSpin} size="lg">
          {disabled ? "Rotation en cours..." : "Lancer la roue"}
        </Button>
        <Button
          disabled={disabled || totalBet === 0}
          fullWidth
          onClick={onClearBets}
          variant="secondary"
        >
          Effacer les mises
        </Button>
      </div>
    </Card>
  );
}

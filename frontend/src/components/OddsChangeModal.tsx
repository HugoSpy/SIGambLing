import type { OddsConflictDetails } from "../types/event";
import { formatEventOdds } from "../lib/event-utils";
import { formatTokens } from "../lib/utils";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface OddsChangeModalProps {
  details: OddsConflictDetails | null;
  open: boolean;
  rememberChoice: boolean;
  onRememberChoiceChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export function OddsChangeModal({
  details,
  open,
  rememberChoice,
  onRememberChoiceChange,
  onClose,
  onConfirm,
  submitting = false,
}: OddsChangeModalProps) {
  return (
    <Modal
      title="Cotes mises à jour"
      description="Le marché a bougé juste avant la validation. Vérifiez les nouvelles cotes avant de confirmer."
      open={open}
      onClose={onClose}
    >
      {!details ? null : (
        <div className="space-y-5">
          <div className="space-y-3">
            {details.changes.map((change) => (
              <div
                className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4"
                key={`${change.event_id}:${change.chosen_option}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{change.event_title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">
                      {change.chosen_option}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Mise</p>
                    <p className="text-sm font-medium text-zinc-100">
                      {formatTokens(change.stake)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Ancienne cote
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zinc-100">
                      {formatEventOdds(change.previous_odds)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Gain potentiel {formatTokens(change.potential_payout_before)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">
                      Nouvelle cote
                    </p>
                    <p className="mt-2 text-lg font-semibold text-emerald-300">
                      {formatEventOdds(change.current_odds)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-100/80">
                      Gain potentiel {formatTokens(change.potential_payout_after)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-400">Potentiel avant validation</span>
              <span className="font-semibold text-zinc-100">
                {formatTokens(details.total_potential_payout_before)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-zinc-400">Potentiel avec les nouvelles cotes</span>
              <span className="font-semibold text-emerald-300">
                {formatTokens(details.total_potential_payout_after)}
              </span>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
            <input
              checked={rememberChoice}
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
              onChange={(event) => onRememberChoiceChange(event.target.checked)}
              type="checkbox"
            />
            <span>Toujours accepter automatiquement les changements de cotes sur ce compte.</span>
          </label>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={onClose} variant="secondary">
              Revoir mon ticket
            </Button>
            <Button className="flex-1" disabled={submitting} onClick={onConfirm}>
              {submitting ? "Validation..." : "Accepter les nouvelles cotes"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

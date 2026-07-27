import type { CSSProperties } from "react";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { canCast } from "../../divine/miracleResolver";
import { MIRACLE_DEFINITIONS } from "../../divine/miracleTypes";
import { useGameStore } from "../../state/gameStore";
import { divineModifiersForState } from "../../engine/progressionEngine";

const MIRACLE_ORDER = ["lightning", "blessing", "curse"] as const;

type MiracleButtonStyle = CSSProperties & {
  readonly "--miracle-color": string;
};

export function MiracleButtons() {
  const {
    selectedMiracle,
    selectMiracle,
    state,
  } = useGameStore();
  const { divinePower, miracleCooldowns, phase } = state;
  const modifiers = divineModifiersForState(state);

  return (
    <section className="miracle-panel" aria-label="Divine miracles">
      <h2>Divine intervention</h2>
      <div className="miracle-button-list">
        {MIRACLE_ORDER.map((type) => {
          const definition = MIRACLE_DEFINITIONS[type];
          const cooldown = miracleCooldowns[type];
          const selected = selectedMiracle === type;
          const enabled =
            (phase === "preparation" || phase === "wave") &&
            canCast(type, divinePower, cooldown, modifiers);
          const style: MiracleButtonStyle = {
            "--miracle-color": definition.color,
          };

          return (
            <button
              aria-pressed={selected}
              className="miracle-button"
              disabled={!enabled}
              key={type}
              onClick={() => selectMiracle(selected ? null : type)}
              style={style}
              type="button"
            >
              <span>{definition.label}</span>
              <span className="miracle-cost">
                {(definition.cost * modifiers.divineCostMultiplier).toFixed(0)}{" "}
                power
              </span>
              {cooldown > 0 ? (
                <span className="miracle-cooldown">
                  {(cooldown / BALANCE_CONFIG.TICKS_PER_SECOND).toFixed(1)}s
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

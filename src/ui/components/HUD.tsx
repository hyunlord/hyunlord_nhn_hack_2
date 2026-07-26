import { useGameStore } from "../../state/gameStore";
import { BALANCE_CONFIG } from "../../content/balanceConfig";

export function HUD() {
  const { state } = useGameStore();

  return (
    <section className="hud-panel" aria-label="World status">
      <div className="hud-heading">
        <h2>Living world</h2>
        <span className="tick-counter">Tick {state.tick}</span>
      </div>
      <div className="phase-status">
        <span>Phase</span>
        <strong>{state.phase}</strong>
      </div>
      {state.activeThreat === null ? null : (
        <div className="invasion-status" aria-label="Invasion status">
          <span>
            {state.activeThreat.creatures.length} creatures remaining
          </span>
          <strong>
            Mage {state.activeThreat.mage.hp}/{BALANCE_CONFIG.DARK_MAGE_HP} HP
          </strong>
        </div>
      )}
      <div className="divine-power">
        <div className="divine-power-label">
          <span>Divine power</span>
          <strong>
            {state.divinePower.toFixed(1)}/{BALANCE_CONFIG.DIVINE_POWER_MAX}
          </strong>
        </div>
        <progress
          aria-label="Divine power"
          max={BALANCE_CONFIG.DIVINE_POWER_MAX}
          value={state.divinePower}
        />
      </div>
      <ul className="house-status-list">
        {state.houses.map((house) => {
          const livingCount = state.agents.filter(
            (agent) =>
              agent.houseId === house.id && agent.state !== "dead",
          ).length;

          return (
            <li key={house.id}>
              <span
                aria-hidden="true"
                className="house-swatch"
                style={{ backgroundColor: house.color }}
              />
              <span>{house.name}</span>
              <strong>
                {livingCount} living · {house.power} power
              </strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

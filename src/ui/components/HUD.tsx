import { useGameStore } from "../../state/gameStore";

export function HUD() {
  const { state } = useGameStore();

  return (
    <section className="hud-panel" aria-label="World status">
      <div className="hud-heading">
        <h2>Living world</h2>
        <span className="tick-counter">Tick {state.tick}</span>
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
              <strong>{livingCount} living</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

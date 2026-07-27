import { useGameStore } from "../../state/gameStore";

export function RunOverlay() {
  const { dispatch, state } = useGameStore();
  if (
    state.phase !== "victory" &&
    state.phase !== "defeat"
  ) {
    return null;
  }

  const survivingHalls = state.halls.filter(({ hp }) => hp > 0).length;
  return (
    <section
      aria-live="polite"
      className={`run-overlay run-overlay--${state.phase}`}
    >
      <p className="run-overlay__eyebrow">
        Run complete
      </p>
      <h2>
        {state.phase === "victory"
          ? "The halls endure"
          : "The last hall has fallen"}
      </h2>
      <p>
        {`${state.waveIndex + 1} wave${state.waveIndex === 0 ? "" : "s"} faced · ${survivingHalls} of ${state.halls.length} halls remain.`}
      </p>
      <button
        onClick={() => dispatch({ type: "restart" })}
        type="button"
      >
        Start a new run
      </button>
    </section>
  );
}

import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { useGameStore } from "../../state/gameStore";

export function RunOverlay() {
  const { dispatch, state } = useGameStore();
  if (
    state.phase !== "intermission" &&
    state.phase !== "victory" &&
    state.phase !== "defeat"
  ) {
    return null;
  }

  const clearedWave = WAVE_DEFINITIONS[state.waveIndex];
  const survivingHalls = state.halls.filter(({ hp }) => hp > 0).length;
  const isIntermission = state.phase === "intermission";

  return (
    <section
      aria-live="polite"
      className={`run-overlay run-overlay--${state.phase}`}
    >
      <p className="run-overlay__eyebrow">
        {isIntermission ? "Intermission" : "Run complete"}
      </p>
      <h2>
        {isIntermission
          ? `${clearedWave?.label ?? "Wave"} secured`
          : state.phase === "victory"
            ? "The halls endure"
            : "The last hall has fallen"}
      </h2>
      <p>
        {isIntermission
          ? `+${clearedWave?.tributeReward ?? 0} tribute · surviving agents recover before the next assault.`
          : `${state.waveIndex + 1} wave${state.waveIndex === 0 ? "" : "s"} faced · ${survivingHalls} of ${state.halls.length} halls remain.`}
      </p>
      {isIntermission ? (
        <>
          <p className="run-overlay__note">
            The tribute shop arrives in Phase 3C.
          </p>
          <button
            onClick={() => dispatch({ type: "beginNextWave" })}
            type="button"
          >
            Begin wave {state.waveIndex + 2}
          </button>
        </>
      ) : (
        <button
          onClick={() => dispatch({ type: "restart" })}
          type="button"
        >
          Start a new run
        </button>
      )}
    </section>
  );
}

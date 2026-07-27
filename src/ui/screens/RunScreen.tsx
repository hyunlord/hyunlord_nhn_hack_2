import { useEffect } from "react";
import { GameCanvas } from "../../render/GameCanvas";
import { useAppFlow } from "../../state/appFlowContext";
import { GameStoreProvider, useGameStore } from "../../state/gameStore";
import { validateHouseSelection } from "../../content/houseConfig";
import { HighlightFeed } from "../components/HighlightFeed";
import { HUD } from "../components/HUD";
import { MiracleButtons } from "../components/MiracleButtons";
import { DraftOverlay } from "../components/DraftOverlay";
import { ShopOverlay } from "../components/ShopOverlay";

function RunWorld() {
  const { state } = useGameStore();
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fantasy God-Sim</h1>
        <p>Guide the chosen alliance through three escalating invasions.</p>
      </header>
      {state.betrayalHouseId === null ? null : (
        <aside className="betrayal-notice" aria-live="assertive">
          <strong>Betrayal within the alliance</strong>
          <span>One house has broken faith and fled the defense.</span>
        </aside>
      )}
      <div className="scaffold-grid">
        <div className="canvas-panel">
          <GameCanvas />
          <ShopOverlay />
          <DraftOverlay />
        </div>
        <HUD />
        <MiracleButtons />
        <HighlightFeed />
      </div>
    </main>
  );
}

export function RunScreen() {
  const { dispatch, state } = useAppFlow();
  const validation = validateHouseSelection(state.selectedHouseIds);

  useEffect(() => {
    if (
      state.appPhase === "run" &&
      (state.runSeed === null || !validation.valid)
    ) {
      dispatch({ type: "returnToMeta" });
    }
  }, [dispatch, state.appPhase, state.runSeed, validation.valid]);

  if (state.runSeed === null || !validation.valid) {
    return null;
  }

  return (
    <GameStoreProvider
      houseIds={validation.houseIds}
      key={`${state.runSeed}:${validation.houseIds.join(",")}`}
      onTerminal={(summary) => dispatch({ type: "completeRun", summary })}
      seed={state.runSeed}
    >
      <RunWorld />
    </GameStoreProvider>
  );
}

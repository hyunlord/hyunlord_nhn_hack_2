import { GameCanvas } from "./render/GameCanvas";
import { HighlightFeed } from "./ui/components/HighlightFeed";
import { HUD } from "./ui/components/HUD";
import { MiracleButtons } from "./ui/components/MiracleButtons";
import { EndingScreen } from "./ui/screens/EndingScreen";
import { IdleScreen } from "./ui/screens/IdleScreen";
import { InterventionScreen } from "./ui/screens/InterventionScreen";
import { ObservationScreen } from "./ui/screens/ObservationScreen";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fantasy God-Sim</h1>
        <p>Phase 2A — a deterministic living world awakens.</p>
      </header>
      <div className="scaffold-grid">
        <div className="canvas-panel">
          <GameCanvas />
        </div>
        <HUD />
        <MiracleButtons />
        <HighlightFeed />
        <InterventionScreen />
        <ObservationScreen />
        <EndingScreen />
        <IdleScreen />
      </div>
    </main>
  );
}

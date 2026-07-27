import { GameCanvas } from "./render/GameCanvas";
import { HighlightFeed } from "./ui/components/HighlightFeed";
import { HUD } from "./ui/components/HUD";
import { MiracleButtons } from "./ui/components/MiracleButtons";
import { RunOverlay } from "./ui/components/RunOverlay";
import { DraftOverlay } from "./ui/components/DraftOverlay";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fantasy God-Sim</h1>
        <p>Phase 3B — shape three houses through a seeded roguelite draft.</p>
      </header>
      <div className="scaffold-grid">
        <div className="canvas-panel">
          <GameCanvas />
          <RunOverlay />
          <DraftOverlay />
        </div>
        <HUD />
        <MiracleButtons />
        <HighlightFeed />
      </div>
    </main>
  );
}

import { GameCanvas } from "./render/GameCanvas";
import { HighlightFeed } from "./ui/components/HighlightFeed";
import { HUD } from "./ui/components/HUD";
import { MiracleButtons } from "./ui/components/MiracleButtons";
import { RunOverlay } from "./ui/components/RunOverlay";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Fantasy God-Sim</h1>
        <p>Phase 3A — defend the three halls through a seeded wave run.</p>
      </header>
      <div className="scaffold-grid">
        <div className="canvas-panel">
          <GameCanvas />
          <RunOverlay />
        </div>
        <HUD />
        <MiracleButtons />
        <HighlightFeed />
      </div>
    </main>
  );
}

import type { Agent, House } from "../agents/agentTypes";
import type { EndingOutcome } from "../narrative/endingResolver";
import type { Highlight } from "../narrative/highlightRecorder";
import type { ThreatEvent } from "../narrative/threatTypes";

export type GamePhase =
  | "intervention"
  | "invasion"
  | "observation"
  | "ending"
  | "idle";

export interface GameState {
  tick: number;
  phase: GamePhase;
  houses: House[];
  agents: Agent[];
  activeThreat: ThreatEvent | null;
  highlights: Highlight[];
  ending: EndingOutcome | null;
}

import type { Agent, House } from "../agents/agentTypes";
import type { HouseId } from "../content/houseConfig";
import type {
  MiracleOutcome,
  MiracleType,
} from "../divine/divine.types";
import type { Highlight } from "../threat/highlightRecorder";
import type { ThreatEvent } from "../threat/threatTypes";

export type RunPhase =
  | "preparation"
  | "wave"
  | "intermission"
  | "victory"
  | "defeat";

export interface Hall {
  houseId: HouseId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface GameState {
  tick: number;
  phase: RunPhase;
  waveIndex: number;
  tribute: number;
  houses: House[];
  halls: Hall[];
  agents: Agent[];
  activeThreat: ThreatEvent | null;
  highlights: Highlight[];
  divinePower: number;
  miracleCooldowns: Record<MiracleType, number>;
  activeEffects: MiracleOutcome[];
}

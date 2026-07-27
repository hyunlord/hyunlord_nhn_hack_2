import type { Agent, House } from "../agents/agentTypes";
import type { HouseId } from "../content/houseConfig";
import type {
  MiracleOutcome,
  MiracleType,
} from "../divine/divine.types";
import type { Highlight } from "../threat/highlightRecorder";
import type { ThreatEvent } from "../threat/threatTypes";
import type {
  DraftOffer,
  HouseProgress,
} from "../progression/progression.types";
import type { ResolvedModifiers } from "../progression/modifiers";
import type {
  ShopPurchases,
  Tower,
} from "../build/build.types";

export type RunPhase =
  | "preparation"
  | "wave"
  | "intermission"
  | "draft"
  | "victory"
  | "defeat";

export interface Hall {
  houseId: HouseId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface WaveSummary {
  agentsLost: number;
  hallDamage: number;
}

export interface GameState {
  tick: number;
  phase: RunPhase;
  phaseBeforeDraft: Exclude<RunPhase, "draft"> | null;
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
  houseProgress: HouseProgress[];
  houseModifiers: {
    houseId: string;
    modifiers: ResolvedModifiers;
  }[];
  pendingDrafts: DraftOffer[];
  towers: Tower[];
  shopPurchases: ShopPurchases;
  runUpgrades: {
    attackDamageMultiplier: number;
  };
  lastWaveSummary: WaveSummary | null;
  waveStartSnapshot: {
    livingAgents: number;
    hallHp: number;
  } | null;
  heroDeaths: number;
}

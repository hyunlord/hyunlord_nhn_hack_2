import type { Agent, House } from "../agents/agentTypes";
import type {
  HouseId,
  HouseSelection,
} from "../content/houseConfig";
import type {
  MiracleOutcome,
  MiracleType,
} from "../divine/divine.types";
import type { SkillOutcome } from "../divine/skillResolver";
import type { DivineSkillId } from "../divine/skillTypes";
import type { Highlight } from "../threat/highlightRecorder";
import type { ThreatEvent } from "../threat/threatTypes";
import type {
  CardEffect,
  DraftOffer,
  HouseProgress,
} from "../progression/progression.types";
import type { ResolvedModifiers } from "../progression/modifiers";
import type {
  ShopPurchases,
  Tower,
  TowerDestroyed,
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
  runSeed: number;
  selectedHouseIds: HouseSelection;
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
  unlockedSkills: DivineSkillId[];
  skillCooldowns: Record<DivineSkillId, number>;
  activeEffects: (MiracleOutcome | SkillOutcome)[];
  houseProgress: HouseProgress[];
  heroProgress: {
    heroId: string;
    xp: number;
    level: number;
  }[];
  houseModifiers: {
    houseId: string;
    modifiers: ResolvedModifiers;
  }[];
  houseBaseEffects: {
    houseId: HouseId;
    effects: readonly CardEffect[];
  }[];
  activeSynergyIds: string[];
  betrayalHouseId: HouseId | null;
  heroLessWave2Clear: boolean;
  pendingDrafts: DraftOffer[];
  towers: Tower[];
  towerRubble: TowerDestroyed[];
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

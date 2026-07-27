import type { HouseSelection } from "../src/content/houseConfig";
import type { UnitClassId } from "../src/content/unitClassConfig";
import type { DivineSkillId } from "../src/divine/skillTypes";
import type { GameState } from "../src/engine/engine.types";
import type { AutoShopDiagnostics } from "./autoShopStrategy";

export type WaveSample = {
  readonly reached: boolean;
  readonly startAgents: number | null;
  readonly endAgents: number | null;
  readonly creatureSpawns: number;
  readonly creatureKills: number;
  readonly clearTicks: number | null;
  readonly mageOnlyTicks: number;
  readonly hallDamage: number;
};

export type RunOutcome =
  | { readonly kind: "defeat"; readonly waveIndex: number }
  | { readonly kind: "victory" };

export type RunSample = {
  readonly seed: number;
  readonly selectedHouseIds: HouseSelection;
  readonly outcome: RunOutcome;
  readonly endTick: number;
  readonly survivingAgents: number;
  readonly hallHpRemaining: number;
  readonly waves: readonly WaveSample[];
  readonly draftCount: number;
  readonly finalLevels: readonly number[];
  readonly finalHeroLevels: readonly number[];
  readonly offeredCardIds: readonly string[];
  readonly pickedCardIds: readonly string[];
  readonly acquiredSkillIds: readonly DivineSkillId[];
  readonly skillCasts: number;
  readonly towersBuilt: number;
  readonly tributeUnspent: number;
  readonly heroDeaths: number;
  readonly divinePowerSpent: number;
  readonly classDeaths: Readonly<Record<UnitClassId, number>>;
  readonly shopDiagnostics: AutoShopDiagnostics;
  readonly legacyEarned: number;
};

export type SimulationObserver = {
  readonly onTick?: (
    before: GameState,
    after: GameState,
    elapsedMs: number,
  ) => void;
};

export type SimulationMetrics = {
  readonly reached: boolean[];
  readonly startAgents: (number | null)[];
  readonly endAgents: (number | null)[];
  readonly creatureSpawns: number[];
  readonly creatureKills: number[];
  readonly clearTicks: (number | null)[];
  readonly mageOnlyTicks: number[];
  readonly hallDamage: number[];
  readonly classDeaths: Record<UnitClassId, number>;
  divinePowerSpent: number;
};

import type { HouseId } from "./houseConfig";

export interface BetrayalSummary {
  readonly traitorHouseId: HouseId;
}

export interface RunSummary {
  readonly runId: string;
  readonly selectedHouseIds: readonly HouseId[];
  readonly wavesCleared: number;
  readonly bestWaveReached: number;
  readonly victory: boolean;
  readonly agentsStarted: number;
  readonly survivingAgents: number;
  readonly agentsLost: number;
  readonly hallsStarted: number;
  readonly survivingHalls: number;
  readonly towersBuilt: number;
  readonly noTowers: boolean;
  readonly allHallsStanding: boolean;
  readonly heroLessWave2Clear: boolean;
  readonly betrayal: BetrayalSummary | null;
  readonly daylightRaidWaveNumbers?: readonly number[];
  readonly discoveredSynergyIds: readonly string[];
  readonly populationHistory: readonly {
    readonly wave: number;
    readonly houseId: HouseId;
    readonly count: number;
  }[];
}

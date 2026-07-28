export const DEATH_PUFF_TICKS = 10;
export const DEFENSE_PULSE_TICKS = 10;
export const SHAKE_TICKS = 10;
export const WAVE_BANNER_TICKS = 60;
export const DEFENSE_DANGER_RATIO = 0.25;

export interface CombatSnapshot {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export type CombatTransientEvent =
  | {
      readonly kind: "death_puff";
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly startTick: number;
      readonly durationTicks: typeof DEATH_PUFF_TICKS;
      readonly target: "agent" | "threat";
    }
  | {
      readonly kind: "defense_pulse";
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly startTick: number;
      readonly durationTicks: typeof DEFENSE_PULSE_TICKS;
      readonly hpBefore: number;
      readonly hpAfter: number;
    }
  | {
      readonly kind: "shake";
      readonly id: string;
      readonly startTick: number;
      readonly durationTicks: typeof SHAKE_TICKS;
      readonly strength: number;
    }
  | {
      readonly kind: "wave_banner";
      readonly id: string;
      readonly startTick: number;
      readonly durationTicks: typeof WAVE_BANNER_TICKS;
      readonly wave: number;
      readonly daylightRaid: boolean;
      readonly creatureCount: number;
    }
  | {
      readonly kind: "banner_destroyed";
      readonly id: string;
      readonly startTick: number;
      readonly durationTicks: typeof WAVE_BANNER_TICKS;
      readonly houseId: import("../content/houseConfig").HouseId;
    };

export interface CombatTransientTracker {
  readonly agents: ReadonlyMap<string, CombatSnapshot>;
  readonly threats: ReadonlyMap<string, CombatSnapshot>;
  readonly defenses: ReadonlyMap<string, CombatSnapshot>;
  readonly threatIdentity: string | null;
  readonly activeEvents: readonly CombatTransientEvent[];
  readonly shakenDefenseIds: ReadonlySet<string>;
}

export interface CombatTransientUpdate {
  readonly tracker: CombatTransientTracker;
  readonly events: readonly CombatTransientEvent[];
  readonly newEvents: readonly CombatTransientEvent[];
}

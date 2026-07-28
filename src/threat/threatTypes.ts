import type { HouseId } from "../content/houseConfig";

export type ThreatType =
  | "dark_mage_invasion"
  | "monster_horde"
  | "giant_beast"
  | "human_army";

export interface ThreatTargetSnapshot {
  readonly id: string;
  readonly houseId: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly state: string;
}

export type DefenseStructureId = "keep" | `banner:${HouseId}`;

export interface KeepDefenseSnapshot {
  readonly kind: "keep";
  readonly id: "keep";
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly radius: number;
}

export interface BannerDefenseSnapshot {
  readonly kind: "banner";
  readonly id: `banner:${HouseId}`;
  readonly houseId: HouseId;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly radius: number;
}

export type DefenseStructureSnapshot =
  | KeepDefenseSnapshot
  | BannerDefenseSnapshot;

export interface StructureSnapshot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly radius: number;
}

export interface Creature {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly agentDamage: number;
  readonly structureDamage: number;
  readonly lastAttackTick: number;
  readonly haltedUntilTick: number;
}

export interface DarkMage {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly structureDamage: number;
  readonly lastAttackTick: number;
}

export interface ThreatEvent {
  readonly type: ThreatType;
  readonly waveIndex: number;
  readonly startTick: number;
  readonly traitorHouseId: string | null;
  readonly daylightRaid?: boolean;
  readonly mage: DarkMage | null;
  readonly creatures: readonly Creature[];
}

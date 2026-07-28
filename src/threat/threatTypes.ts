export type ThreatType =
  | "dark_mage_invasion"
  | "monster_horde"
  | "giant_beast"
  | "human_army";

export interface ThreatTargetSnapshot {
  id: string;
  houseId: string;
  x: number;
  y: number;
  hp: number;
  state: string;
}

export interface HallSnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
}

export interface StructureSnapshot {
  id: string;
  x: number;
  y: number;
  hp: number;
  radius: number;
}

export interface Creature {
  id: string;
  x: number;
  y: number;
  hp: number;
  agentDamage: number;
  hallDamage: number;
  lastAttackTick: number;
  haltedUntilTick: number;
}

export interface DarkMage {
  x: number;
  y: number;
  hp: number;
  hallDamage: number;
  lastAttackTick: number;
}

export interface ThreatEvent {
  type: ThreatType;
  waveIndex: number;
  startTick: number;
  traitorHouseId: string | null;
  readonly daylightRaid?: boolean;
  mage: DarkMage | null;
  creatures: Creature[];
}

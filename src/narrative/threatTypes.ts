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

export interface Creature {
  id: string;
  x: number;
  y: number;
  hp: number;
  lastAttackTick: number;
}

export interface DarkMage {
  x: number;
  y: number;
  hp: number;
}

export interface ThreatEvent {
  type: ThreatType;
  startTick: number;
  traitorHouseId: string | null;
  mage: DarkMage;
  creatures: Creature[];
  engaged: boolean;
}

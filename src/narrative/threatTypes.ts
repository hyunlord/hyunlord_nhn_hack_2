import type { HouseId } from "../content/houseConfig";

export type ThreatType =
  | "dark_mage_invasion"
  | "monster_horde"
  | "giant_beast"
  | "human_army";

export interface ThreatEvent {
  type: ThreatType;
  startTick: number;
  traitorHouseId: HouseId | null;
}

import type { HouseId } from "../content/houseConfig";

export type { HouseId } from "../content/houseConfig";

export interface House {
  id: HouseId;
  name: string;
  color: string;
  power: number;
  isTraitor: boolean;
}

export type AgentState = "idle" | "fleeing" | "fighting" | "helping" | "dead";

export interface Disposition {
  aggression: number;
  loyalty: number;
}

export interface Agent {
  id: string;
  houseId: HouseId;
  disposition: Disposition;
  x: number;
  y: number;
  heading: number;
  state: AgentState;
  hp: number;
  lastDamagedTick: number;
  lastAttackTick: number;
}

export interface ThreatPresence {
  x: number;
  y: number;
  hostile: boolean;
}

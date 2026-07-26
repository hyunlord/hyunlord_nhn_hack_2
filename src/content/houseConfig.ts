export type HouseId = "house_a" | "house_b" | "house_c";

export interface HouseConfigEntry {
  id: HouseId;
  name: string;
  color: string;
  spawnX: number;
  spawnY: number;
  initialPower: number;
}

export const HOUSE_CONFIG = [
  {
    id: "house_a",
    name: "Ashvale",
    color: "#d4693f",
    spawnX: 240,
    spawnY: 180,
    initialPower: 50,
  },
  {
    id: "house_b",
    name: "Thornhold",
    color: "#4f8fbf",
    spawnX: 720,
    spawnY: 200,
    initialPower: 50,
  },
  {
    id: "house_c",
    name: "Greymoor",
    color: "#7bb06a",
    spawnX: 480,
    spawnY: 450,
    initialPower: 50,
  },
] as const satisfies readonly HouseConfigEntry[];

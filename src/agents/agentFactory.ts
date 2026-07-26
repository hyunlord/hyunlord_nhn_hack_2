import { BALANCE_CONFIG } from "../content/balanceConfig";
import { HOUSE_CONFIG } from "../content/houseConfig";
import type { Rng } from "../engine/prng";
import type { Agent, House } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const MIN_DISPOSITION = 20;
const MAX_DISPOSITION = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createHouses(_rng: Rng): House[] {
  return HOUSE_CONFIG.map((config) => ({
    id: config.id,
    name: config.name,
    color: config.color,
    power: config.initialPower,
    isTraitor: false,
  }));
}

export function createAgents(houses: readonly House[], rng: Rng): Agent[] {
  return houses.flatMap((house) => {
    const config = HOUSE_CONFIG.find((entry) => entry.id === house.id);
    if (config === undefined) {
      throw new RangeError(`Missing spawn configuration for ${house.id}.`);
    }

    return Array.from(
      { length: BALANCE_CONFIG.AGENTS_PER_HOUSE },
      (_, index): Agent => {
        const radius = BALANCE_CONFIG.HOUSE_SPAWN_RADIUS * Math.sqrt(rng.next());
        const angle = rng.range(0, FULL_TURN);
        const minPosition = BALANCE_CONFIG.AGENT_RADIUS;

        return {
          id: `${house.id}_${String(index).padStart(2, "0")}`,
          houseId: house.id,
          disposition: {
            aggression: Math.round(
              rng.range(MIN_DISPOSITION, MAX_DISPOSITION),
            ),
            loyalty: Math.round(rng.range(MIN_DISPOSITION, MAX_DISPOSITION)),
          },
          x: clamp(
            config.spawnX + Math.cos(angle) * radius,
            minPosition,
            BALANCE_CONFIG.WORLD_WIDTH - minPosition,
          ),
          y: clamp(
            config.spawnY + Math.sin(angle) * radius,
            minPosition,
            BALANCE_CONFIG.WORLD_HEIGHT - minPosition,
          ),
          heading: rng.range(0, FULL_TURN),
          state: "idle",
          hp: BALANCE_CONFIG.INITIAL_HP,
        };
      },
    );
  });
}

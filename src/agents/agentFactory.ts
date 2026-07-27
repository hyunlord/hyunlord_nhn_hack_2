import { BALANCE_CONFIG } from "../content/balanceConfig";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_CONFIG,
  HOUSE_SPAWN_SLOTS,
  type HouseSelection,
} from "../content/houseConfig";
import { HERO_DEFINITIONS } from "../content/heroConfig";
import type { Rng } from "../content/random";
import type { Agent, House } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const MIN_DISPOSITION = 20;
const MAX_DISPOSITION = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createHouses(
  _rng: Rng,
  selectedHouseIds: HouseSelection = DEFAULT_HOUSE_IDS,
): House[] {
  return selectedHouseIds.map((houseId) => {
    const config = HOUSE_CONFIG.find(({ id }) => id === houseId);
    if (config === undefined) {
      throw new RangeError(`Missing house configuration for ${houseId}.`);
    }
    return {
    id: config.id,
    name: config.name,
    color: config.color,
    power: config.initialPower,
    isTraitor: false,
    };
  });
}

export function createAgents(houses: readonly House[], rng: Rng): Agent[] {
  const regularAgents = houses.flatMap((house, houseIndex) => {
    const config = HOUSE_CONFIG.find((entry) => entry.id === house.id);
    const slot = HOUSE_SPAWN_SLOTS[houseIndex];
    if (config === undefined || slot === undefined) {
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
              clamp(
                rng.range(MIN_DISPOSITION, MAX_DISPOSITION) +
                  config.traits.aggressionBias,
                MIN_DISPOSITION,
                MAX_DISPOSITION,
              ),
            ),
            loyalty: Math.round(
              clamp(
                rng.range(MIN_DISPOSITION, MAX_DISPOSITION) +
                  config.traits.loyaltyBias,
                MIN_DISPOSITION,
                MAX_DISPOSITION,
              ),
            ),
          },
          x: clamp(
            slot.x + Math.cos(angle) * radius,
            minPosition,
            BALANCE_CONFIG.WORLD_WIDTH - minPosition,
          ),
          y: clamp(
            slot.y + Math.sin(angle) * radius,
            minPosition,
            BALANCE_CONFIG.WORLD_HEIGHT - minPosition,
          ),
          heading: rng.range(0, FULL_TURN),
          state: "idle",
          hp: Math.round(
            BALANCE_CONFIG.INITIAL_HP *
              config.traits.maxHpMultiplier,
          ),
          lastDamagedTick: -1,
          lastAttackTick: -1,
          isHero: false,
          heroId: null,
          heroLevel: 1,
          heroLevelUpTick: -1,
          respawnAtTick: null,
          breakImmuneUntilTick: -1,
        };
      },
    );
  });
  const selectedIds = new Set(houses.map(({ id }) => id));
  const heroes = HERO_DEFINITIONS
    .filter(({ houseId }) => selectedIds.has(houseId))
    .map((definition): Agent => {
    const houseIndex = houses.findIndex(({ id }) => id === definition.houseId);
    const house = HOUSE_CONFIG.find(({ id }) => id === definition.houseId);
    const slot = HOUSE_SPAWN_SLOTS[houseIndex];
    if (house === undefined || slot === undefined) {
      throw new RangeError(`Missing hero house ${definition.houseId}.`);
    }
    return {
      id: definition.id,
      houseId: definition.houseId,
      disposition: { aggression: 80, loyalty: 100 },
      x: slot.x,
      y: slot.y,
      heading: 0,
      state: "idle",
      hp: Math.round(
        BALANCE_CONFIG.INITIAL_HP *
          house.traits.maxHpMultiplier *
          definition.hpMultiplier,
      ),
      lastDamagedTick: -1,
      lastAttackTick: -1,
      isHero: true,
      heroId: definition.id,
      heroLevel: 1,
      heroLevelUpTick: -1,
      respawnAtTick: null,
      breakImmuneUntilTick: -1,
    };
  });
  return [...regularAgents, ...heroes];
}

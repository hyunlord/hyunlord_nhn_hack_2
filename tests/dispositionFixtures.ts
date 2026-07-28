import type { Agent, ThreatPresence } from "../src/agents/agentTypes";
import type { DefenseContext } from "../src/agents/dispositionEngine";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { Rng } from "../src/content/random";

export function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "house_a_00",
    houseId: "house_a",
    unitClass: "melee",
    disposition: { aggression: 80, loyalty: 40 },
    x: 100,
    y: 100,
    heading: 0,
    state: "idle",
    hp: BALANCE_CONFIG.INITIAL_HP,
    lastDamagedTick: -1,
    lastAttackTick: -1,
    isHero: false,
    heroId: null,
    heroLevel: 1,
    heroLevelUpTick: -1,
    respawnAtTick: null,
    breakImmuneUntilTick: -1,
    ...overrides,
  };
}

export function threat(
  id: string,
  x: number,
  y: number,
  hostile = true,
): ThreatPresence {
  return { id, x, y, hostile };
}

export function context(
  overrides: Partial<DefenseContext> = {},
): DefenseContext {
  return {
    ownHall: { x: 100, y: 100, hp: BALANCE_CONFIG.HALL_HP },
    rallyHall: { x: 100, y: 100 },
    threatenedHalls: [],
    threats: [],
    ...overrides,
  };
}

export function createCountingRng(): {
  readonly rng: Rng;
  readonly count: () => number;
} {
  let draws = 0;
  const next = () => {
    draws += 1;
    return 0.5;
  };

  return {
    rng: {
      next,
      range(min, max) {
        return min + next() * (max - min);
      },
      int(minInclusive, maxExclusive) {
        return Math.floor(
          minInclusive + next() * (maxExclusive - minInclusive),
        );
      },
      pick<T>(items: readonly T[]) {
        const item = items[this.int(0, items.length)];
        if (item === undefined) {
          throw new RangeError("Cannot pick from an empty array.");
        }
        return item;
      },
    },
    count: () => draws,
  };
}

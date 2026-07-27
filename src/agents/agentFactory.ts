import { BALANCE_CONFIG } from "../content/balanceConfig";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_CONFIG,
  HOUSE_SPAWN_SLOTS,
  type HouseId,
  type HouseSelection,
} from "../content/houseConfig";
import { HERO_DEFINITIONS } from "../content/heroConfig";
import type { Rng } from "../content/random";
import {
  apportionUnitClasses,
  UNIT_CLASSES,
  type UnitClassId,
} from "../content/unitClassConfig";
import type { Agent, House } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const MIN_DISPOSITION = 20;
const MAX_DISPOSITION = 80;

export interface StartingAgentModifiers {
  readonly maxHpBonus: number;
  readonly maxHpMultiplier: number;
  readonly heroMaxHpMultiplier: number;
}

export interface RecruitBatchRequest {
  readonly houseId: HouseId;
  readonly count: number;
  readonly idStart: number;
  readonly spawn: {
    readonly x: number;
    readonly y: number;
  };
  readonly rng: Rng;
  readonly modifiers?: StartingAgentModifiers;
  readonly modifiersByClass?: ReadonlyMap<
    UnitClassId,
    StartingAgentModifiers
  >;
}

interface RegularAgentRequest {
  readonly id: string;
  readonly house: (typeof HOUSE_CONFIG)[number];
  readonly unitClass: UnitClassId;
  readonly x: number;
  readonly y: number;
  readonly rng: Rng;
  readonly modifiers: StartingAgentModifiers | undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function spawnAround(
  center: { readonly x: number; readonly y: number },
  unitClass: UnitClassId,
  rng: Rng,
): { readonly x: number; readonly y: number } {
  const radius = BALANCE_CONFIG.HOUSE_SPAWN_RADIUS * Math.sqrt(rng.next());
  const angle = rng.range(0, FULL_TURN);
  const minimum = UNIT_CLASSES[unitClass].drawRadius;
  return {
    x: clamp(
      center.x + Math.cos(angle) * radius,
      minimum,
      BALANCE_CONFIG.WORLD_WIDTH - minimum,
    ),
    y: clamp(
      center.y + Math.sin(angle) * radius,
      minimum,
      BALANCE_CONFIG.WORLD_HEIGHT - minimum,
    ),
  };
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

function regularHp(
  config: (typeof HOUSE_CONFIG)[number],
  unitClass: UnitClassId,
  modifiers: StartingAgentModifiers | undefined,
): number {
  const baseHp = UNIT_CLASSES[unitClass].maxHp;
  if (modifiers === undefined) {
    return Math.round(baseHp * config.traits.maxHpMultiplier);
  }
  return Math.round(
    (baseHp + modifiers.maxHpBonus) * modifiers.maxHpMultiplier,
  );
}

function heroHp(
  definition: (typeof HERO_DEFINITIONS)[number],
  house: (typeof HOUSE_CONFIG)[number],
  modifiers: StartingAgentModifiers | undefined,
): number {
  if (modifiers === undefined) {
    return Math.round(
      UNIT_CLASSES.melee.maxHp *
        house.traits.maxHpMultiplier *
        definition.hpMultiplier,
    );
  }
  return Math.round(
    (UNIT_CLASSES.melee.maxHp + modifiers.maxHpBonus) *
      modifiers.maxHpMultiplier *
      definition.hpMultiplier *
      modifiers.heroMaxHpMultiplier,
  );
}

function createRegularAgent(request: RegularAgentRequest): Agent {
  return {
    id: request.id,
    houseId: request.house.id,
    unitClass: request.unitClass,
    disposition: {
      aggression: Math.round(
        clamp(
          request.rng.range(MIN_DISPOSITION, MAX_DISPOSITION) +
            request.house.traits.aggressionBias,
          MIN_DISPOSITION,
          MAX_DISPOSITION,
        ),
      ),
      loyalty: Math.round(
        clamp(
          request.rng.range(MIN_DISPOSITION, MAX_DISPOSITION) +
            request.house.traits.loyaltyBias,
          MIN_DISPOSITION,
          MAX_DISPOSITION,
        ),
      ),
    },
    x: request.x,
    y: request.y,
    heading: request.rng.range(0, FULL_TURN),
    state: "idle",
    hp: regularHp(request.house, request.unitClass, request.modifiers),
    lastDamagedTick: -1,
    lastAttackTick: -1,
    isHero: false,
    heroId: null,
    heroLevel: 1,
    heroLevelUpTick: -1,
    respawnAtTick: null,
    breakImmuneUntilTick: -1,
  };
}

export function createRecruits(request: RecruitBatchRequest): Agent[] {
  const house = HOUSE_CONFIG.find(({ id }) => id === request.houseId);
  if (house === undefined) {
    throw new RangeError(`Missing house configuration for ${request.houseId}.`);
  }
  const unitClasses = apportionUnitClasses(
    request.count,
    house.roster,
  ).flatMap(({ unitClass, count }) =>
    Array.from({ length: count }, () => unitClass),
  );

  return unitClasses.map((unitClass, offset) => {
    const position = spawnAround(request.spawn, unitClass, request.rng);
    return createRegularAgent({
      id: `${request.houseId}_${String(request.idStart + offset).padStart(2, "0")}`,
      house,
      unitClass,
      ...position,
      rng: request.rng,
      modifiers:
        request.modifiersByClass?.get(unitClass) ?? request.modifiers,
    });
  });
}

export function createAgents(
  houses: readonly House[],
  rng: Rng,
  modifiersByHouse: ReadonlyMap<string, StartingAgentModifiers> = new Map(),
): Agent[] {
  const regularAgents = houses.flatMap((house, houseIndex) => {
    const config = HOUSE_CONFIG.find((entry) => entry.id === house.id);
    const slot = HOUSE_SPAWN_SLOTS[houseIndex];
    if (config === undefined || slot === undefined) {
      throw new RangeError(`Missing spawn configuration for ${house.id}.`);
    }

    const unitClasses = apportionUnitClasses(
      config.startingPopulation,
      config.roster,
    ).flatMap(({ unitClass, count }) =>
      Array.from({ length: count }, () => unitClass),
    );

    return unitClasses.map((unitClass, index): Agent => {
      return createRegularAgent({
        id: `${house.id}_${String(index).padStart(2, "0")}`,
        house: config,
        unitClass,
        ...spawnAround(slot, unitClass, rng),
        rng,
        modifiers: modifiersByHouse.get(house.id),
      });
    });
  });
  const selectedIds = new Set(houses.map(({ id }) => id));
  const heroes = HERO_DEFINITIONS
    .filter(({ houseId }) => selectedIds.has(houseId))
    .map((definition): Agent => {
      const houseIndex = houses.findIndex(
        ({ id }) => id === definition.houseId,
      );
      const house = HOUSE_CONFIG.find(({ id }) => id === definition.houseId);
      const slot = HOUSE_SPAWN_SLOTS[houseIndex];
      if (house === undefined || slot === undefined) {
        throw new RangeError(`Missing hero house ${definition.houseId}.`);
      }
      return {
        id: definition.id,
        houseId: definition.houseId,
        unitClass: "melee",
        disposition: { aggression: 80, loyalty: 100 },
        x: slot.x,
        y: slot.y,
        heading: 0,
        state: "idle",
        hp: heroHp(
          definition,
          house,
          modifiersByHouse.get(definition.houseId),
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

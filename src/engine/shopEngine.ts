import type { Agent } from "../agents/agentTypes";
import type {
  ShopAvailability,
  ShopItemId,
  ShopPurchases,
  ShopSnapshot,
} from "../build/build.types";
import {
  EMPTY_PURCHASES,
  SHOP_CATALOG,
  availabilityForItem,
} from "../build/shop";
import {
  TOWER_RADIUS,
  createTower,
  validateTowerPlacement,
} from "../build/structures";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { GameState } from "./engine.types";
import {
  maxHpForAgent,
  respawnHeroNow,
} from "./heroEngine";

const MEDICINE_HEAL = 45;
const HALL_REPAIR = 300;
const SHARPEN_MULTIPLIER = 1.08;

export function createShopPurchases(): ShopPurchases {
  return { ...EMPTY_PURCHASES };
}

function modifiersForAgent(state: GameState, agent: Agent) {
  const modifiers = state.houseModifiers.find(
    ({ houseId }) => houseId === agent.houseId,
  )?.modifiers;
  if (modifiers === undefined) {
    throw new RangeError(`Missing modifiers for ${agent.houseId}.`);
  }
  return modifiers;
}

function eligibleDeadRegulars(state: GameState): Agent[] {
  const livingHallHouses = new Set(
    state.halls
      .filter(({ hp }) => hp > 0)
      .map(({ houseId }) => houseId),
  );
  return state.agents.filter(
    (agent) =>
      !agent.isHero &&
      agent.hp <= 0 &&
      livingHallHouses.has(agent.houseId),
  );
}

export function shopSnapshotForState(state: GameState): ShopSnapshot {
  const livingHallCount = state.halls.filter(({ hp }) => hp > 0).length;
  return {
    tribute: state.tribute,
    purchases: state.shopPurchases,
    towerCount: state.towers.length,
    damagedAgentCount: state.agents.filter(
      (agent) =>
        agent.hp > 0 &&
        agent.hp < maxHpForAgent(agent, modifiersForAgent(state, agent)),
    ).length,
    damagedHallCount: state.halls.filter(
      ({ hp, maxHp }) => hp > 0 && hp < maxHp,
    ).length,
    deadHeroCount:
      livingHallCount === 0
        ? 0
        : state.agents.filter(({ isHero, hp }) => isHero && hp <= 0)
            .length,
    deadRegularAgentCount: eligibleDeadRegulars(state).length,
  };
}

export function shopAvailabilityForState(
  state: GameState,
): ShopAvailability[] {
  return SHOP_CATALOG.map(({ id }) => availabilityForState(state, id));
}

function availabilityForState(
  state: GameState,
  itemId: ShopItemId,
): ShopAvailability {
  const snapshot = shopSnapshotForState(state);
  const base = availabilityForItem(itemId, snapshot);
  if (itemId !== "raise_tower") {
    return base;
  }
  const towerCostMultiplier = Math.min(
    1,
    ...state.houseModifiers.map(
      ({ modifiers }) => modifiers.towerCostMultiplier,
    ),
  );
  const cost = Math.round(base.cost * towerCostMultiplier);
  const affordable = state.tribute >= cost;
  const domainAvailability = availabilityForItem(itemId, {
    ...snapshot,
    tribute: Number.MAX_SAFE_INTEGER,
  });
  return {
    ...base,
    cost,
    affordable,
    available: affordable && domainAvailability.reason === null,
    reason: !affordable ? "not enough tribute" : domainAvailability.reason,
  };
}

function incrementPurchase(
  purchases: ShopPurchases,
  itemId: ShopItemId,
): ShopPurchases {
  return { ...purchases, [itemId]: purchases[itemId] + 1 };
}

function purchaseBase(
  state: GameState,
  itemId: ShopItemId,
): GameState | null {
  if (state.phase !== "intermission") {
    return null;
  }
  const availability = availabilityForState(state, itemId);
  if (!availability.available) {
    return null;
  }
  return {
    ...state,
    tribute: state.tribute - availability.cost,
    shopPurchases: incrementPurchase(state.shopPurchases, itemId),
  };
}

function recruitSquad(state: GameState): Agent[] {
  const dead = eligibleDeadRegulars(state);
  const candidateHouse = [...new Set(dead.map(({ houseId }) => houseId))]
    .sort((first, second) => {
      const living = (houseId: string) =>
        state.agents.filter(
          (agent) =>
            !agent.isHero && agent.houseId === houseId && agent.hp > 0,
        ).length;
      return living(first) - living(second) || first.localeCompare(second);
    })[0];
  const hall = state.halls.find(
    ({ houseId, hp }) => houseId === candidateHouse && hp > 0,
  );
  if (candidateHouse === undefined || hall === undefined) {
    return state.agents;
  }
  const revivedIds = new Set(
    dead
      .filter(({ houseId }) => houseId === candidateHouse)
      .sort((first, second) => first.id.localeCompare(second.id))
      .slice(0, 5)
      .map(({ id }) => id),
  );
  return state.agents.map((agent) =>
    revivedIds.has(agent.id)
      ? {
          ...agent,
          x: hall.x,
          y: hall.y,
          hp: maxHpForAgent(agent, modifiersForAgent(state, agent)),
          state: "idle" as const,
          lastDamagedTick: -1,
          lastAttackTick: state.tick,
        }
      : agent,
  );
}

function healLivingAgents(state: GameState): Agent[] {
  return state.agents.map((agent) =>
    agent.hp <= 0
      ? agent
      : {
          ...agent,
          hp: Math.max(
            agent.hp,
            Math.min(
              maxHpForAgent(agent, modifiersForAgent(state, agent)),
              agent.hp + MEDICINE_HEAL,
            ),
          ),
        },
  );
}

function reinforceHall(state: GameState): GameState["halls"] {
  const target = [...state.halls]
    .filter(({ hp, maxHp }) => hp > 0 && hp < maxHp)
    .sort(
      (first, second) =>
        second.maxHp - second.hp - (first.maxHp - first.hp) ||
        first.houseId.localeCompare(second.houseId),
    )[0];
  return target === undefined
    ? state.halls
    : state.halls.map((hall) =>
        hall.houseId === target.houseId
          ? { ...hall, hp: Math.min(hall.maxHp, hall.hp + HALL_REPAIR) }
          : hall,
      );
}

function reviveHero(state: GameState): Agent[] {
  const hero = [...state.agents]
    .filter(({ isHero, hp }) => isHero && hp <= 0)
    .sort((first, second) => first.id.localeCompare(second.id))[0];
  if (hero === undefined) {
    return state.agents;
  }
  return state.agents.map((agent) =>
    agent.id === hero.id
      ? respawnHeroNow(
          agent,
          state.halls,
          state.houseModifiers,
          state.tick,
        )
      : agent,
  );
}

export function purchaseShopItem(
  state: GameState,
  itemId: Exclude<ShopItemId, "raise_tower">,
): GameState {
  const purchased = purchaseBase(state, itemId);
  if (purchased === null) {
    return state;
  }
  switch (itemId) {
    case "recruit_squad":
      return { ...purchased, agents: recruitSquad(purchased) };
    case "field_medicine":
      return { ...purchased, agents: healLivingAgents(purchased) };
    case "sharpen_arms":
      return {
        ...purchased,
        runUpgrades: {
          attackDamageMultiplier:
            purchased.runUpgrades.attackDamageMultiplier *
            SHARPEN_MULTIPLIER,
        },
      };
    case "reinforce_hall":
      return { ...purchased, halls: reinforceHall(purchased) };
    case "revive_hero":
      return { ...purchased, agents: reviveHero(purchased) };
  }
}

export function purchaseTowerAt(
  state: GameState,
  x: number,
  y: number,
): GameState {
  if (
    state.phase !== "intermission" ||
    !validateTowerPlacement(x, y, {
      worldWidth: BALANCE_CONFIG.WORLD_WIDTH,
      worldHeight: BALANCE_CONFIG.WORLD_HEIGHT,
      halls: state.halls.map(({ houseId, x: hallX, y: hallY, hp, maxHp }) => ({
        id: houseId,
        x: hallX,
        y: hallY,
        hp,
        maxHp,
        radius: BALANCE_CONFIG.HALL_RADIUS,
      })),
      towers: state.towers,
    }).ok
  ) {
    return state;
  }
  const purchased = purchaseBase(state, "raise_tower");
  if (purchased === null) {
    return state;
  }
  const tower = createTower(
    `tower_${String(state.shopPurchases.raise_tower + 1).padStart(2, "0")}`,
    x,
    y,
  );
  return { ...purchased, towers: [...purchased.towers, tower] };
}

export { TOWER_RADIUS };

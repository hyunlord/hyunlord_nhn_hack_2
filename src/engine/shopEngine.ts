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
import { SHOP_EFFECT_VALUES } from "../build/shopEffects";
import {
  TOWER_RADIUS,
  createTower,
  validateTowerPlacement,
} from "../build/structures";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { GameState } from "./engine.types";
import { maxHpForAgent } from "./heroEngine";
import { modifiersForAgent } from "./progressionEngine";
import {
  eligibleDeadRegulars,
  healLivingAgents,
  reinforceMostDamagedHall,
  reviveHero,
  reviveRecruitSquadAgents,
} from "./shopEffectEngine";

export function createShopPurchases(): ShopPurchases {
  return { ...EMPTY_PURCHASES };
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
      return { ...purchased, agents: reviveRecruitSquadAgents(purchased) };
    case "field_medicine":
      return { ...purchased, agents: healLivingAgents(purchased) };
    case "sharpen_arms":
      return {
        ...purchased,
        runUpgrades: {
          attackDamageMultiplier:
            purchased.runUpgrades.attackDamageMultiplier *
            SHOP_EFFECT_VALUES.sharpenArmsMultiplier,
        },
      };
    case "reinforce_hall":
      return { ...purchased, halls: reinforceMostDamagedHall(purchased) };
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

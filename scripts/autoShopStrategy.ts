import type {
  ShopItemId,
} from "../src/build/build.types";
import { SHOP_CATALOG } from "../src/build/shop";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { GameState } from "../src/engine/engine.types";
import {
  purchaseShopItem,
  purchaseTowerAt,
  shopAvailabilityForState,
} from "../src/engine/shopEngine";

export interface AutoShopState {
  readonly nextCategoryIndex: number;
}

export interface PurchaseDiagnostic {
  readonly attempted: number;
  readonly succeeded: number;
  readonly unaffordable: number;
  readonly domainUnavailable: number;
  readonly placementFailed: number;
}

export type AutoShopDiagnostics = Record<
  ShopItemId,
  PurchaseDiagnostic
>;

export interface AutoShopResult {
  readonly state: GameState;
  readonly strategy: AutoShopState;
  readonly diagnostics: AutoShopDiagnostics;
}

const CATEGORY_CYCLE = [
  "raise_tower",
  "recruit_squad",
  "field_medicine",
  "raise_tower",
  "sharpen_arms",
  "reinforce_keep",
  "revive_hero",
] as const satisfies readonly ShopItemId[];

function emptyDiagnostic(): PurchaseDiagnostic {
  return {
    attempted: 0,
    succeeded: 0,
    unaffordable: 0,
    domainUnavailable: 0,
    placementFailed: 0,
  };
}

export function createAutoShopDiagnostics(): AutoShopDiagnostics {
  return {
    field_medicine: emptyDiagnostic(),
    raise_tower: emptyDiagnostic(),
    recruit_squad: emptyDiagnostic(),
    reinforce_keep: emptyDiagnostic(),
    revive_hero: emptyDiagnostic(),
    sharpen_arms: emptyDiagnostic(),
  };
}

function incrementDiagnostic(
  diagnostics: AutoShopDiagnostics,
  itemId: ShopItemId,
  field: keyof PurchaseDiagnostic,
): AutoShopDiagnostics {
  return {
    ...diagnostics,
    [itemId]: {
      ...diagnostics[itemId],
      [field]: diagnostics[itemId][field] + 1,
    },
  };
}

function placeNextTower(state: GameState): GameState {
  for (let y = 40; y < BALANCE_CONFIG.WORLD_HEIGHT; y += 40) {
    for (let x = 40; x < BALANCE_CONFIG.WORLD_WIDTH; x += 40) {
      const placed = purchaseTowerAt(state, x, y);
      if (placed !== state) {
        return placed;
      }
    }
  }
  return state;
}

function purchaseCategory(
  state: GameState,
  itemId: ShopItemId,
): GameState {
  return itemId === "raise_tower"
    ? placeNextTower(state)
    : purchaseShopItem(state, itemId);
}

export function runRoundRobinShop(
  state: GameState,
  strategy: AutoShopState,
): AutoShopResult {
  let next = state;
  let cursor =
    ((strategy.nextCategoryIndex % CATEGORY_CYCLE.length) +
      CATEGORY_CYCLE.length) %
    CATEGORY_CYCLE.length;
  let consecutiveFailures = 0;
  let diagnostics = createAutoShopDiagnostics();

  while (consecutiveFailures < CATEGORY_CYCLE.length) {
    const itemId = CATEGORY_CYCLE[cursor];
    if (itemId === undefined) {
      throw new RangeError(`Missing shop category at ${cursor}.`);
    }
    diagnostics = incrementDiagnostic(
      diagnostics,
      itemId,
      "attempted",
    );
    const availability = shopAvailabilityForState(next).find(
      ({ item: candidate }) => candidate.id === itemId,
    );
    if (availability === undefined) {
      throw new RangeError(`Missing shop availability for ${itemId}.`);
    }

    const purchased = availability.available
      ? purchaseCategory(next, itemId)
      : next;
    if (purchased !== next) {
      diagnostics = incrementDiagnostic(
        diagnostics,
        itemId,
        "succeeded",
      );
      next = purchased;
      consecutiveFailures = 0;
    } else {
      const failureField =
        !availability.affordable
          ? "unaffordable"
          : !availability.available
            ? "domainUnavailable"
            : "placementFailed";
      diagnostics = incrementDiagnostic(
        diagnostics,
        itemId,
        failureField,
      );
      consecutiveFailures += 1;
    }
    cursor = (cursor + 1) % CATEGORY_CYCLE.length;
  }

  return {
    state: next,
    strategy: { nextCategoryIndex: cursor },
    diagnostics,
  };
}

import type { HouseId } from "../content/houseConfig";

export type ShopItemId =
  | "recruit_squad"
  | "field_medicine"
  | "raise_tower"
  | "sharpen_arms"
  | "reinforce_keep"
  | "revive_hero";

export interface Tower {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly lastAttackTick: number;
}

export interface TowerDestroyed {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly tick: number;
}

export interface BuildKeepSnapshot {
  readonly id: "keep";
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly radius: number;
}

export interface BuildBannerSnapshot {
  readonly id: `banner:${HouseId}`;
  readonly houseId: HouseId;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly radius: number;
}

export type BuildDefenseSnapshot =
  | BuildKeepSnapshot
  | BuildBannerSnapshot;

export interface TowerPlacementContext {
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly structures: readonly BuildDefenseSnapshot[];
  readonly towers: readonly Tower[];
}

export interface PlacementResult {
  readonly ok: boolean;
  readonly reason: string | null;
}

export interface ShopItem {
  readonly id: ShopItemId;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly costGrowth: number;
  readonly repeatable: boolean;
  readonly needsPlacement: boolean;
}

export type ShopPurchases = Record<ShopItemId, number>;

export interface ShopSnapshot {
  readonly tribute: number;
  readonly purchases: ShopPurchases;
  readonly towerCount: number;
  readonly damagedAgentCount: number;
  readonly damagedStructureCount: number;
  readonly deadHeroCount: number;
  readonly deadRegularAgentCount: number;
}

export interface ShopAvailability {
  readonly item: ShopItem;
  readonly cost: number;
  readonly affordable: boolean;
  readonly available: boolean;
  readonly reason: string | null;
}

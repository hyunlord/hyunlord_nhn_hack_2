import type {
  ShopAvailability,
  ShopItem,
  ShopItemId,
  ShopPurchases,
  ShopSnapshot,
} from "./build.types";
import { TOWER_CONFIG } from "./structures";

export const SHOP_CATALOG: readonly ShopItem[] = [
  {
    id: "recruit_squad",
    name: "Recruit Squad",
    description:
      "Revive 5 dead agents of the house with the fewest living, at its hall, at full HP.",
    baseCost: 40,
    costGrowth: 1.35,
    repeatable: true,
    needsPlacement: false,
  },
  {
    id: "field_medicine",
    name: "Field Medicine",
    description: "Heal all living agents by 45.",
    baseCost: 30,
    costGrowth: 1.25,
    repeatable: true,
    needsPlacement: false,
  },
  {
    id: "raise_tower",
    name: "Raise Tower",
    description: "Enter placement mode for a defensive tower.",
    baseCost: 70,
    costGrowth: 1.15,
    repeatable: true,
    needsPlacement: true,
  },
  {
    id: "sharpen_arms",
    name: "Sharpen Arms",
    description: "+8% attack damage to all houses for the rest of the run.",
    baseCost: 55,
    costGrowth: 1.45,
    repeatable: true,
    needsPlacement: false,
  },
  {
    id: "reinforce_hall",
    name: "Reinforce Hall",
    description: "Restore 300 HP to the most damaged surviving hall.",
    baseCost: 45,
    costGrowth: 1.3,
    repeatable: true,
    needsPlacement: false,
  },
  {
    id: "revive_hero",
    name: "Revive Hero",
    description: "Immediately return the next dead hero.",
    baseCost: 60,
    costGrowth: 1.3,
    repeatable: true,
    needsPlacement: false,
  },
];

export const EMPTY_PURCHASES: ShopPurchases = {
  recruit_squad: 0,
  field_medicine: 0,
  raise_tower: 0,
  sharpen_arms: 0,
  reinforce_hall: 0,
  revive_hero: 0,
};

export function shopItem(id: ShopItemId): ShopItem {
  const item = SHOP_CATALOG.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new RangeError(`Missing shop item ${id}.`);
  }
  return item;
}

export function priceForItem(
  id: ShopItemId,
  purchases: ShopPurchases,
): number {
  const item = shopItem(id);
  return Math.round(item.baseCost * item.costGrowth ** purchases[id]);
}

function domainReason(
  id: ShopItemId,
  snapshot: ShopSnapshot,
): string | null {
  switch (id) {
    case "recruit_squad":
      return snapshot.deadRegularAgentCount > 0
        ? null
        : "no dead regular agents";
    case "field_medicine":
      return snapshot.damagedAgentCount > 0
        ? null
        : "no damaged living agents";
    case "raise_tower":
      return snapshot.towerCount < TOWER_CONFIG.TOWER_MAX_COUNT
        ? null
        : "tower limit reached";
    case "sharpen_arms":
      return null;
    case "reinforce_hall":
      return snapshot.damagedHallCount > 0
        ? null
        : "no damaged surviving halls";
    case "revive_hero":
      return snapshot.deadHeroCount > 0 ? null : "no dead hero";
  }
}

export function availabilityForItem(
  id: ShopItemId,
  snapshot: ShopSnapshot,
): ShopAvailability {
  const item = shopItem(id);
  const cost = priceForItem(id, snapshot.purchases);
  const affordable = snapshot.tribute >= cost;
  const reason = domainReason(id, snapshot);
  return {
    item,
    cost,
    affordable,
    available: affordable && reason === null,
    reason: !affordable ? "not enough tribute" : reason,
  };
}

export function shopAvailability(
  snapshot: ShopSnapshot,
): ShopAvailability[] {
  return SHOP_CATALOG.map(({ id }) => availabilityForItem(id, snapshot));
}

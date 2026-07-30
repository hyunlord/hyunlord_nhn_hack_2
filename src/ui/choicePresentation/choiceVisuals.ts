import type { ShopItemId } from "../../build/build.types";
import type { HouseConfigEntry } from "../../content/houseConfig";
import type { CardEffect } from "../../progression/progression.types";

export type ChoiceIconName =
  | "attack"
  | "defense"
  | "divine"
  | "healing"
  | "mobility"
  | "population"
  | "tribute"
  | "warning";

const EFFECT_ICON_PRIORITY: readonly {
  readonly key: keyof CardEffect;
  readonly icon: ChoiceIconName;
}[] = [
  { key: "disableHeroRespawn", icon: "defense" },
  { key: "tributePerKillBonus", icon: "tribute" },
  { key: "divineRegenMultiplier", icon: "divine" },
  { key: "divineCostMultiplier", icon: "divine" },
  { key: "divinePowerPerAgentDeath", icon: "divine" },
  { key: "grantsSkill", icon: "divine" },
  { key: "miracleRadiusMultiplier", icon: "divine" },
  { key: "miracleHealMultiplier", icon: "healing" },
  { key: "interWaveHealBonus", icon: "healing" },
  { key: "heroOnKillHeal", icon: "healing" },
  { key: "heroRespawnTicksMultiplier", icon: "healing" },
  { key: "heroRespawnHpMultiplier", icon: "healing" },
  { key: "moveSpeedMultiplier", icon: "mobility" },
  { key: "attackDamageMultiplier", icon: "attack" },
  { key: "attackIntervalMultiplier", icon: "attack" },
  { key: "heroDamageMultiplier", icon: "attack" },
  { key: "maxHpBonus", icon: "defense" },
  { key: "maxHpMultiplier", icon: "defense" },
  { key: "heroMaxHpMultiplier", icon: "defense" },
  { key: "threatSenseRadiusBonus", icon: "defense" },
  { key: "breakHpRatioDelta", icon: "defense" },
  { key: "hallDefenseRadiusBonus", icon: "defense" },
  { key: "heroAuraRadiusBonus", icon: "defense" },
  { key: "ignoreBreak", icon: "defense" },
  { key: "towerCostMultiplier", icon: "defense" },
  { key: "unitClass", icon: "population" },
];

const SHOP_ICONS: Readonly<Record<ShopItemId, ChoiceIconName>> = {
  field_medicine: "healing",
  raise_tower: "defense",
  recruit_squad: "population",
  reinforce_keep: "defense",
  revive_hero: "healing",
  sharpen_arms: "attack",
};

export function cardEffectIcon(effect: CardEffect): ChoiceIconName {
  return (
    EFFECT_ICON_PRIORITY.find(({ key }) => effect[key] !== undefined)?.icon ??
    "divine"
  );
}

export function shopItemIcon(itemId: ShopItemId): ChoiceIconName {
  return SHOP_ICONS[itemId];
}

export function houseTraitIcons(
  house: HouseConfigEntry,
): readonly ChoiceIconName[] {
  const icons: ChoiceIconName[] = [];
  if (
    house.traits.attackDamageMultiplier !== 1 ||
    house.traits.attackIntervalMultiplier !== 1 ||
    house.traits.aggressionBias !== 0
  ) {
    icons.push("attack");
  }
  if (
    house.traits.maxHpMultiplier !== 1 ||
    house.traits.loyaltyBias !== 0
  ) {
    icons.push("defense");
  }
  if (house.traits.moveSpeedMultiplier !== 1) {
    icons.push("mobility");
  }
  if (house.traits.tributePerKillBonus !== 0) {
    icons.push("tribute");
  }
  return icons.slice(0, 2);
}

export function pageItems<T>(
  items: readonly T[],
  page: number,
  pageSize = 3,
): readonly T[] {
  return items.slice(page * pageSize, page * pageSize + pageSize);
}

export function pageCount(items: readonly unknown[], pageSize = 3): number {
  return Math.max(1, Math.ceil(items.length / pageSize));
}

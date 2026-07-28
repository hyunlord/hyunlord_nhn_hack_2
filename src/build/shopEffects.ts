import type { ShopItemId } from "./build.types";
import { TOWER_CONFIG } from "./structures";

export const SHOP_EFFECT_VALUES = {
  fieldMedicineHeal: 45,
  hallRepair: 300,
  recruitSquadCount: 5,
  sharpenArmsMultiplier: 1.08,
} as const;

export type ShopEffect =
  | { readonly kind: "reviveRegulars"; readonly count: number }
  | { readonly kind: "healLivingAgents"; readonly hp: number }
  | {
      readonly kind: "tower";
      readonly hp: number;
      readonly damage: number;
      readonly range: number;
    }
  | { readonly kind: "runAttackDamage"; readonly multiplier: number }
  | { readonly kind: "repairHall"; readonly hp: number }
  | { readonly kind: "reviveHero" };

export const SHOP_ITEM_EFFECTS = {
  field_medicine: [
    { kind: "healLivingAgents", hp: SHOP_EFFECT_VALUES.fieldMedicineHeal },
  ],
  raise_tower: [
    {
      kind: "tower",
      damage: TOWER_CONFIG.TOWER_DAMAGE,
      hp: TOWER_CONFIG.TOWER_HP,
      range: TOWER_CONFIG.TOWER_RANGE,
    },
  ],
  recruit_squad: [
    { kind: "reviveRegulars", count: SHOP_EFFECT_VALUES.recruitSquadCount },
  ],
  reinforce_hall: [
    { kind: "repairHall", hp: SHOP_EFFECT_VALUES.hallRepair },
  ],
  revive_hero: [{ kind: "reviveHero" }],
  sharpen_arms: [
    {
      kind: "runAttackDamage",
      multiplier: SHOP_EFFECT_VALUES.sharpenArmsMultiplier,
    },
  ],
} as const satisfies Readonly<Record<ShopItemId, readonly ShopEffect[]>>;

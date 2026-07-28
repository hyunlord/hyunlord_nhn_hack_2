import type { ShopItemId } from "../../build/build.types";
import { SHOP_ITEM_EFFECTS, type ShopEffect } from "../../build/shopEffects";
import type { Translate } from "../../content/locale/display";

function assertNever(value: never): never {
  throw new Error(`Unhandled shop effect: ${String(value)}`);
}

function multiplierPercent(multiplier: number): string {
  const value = Math.round((multiplier - 1) * 100);
  return `${value > 0 ? "+" : ""}${value}%`;
}

function formatShopEffect(t: Translate, effect: ShopEffect): string {
  switch (effect.kind) {
    case "reviveRegulars":
      return t("shop.effect.reviveRegulars", { count: effect.count });
    case "healLivingAgents":
      return t("shop.effect.healLivingAgents", { hp: effect.hp });
    case "tower":
      return t("shop.effect.tower", {
        damage: effect.damage,
        hp: effect.hp,
        range: effect.range,
      });
    case "runAttackDamage":
      return t("shop.effect.runAttackDamage", {
        value: multiplierPercent(effect.multiplier),
      });
    case "repairStronghold":
      return t("shop.effect.repairStronghold", { hp: effect.hp });
    case "reviveHero":
      return t("shop.effect.reviveHero");
    default:
      return assertNever(effect);
  }
}

export function shopChoiceEffects(
  itemId: ShopItemId,
  t: Translate,
): readonly string[] {
  return SHOP_ITEM_EFFECTS[itemId].map((effect) => formatShopEffect(t, effect));
}

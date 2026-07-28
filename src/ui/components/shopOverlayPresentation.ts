import type { ShopAvailability, ShopItemId } from "../../build/build.types";
import type { LocaleKey } from "../../content/locale";
import { shopChoiceEffects } from "../choicePresentation/shopChoicePresentation";

export type ShopCategory = "troops" | "defense" | "recovery" | "upgrade";

type ShopPresentation = {
  readonly category: ShopCategory;
  readonly nameKey: LocaleKey | null;
  readonly descriptionKey: LocaleKey | null;
};

const SHOP_PRESENTATION: Readonly<Record<ShopItemId, ShopPresentation>> = {
  field_medicine: {
    category: "recovery",
    descriptionKey: "shop.item.field_medicine.description",
    nameKey: "shop.item.field_medicine.name",
  },
  raise_tower: {
    category: "defense",
    descriptionKey: "shop.item.raise_tower.description",
    nameKey: "shop.item.raise_tower.name",
  },
  recruit_squad: {
    category: "troops",
    descriptionKey: "shop.item.recruit_squad.description",
    nameKey: "shop.item.recruit_squad.name",
  },
  reinforce_keep: {
    category: "defense",
    descriptionKey: "shop.item.reinforce_keep.description",
    nameKey: "shop.item.reinforce_keep.name",
  },
  revive_hero: {
    category: "recovery",
    descriptionKey: "shop.item.revive_hero.description",
    nameKey: "shop.item.revive_hero.name",
  },
  sharpen_arms: {
    category: "upgrade",
    descriptionKey: "shop.item.sharpen_arms.description",
    nameKey: "shop.item.sharpen_arms.name",
  },
};

export const SHOP_CATEGORY_ORDER = ["troops", "defense", "recovery", "upgrade"] as const;

const SHOP_CATEGORY_KEYS: Readonly<Record<ShopCategory, LocaleKey>> = {
  defense: "shop.category.defense",
  recovery: "shop.category.recovery",
  troops: "shop.category.troops",
  upgrade: "shop.category.upgrade",
};

const SHOP_REASON_KEYS: Readonly<Record<string, LocaleKey>> = {
  "no damaged living agents": "shop.reason.noDamagedAgents",
  "no damaged surviving keep or banners": "shop.reason.noDamagedStructures",
  "no dead hero": "shop.reason.noDeadHero",
  "no dead regular agents": "shop.reason.noDeadAgents",
  "not enough tribute": "shop.reason.notEnoughTribute",
  "tower limit reached": "shop.reason.towerLimit",
};

export function shopCategoryLabelKey(category: ShopCategory): LocaleKey {
  return SHOP_CATEGORY_KEYS[category];
}

export function shopPresentationFor(itemId: ShopItemId): ShopPresentation {
  return SHOP_PRESENTATION[itemId];
}

export function localizedShopReason(
  reason: string | null,
  t: (key: LocaleKey) => string,
): string | null {
  if (reason === null) {
    return null;
  }
  const key = SHOP_REASON_KEYS[reason];
  return key === undefined ? reason : t(key);
}

export function shopAvailabilityByCategory(
  availability: readonly ShopAvailability[],
  category: ShopCategory,
): readonly ShopAvailability[] {
  return availability.filter(
    ({ item }) => SHOP_PRESENTATION[item.id].category === category,
  );
}

export function localizedShopEffects(
  itemId: ShopItemId,
  t: (key: LocaleKey) => string,
): readonly string[] {
  return shopChoiceEffects(itemId, t);
}

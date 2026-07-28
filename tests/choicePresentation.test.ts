import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { shopAvailability } from "../src/build/shop";
import { SHOP_EFFECT_VALUES } from "../src/build/shopEffects";
import { HOUSE_CONFIG } from "../src/content/houseConfig";
import { INVESTMENT_TRACKS } from "../src/content/investmentConfig";
import {
  formatCardEffect,
  houseTraitLabels,
  localizedActiveBonusGroups,
  localizedInvestmentEffectLabel,
} from "../src/content/locale/display";
import { LocaleProvider, translate } from "../src/content/locale";
import { shopAvailabilityForState } from "../src/engine/shopEngine";
import { createInitialState } from "../src/engine/tick";
import { ShopCard } from "../src/ui/components/ShopOverlay";
import { shopChoiceEffects } from "../src/ui/choicePresentation/shopChoicePresentation";
import { HouseSelectionCard } from "../src/ui/screens/HouseSelectScreen";
import { InvestmentTrackCard } from "../src/ui/screens/meta/InvestmentTrackCard";

const english = (
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2],
) => translate("en", key, params);

function orderedIndexes(source: string, markers: readonly string[]): readonly number[] {
  return markers.map((marker) => source.indexOf(marker));
}

function assertOrderedText(source: string, markers: readonly string[]): void {
  const indexes = orderedIndexes(source, markers);
  assert.equal(indexes.every((index) => index >= 0), true);
  assert.deepEqual([...indexes].sort((first, second) => first - second), indexes);
}

function renderEnglish(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { language: "en" }, element),
  );
}

test("Given rendered shop choices, when card markup is produced, then numeric effects lead flavour while costs counts and reasons stay visible", () => {
  const snapshot = {
    tribute: 500,
    purchases: {
      field_medicine: 0,
      raise_tower: 0,
      recruit_squad: 0,
      reinforce_keep: 0,
      revive_hero: 0,
      sharpen_arms: 0,
    },
    towerCount: 0,
    damagedAgentCount: 0,
    damagedStructureCount: 0,
    deadHeroCount: 0,
    deadRegularAgentCount: 0,
  };
  const tower = shopAvailability(snapshot).find(
    ({ item }) => item.id === "raise_tower",
  );
  const revive = shopAvailability(snapshot).find(
    ({ item }) => item.id === "revive_hero",
  );
  assert.ok(tower);
  assert.ok(revive);

  const towerMarkup = renderEnglish(
    createElement(ShopCard, {
      availability: tower,
      onBuy: () => undefined,
      purchaseCount: 0,
      towerPlacementActive: false,
    }),
  );
  assertOrderedText(towerMarkup, [
    "Raise Tower",
    "70",
    "Tower 300 HP · 22 damage · 130 range",
    "Enter placement mode for a defensive tower.",
    "Purchased 0",
    "Choose position",
  ]);

  const reviveMarkup = renderEnglish(
    createElement(ShopCard, {
      availability: revive,
      onBuy: () => undefined,
      purchaseCount: 2,
      towerPlacementActive: false,
    }),
  );
  assertOrderedText(reviveMarkup, [
    "Revive Hero",
    "60",
    "Next dead hero returns",
    "Immediately return the next dead hero.",
    "Purchased 2",
    "Purchase",
    "No dead hero.",
  ]);
});

test("Given rendered investment choices, when card markup is produced, then numeric per-rank effect leads description and disabled reason remains visible", () => {
  const track = INVESTMENT_TRACKS.find(({ id }) => id === "global_vigor");
  assert.ok(track);

  const markup = renderEnglish(
    createElement(InvestmentTrackCard, {
      currentRank: 0,
      legacyPoints: 20,
      onPurchase: () => undefined,
      track,
      unlockedHouses: ["house_a", "house_b", "house_c"],
    }),
  );

  assertOrderedText(markup, [
    "Vigor of the Faithful",
    "+10 max HP per rank",
    "Every house begins each run with sturdier agents.",
    "Next cost 120",
    "Purchase",
    "Need 100 more Legacy",
  ]);
});

test("Given rendered house choices, when card markup is produced, then numeric traits and roster lead identity while locked status stays visible", () => {
  const duskmere = HOUSE_CONFIG.find(({ id }) => id === "house_d");
  assert.ok(duskmere);

  const markup = renderEnglish(
    createElement(HouseSelectionCard, {
      backgroundImage: undefined,
      house: duskmere,
      onToggle: () => undefined,
      selectedOrder: -1,
      unlocked: false,
    }),
  );

  assertOrderedText(markup, [
    "Duskmere",
    "Max HP -18%",
    "Attack interval -15%",
    "Movement speed +25%",
    "Bulwark 0",
    "Assault 0",
    "Volley 30",
    "Skirmish 70",
    "fast, fragile",
    "Locked",
  ]);
  assert.match(markup, /disabled=""/);
});

test("Given numeric card effects, when choices are formatted, then source-derived values are prominent and exact", () => {
  assert.deepEqual(formatCardEffect({ attackDamageMultiplier: 1.12 }, english), ["Attack damage +12%"]);
  assert.deepEqual(formatCardEffect({ attackIntervalMultiplier: 0.88 }, english), ["Attack speed +14%"]);
  assert.deepEqual(formatCardEffect({ maxHpBonus: 25 }, english), ["Max HP +25"]);
  assert.deepEqual(formatCardEffect({ threatSenseRadiusBonus: 60 }, english), ["Threat sense +60"]);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: -0.1 }, english), ["Breaks at -10%p lower"]);
  assert.deepEqual(formatCardEffect({ hallDefenseRadiusBonus: 90 }, english), ["Hall defense radius +90"]);
  assert.deepEqual(formatCardEffect({ divineRegenMultiplier: 1.3 }, english), ["Divine regen +30%"]);
  assert.deepEqual(formatCardEffect({ miracleRadiusMultiplier: 1.25 }, english), ["Miracle radius +25%"]);
  assert.deepEqual(formatCardEffect({ tributePerKillBonus: 2 }, english), ["Tribute +2 per kill"]);
  assert.deepEqual(formatCardEffect({ interWaveHealBonus: 25 }, english), ["Repairs +25 between waves"]);
  assert.deepEqual(formatCardEffect({ grantsSkill: "chains_of_dusk" }, english), ["Grants skill Chains of Dusk"]);
});

test("Given shop choices, when effects are projected, then values come from typed effect sources and unavailable reasons remain separate", () => {
  assert.deepEqual(shopChoiceEffects("recruit_squad", english), [
    `Revives up to ${SHOP_EFFECT_VALUES.recruitSquadCount} regular agents`,
  ]);
  assert.deepEqual(shopChoiceEffects("field_medicine", english), [
    `Living agents heal +${SHOP_EFFECT_VALUES.fieldMedicineHeal} HP`,
  ]);
  assert.deepEqual(shopChoiceEffects("raise_tower", english), [
    "Tower 300 HP · 22 damage · 130 range",
  ]);
  assert.deepEqual(shopChoiceEffects("sharpen_arms", english), [
    "Run attack damage +8%",
  ]);
  assert.deepEqual(shopChoiceEffects("reinforce_keep", english), [
    `Keep/banner repair +${SHOP_EFFECT_VALUES.strongholdRepair} HP`,
  ]);

  const state = {
    ...createInitialState(51).state,
    phase: "intermission" as const,
    tribute: 500,
  };
  const revive = shopAvailabilityForState(state).find(
    ({ item }) => item.id === "revive_hero",
  );
  assert.equal(revive?.available, false);
  assert.equal(revive?.reason, "no dead hero");
  assert.deepEqual(shopChoiceEffects("revive_hero", english), [
    "Next dead hero returns",
  ]);
});

test("Given house and investment choices, when presentation labels are projected, then typed config values replace raw summaries", () => {
  const ashvale = HOUSE_CONFIG.find(({ id }) => id === "house_a");
  const duskmere = HOUSE_CONFIG.find(({ id }) => id === "house_d");
  assert.ok(ashvale);
  assert.ok(duskmere);

  assert.deepEqual(houseTraitLabels(english, ashvale), [
    "Attack damage +10%",
    "Aggression +12",
  ]);
  assert.deepEqual(houseTraitLabels(english, duskmere), [
    "Max HP -18%",
    "Attack interval -15%",
    "Movement speed +25%",
  ]);
  assert.equal(
    localizedInvestmentEffectLabel(english, { attackDamageMultiplier: 1.04 }),
    "+4% attack damage per rank",
  );
  assert.deepEqual(localizedActiveBonusGroups(english, { global_vigor: 2 }), [
    { heading: "Global", labels: ["Max HP +20"] },
  ]);
});

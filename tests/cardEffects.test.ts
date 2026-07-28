import assert from "node:assert/strict";
import test from "node:test";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import { translate } from "../src/content/locale";
import { formatCardEffect } from "../src/content/locale/display";
import type { CardEffect } from "../src/progression/progression.types";

const english = (
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2],
) => translate("en", key, params);

const korean = (
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2],
) => translate("ko", key, params);

const EXHAUSTIVE_EFFECT_FIXTURES = {
  unitClass: { unitClass: "spear" },
  attackDamageMultiplier: { attackDamageMultiplier: 1.12 },
  attackIntervalMultiplier: { attackIntervalMultiplier: 0.88 },
  maxHpBonus: { maxHpBonus: 25 },
  maxHpMultiplier: { maxHpMultiplier: 1.25 },
  moveSpeedMultiplier: { moveSpeedMultiplier: 1.15 },
  threatSenseRadiusBonus: { threatSenseRadiusBonus: 60 },
  breakHpRatioDelta: { breakHpRatioDelta: -0.1 },
  hallDefenseRadiusBonus: { hallDefenseRadiusBonus: 30 },
  divineRegenMultiplier: { divineRegenMultiplier: 1.1 },
  divineCostMultiplier: { divineCostMultiplier: 0.8 },
  miracleRadiusMultiplier: { miracleRadiusMultiplier: 1.25 },
  miracleHealMultiplier: { miracleHealMultiplier: 1.3 },
  tributePerKillBonus: { tributePerKillBonus: 1 },
  interWaveHealBonus: { interWaveHealBonus: 10 },
  heroDamageMultiplier: { heroDamageMultiplier: 1.2 },
  heroMaxHpMultiplier: { heroMaxHpMultiplier: 1.25 },
  heroRespawnTicksMultiplier: { heroRespawnTicksMultiplier: 0.8 },
  heroAuraRadiusBonus: { heroAuraRadiusBonus: 35 },
  heroOnKillHeal: { heroOnKillHeal: 12 },
  grantsSkill: { grantsSkill: "chains_of_dusk" },
  divinePowerPerAgentDeath: { divinePowerPerAgentDeath: 4 },
  ignoreBreak: { ignoreBreak: true },
  towerCostMultiplier: { towerCostMultiplier: 0.6 },
  heroRespawnHpMultiplier: { heroRespawnHpMultiplier: 1.5 },
  disableHeroRespawn: { disableHeroRespawn: true },
} as const satisfies Readonly<Record<keyof CardEffect, CardEffect>>;

test("Given every CardEffect key, when the formatter runs, then each covered fixture yields at least one player-facing line", () => {
  for (const [key, effect] of Object.entries(EXHAUSTIVE_EFFECT_FIXTURES)) {
    assert.equal(Object.hasOwn(effect, key), true);
    assert.notDeepEqual(formatCardEffect(effect, english), [], key);
  }
});

test("Given shipped card definitions, when non-empty effects are formatted, then every configured effect yields player-facing lines", () => {
  const missing = CARD_DEFINITIONS.filter(
    ({ effect }) => Object.keys(effect).length > 0,
  )
    .filter(({ effect }) => formatCardEffect(effect, english).length === 0)
    .map(({ id }) => id);

  assert.deepEqual(missing, []);
});

test("Given attack interval multipliers, when card effects are formatted, then speed uses reciprocal percentage arithmetic", () => {
  assert.deepEqual(formatCardEffect({ attackIntervalMultiplier: 0.88 }, english), [
    "Attack speed +14%",
  ]);
  assert.deepEqual(formatCardEffect({ attackIntervalMultiplier: 1.18 }, english), [
    "Attack speed -15%",
  ]);
});

test("Given break HP ratio deltas, when card effects are formatted, then higher lower and unchanged directions are explicit in English and Korean", () => {
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: 0.1 }, english), [
    "Breaks at +10%p higher",
  ]);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: -0.1 }, english), [
    "Breaks at -10%p lower",
  ]);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: 0.1 }, korean), [
    "+10%p 더 높은 체력에서 붕괴",
  ]);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: -0.1 }, korean), [
    "-10%p 더 낮은 체력에서 붕괴",
  ]);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: 0 }, english), []);
  assert.deepEqual(formatCardEffect({ breakHpRatioDelta: 0 }, korean), []);
});

test("Given Korean max HP card effects, when values are signed by the formatter, then the locale does not add a second plus sign", () => {
  assert.deepEqual(formatCardEffect({ maxHpBonus: 25 }, korean), [
    "최대 체력 +25",
  ]);
});

test("Given class scope and granted skills, when card effects are formatted, then English and Korean labels are localized", () => {
  assert.deepEqual(formatCardEffect({ unitClass: "spear", grantsSkill: "chains_of_dusk" }, english), [
    "Class: Bulwark",
    "Grants skill Chains of Dusk",
  ]);
  assert.deepEqual(formatCardEffect({ unitClass: "spear", grantsSkill: "chains_of_dusk" }, korean), [
    "계열: 방벽",
    "권능 습득: 황혼의 사슬",
  ]);
});

test("Given neutral numeric and disabled boolean effects, when card effects are formatted, then neutral values are omitted", () => {
  assert.deepEqual(
    formatCardEffect(
      {
        attackDamageMultiplier: 1,
        attackIntervalMultiplier: 1,
        maxHpBonus: 0,
        maxHpMultiplier: 1,
        moveSpeedMultiplier: 1,
        threatSenseRadiusBonus: 0,
        breakHpRatioDelta: 0,
        hallDefenseRadiusBonus: 0,
        divineRegenMultiplier: 1,
        divineCostMultiplier: 1,
        miracleRadiusMultiplier: 1,
        miracleHealMultiplier: 1,
        tributePerKillBonus: 0,
        interWaveHealBonus: 0,
        heroDamageMultiplier: 1,
        heroMaxHpMultiplier: 1,
        heroRespawnTicksMultiplier: 1,
        heroAuraRadiusBonus: 0,
        heroOnKillHeal: 0,
        divinePowerPerAgentDeath: 0,
        ignoreBreak: false,
        towerCostMultiplier: 1,
        heroRespawnHpMultiplier: 1,
        disableHeroRespawn: false,
      },
      english,
    ),
    [],
  );
});

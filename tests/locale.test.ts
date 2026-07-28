import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/content/locale/en";
import { ko } from "../src/content/locale/ko";
import { translate } from "../src/content/locale";

import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import { HOUSE_CONFIG } from "../src/content/houseConfig";
import { HERO_DEFINITIONS } from "../src/content/heroConfig";
import { INVESTMENT_TRACKS } from "../src/content/investmentConfig";
import { HOUSE_SYNERGIES } from "../src/content/houseSynergies";
import { ACHIEVEMENT_DEFINITIONS } from "../src/content/metaConfig";
import { DIVINE_SKILL_DEFINITIONS } from "../src/content/skillConfig";

test("Given Korean and English locale tables, when key sets are compared, then every translation key exists in both", () => {
  const koreanKeys = Object.keys(ko).sort();
  const englishKeys = Object.keys(en).sort();

  assert.deepEqual(koreanKeys, englishKeys);
});

test("Given a parameterized translation, when text is translated, then placeholders are replaced", () => {
  assert.equal(
    translate("ko", "title.stats", {
      bestWave: 3,
      runs: 4,
      victories: 1,
    }),
    "원정 4회 · 승리 1회 · 최고 3파",
  );
});

test("Given a missing locale entry, when translated repeatedly, then the key is returned and warned once", () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (message?: unknown) => {
    warnings.push(String(message));
  };

  try {
    assert.equal(translate("ko", "test.missing.entry"), "test.missing.entry");
    assert.equal(translate("ko", "test.missing.entry"), "test.missing.entry");
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(warnings, [
    "[locale] Missing ko translation: test.missing.entry",
  ]);
});

test("Given Phase 4A screen locale keys, when Korean text is resolved, then summary raid and population copy is localized", () => {
  assert.equal(
    translate("ko", "summary.daylightRaids.wave", { wave: 3 }),
    "제3파",
  );
  assert.equal(
    translate("ko", "summary.population.entry", { count: 17, wave: 2 }),
    "제2파 17",
  );
  assert.equal(
    translate("ko", "selection.slot.bottom_center"),
    "하단 중앙",
  );
  assert.equal(translate("ko", "run.phase.wave"), "밤 — 습격");
  assert.equal(translate("en", "run.phase.defeat"), "Fallen");
});


test("Given domain config ids, when localized display keys are resolved, then Korean and English tables cover every player-facing domain label", () => {
  const keys = [
    ...HOUSE_CONFIG.flatMap(({ id }) => [
      `house.${id}.name`,
      `house.${id}.identity`,
      `house.${id}.trait`,
    ]),
    ...HERO_DEFINITIONS.map(({ id }) => `hero.${id}.name`),
    ...Object.keys(DIVINE_SKILL_DEFINITIONS).flatMap((id) => [
      `skill.${id}.name`,
      `skill.${id}.description`,
    ]),
    ...CARD_DEFINITIONS.flatMap(({ id }) => [
      `card.${id}.name`,
      `card.${id}.description`,
    ]),
    ...INVESTMENT_TRACKS.flatMap(({ id }) => [
      `investment.${id}.name`,
      `investment.${id}.description`,
    ]),
    ...HOUSE_SYNERGIES.flatMap(({ id }) => [
      `synergy.${id}.name`,
      `synergy.${id}.description`,
    ]),
    ...ACHIEVEMENT_DEFINITIONS.flatMap(({ id }) => [
      `achievement.${id}.name`,
      `achievement.${id}.description`,
    ]),
  ];

  for (const key of keys) {
    assert.notEqual(translate("ko", key as never), key);
    assert.notEqual(translate("en", key as never), key);
  }
});

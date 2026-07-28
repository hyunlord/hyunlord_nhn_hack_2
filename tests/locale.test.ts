import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/content/locale/en";
import { ko } from "../src/content/locale/ko";
import { translate } from "../src/content/locale";
import {
  cardKindLabel,
  cardRarityLabel,
  classShareFromTally,
  dominantUnitClass,
  formatCardEffect,
  heroName,
  houseName,
  miracleName,
  roleFromComposition,
  skillName,
  unitTallyByHouse,
  unitClassLabel,
} from "../src/content/locale/display";

import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import { HOUSE_CONFIG } from "../src/content/houseConfig";
import { HERO_DEFINITIONS } from "../src/content/heroConfig";
import { INVESTMENT_TRACKS } from "../src/content/investmentConfig";
import { HOUSE_SYNERGIES } from "../src/content/houseSynergies";
import { ACHIEVEMENT_DEFINITIONS } from "../src/content/metaConfig";
import { DIVINE_SKILL_DEFINITIONS } from "../src/content/skillConfig";
import { MIRACLE_DEFINITIONS } from "../src/divine/miracleTypes";

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
  assert.equal(translate("ko", "selection.slot.southeast"), "남동쪽");
  assert.equal(translate("en", "selection.slot.southwest"), "southwest");
  assert.equal(translate("ko", "run.phase.wave"), "밤 — 습격");
  assert.equal(translate("en", "run.phase.defeat"), "Fallen");
});

test("Given Phase 4A display helpers, when config-backed labels are resolved, then existing names and ability labels remain stable", () => {
  assert.equal(houseName((key) => translate("ko", key), "house_a"), translate("ko", "house.house_a.name"));
  assert.equal(heroName((key) => translate("ko", key), "hero_ashvale"), translate("ko", "hero.hero_ashvale.name"));
  assert.equal(skillName((key) => translate("ko", key), "meteor_fall"), translate("ko", "skill.meteor_fall.name"));
  assert.equal(miracleName((key) => translate("ko", key), "lightning"), MIRACLE_DEFINITIONS.lightning.label);
  assert.equal(cardKindLabel((key) => translate("ko", key), "hero"), "영웅");
  assert.equal(cardRarityLabel((key) => translate("en", key), "legendary"), "Legendary");
});

test("Given localized unit classes, when roles are derived, then spear protects and melee assaults in both direct and composition labels", () => {
  const korean = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate("ko", key, params);

  assert.equal(unitClassLabel(korean, "spear"), "방벽");
  assert.equal(unitClassLabel(korean, "melee"), "돌격");
  assert.equal(unitClassLabel(korean, "archer"), "사격");
  assert.equal(unitClassLabel(korean, "skirmisher"), "유격");
  assert.equal(roleFromComposition([{ unitClass: "spear", count: 3 }]), "방벽");
  assert.equal(roleFromComposition([{ unitClass: "melee", count: 3 }]), "돌격");
});

test("Given regular and hero agents, when class composition is tallied, then only living regular agents count", () => {
  const agents = [
    { houseId: "house_a", unitClass: "spear" as const, state: "idle" as const },
    { houseId: "house_a", unitClass: "spear" as const, state: "dead" as const },
    { houseId: "house_a", unitClass: "archer" as const, state: "fighting" as const, isHero: true },
    { houseId: "house_a", unitClass: "melee" as const, state: "helping" as const },
    { houseId: "house_b", unitClass: "skirmisher" as const, state: "idle" as const },
  ];

  assert.deepEqual(unitTallyByHouse(agents, "house_a"), [
    { unitClass: "spear", count: 1 },
    { unitClass: "melee", count: 1 },
    { unitClass: "archer", count: 0 },
    { unitClass: "skirmisher", count: 0 },
  ]);
});

test("Given class composition ties and empty houses, when dominant roles and shares are projected, then fixed class order and zero state are deterministic", () => {
  const tied = [
    { unitClass: "melee" as const, count: 2 },
    { unitClass: "spear" as const, count: 2 },
    { unitClass: "archer" as const, count: 2 },
    { unitClass: "skirmisher" as const, count: 0 },
  ];
  const empty = [
    { unitClass: "spear" as const, count: 0 },
    { unitClass: "melee" as const, count: 0 },
    { unitClass: "archer" as const, count: 0 },
    { unitClass: "skirmisher" as const, count: 0 },
  ];

  assert.equal(dominantUnitClass(tied), "spear");
  assert.equal(roleFromComposition(tied), "방벽");
  assert.equal(dominantUnitClass(empty), undefined);
  assert.equal(roleFromComposition(empty), "");
  assert.deepEqual(classShareFromTally(empty), [
    { unitClass: "spear", count: 0, percent: 0 },
    { unitClass: "melee", count: 0, percent: 0 },
    { unitClass: "archer", count: 0, percent: 0 },
    { unitClass: "skirmisher", count: 0, percent: 0 },
  ]);
});

test("Given English presentation helpers, when class-scoped card effects are formatted, then no Korean literals leak into the output", () => {
  const english = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate("en", key, params);

  assert.deepEqual(formatCardEffect({ unitClass: "spear", attackIntervalMultiplier: 0.88 }, english), [
    "Class: Bulwark",
    "Attack speed +14%",
  ]);
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


const PRODUCT_COPY_FORBIDDEN_DEFENSE_MODEL = /\b[hH]alls?\b|회관/u;

function playerFacingContentStrings(): readonly { readonly label: string; readonly text: string }[] {
  return [
    ...Object.entries(en).map(([key, text]) => ({ label: `en.${key}`, text })),
    ...Object.entries(ko).map(([key, text]) => ({ label: `ko.${key}`, text })),
    ...CARD_DEFINITIONS.flatMap(({ id, name, description }) => [
      { label: `card.${id}.name`, text: name },
      { label: `card.${id}.description`, text: description },
    ]),
    ...Object.entries(DIVINE_SKILL_DEFINITIONS).flatMap(([id, definition]) => [
      { label: `skill.${id}.name`, text: definition.name },
      { label: `skill.${id}.description`, text: definition.description },
    ]),
    ...ACHIEVEMENT_DEFINITIONS.flatMap(({ id, name, description }) => [
      { label: `achievement.${id}.name`, text: name },
      { label: `achievement.${id}.description`, text: description },
    ]),
  ];
}

test("Given player-facing content copy, when product terminology is scanned, then the old hall model is absent", () => {
  const offenders = playerFacingContentStrings()
    .filter(({ text }) => PRODUCT_COPY_FORBIDDEN_DEFENSE_MODEL.test(text))
    .map(({ label, text }) => `${label}: ${text}`);

  assert.deepEqual(offenders, []);
});

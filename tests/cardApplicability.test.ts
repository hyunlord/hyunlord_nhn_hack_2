import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import type { HouseSelection } from "../src/content/houseConfig";
import type { UnitClassId } from "../src/content/unitClassConfig";
import type { Banner, Keep } from "../src/engine/engine.types";
import type { CardDefinition } from "../src/progression/progression.types";
import {
  cardApplicabilityWarnings,
} from "../src/progression/cardApplicability";
import { formatCardApplicabilityWarning } from "../src/content/locale/display";
import { translate } from "../src/content/locale";

const SELECTED_HOUSES = ["house_a", "house_b", "house_c"] as const satisfies HouseSelection;

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent",
    houseId: "house_a",
    unitClass: "melee",
    disposition: { aggression: 0, loyalty: 0 },
    x: 0,
    y: 0,
    heading: 0,
    state: "idle",
    hp: 100,
    lastDamagedTick: 0,
    lastAttackTick: 0,
    isHero: false,
    heroId: null,
    heroLevel: 1,
    heroLevelUpTick: 0,
    respawnAtTick: null,
    breakImmuneUntilTick: 0,
    ...overrides,
  };
}

function agents(
  count: number,
  unitClass: UnitClassId,
  overrides: Partial<Agent> = {},
): Agent[] {
  return Array.from({ length: count }, (_, index) =>
    agent({
      id: `${unitClass}-${index}`,
      unitClass,
      ...overrides,
    }),
  );
}

function keep(overrides: Partial<Keep> = {}): Keep {
  return {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    ...overrides,
  };
}

function banner(overrides: Partial<Banner> = {}): Banner {
  return {
    houseId: "house_a",
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    ...overrides,
  };
}

function card(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "card",
    kind: "common",
    rarity: "rare",
    name: "Card",
    description: "Card",
    maxStacks: 1,
    effect: {},
    ...overrides,
  };
}

function warningsFor(cardDefinition: CardDefinition, army: readonly Agent[] = []) {
  return cardApplicabilityWarnings({
    card: cardDefinition,
    selectedHouseIds: SELECTED_HOUSES,
    agents: army,
    keep: keep(),
    banners: [banner()],
  });
}

test("Given class-scoped cards, when living regular selected-army share is below 15 percent, then warnings include raw shares that round to 15", () => {
  const classCard = card({ effect: { unitClass: "spear" } });

  assert.deepEqual(warningsFor(classCard, agents(12, "melee")), [
    { kind: "lowClassShare", unitClass: "spear", sharePercent: 0 },
  ]);
  assert.deepEqual(
    warningsFor(classCard, [
      ...agents(1499, "spear"),
      ...agents(8501, "melee"),
    ]),
    [{ kind: "lowClassShare", unitClass: "spear", sharePercent: 14.99 }],
  );
  assert.deepEqual(
    warningsFor(classCard, [
      ...agents(2999, "spear"),
      ...agents(17001, "melee"),
    ]),
    [{ kind: "lowClassShare", unitClass: "spear", sharePercent: 15 }],
  );
  assert.deepEqual(warningsFor(classCard, [
    ...agents(15, "spear"),
    ...agents(85, "melee"),
  ]), []);
  assert.deepEqual(warningsFor(classCard, [
    ...agents(16, "spear"),
    ...agents(84, "melee"),
  ]), []);
});

test("Given class-scoped cards, when dead agents, heroes, and non-selected houses are present, then they are excluded from class share", () => {
  const classCard = card({ effect: { unitClass: "spear" } });

  assert.deepEqual(warningsFor(classCard, [
    ...agents(20, "spear", { state: "dead", hp: 0 }),
    ...agents(20, "spear", { isHero: true, heroId: "hero_ashvale" }),
    ...agents(20, "spear", { houseId: "house_d" }),
    ...agents(10, "melee"),
  ]), [
    { kind: "lowClassShare", unitClass: "spear", sharePercent: 0 },
  ]);
});

test("Given class-scoped cards, when no living regular selected-army agents exist, then zero denominator is treated as zero share", () => {
  const classCard = card({ effect: { unitClass: "spear" } });

  assert.deepEqual(warningsFor(classCard, [
    ...agents(3, "spear", { state: "dead", hp: 0 }),
    ...agents(2, "spear", { isHero: true, heroId: "hero_ashvale" }),
  ]), [
    { kind: "lowClassShare", unitClass: "spear", sharePercent: 0 },
  ]);
});

test("Given hero-scoped cards, when the scoped hero is alive, dead, or respawning, then only unavailable heroes warn", () => {
  const heroCard = card({ heroId: "hero_ashvale" });
  const aliveHero = agent({
    id: "hero-alive",
    isHero: true,
    heroId: "hero_ashvale",
    hp: 50,
  });
  const deadHero = agent({
    id: "hero-dead",
    isHero: true,
    heroId: "hero_ashvale",
    state: "dead",
    hp: 0,
  });
  const respawningHero = agent({
    id: "hero-respawning",
    isHero: true,
    heroId: "hero_ashvale",
    state: "dead",
    hp: 0,
    respawnAtTick: 400,
  });

  assert.deepEqual(warningsFor(heroCard, [aliveHero]), []);
  assert.deepEqual(warningsFor(heroCard, [deadHero]), [
    { kind: "deadHero", heroId: "hero_ashvale" },
  ]);
  assert.deepEqual(warningsFor(heroCard, [respawningHero]), [
    { kind: "deadHero", heroId: "hero_ashvale" },
  ]);
});

test("Given house-scoped cards, when the scoped banner or fallback keep is alive or fallen, then only missing live anchors warn", () => {
  const houseCard = card({ houseId: "house_b" });
  const liveBanner = banner({ houseId: "house_b", hp: 40 });
  const fallenBanner = banner({ houseId: "house_b", hp: 0 });

  assert.deepEqual(cardApplicabilityWarnings({
    card: houseCard,
    selectedHouseIds: SELECTED_HOUSES,
    agents: [],
    keep: keep({ hp: 0 }),
    banners: [liveBanner],
  }), []);
  assert.deepEqual(cardApplicabilityWarnings({
    card: houseCard,
    selectedHouseIds: SELECTED_HOUSES,
    agents: [],
    keep: keep({ hp: 100 }),
    banners: [fallenBanner],
  }), []);
  assert.deepEqual(cardApplicabilityWarnings({
    card: houseCard,
    selectedHouseIds: SELECTED_HOUSES,
    agents: [],
    keep: keep({ hp: 0 }),
    banners: [fallenBanner],
  }), [{ kind: "fallenHouseStronghold", houseId: "house_b" }]);
});

test("Given unscoped cards, when army, hero, and stronghold state is poor, then applicability returns no warnings", () => {
  assert.deepEqual(cardApplicabilityWarnings({
    card: card(),
    selectedHouseIds: SELECTED_HOUSES,
    agents: [
      ...agents(12, "melee"),
      agent({
        id: "hero-dead",
        isHero: true,
        heroId: "hero_ashvale",
        state: "dead",
        hp: 0,
      }),
    ],
    keep: keep({ hp: 0 }),
    banners: [banner({ hp: 0 })],
  }), []);
});

test("Given applicability warnings, when formatted through locale helpers, then structured Korean and English text is localized", () => {
  const english = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate("en", key, params);
  const korean = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate("ko", key, params);

  assert.equal(
    formatCardApplicabilityWarning(english, {
      kind: "lowClassShare",
      unitClass: "spear",
      sharePercent: 14.99,
    }),
    "Only 14.99% of living regulars are Bulwark.",
  );
  assert.equal(
    formatCardApplicabilityWarning(korean, {
      kind: "deadHero",
      heroId: "hero_ashvale",
    }),
    "불씨의 세라 영웅이 쓰러져 있습니다.",
  );
  assert.equal(
    formatCardApplicabilityWarning(english, {
      kind: "fallenHouseStronghold",
      houseId: "house_b",
    }),
    "Thornhold keep/banner anchor has fallen.",
  );
});

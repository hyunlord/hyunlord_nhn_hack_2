import assert from "node:assert/strict";
import test from "node:test";
import { INVESTMENT_TRACKS } from "../src/content/investmentConfig";
import {
  canPurchase,
  investmentCost,
  purchaseInvestment,
  resolveInvestmentEffects,
} from "../src/meta/investments";
import { createDefaultMetaState } from "../src/meta/legacy";

test("Given investment content, when tracks are loaded, then the exact global economics are defined", () => {
  const globals = INVESTMENT_TRACKS.filter(({ scope }) => scope === "global");

  assert.deepEqual(
    globals.map(
      ({
        id,
        scope,
        houseId,
        name,
        maxRank,
        baseCost,
        costGrowth,
        effectPerRank,
      }) => ({
        id,
        scope,
        houseId,
        name,
        maxRank,
        baseCost,
        costGrowth,
        effectPerRank,
      }),
    ),
    [
      {
        id: "global_vigor",
        scope: "global",
        houseId: undefined,
        name: "Vigor of the Faithful",
        maxRank: 5,
        baseCost: 120,
        costGrowth: 1.5,
        effectPerRank: { maxHpBonus: 10 },
      },
      {
        id: "global_edge",
        scope: "global",
        houseId: undefined,
        name: "Keen Devotion",
        maxRank: 5,
        baseCost: 140,
        costGrowth: 1.55,
        effectPerRank: { attackDamageMultiplier: 1.03 },
      },
      {
        id: "global_grace",
        scope: "global",
        houseId: undefined,
        name: "Divine Grace",
        maxRank: 4,
        baseCost: 160,
        costGrowth: 1.6,
        effectPerRank: { divineRegenMultiplier: 1.08 },
      },
      {
        id: "global_tithe",
        scope: "global",
        houseId: undefined,
        name: "Greater Tithe",
        maxRank: 4,
        baseCost: 130,
        costGrowth: 1.5,
        effectPerRank: { tributePerKillBonus: 1 },
      },
      {
        id: "global_resolve",
        scope: "global",
        houseId: undefined,
        name: "Steadfast Resolve",
        maxRank: 3,
        baseCost: 200,
        costGrowth: 1.7,
        effectPerRank: { breakHpRatioDelta: -0.03 },
      },
    ],
  );
});

test("Given investment content, when house tracks are loaded, then every house has one identity track with shared economics", () => {
  const houseTracks = INVESTMENT_TRACKS.filter(({ scope }) => scope === "house");

  assert.deepEqual(
    houseTracks.map(
      ({ id, scope, houseId, maxRank, baseCost, costGrowth, effectPerRank }) => ({
        id,
        scope,
        houseId,
        maxRank,
        baseCost,
        costGrowth,
        effectPerRank,
      }),
    ),
    [
      {
        id: "house_a_ashvale_fury",
        scope: "house",
        houseId: "house_a",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { attackDamageMultiplier: 1.04 },
      },
      {
        id: "house_b_thornhold_bulwark",
        scope: "house",
        houseId: "house_b",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { maxHpBonus: 15 },
      },
      {
        id: "house_c_greymoor_levy",
        scope: "house",
        houseId: "house_c",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { tributePerKillBonus: 1 },
      },
      {
        id: "house_d_duskmere_stride",
        scope: "house",
        houseId: "house_d",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { moveSpeedMultiplier: 1.04 },
      },
      {
        id: "house_e_stonewake_hide",
        scope: "house",
        houseId: "house_e",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { maxHpBonus: 20 },
      },
      {
        id: "house_f_highreach_due",
        scope: "house",
        houseId: "house_f",
        maxRank: 3,
        baseCost: 180,
        costGrowth: 1.6,
        effectPerRank: { tributePerKillBonus: 1 },
      },
    ],
  );
});

test("Given current ranks, when investment costs are requested, then the rounded next-rank formula is exact", () => {
  const edge = INVESTMENT_TRACKS.find(({ id }) => id === "global_edge");
  assert.ok(edge);

  assert.equal(investmentCost(edge, 0), 140);
  assert.equal(investmentCost(edge, 1), 217);
  assert.equal(investmentCost(edge, 2), 336);
  assert.equal(investmentCost(edge, 4), 808);
});

test("Given purchase conditions, when affordability is checked, then max rank, funds, and locked houses are enforced", () => {
  const global = INVESTMENT_TRACKS.find(({ id }) => id === "global_vigor");
  const lockedHouse = INVESTMENT_TRACKS.find(
    ({ id }) => id === "house_d_duskmere_stride",
  );
  assert.ok(global);
  assert.ok(lockedHouse);

  assert.equal(canPurchase(global, 0, 120, []), true);
  assert.equal(canPurchase(global, 0, 119, []), false);
  assert.equal(canPurchase(global, 5, 1_000, []), false);
  assert.equal(canPurchase(lockedHouse, 0, 180, ["house_a"]), false);
  assert.equal(canPurchase(lockedHouse, 0, 180, ["house_d"]), true);
});

test("Given invalid purchase attempts, when an investment is bought, then rejection kind is explicit and state is unchanged", () => {
  const base = {
    ...createDefaultMetaState(),
    legacyPoints: 119,
    investmentRanks: { global_vigor: 5 },
  };

  assert.deepEqual(purchaseInvestment(base, "missing_track"), {
    kind: "unknown_track",
    state: base,
  });
  assert.deepEqual(purchaseInvestment(base, "global_vigor"), {
    kind: "max_rank",
    state: base,
  });
  assert.deepEqual(
    purchaseInvestment(base, "house_d_duskmere_stride"),
    { kind: "locked_house", state: base },
  );
  assert.deepEqual(purchaseInvestment(base, "global_edge"), {
    kind: "insufficient_legacy",
    state: base,
  });
});

test("Given enough legacy, when an investment is purchased, then state is copied and rank plus points update immutably", () => {
  const initial = {
    ...createDefaultMetaState(),
    legacyPoints: 400,
    investmentRanks: { global_vigor: 1 },
  };

  const result = purchaseInvestment(initial, "global_vigor");

  assert.equal(result.kind, "purchased");
  assert.notStrictEqual(result.state, initial);
  assert.notStrictEqual(result.state.investmentRanks, initial.investmentRanks);
  assert.deepEqual(initial.investmentRanks, { global_vigor: 1 });
  assert.equal(result.state.legacyPoints, 220);
  assert.deepEqual(result.state.investmentRanks, { global_vigor: 2 });
});

test("Given investment ranks, when effects are resolved, then flats add and multipliers multiply by rank", () => {
  const effects = resolveInvestmentEffects({
    global_vigor: 2,
    global_edge: 2,
    global_grace: 2,
    global_tithe: 3,
    global_resolve: 2,
  });

  assert.equal(effects.maxHpBonus, 20);
  assert.equal(effects.attackDamageMultiplier, 1.03 ** 2);
  assert.equal(effects.divineRegenMultiplier, 1.08 ** 2);
  assert.equal(effects.tributePerKillBonus, 3);
  assert.equal(effects.breakHpRatioDelta, -0.06);
});

test("Given no ranks, when effects are resolved, then neutral defaults are returned", () => {
  assert.deepEqual(resolveInvestmentEffects({}), {
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
  });
});

test("Given house ranks, when effects are resolved for a selected house list, then only matching house tracks apply", () => {
  const effects = resolveInvestmentEffects(
    {
      global_tithe: 1,
      house_a_ashvale_fury: 1,
      house_d_duskmere_stride: 2,
      house_f_highreach_due: 3,
    },
    ["house_a", "house_d"],
  );

  assert.equal(effects.attackDamageMultiplier, 1.04);
  assert.equal(effects.moveSpeedMultiplier, 1.04 ** 2);
  assert.equal(effects.tributePerKillBonus, 1);
});

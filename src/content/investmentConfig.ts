import type { HouseId } from "./houseConfig";
import type { CardEffect } from "../progression/progression.types";

export type InvestmentScope = "global" | "house";

export interface InvestmentTrack {
  readonly id: string;
  readonly scope: InvestmentScope;
  readonly houseId?: HouseId;
  readonly name: string;
  readonly description: string;
  readonly maxRank: number;
  readonly baseCost: number;
  readonly costGrowth: number;
  readonly effectPerRank: CardEffect;
}

export const INVESTMENT_TRACKS: readonly InvestmentTrack[] = [
  {
    id: "global_vigor",
    scope: "global",
    name: "Vigor of the Faithful",
    description: "Every house begins each run with sturdier agents.",
    maxRank: 5,
    baseCost: 120,
    costGrowth: 1.5,
    effectPerRank: { maxHpBonus: 10 },
  },
  {
    id: "global_edge",
    scope: "global",
    name: "Keen Devotion",
    description: "Permanent rites sharpen every house's opening attacks.",
    maxRank: 5,
    baseCost: 140,
    costGrowth: 1.55,
    effectPerRank: { attackDamageMultiplier: 1.03 },
  },
  {
    id: "global_grace",
    scope: "global",
    name: "Divine Grace",
    description: "The divine well refills faster from the first wave.",
    maxRank: 4,
    baseCost: 160,
    costGrowth: 1.6,
    effectPerRank: { divineRegenMultiplier: 1.08 },
  },
  {
    id: "global_tithe",
    scope: "global",
    name: "Greater Tithe",
    description: "Every kill returns more tribute to the legacy ledger.",
    maxRank: 4,
    baseCost: 130,
    costGrowth: 1.5,
    effectPerRank: { tributePerKillBonus: 1 },
  },
  {
    id: "global_resolve",
    scope: "global",
    name: "Steadfast Resolve",
    description: "Agents hold formation longer before breaking.",
    maxRank: 3,
    baseCost: 200,
    costGrowth: 1.7,
    effectPerRank: { breakHpRatioDelta: -0.03 },
  },
  {
    id: "house_a_ashvale_fury",
    scope: "house",
    houseId: "house_a",
    name: "Ashvale Fury",
    description: "Ashvale carries a sharper opening damage rite.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { attackDamageMultiplier: 1.04 },
  },
  {
    id: "house_b_thornhold_bulwark",
    scope: "house",
    houseId: "house_b",
    name: "Thornhold Bulwark",
    description: "Thornhold begins with a deeper reserve of health.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { maxHpBonus: 15 },
  },
  {
    id: "house_c_greymoor_levy",
    scope: "house",
    houseId: "house_c",
    name: "Greymoor Levy",
    description: "Greymoor extracts more tribute from every kill.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { tributePerKillBonus: 1 },
  },
  {
    id: "house_d_duskmere_stride",
    scope: "house",
    houseId: "house_d",
    name: "Duskmere Stride",
    description: "Duskmere starts each run even faster on the field.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { moveSpeedMultiplier: 1.04 },
  },
  {
    id: "house_e_stonewake_hide",
    scope: "house",
    houseId: "house_e",
    name: "Stonewake Hide",
    description: "Stonewake adds more health to its already heavy line.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { maxHpBonus: 20 },
  },
  {
    id: "house_f_highreach_due",
    scope: "house",
    houseId: "house_f",
    name: "Highreach Due",
    description: "Highreach opens each run with a richer tribute claim.",
    maxRank: 3,
    baseCost: 180,
    costGrowth: 1.6,
    effectPerRank: { tributePerKillBonus: 1 },
  },
] as const;

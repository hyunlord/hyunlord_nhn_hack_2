import type { MiracleType } from "./divine.types";

export interface MiracleDefinition {
  readonly type: MiracleType;
  readonly label: string;
  readonly cost: number;
  readonly radius: number;
  readonly cooldownTicks: number;
  readonly color: string;
  readonly maxDamage: number;
  readonly maxHeal: number;
  readonly housePowerDelta: number;
}

export const MIRACLE_DEFINITIONS: Record<
  MiracleType,
  MiracleDefinition
> = {
  lightning: {
    type: "lightning",
    label: "Lightning",
    cost: 30,
    radius: 55,
    cooldownTicks: 20,
    color: "#ffd76a",
    maxDamage: 60,
    maxHeal: 0,
    housePowerDelta: 0,
  },
  blessing: {
    type: "blessing",
    label: "Blessing",
    cost: 20,
    radius: 90,
    cooldownTicks: 30,
    color: "#8fe3b0",
    maxDamage: 0,
    maxHeal: 25,
    housePowerDelta: 8,
  },
  curse: {
    type: "curse",
    label: "Curse",
    cost: 25,
    radius: 90,
    cooldownTicks: 30,
    color: "#b06ad4",
    maxDamage: 12,
    maxHeal: 0,
    housePowerDelta: -10,
  },
};

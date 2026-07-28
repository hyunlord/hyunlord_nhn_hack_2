import type { HouseConfigEntry } from "../houseConfig";
import type { Translate } from "./domainLabels";

function signedNumber(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function signedPercent(multiplier: number): string {
  const value = Math.round((multiplier - 1) * 100);
  return `${value > 0 ? "+" : ""}${value}%`;
}

function pushMultiplierLabel(
  labels: string[],
  t: Translate,
  key: Parameters<Translate>[0],
  multiplier: number,
): void {
  if (multiplier !== 1) {
    labels.push(t(key, { value: signedPercent(multiplier) }));
  }
}

function pushNumberLabel(
  labels: string[],
  t: Translate,
  key: Parameters<Translate>[0],
  value: number,
): void {
  if (value !== 0) {
    labels.push(t(key, { value: signedNumber(value) }));
  }
}

export function houseTraitLabels(
  t: Translate,
  house: Pick<HouseConfigEntry, "traits">,
): readonly string[] {
  const labels: string[] = [];
  pushMultiplierLabel(labels, t, "house.trait.maxHp", house.traits.maxHpMultiplier);
  pushMultiplierLabel(labels, t, "house.trait.attackDamage", house.traits.attackDamageMultiplier);
  pushMultiplierLabel(labels, t, "house.trait.attackInterval", house.traits.attackIntervalMultiplier);
  pushMultiplierLabel(labels, t, "house.trait.moveSpeed", house.traits.moveSpeedMultiplier);
  pushNumberLabel(labels, t, "house.trait.aggression", house.traits.aggressionBias);
  pushNumberLabel(labels, t, "house.trait.loyalty", house.traits.loyaltyBias);
  pushNumberLabel(labels, t, "house.trait.tribute", house.traits.tributePerKillBonus);
  return labels.length === 0 ? [t("effect.empty")] : labels;
}

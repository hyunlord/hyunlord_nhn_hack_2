import { resolveInvestmentEffects } from "../../meta/investments";
import type { CardEffect } from "../../progression/progression.types";
import { HOUSE_CONFIG } from "../houseConfig";
import { INVESTMENT_TRACKS } from "../investmentConfig";
import { houseName, type Translate } from "./domainLabels";

function effectLabels(
  investmentRanks: Readonly<Record<string, number>>,
  t: Translate,
): readonly string[] {
  const effects = resolveInvestmentEffects(investmentRanks);
  const labels: string[] = [];
  if (effects.maxHpBonus !== 0) {
    labels.push(t("effect.maxHp", { value: `${effects.maxHpBonus > 0 ? "+" : ""}${effects.maxHpBonus}` }));
  }
  if (effects.attackDamageMultiplier !== 1) {
    const value = Math.round((effects.attackDamageMultiplier - 1) * 100);
    labels.push(t("effect.attack", { value: `${value > 0 ? "+" : ""}${value}%` }));
  }
  if (effects.divineRegenMultiplier !== 1) {
    labels.push(t("effect.divineRegen", { value: `${Math.round((effects.divineRegenMultiplier - 1) * 100)}%` }));
  }
  if (effects.tributePerKillBonus !== 0) {
    labels.push(t("effect.tribute", { value: effects.tributePerKillBonus }));
  }
  if (effects.breakHpRatioDelta !== 0) {
    labels.push(t("effect.flee", { value: Math.round(effects.breakHpRatioDelta * 100) }));
  }
  if (effects.moveSpeedMultiplier !== 1) {
    labels.push(t("effect.speed", { value: `${Math.round((effects.moveSpeedMultiplier - 1) * 100)}%` }));
  }
  return labels;
}

function ranksForTracks(
  investmentRanks: Readonly<Record<string, number>>,
  tracks: readonly { readonly id: string }[],
): Readonly<Record<string, number>> {
  const ranks: Record<string, number> = {};
  for (const track of tracks) {
    const rank = investmentRanks[track.id] ?? 0;
    if (rank > 0) {
      ranks[track.id] = rank;
    }
  }
  return ranks;
}

export function localizedActiveBonusGroups(
  t: Translate,
  investmentRanks: Readonly<Record<string, number>>,
): readonly { readonly heading: string; readonly labels: readonly string[] }[] {
  const groups: { readonly heading: string; readonly labels: readonly string[] }[] = [];
  const globalLabels = effectLabels(
    ranksForTracks(investmentRanks, INVESTMENT_TRACKS.filter((track) => track.scope === "global")),
    t,
  );
  if (globalLabels.length > 0) {
    groups.push({ heading: t("group.global"), labels: globalLabels });
  }
  for (const house of HOUSE_CONFIG) {
    const houseLabels = effectLabels(
      ranksForTracks(investmentRanks, INVESTMENT_TRACKS.filter((track) => track.houseId === house.id)),
      t,
    );
    if (houseLabels.length > 0) {
      groups.push({ heading: houseName(t, house.id), labels: houseLabels });
    }
  }
  return groups;
}

export function localizedInvestmentEffectLabel(t: Translate, effect: CardEffect): string {
  const lines = [] as string[];
  if (effect.maxHpBonus !== undefined) {
    lines.push(t("effect.maxHpPerRank", { value: effect.maxHpBonus }));
  }
  if (effect.attackDamageMultiplier !== undefined) {
    const value = Math.round((effect.attackDamageMultiplier - 1) * 100);
    lines.push(t("effect.attackPerRank", { value: `${value > 0 ? "+" : ""}${value}%` }));
  }
  if (effect.divineRegenMultiplier !== undefined) {
    lines.push(t("effect.divineRegenPerRank", { value: `${Math.round((effect.divineRegenMultiplier - 1) * 100)}%` }));
  }
  if (effect.tributePerKillBonus !== undefined) {
    lines.push(t("effect.tributePerRank", { value: effect.tributePerKillBonus }));
  }
  if (effect.breakHpRatioDelta !== undefined) {
    lines.push(t("effect.fleePerRank", { value: Math.round(effect.breakHpRatioDelta * 100) }));
  }
  if (effect.moveSpeedMultiplier !== undefined) {
    lines.push(t("effect.speedPerRank", { value: `${Math.round((effect.moveSpeedMultiplier - 1) * 100)}%` }));
  }
  return lines.length === 0 ? t("effect.empty") : lines.join("; ");
}

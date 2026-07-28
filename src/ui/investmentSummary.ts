import { HOUSE_CONFIG, type HouseId } from "../content/houseConfig";
import { houseName, investmentDescription, investmentName, type Translate } from "../content/locale/display";
import { translate } from "../content/locale";
import { INVESTMENT_TRACKS, type InvestmentTrack } from "../content/investmentConfig";
import { resolveInvestmentEffects } from "../meta/investments";
import type { CardEffect } from "../progression/progression.types";

export interface ActiveBonusGroup {
  readonly heading: string;
  readonly labels: readonly string[];
}

export interface LegacyRiteItem {
  readonly effect: string;
  readonly name: string;
  readonly rank: string;
}

export interface LegacyRiteGroup {
  readonly heading: string;
  readonly items: readonly LegacyRiteItem[];
}

const DEFAULT_T: Translate = (key: Parameters<Translate>[0], params) => translate("en", key, params);

export function purchaseInvestmentLabel(trackName: string, t: Translate = DEFAULT_T): string {
  return t("meta.investment.purchaseLabel", { track: trackName });
}

function multiplierPercent(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

export function investmentEffectLabel(effect: CardEffect, t: Translate = DEFAULT_T): string {
  const labels: string[] = [];
  if (effect.maxHpBonus !== undefined) {
    labels.push(t("effect.maxHpPerRank", { value: effect.maxHpBonus }));
  }
  if (effect.attackDamageMultiplier !== undefined) {
    labels.push(t("effect.attackPerRank", { value: multiplierPercent(effect.attackDamageMultiplier) }));
  }
  if (effect.divineRegenMultiplier !== undefined) {
    labels.push(t("effect.divineRegenPerRank", { value: multiplierPercent(effect.divineRegenMultiplier) }));
  }
  if (effect.tributePerKillBonus !== undefined) {
    labels.push(t("effect.tributePerRank", { value: effect.tributePerKillBonus }));
  }
  if (effect.breakHpRatioDelta !== undefined) {
    labels.push(t("effect.fleePerRank", { value: Math.round(effect.breakHpRatioDelta * 100) }));
  }
  if (effect.moveSpeedMultiplier !== undefined) {
    labels.push(t("effect.speedPerRank", { value: multiplierPercent(effect.moveSpeedMultiplier) }));
  }
  return labels.length === 0 ? t("effect.empty") : labels.join("; ");
}

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
    labels.push(t("effect.attack", { value: multiplierPercent(effects.attackDamageMultiplier) }));
  }
  if (effects.divineRegenMultiplier !== 1) {
    labels.push(t("effect.divineRegen", { value: multiplierPercent(effects.divineRegenMultiplier) }));
  }
  if (effects.tributePerKillBonus !== 0) {
    labels.push(t("effect.tribute", { value: effects.tributePerKillBonus }));
  }
  if (effects.breakHpRatioDelta !== 0) {
    labels.push(t("effect.flee", { value: Math.round(effects.breakHpRatioDelta * 100) }));
  }
  if (effects.moveSpeedMultiplier !== 1) {
    labels.push(t("effect.speed", { value: multiplierPercent(effects.moveSpeedMultiplier) }));
  }
  return labels;
}

function ranksForTracks(
  investmentRanks: Readonly<Record<string, number>>,
  tracks: readonly InvestmentTrack[],
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

export function activeBonusGroups(
  investmentRanks: Readonly<Record<string, number>>,
  t: Translate = DEFAULT_T,
): readonly ActiveBonusGroup[] {
  const groups: ActiveBonusGroup[] = [];
  const globalLabels = effectLabels(
    ranksForTracks(
      investmentRanks,
      INVESTMENT_TRACKS.filter((track) => track.scope === "global"),
    ),
    t,
  );
  if (globalLabels.length > 0) {
    groups.push({ heading: t("group.global"), labels: globalLabels });
  }

  for (const house of HOUSE_CONFIG) {
    const houseLabels = effectLabels(
      ranksForTracks(
        investmentRanks,
        INVESTMENT_TRACKS.filter((track) => track.houseId === house.id),
      ),
      t,
    );
    if (houseLabels.length > 0) {
      groups.push({ heading: houseName(t, house.id), labels: houseLabels });
    }
  }
  return groups;
}

function riteItem(track: InvestmentTrack, rank: number, t: Translate): LegacyRiteItem {
  return {
    effect: investmentEffectLabel(track.effectPerRank, t),
    name: investmentName(t, track.id),
    rank: t("meta.investment.rankLabel", { rank }),
  };
}

function activeTrackItems(
  investmentRanks: Readonly<Record<string, number>>,
  tracks: readonly InvestmentTrack[],
  t: Translate,
): readonly LegacyRiteItem[] {
  return tracks.flatMap((track) => {
    const rank = investmentRanks[track.id] ?? 0;
    return rank > 0 ? [riteItem(track, rank, t)] : [];
  });
}

export function legacyRiteGroups(
  investmentRanks: Readonly<Record<string, number>>,
  selectedHouseIds: readonly HouseId[],
  t: Translate = DEFAULT_T,
): readonly LegacyRiteGroup[] {
  const groups: LegacyRiteGroup[] = [];
  const globalItems = activeTrackItems(
    investmentRanks,
    INVESTMENT_TRACKS.filter((track) => track.scope === "global"),
    t,
  );
  if (globalItems.length > 0) {
    groups.push({ heading: t("group.global"), items: globalItems });
  }

  for (const houseId of selectedHouseIds) {
    const house = HOUSE_CONFIG.find((candidate) => candidate.id === houseId);
    const houseItems = activeTrackItems(
      investmentRanks,
      INVESTMENT_TRACKS.filter((track) => track.houseId === houseId),
      t,
    );
    if (house !== undefined && houseItems.length > 0) {
      groups.push({ heading: houseName(t, house.id), items: houseItems });
    }
  }
  return groups;
}

export { investmentDescription, investmentName };

import {
  HOUSE_CONFIG,
  type HouseId,
} from "../content/houseConfig";
import {
  INVESTMENT_TRACKS,
  type InvestmentTrack,
} from "../content/investmentConfig";
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

export function purchaseInvestmentLabel(trackName: string): string {
  return `Purchase ${trackName}`;
}

function multiplierPercent(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

export function investmentEffectLabel(effect: CardEffect): string {
  const labels: string[] = [];
  if (effect.maxHpBonus !== undefined) {
    labels.push(`+${effect.maxHpBonus} max HP per rank`);
  }
  if (effect.attackDamageMultiplier !== undefined) {
    labels.push(`${multiplierPercent(effect.attackDamageMultiplier)} attack damage per rank`);
  }
  if (effect.divineRegenMultiplier !== undefined) {
    labels.push(`${multiplierPercent(effect.divineRegenMultiplier)} divine regen per rank`);
  }
  if (effect.tributePerKillBonus !== undefined) {
    labels.push(`+${effect.tributePerKillBonus} tribute per kill per rank`);
  }
  if (effect.breakHpRatioDelta !== undefined) {
    labels.push(`${Math.round(effect.breakHpRatioDelta * 100)} point flee threshold per rank`);
  }
  if (effect.moveSpeedMultiplier !== undefined) {
    labels.push(`${multiplierPercent(effect.moveSpeedMultiplier)} move speed per rank`);
  }
  return labels.join("; ");
}

function effectLabels(investmentRanks: Readonly<Record<string, number>>): readonly string[] {
  const effects = resolveInvestmentEffects(investmentRanks);
  const labels: string[] = [];
  if (effects.maxHpBonus !== 0) {
    labels.push(`Max HP ${effects.maxHpBonus > 0 ? "+" : ""}${effects.maxHpBonus}`);
  }
  if (effects.attackDamageMultiplier !== 1) {
    labels.push(`Attack damage ${multiplierPercent(effects.attackDamageMultiplier)}`);
  }
  if (effects.divineRegenMultiplier !== 1) {
    labels.push(`Divine regen ${multiplierPercent(effects.divineRegenMultiplier)}`);
  }
  if (effects.tributePerKillBonus !== 0) {
    labels.push(`Tribute per kill +${effects.tributePerKillBonus}`);
  }
  if (effects.breakHpRatioDelta !== 0) {
    labels.push(`Flee threshold ${Math.round(effects.breakHpRatioDelta * 100)} points`);
  }
  if (effects.moveSpeedMultiplier !== 1) {
    labels.push(`Move speed ${multiplierPercent(effects.moveSpeedMultiplier)}`);
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
): readonly ActiveBonusGroup[] {
  const groups: ActiveBonusGroup[] = [];
  const globalLabels = effectLabels(
    ranksForTracks(
      investmentRanks,
      INVESTMENT_TRACKS.filter((track) => track.scope === "global"),
    ),
  );
  if (globalLabels.length > 0) {
    groups.push({ heading: "Global", labels: globalLabels });
  }

  for (const house of HOUSE_CONFIG) {
    const houseLabels = effectLabels(
      ranksForTracks(
        investmentRanks,
        INVESTMENT_TRACKS.filter((track) => track.houseId === house.id),
      ),
    );
    if (houseLabels.length > 0) {
      groups.push({ heading: house.name, labels: houseLabels });
    }
  }
  return groups;
}

function riteItem(
  track: InvestmentTrack,
  rank: number,
): LegacyRiteItem {
  return {
    effect: investmentEffectLabel(track.effectPerRank),
    name: track.name,
    rank: `Rank ${rank}`,
  };
}

function activeTrackItems(
  investmentRanks: Readonly<Record<string, number>>,
  tracks: readonly InvestmentTrack[],
): readonly LegacyRiteItem[] {
  return tracks.flatMap((track) => {
    const rank = investmentRanks[track.id] ?? 0;
    return rank > 0 ? [riteItem(track, rank)] : [];
  });
}

export function legacyRiteGroups(
  investmentRanks: Readonly<Record<string, number>>,
  selectedHouseIds: readonly HouseId[],
): readonly LegacyRiteGroup[] {
  const groups: LegacyRiteGroup[] = [];
  const globalItems = activeTrackItems(
    investmentRanks,
    INVESTMENT_TRACKS.filter((track) => track.scope === "global"),
  );
  if (globalItems.length > 0) {
    groups.push({ heading: "Global", items: globalItems });
  }

  for (const houseId of selectedHouseIds) {
    const house = HOUSE_CONFIG.find((candidate) => candidate.id === houseId);
    const houseItems = activeTrackItems(
      investmentRanks,
      INVESTMENT_TRACKS.filter((track) => track.houseId === houseId),
    );
    if (house !== undefined && houseItems.length > 0) {
      groups.push({ heading: house.name, items: houseItems });
    }
  }
  return groups;
}

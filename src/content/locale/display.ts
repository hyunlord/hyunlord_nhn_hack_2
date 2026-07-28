import { HOUSE_CONFIG, type HouseId } from "../houseConfig";
import type { CardKind, CardRarity } from "../../progression/progression.types";
import type { MiracleType } from "../../divine/divine.types";
import type { DivineSkillId } from "../../divine/skillTypes";
import { INVESTMENT_TRACKS } from "../investmentConfig";
import { resolveInvestmentEffects } from "../../meta/investments";
import type { CardEffect } from "../../progression/progression.types";
import type { LocaleKey, LocaleParams } from "./index";

export type Translate = (key: LocaleKey, params?: LocaleParams) => string;

type DomainScope =
  | "achievement"
  | "card"
  | "hero"
  | "house"
  | "investment"
  | "skill"
  | "synergy";

function domainKey(
  scope: DomainScope,
  id: string,
  field: "description" | "identity" | "name" | "trait",
): LocaleKey {
  return `${scope}.${id}.${field}` as LocaleKey;
}

export function houseName(t: Translate, houseId: HouseId | string): string {
  return t(domainKey("house", houseId, "name"));
}

export function houseIdentity(t: Translate, houseId: HouseId | string): string {
  return t(domainKey("house", houseId, "identity"));
}

export function houseTrait(t: Translate, houseId: HouseId | string): string {
  return t(domainKey("house", houseId, "trait"));
}

export function heroName(t: Translate, heroId: string): string {
  return t(domainKey("hero", heroId, "name"));
}

export function miracleName(t: Translate, miracle: MiracleType): string {
  return t(`miracle.${miracle}` as LocaleKey);
}

export function skillName(t: Translate, skill: DivineSkillId): string {
  return t(domainKey("skill", skill, "name"));
}

export function skillDescription(t: Translate, skill: DivineSkillId): string {
  return t(domainKey("skill", skill, "description"));
}

export function cardName(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "name"));
}

export function cardDescription(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "description"));
}

export function cardKindLabel(t: Translate, kind: CardKind): string {
  return t(`card.kind.${kind}` as LocaleKey);
}

export function cardRarityLabel(t: Translate, rarity: CardRarity): string {
  return t(`card.rarity.${rarity}` as LocaleKey);
}

export function investmentName(t: Translate, trackId: string): string {
  return t(domainKey("investment", trackId, "name"));
}

export function investmentDescription(t: Translate, trackId: string): string {
  return t(domainKey("investment", trackId, "description"));
}

export function achievementName(t: Translate, achievementId: string): string {
  return t(domainKey("achievement", achievementId, "name"));
}

export function achievementDescription(t: Translate, achievementId: string): string {
  return t(domainKey("achievement", achievementId, "description"));
}

export function synergyName(t: Translate, synergyId: string): string {
  return t(domainKey("synergy", synergyId, "name"));
}

export function synergyDescription(t: Translate, synergyId: string): string {
  return t(domainKey("synergy", synergyId, "description"));
}

function multiplierPercent(multiplier: number): string {
  const percent = Math.round((multiplier - 1) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

function effectKey(
  name: "attack" | "divineRegen" | "flee" | "maxHp" | "speed" | "tribute",
  keySuffix: "" | "PerRank",
): LocaleKey {
  return `effect.${name}${keySuffix}` as LocaleKey;
}

function effectLabels(
  t: Translate,
  effect: CardEffect,
  keySuffix: "" | "PerRank",
): readonly string[] {
  const labels: string[] = [];
  if (effect.maxHpBonus !== undefined && effect.maxHpBonus !== 0) {
    const value =
      keySuffix === "" && effect.maxHpBonus > 0
        ? `+${effect.maxHpBonus}`
        : effect.maxHpBonus;
    labels.push(t(effectKey("maxHp", keySuffix), { value }));
  }
  if (
    effect.attackDamageMultiplier !== undefined &&
    effect.attackDamageMultiplier !== 1
  ) {
    labels.push(
      t(effectKey("attack", keySuffix), {
        value: multiplierPercent(effect.attackDamageMultiplier),
      }),
    );
  }
  if (
    effect.divineRegenMultiplier !== undefined &&
    effect.divineRegenMultiplier !== 1
  ) {
    labels.push(
      t(effectKey("divineRegen", keySuffix), {
        value: multiplierPercent(effect.divineRegenMultiplier),
      }),
    );
  }
  if (effect.tributePerKillBonus !== undefined && effect.tributePerKillBonus !== 0) {
    labels.push(
      t(effectKey("tribute", keySuffix), {
        value: effect.tributePerKillBonus,
      }),
    );
  }
  if (effect.breakHpRatioDelta !== undefined && effect.breakHpRatioDelta !== 0) {
    labels.push(
      t(effectKey("flee", keySuffix), {
        value: Math.round(effect.breakHpRatioDelta * 100),
      }),
    );
  }
  if (effect.moveSpeedMultiplier !== undefined && effect.moveSpeedMultiplier !== 1) {
    labels.push(
      t(effectKey("speed", keySuffix), {
        value: multiplierPercent(effect.moveSpeedMultiplier),
      }),
    );
  }
  return labels.length === 0 ? [t("effect.empty")] : labels;
}

function ranksForTracks(
  investmentRanks: Readonly<Record<string, number>>,
  trackIds: readonly string[],
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    trackIds.map((trackId) => [trackId, investmentRanks[trackId] ?? 0]),
  );
}

export function localizedInvestmentEffectLabel(
  t: Translate,
  effect: CardEffect,
): string {
  return effectLabels(t, effect, "PerRank").join("; ");
}

export function localizedActiveBonusGroups(
  t: Translate,
  investmentRanks: Readonly<Record<string, number>>,
): readonly { readonly heading: string; readonly labels: readonly string[] }[] {
  const groups: { readonly heading: string; readonly labels: readonly string[] }[] = [];
  const emptyEffect = t("effect.empty");
  const globalTrackIds = INVESTMENT_TRACKS.filter(
    (track) => track.scope === "global",
  ).map((track) => track.id);
  const globalLabels = effectLabels(
    t,
    resolveInvestmentEffects(ranksForTracks(investmentRanks, globalTrackIds)),
    "",
  );
  if (globalLabels.some((label) => label !== emptyEffect)) {
    groups.push({ heading: t("group.global"), labels: globalLabels });
  }

  for (const house of HOUSE_CONFIG) {
    const houseTrackIds = INVESTMENT_TRACKS.filter(
      (track) => track.houseId === house.id,
    ).map((track) => track.id);
    const houseLabels = effectLabels(
      t,
      resolveInvestmentEffects(ranksForTracks(investmentRanks, houseTrackIds)),
      "",
    );
    if (houseLabels.some((label) => label !== emptyEffect)) {
      groups.push({ heading: houseName(t, house.id), labels: houseLabels });
    }
  }
  return groups;
}

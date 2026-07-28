import type { MiracleType } from "../../divine/divine.types";
import { MIRACLE_DEFINITIONS } from "../../divine/miracleTypes";
import type { DivineSkillId } from "../../divine/skillTypes";
import type { CardKind, CardRarity } from "../../progression/progression.types";
import type { HouseId } from "../houseConfig";
import { HOUSE_CONFIG } from "../houseConfig";
import { HOUSE_SYNERGIES } from "../houseSynergies";
import { HERO_DEFINITIONS } from "../heroConfig";
import { INVESTMENT_TRACKS } from "../investmentConfig";
import { ACHIEVEMENT_DEFINITIONS } from "../metaConfig";
import type { UnitClassId } from "../unitClassConfig";
import type { LocaleKey, LocaleParams } from ".";

export type Translate = (key: LocaleKey, params?: LocaleParams) => string;

export type { LocaleKey } from ".";

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
  field: "description" | "identity" | "name" | "role" | "trait",
): LocaleKey {
  return `${scope}.${id}.${field}` as LocaleKey;
}

function hasHouse(houseId: HouseId): boolean {
  return HOUSE_CONFIG.some((house) => house.id === houseId);
}

export function houseName(t: Translate, houseId: HouseId): string {
  return hasHouse(houseId) ? t(domainKey("house", houseId, "name")) : houseId;
}

export function houseIdentity(t: Translate, houseId: HouseId): string {
  return hasHouse(houseId) ? t(domainKey("house", houseId, "identity")) : "";
}

export function houseTrait(t: Translate, houseId: HouseId): string {
  return hasHouse(houseId) ? t(domainKey("house", houseId, "trait")) : "";
}

export function investmentName(t: Translate, trackId: string): string {
  return INVESTMENT_TRACKS.some((candidate) => candidate.id === trackId)
    ? t(domainKey("investment", trackId, "name"))
    : trackId;
}

export function investmentDescription(t: Translate, trackId: string): string {
  return INVESTMENT_TRACKS.some((candidate) => candidate.id === trackId)
    ? t(domainKey("investment", trackId, "description"))
    : "";
}

export function achievementName(t: Translate, achievementId: string): string {
  return ACHIEVEMENT_DEFINITIONS.some((candidate) => candidate.id === achievementId)
    ? t(domainKey("achievement", achievementId, "name"))
    : achievementId;
}

export function achievementDescription(t: Translate, achievementId: string): string {
  return ACHIEVEMENT_DEFINITIONS.some((candidate) => candidate.id === achievementId)
    ? t(domainKey("achievement", achievementId, "description"))
    : "";
}

export function synergyName(t: Translate, synergyId: string): string {
  return HOUSE_SYNERGIES.some((candidate) => candidate.id === synergyId)
    ? t(domainKey("synergy", synergyId, "name"))
    : synergyId;
}

export function synergyDescription(t: Translate, synergyId: string): string {
  return HOUSE_SYNERGIES.some((candidate) => candidate.id === synergyId)
    ? t(domainKey("synergy", synergyId, "description"))
    : "";
}

export function heroName(t: Translate, heroId: string): string {
  return HERO_DEFINITIONS.some((candidate) => candidate.id === heroId)
    ? t(domainKey("hero", heroId, "name"))
    : heroId;
}

export function heroRole(t: Translate, heroId: string): string {
  return HERO_DEFINITIONS.some((candidate) => candidate.id === heroId)
    ? t(domainKey("hero", heroId, "role"))
    : "";
}

export function unitClassLabel(t: Translate, unitClass: UnitClassId): string {
  return t(`unitClass.${unitClass}.role` as LocaleKey);
}

export function miracleName(_t: Translate, miracle: MiracleType): string {
  return MIRACLE_DEFINITIONS[miracle].label;
}

export function skillName(t: Translate, skill: DivineSkillId): string {
  return t(domainKey("skill", skill, "name"));
}

export function skillDescription(t: Translate, skill: DivineSkillId): string {
  return t(domainKey("skill", skill, "description"));
}

export function cardKindLabel(t: Translate, kind: CardKind): string {
  return t(`card.kind.${kind}` as LocaleKey);
}

export function cardRarityLabel(t: Translate, rarity: CardRarity): string {
  return t(`card.rarity.${rarity}` as LocaleKey);
}

export function cardName(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "name"));
}

export function cardDescription(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "description"));
}

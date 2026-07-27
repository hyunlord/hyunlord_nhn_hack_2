import type { DivineSkillId } from "../divine/skillTypes";

export type CardKind = "common" | "house" | "hero" | "divine";
export type CardRarity = "common" | "rare" | "legendary";

export interface CardEffect {
  attackDamageMultiplier?: number;
  attackIntervalMultiplier?: number;
  maxHpBonus?: number;
  maxHpMultiplier?: number;
  moveSpeedMultiplier?: number;
  threatSenseRadiusBonus?: number;
  breakHpRatioDelta?: number;
  hallDefenseRadiusBonus?: number;
  divineRegenMultiplier?: number;
  divineCostMultiplier?: number;
  miracleRadiusMultiplier?: number;
  miracleHealMultiplier?: number;
  tributePerKillBonus?: number;
  interWaveHealBonus?: number;
  heroDamageMultiplier?: number;
  heroMaxHpMultiplier?: number;
  heroRespawnTicksMultiplier?: number;
  heroAuraRadiusBonus?: number;
  heroOnKillHeal?: number;
  grantsSkill?: DivineSkillId;
  divinePowerPerAgentDeath?: number;
  ignoreBreak?: boolean;
  towerCostMultiplier?: number;
  heroRespawnHpMultiplier?: number;
  disableHeroRespawn?: boolean;
}

export interface CardDefinition {
  id: string;
  kind: CardKind;
  rarity: CardRarity;
  name: string;
  description: string;
  houseId?: string;
  heroId?: string;
  maxStacks: number;
  effect: CardEffect;
}

export interface OwnedCard {
  cardId: string;
  stacks: number;
}

export interface HouseProgress {
  houseId: string;
  xp: number;
  level: number;
  cards: OwnedCard[];
}

export interface DraftOffer {
  id: string;
  houseId: string;
  level: number;
  cardIds: string[];
}

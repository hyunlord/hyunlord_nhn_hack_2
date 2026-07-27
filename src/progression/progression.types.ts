export type CardKind = "common" | "house" | "hero" | "divine";

export interface CardEffect {
  attackDamageMultiplier?: number;
  attackIntervalMultiplier?: number;
  maxHpBonus?: number;
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
}

export interface CardDefinition {
  id: string;
  kind: CardKind;
  name: string;
  description: string;
  houseId?: string;
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

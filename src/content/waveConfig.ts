export interface WaveDefinition {
  readonly index: number;
  readonly label: string;
  readonly creatureCount: number;
  readonly creatureHpMultiplier: number;
  readonly creatureDamageMultiplier: number;
  readonly hasMage: boolean;
  readonly tributeReward: number;
}

export const WAVE_DEFINITIONS: readonly WaveDefinition[] = [
  {
    index: 0,
    label: "First Howl",
    creatureCount: 14,
    creatureHpMultiplier: 1,
    creatureDamageMultiplier: 1,
    hasMage: false,
    tributeReward: 60,
  },
  {
    index: 1,
    label: "Gathering Dark",
    creatureCount: 22,
    creatureHpMultiplier: 1.3,
    creatureDamageMultiplier: 1.1,
    hasMage: false,
    tributeReward: 90,
  },
  {
    index: 2,
    label: "The Mage Comes",
    creatureCount: 30,
    creatureHpMultiplier: 1.6,
    creatureDamageMultiplier: 1.2,
    hasMage: true,
    tributeReward: 140,
  },
] as const;

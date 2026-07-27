export interface WaveDefinition {
  readonly index: number;
  readonly label: string;
  readonly creatureCount: number;
  readonly creatureHpMultiplier: number;
  readonly creatureDamageMultiplier: number;
  readonly spawnEdges: number;
  readonly hasMage: boolean;
  readonly tributeReward: number;
}

export const WAVE_DEFINITIONS: readonly WaveDefinition[] = [
  {
    index: 0,
    label: "First Howl",
    creatureCount: 20,
    creatureHpMultiplier: 1.8,
    creatureDamageMultiplier: 1,
    spawnEdges: 1,
    hasMage: false,
    tributeReward: 60,
  },
  {
    index: 1,
    label: "Gathering Dark",
    creatureCount: 34,
    creatureHpMultiplier: 2.5,
    creatureDamageMultiplier: 1.1,
    spawnEdges: 2,
    hasMage: false,
    tributeReward: 90,
  },
  {
    index: 2,
    label: "The Mage Comes",
    creatureCount: 64,
    creatureHpMultiplier: 5,
    creatureDamageMultiplier: 1.2,
    spawnEdges: 3,
    hasMage: true,
    tributeReward: 140,
  },
] as const;

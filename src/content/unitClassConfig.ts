export type UnitClassId = "melee" | "spear" | "archer" | "skirmisher";

export type UnitShape = "circle" | "diamond" | "triangle" | "dot";

export interface UnitClassDefinition {
  readonly id: UnitClassId;
  readonly name: string;
  readonly maxHp: number;
  readonly attackDamage: number;
  readonly attackIntervalTicks: number;
  readonly attackRange: number;
  readonly preferredRange: number;
  readonly moveSpeed: number;
  readonly drawRadius: number;
  readonly drawShape: UnitShape;
  readonly lineRank: number;
}

export type UnitRoster = Readonly<Partial<Record<UnitClassId, number>>>;

export interface UnitClassAllocation {
  readonly unitClass: UnitClassId;
  readonly count: number;
}

export const UNIT_CLASS_IDS = [
  "melee",
  "spear",
  "archer",
  "skirmisher",
] as const satisfies readonly UnitClassId[];

export const UNIT_CLASSES = {
  melee: {
    id: "melee",
    name: "Warrior",
    maxHp: 100,
    attackDamage: 20,
    attackIntervalTicks: 10,
    attackRange: 13,
    preferredRange: 13,
    moveSpeed: 0.6,
    drawRadius: 4,
    drawShape: "circle",
    lineRank: 78,
  },
  spear: {
    id: "spear",
    name: "Spearman",
    maxHp: 140,
    attackDamage: 16,
    attackIntervalTicks: 12,
    attackRange: 20,
    preferredRange: 20,
    moveSpeed: 0.5,
    drawRadius: 4.5,
    drawShape: "diamond",
    lineRank: 96,
  },
  archer: {
    id: "archer",
    name: "Archer",
    maxHp: 65,
    attackDamage: 18,
    attackIntervalTicks: 14,
    attackRange: 70,
    preferredRange: 58,
    moveSpeed: 0.55,
    drawRadius: 3.5,
    drawShape: "triangle",
    lineRank: 52,
  },
  skirmisher: {
    id: "skirmisher",
    name: "Skirmisher",
    maxHp: 75,
    attackDamage: 14,
    attackIntervalTicks: 8,
    attackRange: 13,
    preferredRange: 13,
    moveSpeed: 0.9,
    drawRadius: 3,
    drawShape: "dot",
    lineRank: 78,
  },
} as const satisfies Readonly<Record<UnitClassId, UnitClassDefinition>>;

export function apportionUnitClasses(
  total: number,
  roster: UnitRoster,
): readonly UnitClassAllocation[] {
  const totalWeight = UNIT_CLASS_IDS.reduce(
    (sum, unitClass) => sum + (roster[unitClass] ?? 0),
    0,
  );
  if (total <= 0 || totalWeight <= 0) {
    return UNIT_CLASS_IDS.map((unitClass) => ({ unitClass, count: 0 }));
  }

  const quotas = UNIT_CLASS_IDS.map((unitClass, order) => {
    const exact = (total * (roster[unitClass] ?? 0)) / totalWeight;
    return {
      unitClass,
      order,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const unassigned =
    total - quotas.reduce((sum, allocation) => sum + allocation.floor, 0);
  const remainderWinners = new Set(
    [...quotas]
      .sort(
        (first, second) =>
          second.remainder - first.remainder || first.order - second.order,
      )
      .slice(0, unassigned)
      .map(({ unitClass }) => unitClass),
  );

  return quotas.map(({ unitClass, floor }) => ({
    unitClass,
    count: floor + (remainderWinners.has(unitClass) ? 1 : 0),
  }));
}

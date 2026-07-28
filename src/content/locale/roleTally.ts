import type { UnitClassId } from "../unitClassConfig";
import { ko } from "./ko";

export const UNIT_CLASS_ORDER: readonly UnitClassId[] = ["spear", "melee", "archer", "skirmisher"] as const;

interface AgentTallyInput {
  readonly houseId: string;
  readonly unitClass: UnitClassId | undefined;
  readonly isHero?: boolean;
  readonly state?: "idle" | "fleeing" | "fighting" | "helping" | "dead";
}

export interface UnitClassTally {
  readonly unitClass: UnitClassId;
  readonly count: number;
}

export interface UnitClassShare extends UnitClassTally {
  readonly percent: number;
}

function defaultRoleLabel(unitClass: UnitClassId): string {
  return ko[`unitClass.${unitClass}.role`];
}

export function dominantUnitClass(tallies: readonly UnitClassTally[]): UnitClassId | undefined {
  let topClass: UnitClassId | undefined;
  let topCount = 0;
  for (const unitClass of UNIT_CLASS_ORDER) {
    const count = tallies.find((entry) => entry.unitClass === unitClass)?.count ?? 0;
    if (count > topCount) {
      topClass = unitClass;
      topCount = count;
    }
  }
  return topClass;
}

export function roleFromComposition(tallies: readonly UnitClassTally[]): string {
  const topClass = dominantUnitClass(tallies);
  return topClass === undefined ? "" : defaultRoleLabel(topClass);
}

export function classShareFromTally(tallies: readonly UnitClassTally[]): readonly UnitClassShare[] {
  const total = tallies.reduce((sum, { count }) => sum + count, 0);
  return UNIT_CLASS_ORDER.map((unitClass) => {
    const count = tallies.find((entry) => entry.unitClass === unitClass)?.count ?? 0;
    return {
      unitClass,
      count,
      percent: total === 0 ? 0 : (count / total) * 100,
    };
  });
}

export function unitTallyByHouse(
  agents: readonly AgentTallyInput[],
  houseId: string,
  includeDead = false,
): readonly UnitClassTally[] {
  const tally: Record<UnitClassId, number> = {
    spear: 0,
    melee: 0,
    archer: 0,
    skirmisher: 0,
  };
  for (const agent of agents) {
    const { unitClass, isHero: isHeroAgent, state } = agent;
    if (agent.houseId !== houseId || unitClass === undefined || isHeroAgent === true) {
      continue;
    }
    if (!includeDead && state === "dead") {
      continue;
    }
    tally[unitClass] += 1;
  }
  return UNIT_CLASS_ORDER.map((unitClass) => ({ unitClass, count: tally[unitClass] }));
}

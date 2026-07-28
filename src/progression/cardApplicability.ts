import type { Agent } from "../agents/agentTypes";
import { HOUSE_IDS, type HouseId } from "../content/houseConfig";
import type { UnitClassId } from "../content/unitClassConfig";
import type { Hall } from "../engine/engine.types";

const MINIMUM_CLASS_SHARE_PERCENT = 15;

export type CardApplicabilityWarning =
  | {
      readonly kind: "lowClassShare";
      readonly unitClass: UnitClassId;
      readonly sharePercent: number;
    }
  | {
      readonly kind: "deadHero";
      readonly heroId: string;
    }
  | {
      readonly kind: "fallenHouseHall";
      readonly houseId: HouseId;
    };

export interface CardApplicabilityInput {
  readonly card: {
    readonly effect: {
      readonly unitClass?: UnitClassId;
    };
    readonly heroId?: string;
    readonly houseId?: string;
  };
  readonly selectedHouseIds: readonly HouseId[];
  readonly agents: readonly Agent[];
  readonly halls: readonly Hall[];
}

function isHouseId(houseId: string): houseId is HouseId {
  return HOUSE_IDS.some((candidate) => candidate === houseId);
}

function isLivingRegularSelectedAgent(
  agent: Agent,
  selectedHouseIds: readonly HouseId[],
): boolean {
  return (
    !agent.isHero &&
    agent.hp > 0 &&
    agent.state !== "dead" &&
    selectedHouseIds.includes(agent.houseId)
  );
}

function roundedSharePercent(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((count / total) * 10000) / 100;
}

function isBelowMinimumClassShare(count: number, total: number): boolean {
  return total <= 0 || count * 100 < total * MINIMUM_CLASS_SHARE_PERCENT;
}

function classShareWarning({
  agents,
  card,
  selectedHouseIds,
}: CardApplicabilityInput): CardApplicabilityWarning | null {
  const unitClass = card.effect.unitClass;
  if (unitClass === undefined) {
    return null;
  }

  const livingRegulars = agents.filter((agent) =>
    isLivingRegularSelectedAgent(agent, selectedHouseIds),
  );
  const matching = livingRegulars.filter(
    (agent) => agent.unitClass === unitClass,
  );
  const sharePercent = roundedSharePercent(
    matching.length,
    livingRegulars.length,
  );

  return isBelowMinimumClassShare(matching.length, livingRegulars.length)
    ? { kind: "lowClassShare", unitClass, sharePercent }
    : null;
}

function heroWarning({
  agents,
  card,
}: CardApplicabilityInput): CardApplicabilityWarning | null {
  if (card.heroId === undefined) {
    return null;
  }

  const hero = agents.find(
    (agent) => agent.isHero && agent.heroId === card.heroId,
  );
  const heroUnavailable =
    hero !== undefined &&
    (hero.hp <= 0 || hero.state === "dead" || hero.respawnAtTick !== null);

  return heroUnavailable ? { kind: "deadHero", heroId: card.heroId } : null;
}

function hallWarning({
  card,
  halls,
}: CardApplicabilityInput): CardApplicabilityWarning | null {
  if (card.houseId === undefined || !isHouseId(card.houseId)) {
    return null;
  }

  const hall = halls.find((candidate) => candidate.houseId === card.houseId);
  return hall !== undefined && hall.hp <= 0
    ? { kind: "fallenHouseHall", houseId: card.houseId }
    : null;
}

export function cardApplicabilityWarnings(
  input: CardApplicabilityInput,
): readonly CardApplicabilityWarning[] {
  const warnings = [
    classShareWarning(input),
    heroWarning(input),
    hallWarning(input),
  ];
  return warnings.filter(
    (warning): warning is CardApplicabilityWarning => warning !== null,
  );
}

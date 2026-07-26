import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  AgentDamage,
  AgentHeal,
  HousePowerDelta,
  MiracleEvent,
  MiracleOutcome,
  MiracleTargetSnapshot,
  MiracleType,
} from "./divine.types";
import { MIRACLE_DEFINITIONS } from "./miracleTypes";

function distanceBetween(
  event: MiracleEvent,
  target: MiracleTargetSnapshot,
): number {
  return Math.hypot(target.x - event.targetX, target.y - event.targetY);
}

function scaledAmount(maximum: number, distance: number, radius: number): number {
  const factor = Math.min(1, Math.max(0, 1 - distance / radius));
  return Math.round(maximum * factor);
}

export function canCast(
  type: MiracleType,
  divinePower: number,
  cooldownRemaining: number,
): boolean {
  return (
    divinePower >= MIRACLE_DEFINITIONS[type].cost && cooldownRemaining <= 0
  );
}

export function resolveMiracle(
  event: MiracleEvent,
  targets: readonly MiracleTargetSnapshot[],
): MiracleOutcome {
  const definition = MIRACLE_DEFINITIONS[event.type];
  const affected = targets.filter(
    (target) =>
      target.hp > 0 && distanceBetween(event, target) <= definition.radius,
  );
  const damages: AgentDamage[] = [];
  const heals: AgentHeal[] = [];

  for (const target of affected) {
    const distance = distanceBetween(event, target);
    const damage = scaledAmount(
      definition.maxDamage,
      distance,
      definition.radius,
    );
    const heal = scaledAmount(definition.maxHeal, distance, definition.radius);

    if (damage > 0) {
      damages.push({ agentId: target.id, amount: damage });
    }
    if (heal > 0) {
      heals.push({ agentId: target.id, amount: heal });
    }
  }

  damages.sort((first, second) => first.agentId.localeCompare(second.agentId));
  heals.sort((first, second) => first.agentId.localeCompare(second.agentId));

  const housePowerDeltas: HousePowerDelta[] = [];
  if (definition.housePowerDelta !== 0 && affected.length > 0) {
    const counts = new Map<string, number>();
    for (const target of affected) {
      counts.set(target.houseId, (counts.get(target.houseId) ?? 0) + 1);
    }
    const dominantHouse = [...counts.entries()].sort(
      ([firstId, firstCount], [secondId, secondCount]) =>
        secondCount - firstCount || firstId.localeCompare(secondId),
    )[0];
    if (dominantHouse !== undefined) {
      housePowerDeltas.push({
        houseId: dominantHouse[0],
        amount: definition.housePowerDelta,
      });
    }
  }

  return {
    id: `${event.type}_${event.tick}`,
    type: event.type,
    x: event.targetX,
    y: event.targetY,
    radius: definition.radius,
    color: definition.color,
    startTick: event.tick,
    durationTicks: BALANCE_CONFIG.EFFECT_DURATION_TICKS,
    damages,
    heals,
    housePowerDeltas,
  };
}

import type { Rng } from "../content/random";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  Creature,
  DarkMage,
  ThreatEvent,
  ThreatTargetSnapshot,
} from "./threatTypes";

type Point = {
  readonly x: number;
  readonly y: number;
};

type AgentDamage = {
  readonly agentId: string;
  readonly amount: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function distanceSquared(first: Point, second: Point): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

function moveToward(origin: Point, target: Point, speed: number): Point {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance === 0) {
    return { x: origin.x, y: origin.y };
  }

  const travel = Math.min(speed, distance);
  return {
    x: origin.x + (deltaX / distance) * travel,
    y: origin.y + (deltaY / distance) * travel,
  };
}

function findNearestTarget(
  origin: Point,
  targets: readonly ThreatTargetSnapshot[],
): ThreatTargetSnapshot | undefined {
  return [...targets].sort((first, second) => {
    const distanceDifference =
      distanceSquared(origin, first) - distanceSquared(origin, second);
    return distanceDifference === 0
      ? first.id.localeCompare(second.id)
      : distanceDifference;
  })[0];
}

function spawnMage(
  edge: number,
  worldWidth: number,
  worldHeight: number,
  rng: Rng,
): DarkMage {
  const inset = BALANCE_CONFIG.DARK_MAGE_RADIUS;
  if (edge === 0) {
    return {
      x: rng.range(inset, worldWidth - inset),
      y: inset,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
    };
  }
  if (edge === 1) {
    return {
      x: worldWidth - inset,
      y: rng.range(inset, worldHeight - inset),
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
    };
  }
  if (edge === 2) {
    return {
      x: rng.range(inset, worldWidth - inset),
      y: worldHeight - inset,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
    };
  }
  return {
    x: inset,
    y: rng.range(inset, worldHeight - inset),
    hp: BALANCE_CONFIG.DARK_MAGE_HP,
  };
}

export function assignTraitor(
  houseIds: readonly string[],
  rng: Rng,
): string {
  return rng.pick([...houseIds].sort());
}

export function spawnInvasion(
  houseIds: readonly string[],
  worldWidth: number,
  worldHeight: number,
  tick: number,
  rng: Rng,
): ThreatEvent {
  const mage = spawnMage(rng.int(0, 4), worldWidth, worldHeight, rng);
  const traitorHouseId = assignTraitor(houseIds, rng);
  const radius = BALANCE_CONFIG.CREATURE_RADIUS;
  const creatures = Array.from(
    { length: BALANCE_CONFIG.CREATURE_COUNT },
    (_, index): Creature => ({
      id: `creature_${String(index).padStart(2, "0")}`,
      x: clamp(
        mage.x +
          rng.range(
            -BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
            BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
          ),
        radius,
        worldWidth - radius,
      ),
      y: clamp(
        mage.y +
          rng.range(
            -BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
            BALANCE_CONFIG.CREATURE_SPAWN_SPREAD,
          ),
        radius,
        worldHeight - radius,
      ),
      hp: BALANCE_CONFIG.CREATURE_HP,
      lastAttackTick: -1,
    }),
  );

  return {
    type: "dark_mage_invasion",
    startTick: tick,
    traitorHouseId,
    mage,
    creatures,
    engaged: false,
  };
}

export function stepThreat(
  threat: ThreatEvent,
  targets: readonly ThreatTargetSnapshot[],
  tick: number,
): {
  threat: ThreatEvent;
  damages: AgentDamage[];
} {
  const livingTargets = targets.filter(
    (target) => target.hp > 0 && target.state !== "dead",
  );
  const mageTarget =
    livingTargets.length === 0
      ? threat.mage
      : {
          x:
            livingTargets.reduce((sum, target) => sum + target.x, 0) /
            livingTargets.length,
          y:
            livingTargets.reduce((sum, target) => sum + target.y, 0) /
            livingTargets.length,
        };
  const mage = {
    ...threat.mage,
    ...moveToward(
      threat.mage,
      mageTarget,
      BALANCE_CONFIG.DARK_MAGE_SPEED,
    ),
  };
  const damages: AgentDamage[] = [];
  const creatures = threat.creatures.map((creature): Creature => {
    const target = findNearestTarget(creature, livingTargets);
    if (target === undefined) {
      return {
        ...creature,
        ...moveToward(
          creature,
          mage,
          BALANCE_CONFIG.CREATURE_SPEED,
        ),
      };
    }

    const targetDistance = Math.sqrt(distanceSquared(creature, target));
    if (targetDistance > BALANCE_CONFIG.CREATURE_ATTACK_RANGE) {
      return {
        ...creature,
        ...moveToward(
          creature,
          target,
          BALANCE_CONFIG.CREATURE_SPEED,
        ),
      };
    }

    if (
      tick - creature.lastAttackTick <
      BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS
    ) {
      return { ...creature };
    }

    damages.push({
      agentId: target.id,
      amount: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
    });
    return { ...creature, lastAttackTick: tick };
  });
  damages.sort((first, second) =>
    first.agentId.localeCompare(second.agentId),
  );

  return {
    threat: {
      ...threat,
      mage,
      creatures,
      engaged: threat.engaged || damages.length > 0,
    },
    damages,
  };
}

export function applyDamageToThreat(
  threat: ThreatEvent,
  hits: readonly { creatureId: string | null; amount: number }[],
): ThreatEvent {
  const creatureDamage = new Map<string, number>();
  let mageDamage = 0;
  for (const hit of hits) {
    if (hit.creatureId === null) {
      mageDamage += hit.amount;
    } else {
      creatureDamage.set(
        hit.creatureId,
        (creatureDamage.get(hit.creatureId) ?? 0) + hit.amount,
      );
    }
  }

  return {
    ...threat,
    mage: {
      ...threat.mage,
      hp: Math.max(0, threat.mage.hp - mageDamage),
    },
    creatures: threat.creatures
      .map((creature) => ({
        ...creature,
        hp: Math.max(
          0,
          creature.hp - (creatureDamage.get(creature.id) ?? 0),
        ),
      }))
      .filter((creature) => creature.hp > 0),
  };
}

import type { Rng } from "../content/random";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  Creature,
  DarkMage,
  HallSnapshot,
  ThreatEvent,
  ThreatTargetSnapshot,
} from "./threatTypes";
import {
  distanceSquared,
  findNearestById,
  moveToward,
  type Point,
} from "./threatMotion";

export { spawnWave } from "./waveSpawner";

type AgentDamage = {
  readonly agentId: string;
  readonly amount: number;
};

type HallDamage = {
  readonly hallId: string;
  readonly amount: number;
};

function findNearestTarget(
  origin: Point,
  targets: readonly ThreatTargetSnapshot[],
): ThreatTargetSnapshot | undefined {
  return findNearestById(origin, targets);
}

function findNearestHall(
  origin: Point,
  halls: readonly HallSnapshot[],
): HallSnapshot | undefined {
  return findNearestById(origin, halls);
}

export function assignTraitor(
  houseIds: readonly string[],
  rng: Rng,
): string {
  return rng.pick([...houseIds].sort());
}

export function stepThreat(
  threat: ThreatEvent,
  targets: readonly ThreatTargetSnapshot[],
  halls: readonly HallSnapshot[],
  tick: number,
): {
  threat: ThreatEvent;
  agentDamages: AgentDamage[];
  hallDamages: HallDamage[];
} {
  const livingTargets = targets.filter(
    (target) => target.hp > 0 && target.state !== "dead",
  );
  const livingHalls = halls.filter((hall) => hall.hp > 0);
  const agentDamages: AgentDamage[] = [];
  const hallDamages: HallDamage[] = [];
  const creatures = threat.creatures.map((creature): Creature => {
    const target = findNearestTarget(creature, livingTargets);
    if (
      target !== undefined &&
      distanceSquared(creature, target) <=
        BALANCE_CONFIG.CREATURE_AGGRO_RADIUS ** 2
    ) {
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

      agentDamages.push({
        agentId: target.id,
        amount: creature.agentDamage,
      });
      return { ...creature, lastAttackTick: tick };
    }

    const hall = findNearestHall(creature, livingHalls);
    if (hall === undefined) {
      return { ...creature };
    }
    const hallDistance = Math.sqrt(distanceSquared(creature, hall));
    if (
      hallDistance >
      BALANCE_CONFIG.CREATURE_ATTACK_RANGE + BALANCE_CONFIG.HALL_RADIUS
    ) {
      return {
        ...creature,
        ...moveToward(
          creature,
          hall,
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

    hallDamages.push({
      hallId: hall.id,
      amount: creature.hallDamage,
    });
    return { ...creature, lastAttackTick: tick };
  });
  const mage = stepMage(threat.mage, livingHalls, tick, hallDamages);
  agentDamages.sort((first, second) =>
    first.agentId.localeCompare(second.agentId),
  );
  hallDamages.sort((first, second) =>
    first.hallId.localeCompare(second.hallId),
  );

  return {
    threat: {
      ...threat,
      mage,
      creatures,
    },
    agentDamages,
    hallDamages,
  };
}

function stepMage(
  mage: DarkMage | null,
  halls: readonly HallSnapshot[],
  tick: number,
  damages: HallDamage[],
): DarkMage | null {
  if (mage === null) {
    return null;
  }
  if (mage.hp <= 0) {
    return { ...mage };
  }
  const hall = findNearestHall(mage, halls);
  if (hall === undefined) {
    return { ...mage };
  }
  const hallDistance = Math.sqrt(distanceSquared(mage, hall));
  if (
    hallDistance >
    BALANCE_CONFIG.CREATURE_ATTACK_RANGE + BALANCE_CONFIG.HALL_RADIUS
  ) {
    return {
      ...mage,
      ...moveToward(mage, hall, BALANCE_CONFIG.DARK_MAGE_SPEED),
    };
  }
  if (
    tick - mage.lastAttackTick <
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS
  ) {
    return { ...mage };
  }

  damages.push({ hallId: hall.id, amount: mage.hallDamage });
  return { ...mage, lastAttackTick: tick };
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
    mage:
      threat.mage === null
        ? null
        : {
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

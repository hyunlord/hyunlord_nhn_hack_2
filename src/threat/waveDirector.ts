import type { Rng } from "../content/random";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  Creature,
  DarkMage,
  HallSnapshot,
  StructureSnapshot,
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

type StructureDamage = {
  readonly structureId: string;
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

export function assignTraitor<T extends string>(
  houseIds: readonly T[],
  rng: Rng,
): T {
  return rng.pick([...houseIds].sort());
}

export function stepThreat(
  threat: ThreatEvent,
  targets: readonly ThreatTargetSnapshot[],
  halls: readonly HallSnapshot[],
  tick: number,
  structures: readonly StructureSnapshot[] = [],
): {
  threat: ThreatEvent;
  agentDamages: AgentDamage[];
  hallDamages: HallDamage[];
  structureDamages: StructureDamage[];
} {
  const livingTargets = targets.filter(
    (target) => target.hp > 0 && target.state !== "dead",
  );
  const livingHalls = halls.filter((hall) => hall.hp > 0);
  const agentDamages: AgentDamage[] = [];
  const hallDamages: HallDamage[] = [];
  const structureDamages: StructureDamage[] = [];
  const livingObjectives = [
    ...livingHalls.map((hall) => ({
      ...hall,
      radius: BALANCE_CONFIG.HALL_RADIUS,
      kind: "hall" as const,
    })),
    ...structures
      .filter(({ hp }) => hp > 0)
      .map((structure) => ({
        ...structure,
        kind: "structure" as const,
      })),
  ];
  const creatures = threat.creatures.map((creature): Creature => {
    const target = findNearestTarget(creature, livingTargets);
    if (
      target !== undefined &&
      distanceSquared(creature, target) <=
        BALANCE_CONFIG.CREATURE_AGGRO_RADIUS ** 2
    ) {
      const targetDistance = Math.sqrt(distanceSquared(creature, target));
      if (targetDistance > BALANCE_CONFIG.CREATURE_ATTACK_RANGE) {
        if (tick < creature.haltedUntilTick) {
          return { ...creature };
        }
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

    const objective = findNearestById(creature, livingObjectives);
    if (objective === undefined) {
      return { ...creature };
    }
    const objectiveDistance = Math.sqrt(
      distanceSquared(creature, objective),
    );
    if (
      objectiveDistance >
      BALANCE_CONFIG.CREATURE_ATTACK_RANGE + objective.radius
    ) {
      if (tick < creature.haltedUntilTick) {
        return { ...creature };
      }
      return {
        ...creature,
        ...moveToward(
          creature,
          objective,
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

    if (objective.kind === "hall") {
      hallDamages.push({
        hallId: objective.id,
        amount: creature.hallDamage,
      });
    } else {
      structureDamages.push({
        structureId: objective.id,
        amount: creature.hallDamage,
      });
    }
    return { ...creature, lastAttackTick: tick };
  });
  const mage = stepMage(threat.mage, livingHalls, tick, hallDamages);
  agentDamages.sort((first, second) =>
    first.agentId.localeCompare(second.agentId),
  );
  hallDamages.sort((first, second) =>
    first.hallId.localeCompare(second.hallId),
  );
  structureDamages.sort((first, second) =>
    first.structureId.localeCompare(second.structureId),
  );

  return {
    threat: {
      ...threat,
      mage,
      creatures,
    },
    agentDamages,
    hallDamages,
    structureDamages,
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

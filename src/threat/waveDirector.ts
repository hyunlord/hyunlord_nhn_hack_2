import type { Rng } from "../content/random";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  Creature,
  DarkMage,
  DefenseStructureId,
  DefenseStructureSnapshot,
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

type DefenseStructureDamage = {
  readonly structureId: DefenseStructureId;
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

export function assignTraitor<T extends string>(
  houseIds: readonly T[],
  rng: Rng,
): T {
  return rng.pick([...houseIds].sort());
}

export function stepThreat(
  threat: ThreatEvent,
  targets: readonly ThreatTargetSnapshot[],
  defenseStructures: readonly DefenseStructureSnapshot[],
  tick: number,
  structures: readonly StructureSnapshot[] = [],
): {
  threat: ThreatEvent;
  agentDamages: AgentDamage[];
  defenseStructureDamages: DefenseStructureDamage[];
  structureDamages: StructureDamage[];
} {
  const livingTargets = targets.filter(
    (target) => target.hp > 0 && target.state !== "dead",
  );
  const livingDefenseStructures = defenseStructures.filter(
    (structure) => structure.hp > 0,
  );
  const agentDamages: AgentDamage[] = [];
  const defenseStructureDamages: DefenseStructureDamage[] = [];
  const structureDamages: StructureDamage[] = [];
  const livingObjectives = [
    ...livingDefenseStructures,
    ...structures
      .filter(({ hp }) => hp > 0)
      .map((structure) => ({
        ...structure,
        kind: "tower" as const,
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

    if (objective.kind === "tower") {
      structureDamages.push({
        structureId: objective.id,
        amount: creature.structureDamage,
      });
    } else {
      defenseStructureDamages.push({
        structureId: objective.id,
        amount: creature.structureDamage,
      });
    }
    return { ...creature, lastAttackTick: tick };
  });
  const mage = stepMage(
    threat.mage,
    livingDefenseStructures,
    tick,
    defenseStructureDamages,
  );
  agentDamages.sort((first, second) =>
    first.agentId.localeCompare(second.agentId),
  );
  defenseStructureDamages.sort((first, second) =>
    first.structureId.localeCompare(second.structureId),
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
    defenseStructureDamages,
    structureDamages,
  };
}

function stepMage(
  mage: DarkMage | null,
  defenseStructures: readonly DefenseStructureSnapshot[],
  tick: number,
  damages: DefenseStructureDamage[],
): DarkMage | null {
  if (mage === null) {
    return null;
  }
  if (mage.hp <= 0) {
    return { ...mage };
  }
  const objective = findNearestById(mage, defenseStructures);
  if (objective === undefined) {
    return { ...mage };
  }
  const objectiveDistance = Math.sqrt(distanceSquared(mage, objective));
  if (
    objectiveDistance >
    BALANCE_CONFIG.CREATURE_ATTACK_RANGE + objective.radius
  ) {
    return {
      ...mage,
      ...moveToward(mage, objective, BALANCE_CONFIG.DARK_MAGE_SPEED),
    };
  }
  if (
    tick - mage.lastAttackTick <
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS
  ) {
    return { ...mage };
  }

  damages.push({
    structureId: objective.id,
    amount: mage.structureDamage,
  });
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

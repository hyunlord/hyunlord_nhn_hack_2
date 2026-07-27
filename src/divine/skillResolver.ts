import { DIVINE_SKILL_DEFINITIONS } from "../content/skillConfig";
import type {
  DivineSkillEvent,
  DivineSkillId,
} from "./skillTypes";

export interface SkillEnemySnapshot {
  readonly id: string;
  readonly kind: "creature" | "mage";
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export interface SkillTowerSnapshot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export interface SkillAgentSnapshot {
  readonly id: string;
  readonly houseId: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly isHero: boolean;
}

export interface SkillHallSnapshot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

export interface SkillTargetSnapshot {
  readonly enemies: readonly SkillEnemySnapshot[];
  readonly towers: readonly SkillTowerSnapshot[];
  readonly agents: readonly SkillAgentSnapshot[];
  readonly halls: readonly SkillHallSnapshot[];
}

export interface SkillOutcome {
  readonly id: string;
  readonly type: DivineSkillId;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly startTick: number;
  readonly durationTicks: number;
  readonly enemyDamages: readonly {
    readonly enemyId: string;
    readonly amount: number;
  }[];
  readonly towerDamages: readonly {
    readonly towerId: string;
    readonly amount: number;
  }[];
  readonly agentHeals: readonly {
    readonly agentId: string;
    readonly amount: number;
  }[];
  readonly breakImmunities: readonly {
    readonly agentId: string;
    readonly untilTick: number;
  }[];
  readonly creatureHalts: readonly {
    readonly creatureId: string;
    readonly untilTick: number;
  }[];
  readonly regularRevives: readonly {
    readonly agentId: string;
    readonly hallId: string;
  }[];
  readonly heroRevives: readonly string[];
}

type Point = { readonly x: number; readonly y: number };

function distanceToEvent(point: Point, event: DivineSkillEvent): number {
  return Math.hypot(
    point.x - event.targetX,
    point.y - event.targetY,
  );
}

export function canCastSkill(
  skillId: DivineSkillId,
  unlocked: readonly DivineSkillId[],
  divinePower: number,
  cooldown: number,
  costMultiplier = 1,
): boolean {
  return (
    unlocked.includes(skillId) &&
    cooldown <= 0 &&
    divinePower >=
      DIVINE_SKILL_DEFINITIONS[skillId].cost * costMultiplier
  );
}

function emptyOutcome(event: DivineSkillEvent): SkillOutcome {
  const definition = DIVINE_SKILL_DEFINITIONS[event.type];
  return {
    id: `${event.type}_${event.tick}`,
    type: event.type,
    x: event.targetX,
    y: event.targetY,
    radius: definition.radius,
    color: definition.color,
    startTick: event.tick,
    durationTicks: 24,
    enemyDamages: [],
    towerDamages: [],
    agentHeals: [],
    breakImmunities: [],
    creatureHalts: [],
    regularRevives: [],
    heroRevives: [],
  };
}

function resurgenceRevives(
  snapshot: SkillTargetSnapshot,
): Pick<SkillOutcome, "regularRevives" | "heroRevives"> {
  const halls = [...snapshot.halls]
    .filter(({ hp }) => hp > 0)
    .sort((first, second) => first.id.localeCompare(second.id));
  const deadRegularsByHouse = new Map(
    halls.map(({ id }) => [
      id,
      snapshot.agents
        .filter(
          (agent) =>
            !agent.isHero && agent.hp <= 0 && agent.houseId === id,
        )
        .sort((first, second) => first.id.localeCompare(second.id)),
    ]),
  );
  const regularRevives: { agentId: string; hallId: string }[] = [];
  while (regularRevives.length < 8) {
    let revivedThisRound = false;
    for (const hall of halls) {
      const queue = deadRegularsByHouse.get(hall.id);
      const agent = queue?.shift();
      if (agent === undefined) {
        continue;
      }
      regularRevives.push({ agentId: agent.id, hallId: hall.id });
      revivedThisRound = true;
      if (regularRevives.length === 8) {
        break;
      }
    }
    if (!revivedThisRound) {
      break;
    }
  }
  return {
    regularRevives,
    heroRevives: snapshot.agents
      .filter(({ isHero, hp }) => isHero && hp <= 0)
      .map(({ id }) => id)
      .sort(),
  };
}

export function resolveSkill(
  event: DivineSkillEvent,
  snapshot: SkillTargetSnapshot,
): SkillOutcome {
  const base = emptyOutcome(event);
  const definition = DIVINE_SKILL_DEFINITIONS[event.type];
  switch (event.type) {
    case "meteor_fall":
      return {
        ...base,
        enemyDamages: snapshot.enemies
          .filter(
            (enemy) =>
              enemy.hp > 0 &&
              distanceToEvent(enemy, event) <= definition.radius,
          )
          .map((enemy) => ({
            enemyId: enemy.id,
            amount:
              140 *
              Math.max(
                0,
                1 - distanceToEvent(enemy, event) / definition.radius,
              ),
          }))
          .sort((first, second) =>
            first.enemyId.localeCompare(second.enemyId),
          ),
        towerDamages: snapshot.towers
          .filter(
            (tower) =>
              tower.hp > 0 &&
              distanceToEvent(tower, event) <= definition.radius,
          )
          .map(({ id }) => ({ towerId: id, amount: 40 }))
          .sort((first, second) =>
            first.towerId.localeCompare(second.towerId),
          ),
      };
    case "sanctuary": {
      const affected = snapshot.agents
        .filter(
          (agent) =>
            agent.hp > 0 &&
            distanceToEvent(agent, event) <= definition.radius,
        )
        .sort((first, second) => first.id.localeCompare(second.id));
      return {
        ...base,
        agentHeals: affected.map(({ id }) => ({
          agentId: id,
          amount: 60,
        })),
        breakImmunities: affected.map(({ id }) => ({
          agentId: id,
          untilTick: event.tick + 200,
        })),
      };
    }
    case "chains_of_dusk": {
      const affected = snapshot.enemies
        .filter(
          (enemy) =>
            enemy.hp > 0 &&
            distanceToEvent(enemy, event) <= definition.radius,
        )
        .sort((first, second) => first.id.localeCompare(second.id));
      return {
        ...base,
        enemyDamages: affected.map(({ id }) => ({
          enemyId: id,
          amount: 20,
        })),
        creatureHalts: affected
          .filter(({ kind }) => kind === "creature")
          .map(({ id }) => ({
            creatureId: id,
            untilTick: event.tick + 120,
          })),
      };
    }
    case "resurgence":
      return {
        ...base,
        x: 480,
        y: 300,
        radius: 480,
        ...resurgenceRevives(snapshot),
      };
  }
}

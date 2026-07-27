import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { DIVINE_SKILL_DEFINITIONS } from "../src/content/skillConfig";
import type { DivineSkillId } from "../src/divine/skillTypes";
import type { GameState } from "../src/engine/engine.types";
import { castSkill } from "../src/engine/skillApplication";

type Point = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

function enemyPoints(state: GameState): Point[] {
  if (state.activeThreat === null) {
    return [];
  }
  return [
    ...state.activeThreat.creatures.map(({ id, x, y }) => ({ id, x, y })),
    ...(state.activeThreat.mage === null
      ? []
      : [{
          id: "mage",
          x: state.activeThreat.mage.x,
          y: state.activeThreat.mage.y,
        }]),
  ].sort((first, second) => first.id.localeCompare(second.id));
}

function largestEnemyCluster(
  state: GameState,
  radius: number,
): Point | null {
  const points = enemyPoints(state);
  let best: Point | null = null;
  let bestCount = -1;
  for (const point of points) {
    const count = points.filter(
      (candidate) =>
        Math.hypot(candidate.x - point.x, candidate.y - point.y) <=
        radius,
    ).length;
    if (count > bestCount) {
      best = point;
      bestCount = count;
    }
  }
  return best;
}

export type AutoSkillResult = {
  readonly state: GameState;
  readonly castSkillId: DivineSkillId | null;
};

export function castFirstAvailableSkill(
  state: GameState,
): AutoSkillResult {
  if (state.phase !== "wave") {
    return { state, castSkillId: null };
  }
  for (const skillId of state.unlockedSkills) {
    const definition = DIVINE_SKILL_DEFINITIONS[skillId];
    const target = definition.targeted
      ? largestEnemyCluster(state, definition.radius)
      : {
          id: "field",
          x: BALANCE_CONFIG.WORLD_WIDTH / 2,
          y: BALANCE_CONFIG.WORLD_HEIGHT / 2,
        };
    if (target === null) {
      continue;
    }
    const cast = castSkill(state, {
      type: skillId,
      targetX: target.x,
      targetY: target.y,
      tick: state.tick,
    });
    if (cast !== state) {
      return { state: cast, castSkillId: skillId };
    }
  }
  return { state, castSkillId: null };
}

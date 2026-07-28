import { DIVINE_SKILL_DEFINITIONS } from "../content/skillConfig";
import type { DivineSkillEvent } from "../divine/skillTypes";
import {
  canCastSkill,
  resolveSkill,
  type SkillTargetSnapshot,
} from "../divine/skillResolver";
import type { DefenseStructureId } from "../threat/threatTypes";
import { applyDamageToThreat } from "../threat/waveDirector";
import { applyTowerDamages } from "./combatDamage";
import type { GameState } from "./engine.types";
import {
  maxHpForAgent,
  respawnHeroNow,
} from "./heroEngine";
import {
  divineModifiersForState,
  modifiersForAgent,
} from "./progressionEngine";

function targetSnapshot(state: GameState): SkillTargetSnapshot {
  return {
    enemies: state.activeThreat === null
      ? []
      : [
          ...state.activeThreat.creatures.map(
            ({ id, x, y, hp }) => ({
              id,
              kind: "creature" as const,
              x,
              y,
              hp,
            }),
          ),
          ...(state.activeThreat.mage === null
            ? []
            : [{
                id: "mage",
                kind: "mage" as const,
                x: state.activeThreat.mage.x,
                y: state.activeThreat.mage.y,
                hp: state.activeThreat.mage.hp,
              }]),
        ],
    towers: state.towers,
    agents: state.agents,
    keep: {
      id: "keep",
      x: state.keep.x,
      y: state.keep.y,
      hp: state.keep.hp,
    },
    banners: state.banners.map((banner) => ({
      id: `banner:${banner.houseId}`,
      houseId: banner.houseId,
      x: banner.x,
      y: banner.y,
      hp: banner.hp,
    })),
  };
}

function revivalPoint(
  state: GameState,
  structureId: DefenseStructureId,
): { readonly x: number; readonly y: number } | null {
  if (structureId === "keep") {
    return state.keep.hp > 0 ? state.keep : null;
  }
  const banner = state.banners.find(
    (candidate) =>
      `banner:${candidate.houseId}` === structureId && candidate.hp > 0,
  );
  return banner ?? null;
}

export function castSkill(
  state: GameState,
  event: DivineSkillEvent,
): GameState {
  if (state.phase !== "preparation" && state.phase !== "wave") {
    return state;
  }
  const modifiers = divineModifiersForState(state);
  if (
    !canCastSkill(
      event.type,
      state.unlockedSkills,
      state.divinePower,
      state.skillCooldowns[event.type],
      modifiers.divineCostMultiplier,
    )
  ) {
    return state;
  }

  const definition = DIVINE_SKILL_DEFINITIONS[event.type];
  const outcome = resolveSkill(event, targetSnapshot(state));
  const damageHits = outcome.enemyDamages.map(
    ({ enemyId, amount }) => ({
      creatureId: enemyId === "mage" ? null : enemyId,
      amount,
    }),
  );
  const halts = new Map(
    outcome.creatureHalts.map(({ creatureId, untilTick }) => [
      creatureId,
      untilTick,
    ]),
  );
  const damagedThreat =
    state.activeThreat === null
      ? null
      : applyDamageToThreat(state.activeThreat, damageHits);
  const activeThreat =
    damagedThreat === null
      ? null
      : {
          ...damagedThreat,
          creatures: damagedThreat.creatures.map((creature) => ({
            ...creature,
            haltedUntilTick: Math.max(
              creature.haltedUntilTick,
              halts.get(creature.id) ?? -1,
            ),
          })),
        };
  const towerDamage = applyTowerDamages(
    state.towers,
    outcome.towerDamages.map(({ towerId, amount }) => ({
      structureId: towerId,
      amount,
    })),
    state.tick,
  );
  const heals = new Map(
    outcome.agentHeals.map(({ agentId, amount }) => [agentId, amount]),
  );
  const immunities = new Map(
    outcome.breakImmunities.map(({ agentId, untilTick }) => [
      agentId,
      untilTick,
    ]),
  );
  const regularRevives = new Map(
    outcome.regularRevives.map(({ agentId, structureId }) => [
      agentId,
      structureId,
    ]),
  );
  const heroRevives = new Set(outcome.heroRevives);
  let agents = state.agents.map((agent) => {
    const structureId = regularRevives.get(agent.id);
    if (structureId !== undefined) {
      const point = revivalPoint(state, structureId);
      if (point !== null) {
        return {
          ...agent,
          x: point.x,
          y: point.y,
          hp: maxHpForAgent(
            agent,
            modifiersForAgent(state, agent),
          ),
          state: "idle" as const,
          lastDamagedTick: -1,
          lastAttackTick: state.tick,
        };
      }
    }
    const heal = heals.get(agent.id);
    const immunity = immunities.get(agent.id);
    if (heal === undefined && immunity === undefined) {
      return agent;
    }
    return {
      ...agent,
      hp:
        heal === undefined
          ? agent.hp
          : Math.max(
              agent.hp,
              Math.min(
                maxHpForAgent(
                  agent,
                  modifiersForAgent(state, agent),
                ),
                agent.hp + heal,
              ),
            ),
      breakImmuneUntilTick: Math.max(
        agent.breakImmuneUntilTick,
        immunity ?? -1,
      ),
    };
  });
  if (heroRevives.size > 0) {
    agents = agents.map((agent) =>
      heroRevives.has(agent.id)
        ? respawnHeroNow(
            agent,
            state.keep,
            state.banners,
            [{
              agentId: agent.id,
              houseId: agent.houseId,
              modifiers: modifiersForAgent(state, agent),
            }],
            state.tick,
          )
        : agent,
    );
  }

  return {
    ...state,
    agents,
    activeThreat,
    towers: towerDamage.towers,
    towerRubble: [...state.towerRubble, ...towerDamage.destroyed],
    divinePower:
      state.divinePower -
      definition.cost * modifiers.divineCostMultiplier,
    skillCooldowns: {
      ...state.skillCooldowns,
      [event.type]: definition.cooldownTicks,
    },
    activeEffects: [...state.activeEffects, outcome],
  };
}

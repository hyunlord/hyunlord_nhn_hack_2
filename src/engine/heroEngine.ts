import type { Agent } from "../agents/agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import {
  HERO_DEFINITIONS,
  type HeroDefinition,
} from "../content/heroConfig";
import type { ResolvedModifiers } from "../progression/modifiers";
import type { Hall } from "./engine.types";

type ModifierEntry = {
  readonly houseId: string;
  readonly modifiers: ResolvedModifiers;
};

export interface AgentCombatBonus {
  readonly damageMultiplier: number;
  readonly attackIntervalMultiplier: number;
  readonly onKillHeal: number;
  readonly onKillHealRadius: number;
}

function definitionForAgent(agent: Agent): HeroDefinition | null {
  if (!agent.isHero || agent.heroId === null) {
    return null;
  }
  return HERO_DEFINITIONS.find(({ id }) => id === agent.heroId) ?? null;
}

function modifiersForAgent(
  agent: Agent,
  entries: readonly ModifierEntry[],
): ResolvedModifiers {
  const modifiers = entries.find(
    ({ houseId }) => houseId === agent.houseId,
  )?.modifiers;
  if (modifiers === undefined) {
    throw new RangeError(`Missing modifiers for ${agent.houseId}.`);
  }
  return modifiers;
}

export function maxHpForAgent(
  agent: Agent,
  modifiers: ResolvedModifiers,
): number {
  const hero = definitionForAgent(agent);
  const heroMultiplier =
    hero === null
      ? 1
      : hero.hpMultiplier * modifiers.heroMaxHpMultiplier;
  return Math.round(
    (BALANCE_CONFIG.INITIAL_HP + modifiers.maxHpBonus) *
      heroMultiplier,
  );
}

export function heroMaxHpMultiplierForAgent(agent: Agent): number {
  return definitionForAgent(agent)?.hpMultiplier ?? 1;
}

export function movementMultiplierForAgent(agent: Agent): number {
  return definitionForAgent(agent)?.moveSpeedMultiplier ?? 1;
}

function auraRadius(
  agent: Agent,
  modifiers: ResolvedModifiers,
): number {
  const hero = definitionForAgent(agent);
  return hero === null
    ? 0
    : hero.auraRadius + modifiers.heroAuraRadiusBonus;
}

function distanceSquared(first: Agent, second: Agent): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

export function combatBonusesForAgents(
  agents: readonly Agent[],
  modifiersByHouse: readonly ModifierEntry[],
  runAttackDamageMultiplier: number,
): ReadonlyMap<string, AgentCombatBonus> {
  const auraSources = agents
    .filter((agent) => {
      if (!agent.isHero || agent.hp <= 0) {
        return false;
      }
      const modifiers = modifiersForAgent(agent, modifiersByHouse);
      return auraRadius(agent, modifiers) > 0;
    })
    .sort((first, second) => first.id.localeCompare(second.id));
  return new Map(
    agents.map((agent) => {
      const modifiers = modifiersForAgent(agent, modifiersByHouse);
      const hero = definitionForAgent(agent);
      const auraMultiplier = auraSources.reduce((strongest, source) => {
        if (source.id === agent.id) {
          return strongest;
        }
        const sourceModifiers = modifiersForAgent(
          source,
          modifiersByHouse,
        );
        const radius = auraRadius(source, sourceModifiers);
        const sourceHero = definitionForAgent(source);
        return sourceHero !== null &&
          distanceSquared(agent, source) <= radius ** 2
          ? Math.max(strongest, sourceHero.auraDamageMultiplier)
          : strongest;
      }, 1);
      return [
        agent.id,
        {
          damageMultiplier:
            runAttackDamageMultiplier *
            auraMultiplier *
            (hero === null
              ? 1
              : hero.damageMultiplier *
                modifiers.heroDamageMultiplier),
          attackIntervalMultiplier:
            hero?.attackIntervalMultiplier ?? 1,
          onKillHeal:
            hero === null ? 0 : modifiers.heroOnKillHeal,
          onKillHealRadius:
            hero === null ? 0 : auraRadius(agent, modifiers),
        },
      ] as const;
    }),
  );
}

export function heroRespawnTicksForAgent(
  agent: Agent,
  modifiers: ResolvedModifiers,
): number {
  return Math.max(
    1,
    Math.round(
      BALANCE_CONFIG.HERO_RESPAWN_TICKS *
        (definitionForAgent(agent) === null
          ? 1
          : modifiers.heroRespawnTicksMultiplier),
    ),
  );
}

export function scheduleHeroDeath(
  agent: Agent,
  tick: number,
  modifiers: ResolvedModifiers,
): Agent {
  if (!agent.isHero) {
    return { ...agent, respawnAtTick: null };
  }
  return {
    ...agent,
    respawnAtTick: tick + heroRespawnTicksForAgent(agent, modifiers),
  };
}

function nearestSurvivingHall(
  agent: Agent,
  halls: readonly Hall[],
): Hall | null {
  const ownHall = halls.find(
    ({ houseId, hp }) => houseId === agent.houseId && hp > 0,
  );
  if (ownHall !== undefined) {
    return ownHall;
  }
  return [...halls]
    .filter(({ hp }) => hp > 0)
    .sort((first, second) => {
      const firstDistance =
        (agent.x - first.x) ** 2 + (agent.y - first.y) ** 2;
      const secondDistance =
        (agent.x - second.x) ** 2 + (agent.y - second.y) ** 2;
      return (
        firstDistance - secondDistance ||
        first.houseId.localeCompare(second.houseId)
      );
    })[0] ?? null;
}

export function respawnHeroes(
  agents: Agent[],
  halls: readonly Hall[],
  modifiersByHouse: readonly ModifierEntry[],
  tick: number,
): Agent[] {
  let changed = false;
  const next = agents.map((agent) => {
    if (
      !agent.isHero ||
      agent.hp > 0 ||
      agent.respawnAtTick === null ||
      tick < agent.respawnAtTick
    ) {
      return agent;
    }
    const hall = nearestSurvivingHall(agent, halls);
    if (hall === null) {
      return agent;
    }
    changed = true;
    return {
      ...agent,
      x: hall.x,
      y: hall.y,
      hp: maxHpForAgent(
        agent,
        modifiersForAgent(agent, modifiersByHouse),
      ),
      state: "idle" as const,
      respawnAtTick: null,
      lastDamagedTick: -1,
      lastAttackTick: tick,
    };
  });
  return changed ? next : agents;
}

export function respawnHeroNow(
  agent: Agent,
  halls: readonly Hall[],
  modifiersByHouse: readonly ModifierEntry[],
  tick: number,
): Agent {
  if (!agent.isHero || agent.hp > 0) {
    return agent;
  }
  return respawnHeroes(
    [{ ...agent, respawnAtTick: tick }],
    halls,
    modifiersByHouse,
    tick,
  )[0] ?? agent;
}

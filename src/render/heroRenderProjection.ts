import type { Agent, House } from "../agents/agentTypes";
import { HERO_DEFINITIONS } from "../content/heroConfig";
import type { GameState } from "../engine/engine.types";
import { maxHpForAgent } from "../engine/heroEngine";
import { modifiersForAgent } from "../engine/progressionEngine";

interface HeroPoint {
  readonly x: number;
  readonly y: number;
}

export interface HeroFallSite extends HeroPoint {
  readonly heroId: string;
  readonly houseId: string;
  readonly fallenTick: number;
  readonly respawnAtTick: number | null;
}

export interface HeroRenderTracker {
  readonly previousLivingByHeroId: ReadonlyMap<string, HeroPoint>;
  readonly fallSitesByHeroId: ReadonlyMap<string, HeroFallSite>;
}

export interface LivingHeroRenderProjection {
  readonly agent: Agent;
  readonly auraRadius: number;
  readonly houseColor: string;
  readonly maxHp: number;
}

export interface FallenHeroRenderProjection extends HeroFallSite {
  readonly houseColor: string;
  readonly respawnTicksRemaining: number;
}

export interface HeroRenderProjection {
  readonly tracker: HeroRenderTracker;
  readonly livingHeroes: readonly LivingHeroRenderProjection[];
  readonly fallenHeroes: readonly FallenHeroRenderProjection[];
}

export function createHeroRenderTracker(): HeroRenderTracker {
  return {
    previousLivingByHeroId: new Map(),
    fallSitesByHeroId: new Map(),
  };
}

function colorForHouse(houses: readonly House[], houseId: string): string | null {
  return houses.find(({ id }) => id === houseId)?.color ?? null;
}

function effectiveAuraRadius(state: GameState, hero: Agent): number {
  const definition = HERO_DEFINITIONS.find(({ id }) => id === hero.heroId);
  if (definition === undefined) {
    return 0;
  }
  return definition.auraRadius + modifiersForAgent(state, hero).heroAuraRadiusBonus;
}

function liveProjection(
  state: GameState,
  hero: Agent,
): LivingHeroRenderProjection | null {
  const color = colorForHouse(state.houses, hero.houseId);
  if (color === null) {
    return null;
  }
  return {
    agent: hero,
    auraRadius: effectiveAuraRadius(state, hero),
    houseColor: color,
    maxHp: maxHpForAgent(hero, modifiersForAgent(state, hero)),
  };
}

function fallSiteForHero(
  hero: Agent,
  tick: number,
  tracker: HeroRenderTracker,
): HeroFallSite | null {
  if (hero.heroId === null) {
    return null;
  }
  const existing = tracker.fallSitesByHeroId.get(hero.heroId);
  if (existing !== undefined) {
    return { ...existing, respawnAtTick: hero.respawnAtTick };
  }
  const previous = tracker.previousLivingByHeroId.get(hero.heroId);
  if (previous === undefined) {
    return null;
  }
  return {
    heroId: hero.heroId,
    houseId: hero.houseId,
    x: previous.x,
    y: previous.y,
    fallenTick: tick,
    respawnAtTick: hero.respawnAtTick,
  };
}

export function projectHeroRenderState(
  state: GameState,
  tracker: HeroRenderTracker,
): HeroRenderProjection {
  const previousLivingByHeroId = new Map(tracker.previousLivingByHeroId);
  const fallSitesByHeroId = new Map<string, HeroFallSite>();
  const livingHeroes: LivingHeroRenderProjection[] = [];
  const fallenHeroes: FallenHeroRenderProjection[] = [];

  for (const hero of state.agents.filter(({ isHero }) => isHero)) {
    if (hero.heroId === null) {
      continue;
    }
    if (hero.hp > 0) {
      previousLivingByHeroId.set(hero.heroId, { x: hero.x, y: hero.y });
      const projected = liveProjection(state, hero);
      if (projected !== null) {
        livingHeroes.push(projected);
      }
      continue;
    }
    const site = fallSiteForHero(hero, state.tick, tracker);
    if (site === null) {
      continue;
    }
    fallSitesByHeroId.set(hero.heroId, site);
    const color = colorForHouse(state.houses, hero.houseId);
    if (color !== null) {
      fallenHeroes.push({
        ...site,
        houseColor: color,
        respawnTicksRemaining: Math.max(
          0,
          (hero.respawnAtTick ?? state.tick) - state.tick,
        ),
      });
    }
  }

  return {
    tracker: { previousLivingByHeroId, fallSitesByHeroId },
    livingHeroes,
    fallenHeroes,
  };
}

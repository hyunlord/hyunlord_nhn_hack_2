import type { Agent, House } from "../agents/agentTypes";
import { HERO_DEFINITIONS } from "../content/heroConfig";
import type { GameState } from "../engine/engine.types";
import { battleLineRoleForAgent, maxHpForAgent } from "../engine/heroEngine";
import { modifiersForAgent } from "../engine/progressionEngine";

interface HeroPoint { readonly x: number; readonly y: number }

export interface HeroFallSite extends HeroPoint {
  readonly heroId: string;
  readonly houseId: string;
  readonly fallenTick: number;
  readonly respawnAtTick: number | null;
}

export interface HeroFrontArc { readonly direction: HeroPoint; readonly targetId: string }
export interface HeroAuraPulse { readonly radius: number; readonly alpha: number }

export interface HeroRenderTracker {
  readonly runSeed: number | null;
  readonly previousLivingByHeroId: ReadonlyMap<string, HeroPoint>;
  readonly fallSitesByHeroId: ReadonlyMap<string, HeroFallSite>;
  readonly trailsByHeroId: ReadonlyMap<string, readonly HeroPoint[]>;
}

export interface LivingHeroRenderProjection {
  readonly agent: Agent;
  readonly auraRadius: number;
  readonly auraPulse: HeroAuraPulse | null;
  readonly frontArc: HeroFrontArc | null;
  readonly houseColor: string;
  readonly maxHp: number;
  readonly trail: readonly HeroPoint[];
}

export interface FallenHeroRenderProjection extends HeroFallSite {
  readonly houseColor: string;
  readonly respawnTicksRemaining: number;
}

export interface HeroRenderProjection {
  readonly tracker: HeroRenderTracker;
  readonly livingHeroes: readonly LivingHeroRenderProjection[];
  readonly fallenHeroes: readonly FallenHeroRenderProjection[];
  readonly brightenedAgentIds: readonly string[];
}

const SERA_HERO_ID = "hero_ashvale";
const SERA_TRAIL_LIMIT = 6;
const IVY_PULSE_TICKS = 45;
const IVY_PULSE_SPREAD = 10;
const IVY_PULSE_BASE = 6;

export function createHeroRenderTracker(): HeroRenderTracker {
  return { runSeed: null, previousLivingByHeroId: new Map(), fallSitesByHeroId: new Map(), trailsByHeroId: new Map() };
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

function distanceSquared(first: HeroPoint, second: HeroPoint): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function samePoint(first: HeroPoint, second: HeroPoint): boolean {
  return first.x === second.x && first.y === second.y;
}

function appendTrail(current: readonly HeroPoint[] | undefined, point: HeroPoint): readonly HeroPoint[] {
  const previous = current?.at(-1);
  if (previous !== undefined && samePoint(previous, point)) {
    return current ?? [];
  }
  return [...(current ?? []), point].slice(-SERA_TRAIL_LIMIT);
}

function tracksTrail(hero: Agent): boolean {
  return hero.heroId === SERA_HERO_ID && battleLineRoleForAgent(hero) === "outer_forward";
}

function livingTrackerForRun(
  state: GameState,
  tracker: HeroRenderTracker,
): HeroRenderTracker {
  return tracker.runSeed === state.runSeed
    ? tracker
    : createHeroRenderTracker();
}

function threatPoints(state: GameState): readonly (HeroPoint & { readonly id: string })[] {
  if (state.activeThreat === null) {
    return [];
  }
  const mage = state.activeThreat.mage === null
    ? []
    : [{ id: "dark_mage", x: state.activeThreat.mage.x, y: state.activeThreat.mage.y }];
  return [
    ...state.activeThreat.creatures.map(({ id, x, y }) => ({ id, x, y })),
    ...mage,
  ];
}

function nearestThreat(
  state: GameState,
  hero: Agent,
): (HeroPoint & { readonly id: string }) | null {
  return [...threatPoints(state)].sort((first, second) => {
    const delta = distanceSquared(first, hero) - distanceSquared(second, hero);
    return delta === 0 ? first.id.localeCompare(second.id) : delta;
  })[0] ?? null;
}

function frontArcForHero(state: GameState, hero: Agent): HeroFrontArc | null {
  if (battleLineRoleForAgent(hero) !== "spear_guard") {
    return null;
  }
  const threat = nearestThreat(state, hero);
  if (threat === null) {
    return null;
  }
  const deltaX = threat.x - hero.x;
  const deltaY = threat.y - hero.y;
  const magnitude = Math.hypot(deltaX, deltaY);
  if (magnitude === 0) {
    return null;
  }
  return {
    direction: { x: deltaX / magnitude, y: deltaY / magnitude },
    targetId: threat.id,
  };
}

function auraPulseForHero(state: GameState, hero: Agent, auraRadius: number): HeroAuraPulse | null {
  if (battleLineRoleForAgent(hero) !== "archer_support" || auraRadius <= 0) {
    return null;
  }
  const progress = (state.tick % IVY_PULSE_TICKS) / IVY_PULSE_TICKS;
  return {
    radius: auraRadius + IVY_PULSE_BASE + progress * IVY_PULSE_SPREAD,
    alpha: Math.max(0.18, 0.48 - progress * 0.3),
  };
}

function liveProjection(
  state: GameState,
  hero: Agent,
  trail: readonly HeroPoint[],
): LivingHeroRenderProjection | null {
  const color = colorForHouse(state.houses, hero.houseId);
  if (color === null) {
    return null;
  }
  const auraRadius = effectiveAuraRadius(state, hero);
  return {
    agent: hero,
    auraRadius,
    auraPulse: auraPulseForHero(state, hero, auraRadius),
    frontArc: frontArcForHero(state, hero),
    houseColor: color,
    maxHp: maxHpForAgent(hero, modifiersForAgent(state, hero)),
    trail,
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

function brightenedAgentIds(
  state: GameState,
  livingHeroes: readonly LivingHeroRenderProjection[],
): readonly string[] {
  const ivy = livingHeroes.find(
    ({ agent, auraRadius }) =>
      battleLineRoleForAgent(agent) === "archer_support" && auraRadius > 0,
  );
  if (ivy === undefined) {
    return [];
  }
  const radiusSquared = ivy.auraRadius ** 2;
  return state.agents
    .filter(
      (agent) =>
        !agent.isHero &&
        agent.hp > 0 &&
        agent.houseId === ivy.agent.houseId &&
        distanceSquared(agent, ivy.agent) <= radiusSquared,
    )
    .map(({ id }) => id)
    .sort((first, second) => first.localeCompare(second));
}

export function projectHeroRenderState(
  state: GameState,
  tracker: HeroRenderTracker,
): HeroRenderProjection {
  const activeTracker = livingTrackerForRun(state, tracker);
  const previousLivingByHeroId = new Map(activeTracker.previousLivingByHeroId);
  const trailsByHeroId = new Map<string, readonly HeroPoint[]>();
  const fallSitesByHeroId = new Map<string, HeroFallSite>();
  const livingHeroes: LivingHeroRenderProjection[] = [];
  const fallenHeroes: FallenHeroRenderProjection[] = [];

  for (const hero of state.agents.filter(({ isHero }) => isHero)) {
    if (hero.heroId === null) {
      continue;
    }
    if (hero.hp > 0) {
      const point = { x: hero.x, y: hero.y };
      previousLivingByHeroId.set(hero.heroId, point);
      const shouldTrackTrail = tracksTrail(hero);
      const trail = shouldTrackTrail
        ? appendTrail(activeTracker.trailsByHeroId.get(hero.heroId), point)
        : [];
      if (shouldTrackTrail) {
        trailsByHeroId.set(hero.heroId, trail);
      }
      const projected = liveProjection(state, hero, trail);
      if (projected !== null) {
        livingHeroes.push(projected);
      }
      continue;
    }
    const site = fallSiteForHero(hero, state.tick, activeTracker);
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
    tracker: {
      runSeed: state.runSeed,
      previousLivingByHeroId,
      fallSitesByHeroId,
      trailsByHeroId,
    },
    livingHeroes,
    fallenHeroes,
    brightenedAgentIds: brightenedAgentIds(state, livingHeroes),
  };
}

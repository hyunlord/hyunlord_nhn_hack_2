import { BALANCE_CONFIG } from "../content/balanceConfig";
import { HOUSE_CONFIG, type HouseFormation, type HouseId, type HouseSelection } from "../content/houseConfig";
import { UNIT_CLASSES } from "../content/unitClassConfig";
import type { Banner, Keep } from "../engine/engine.types";
import type { Agent, ThreatPresence } from "./agentTypes";
import type { FormationMovement, FormationShape, Point } from "./formation";
import { buildSpatialGrid, queryFormationNeighbours, type SpatialGrid } from "./spatialGrid";

export const LATERAL_SPREAD = 55;
const NEARBY_THREAT_RADIUS_MULTIPLIER = 1.6;
const HARASS_RETREAT_TICKS = 25;
const CHARGE_RANK_MULTIPLIER = 1.2;
const HARASS_ADVANCE_RANK_MULTIPLIER = 1.1;
const FRACTURED_RANK_MULTIPLIER = 0.7;
const FRACTURED_COHESION = 0.1;
const FRACTURED_JITTER = 0.6;
const SELECTED_HOUSE_BIASES = [-28, 0, 28] as const;
const ZERO_POINT = { x: 0, y: 0 } as const;

export type BattleLinePosture = "engage" | "retreat";
export type BattleLineThreatSource = { readonly kind: "nearby-centroid" } | { readonly kind: "nearest-fallback"; readonly id: string } | { readonly kind: "muster" };
export type BattleLineTarget = { readonly target: Point; readonly direction: Point; readonly threatSource: BattleLineThreatSource; readonly targetId: string | null; readonly desiredRank: number; readonly lateralDisplacement: number; readonly jitterDisplacement: number; readonly jitter: number; readonly fractured: boolean; readonly posture: BattleLinePosture; readonly formation: FormationShape; };
export type BattleLineMovementPlan = { readonly target: BattleLineTarget; readonly formation: FormationMovement };

type BattleLineGrid = SpatialGrid | readonly Agent[];

type ResolveBattleLineTargetRequest = { readonly agent: Agent; readonly keep: Keep; readonly banners: readonly Banner[]; readonly threats: readonly ThreatPresence[]; readonly selectedHouseIds: HouseSelection; readonly tick: number };
type BattleLineMovementPlansRequest = { readonly agents: readonly Agent[]; readonly keep: Keep; readonly banners: readonly Banner[]; readonly threats: readonly ThreatPresence[]; readonly selectedHouseIds: HouseSelection; readonly tick: number; readonly buildGrid?: (agents: readonly Agent[]) => BattleLineGrid };

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function unitVector(from: Point, to: Point): Point | null {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const magnitude = Math.hypot(deltaX, deltaY);
  return magnitude === 0 ? null : { x: deltaX / magnitude, y: deltaY / magnitude };
}

function houseFormation(houseId: HouseId): HouseFormation {
  const config = HOUSE_CONFIG.find((candidate) => candidate.id === houseId);
  if (config === undefined) {
    throw new RangeError(`Missing house config ${houseId}.`);
  }
  return config.formation;
}

function ownBanner(agent: Agent, banners: readonly Banner[]): Banner | null {
  return banners.find((banner) => banner.houseId === agent.houseId) ?? null;
}

function hostileThreats(threats: readonly ThreatPresence[]): readonly ThreatPresence[] {
  return threats.filter((threat) => threat.hostile);
}

function nearbyHostiles(keep: Keep, threats: readonly ThreatPresence[]): readonly ThreatPresence[] {
  const radiusSquared = (BALANCE_CONFIG.KEEP_DEFENSE_RADIUS * NEARBY_THREAT_RADIUS_MULTIPLIER) ** 2;
  return hostileThreats(threats).filter(
    (threat) => distanceSquared(keep, threat) <= radiusSquared,
  );
}

function centroid(threats: readonly ThreatPresence[]): Point {
  const sum = threats.reduce<Point>(
    (total, threat) => ({ x: total.x + threat.x, y: total.y + threat.y }),
    ZERO_POINT,
  );
  return { x: sum.x / threats.length, y: sum.y / threats.length };
}

function nearestHostile(keep: Keep, threats: readonly ThreatPresence[]): ThreatPresence | null {
  return [...hostileThreats(threats)].sort((first, second) => {
    const delta = distanceSquared(first, keep) - distanceSquared(second, keep);
    return delta === 0 ? first.id.localeCompare(second.id) : delta;
  })[0] ?? null;
}

function fallbackDirection(agent: Agent, keep: Keep): Point {
  const fromKeep = unitVector(keep, agent);
  if (fromKeep !== null) {
    return fromKeep;
  }
  return { x: Math.cos(agent.heading), y: Math.sin(agent.heading) };
}

function threatDirection(request: ResolveBattleLineTargetRequest): {
  readonly direction: Point;
  readonly source: BattleLineThreatSource;
  readonly targetId: string | null;
} {
  const nearby = nearbyHostiles(request.keep, request.threats);
  if (nearby.length > 0) {
    return {
      direction: unitVector(request.keep, centroid(nearby)) ?? fallbackDirection(request.agent, request.keep),
      source: { kind: "nearby-centroid" },
      targetId: nearby.length === 1 ? nearby[0]?.id ?? null : null,
    };
  }
  const nearest = nearestHostile(request.keep, request.threats);
  if (nearest !== null) {
    return {
      direction: unitVector(request.keep, nearest) ?? fallbackDirection(request.agent, request.keep),
      source: { kind: "nearest-fallback", id: nearest.id },
      targetId: nearest.id,
    };
  }
  return {
    direction: fallbackDirection(request.agent, request.keep),
    source: { kind: "muster" },
    targetId: null,
  };
}

function selectedBiasDisplacement(houseId: HouseId, selectedHouseIds: HouseSelection): number {
  const selectedIndex = selectedHouseIds.findIndex((selected) => selected === houseId);
  const degrees = SELECTED_HOUSE_BIASES[selectedIndex];
  return degrees === undefined ? 0 : (degrees / 28) * LATERAL_SPREAD;
}

function stableSignedUnit(id: string): number {
  let hash = 2_166_136_261;
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return ((hash >>> 0) / 4_294_967_295) * 2 - 1;
}

function linePosture(agent: Agent, formation: HouseFormation, tick: number): BattleLinePosture {
  return formation.style === "harass" &&
    agent.lastAttackTick >= 0 &&
    tick - agent.lastAttackTick < HARASS_RETREAT_TICKS
    ? "retreat"
    : "engage";
}

function rankFor(
  agent: Agent,
  formation: HouseFormation,
  fractured: boolean,
  posture: BattleLinePosture,
): number {
  const lineRank = UNIT_CLASSES[agent.unitClass].lineRank;
  if (fractured || posture === "retreat") {
    return lineRank * FRACTURED_RANK_MULTIPLIER;
  }
  switch (formation.style) {
    case "charge":
      return lineRank * CHARGE_RANK_MULTIPLIER;
    case "harass":
      return lineRank * HARASS_ADVANCE_RANK_MULTIPLIER;
    case "hold":
      return lineRank;
  }
}

function formationShape(formation: HouseFormation, fractured: boolean): FormationShape {
  return { lineSpacing: formation.lineSpacing, cohesion: fractured ? FRACTURED_COHESION : formation.cohesion };
}

function jitterFor(formation: HouseFormation, fractured: boolean): number {
  return fractured ? FRACTURED_JITTER : formation.jitter;
}

function isSpatialGrid(grid: BattleLineGrid): grid is SpatialGrid {
  return !Array.isArray(grid);
}

function queryNeighbours(subject: Agent, grid: BattleLineGrid): readonly Agent[] {
  if (isSpatialGrid(grid)) {
    return queryFormationNeighbours(subject, grid);
  }
  return grid
    .filter(
      (candidate) =>
        candidate.id !== subject.id &&
        candidate.houseId === subject.houseId &&
        candidate.state !== "dead" &&
        candidate.hp > 0 &&
        !candidate.isHero &&
        candidate.heroId === null,
    )
    .sort((first, second) => first.id.localeCompare(second.id))
    .slice(0, 8);
}

export function resolveBattleLineTarget(request: ResolveBattleLineTargetRequest): BattleLineTarget {
  const formation = houseFormation(request.agent.houseId);
  const banner = ownBanner(request.agent, request.banners);
  const fractured = banner !== null && banner.hp <= 0;
  const posture = linePosture(request.agent, formation, request.tick);
  const desiredRank = rankFor(request.agent, formation, fractured, posture);
  const resolvedThreat = threatDirection(request);
  const lateralDisplacement = selectedBiasDisplacement(
    request.agent.houseId,
    request.selectedHouseIds,
  );
  const jitter = jitterFor(formation, fractured);
  const jitterDisplacement = stableSignedUnit(request.agent.id) * jitter * LATERAL_SPREAD;
  const tangent = { x: -resolvedThreat.direction.y, y: resolvedThreat.direction.x };
  const totalLateral = lateralDisplacement + jitterDisplacement;

  return {
    target: {
      x: request.keep.x + resolvedThreat.direction.x * desiredRank + tangent.x * totalLateral,
      y: request.keep.y + resolvedThreat.direction.y * desiredRank + tangent.y * totalLateral,
    },
    direction: resolvedThreat.direction,
    threatSource: resolvedThreat.source,
    targetId: posture === "retreat" ? null : resolvedThreat.targetId,
    desiredRank,
    lateralDisplacement,
    jitterDisplacement,
    jitter,
    fractured,
    posture,
    formation: formationShape(formation, fractured),
  };
}

export function createBattleLineMovementPlans(request: BattleLineMovementPlansRequest): ReadonlyMap<string, BattleLineMovementPlan> {
  const grid = (request.buildGrid ?? buildSpatialGrid)(request.agents);
  const plans = new Map<string, BattleLineMovementPlan>();
  for (const agent of request.agents) {
    const target = resolveBattleLineTarget({
      agent,
      keep: request.keep,
      banners: request.banners,
      threats: request.threats,
      selectedHouseIds: request.selectedHouseIds,
      tick: request.tick,
    });
    plans.set(agent.id, {
      target,
      formation: {
        neighbours: queryNeighbours(agent, grid),
        houseFormation: target.formation,
      },
    });
  }
  return plans;
}

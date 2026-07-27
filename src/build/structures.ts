import type {
  PlacementResult,
  Tower,
  TowerPlacementContext,
} from "./build.types";

export const TOWER_CONFIG = {
  TOWER_HP: 300,
  TOWER_RANGE: 130,
  TOWER_DAMAGE: 22,
  TOWER_ATTACK_INTERVAL_TICKS: 14,
  TOWER_RADIUS: 10,
  TOWER_MIN_SPACING: 60,
  TOWER_MAX_COUNT: 6,
} as const;

export const {
  TOWER_HP,
  TOWER_RANGE,
  TOWER_DAMAGE,
  TOWER_ATTACK_INTERVAL_TICKS,
  TOWER_RADIUS,
  TOWER_MIN_SPACING,
  TOWER_MAX_COUNT,
} = TOWER_CONFIG;

function distanceSquared(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

export function validateTowerPlacement(
  x: number,
  y: number,
  context: TowerPlacementContext,
): PlacementResult {
  if (
    x < TOWER_RADIUS ||
    y < TOWER_RADIUS ||
    x > context.worldWidth - TOWER_RADIUS ||
    y > context.worldHeight - TOWER_RADIUS
  ) {
    return { ok: false, reason: "outside buildable bounds" };
  }
  if (context.towers.length >= TOWER_MAX_COUNT) {
    return { ok: false, reason: "tower limit reached" };
  }
  const point = { x, y };
  const tooCloseTower = context.towers.some(
    (tower) =>
      distanceSquared(point, tower) <
      TOWER_MIN_SPACING ** 2,
  );
  if (tooCloseTower) {
    return { ok: false, reason: "too close to another tower" };
  }
  const overlapsHall = context.halls.some(
    (hall) =>
      distanceSquared(point, hall) <
      (hall.radius + TOWER_RADIUS) ** 2,
  );
  return overlapsHall
    ? { ok: false, reason: "too close to a hall" }
    : { ok: true, reason: null };
}

export function createTower(
  id: string,
  x: number,
  y: number,
): Tower {
  return {
    id,
    x,
    y,
    hp: TOWER_HP,
    lastAttackTick: -1,
  };
}

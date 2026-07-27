export interface Point {
  readonly x: number;
  readonly y: number;
}

export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function distanceSquared(
  first: Point,
  second: Point,
): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function moveToward(
  origin: Point,
  target: Point,
  speed: number,
): Point {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance === 0) {
    return { x: origin.x, y: origin.y };
  }

  const travel = Math.min(speed, distance);
  return {
    x: origin.x + (deltaX / distance) * travel,
    y: origin.y + (deltaY / distance) * travel,
  };
}

export function findNearestById<T extends Point & { readonly id: string }>(
  origin: Point,
  candidates: readonly T[],
): T | undefined {
  return [...candidates].sort((first, second) => {
    const distanceDifference =
      distanceSquared(origin, first) - distanceSquared(origin, second);
    return distanceDifference === 0
      ? first.id.localeCompare(second.id)
      : distanceDifference;
  })[0];
}

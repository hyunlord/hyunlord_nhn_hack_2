import type { HouseFormation } from "../content/houseConfig";
import type { Agent } from "./agentTypes";

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type FormationShape = Pick<HouseFormation, "spacing" | "cohesion">;

export type FormationMovement = {
  readonly neighbours: readonly Agent[];
  readonly houseFormation: FormationShape;
};

export type FormationAdjustmentRequest = {
  readonly agent: Agent;
  readonly neighbours: readonly Agent[];
  readonly target: Point;
  readonly formation: FormationShape;
  readonly maxMagnitude: number;
};

type SeparationRequest = {
  readonly agent: Agent;
  readonly neighbours: readonly Agent[];
  readonly spacing: number;
  readonly target: Point;
};

const ZERO_POINT = { x: 0, y: 0 } as const;

function clampVector(vector: Point, maxMagnitude: number): Point {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude === 0 || magnitude <= maxMagnitude) {
    return vector;
  }
  const scale = maxMagnitude / magnitude;
  return { x: vector.x * scale, y: vector.y * scale };
}

function forwardUnit(agent: Agent, target: Point): Point {
  const deltaX = target.x - agent.x;
  const deltaY = target.y - agent.y;
  const magnitude = Math.hypot(deltaX, deltaY);
  if (magnitude === 0) {
    return { x: Math.cos(agent.heading), y: Math.sin(agent.heading) };
  }
  return { x: deltaX / magnitude, y: deltaY / magnitude };
}

function zeroDistanceSeparation(
  agent: Agent,
  neighbour: Agent,
  target: Point,
): Point {
  const forward = forwardUnit(agent, target);
  const sideSign = agent.id.localeCompare(neighbour.id) > 0 ? 1 : -1;
  return { x: -forward.y * sideSign, y: forward.x * sideSign };
}

function separationVector(request: SeparationRequest): Point {
  return request.neighbours.reduce<Point>((sum, neighbour) => {
    const deltaX = request.agent.x - neighbour.x;
    const deltaY = request.agent.y - neighbour.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance === 0) {
      const deterministic = zeroDistanceSeparation(
        request.agent,
        neighbour,
        request.target,
      );
      return { x: sum.x + deterministic.x, y: sum.y + deterministic.y };
    }
    if (distance >= request.spacing) {
      return sum;
    }
    const strength = (request.spacing - distance) / request.spacing;
    return {
      x: sum.x + (deltaX / distance) * strength,
      y: sum.y + (deltaY / distance) * strength,
    };
  }, ZERO_POINT);
}

function cohesionVector(
  agent: Agent,
  neighbours: readonly Agent[],
  formation: FormationShape,
): Point {
  const centroid = neighbours.reduce<Point>(
    (sum, neighbour) => ({ x: sum.x + neighbour.x, y: sum.y + neighbour.y }),
    ZERO_POINT,
  );
  const average = {
    x: centroid.x / neighbours.length,
    y: centroid.y / neighbours.length,
  };
  const deltaX = average.x - agent.x;
  const deltaY = average.y - agent.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance === 0 || formation.spacing <= 0) {
    return ZERO_POINT;
  }
  const strength =
    Math.min(1, distance / formation.spacing) * formation.cohesion;
  return {
    x: (deltaX / distance) * strength,
    y: (deltaY / distance) * strength,
  };
}

export function formationAdjustment(request: FormationAdjustmentRequest): Point {
  if (
    request.neighbours.length === 0 ||
    request.maxMagnitude <= 0 ||
    request.formation.spacing <= 0
  ) {
    return ZERO_POINT;
  }

  const separation = separationVector({
    agent: request.agent,
    neighbours: request.neighbours,
    spacing: request.formation.spacing,
    target: request.target,
  });
  const cohesion = cohesionVector(
    request.agent,
    request.neighbours,
    request.formation,
  );
  return clampVector(
    { x: separation.x + cohesion.x, y: separation.y + cohesion.y },
    request.maxMagnitude,
  );
}

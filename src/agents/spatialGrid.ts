import type { Agent } from "./agentTypes";

export const SPATIAL_GRID_CELL_SIZE = 40;
export const SPATIAL_GRID_NEIGHBOUR_CAP = 8;

type CellCoordinate = {
  readonly x: number;
  readonly y: number;
};

export type SpatialGrid = {
  readonly cells: ReadonlyMap<string, readonly Agent[]>;
};

function cellForPoint(point: Pick<Agent, "x" | "y">): CellCoordinate {
  return {
    x: Math.floor(point.x / SPATIAL_GRID_CELL_SIZE),
    y: Math.floor(point.y / SPATIAL_GRID_CELL_SIZE),
  };
}

function cellKey(cell: CellCoordinate): string {
  return `${cell.x}:${cell.y}`;
}

function isLivingRegularSameHouse(subject: Agent, candidate: Agent): boolean {
  return (
    candidate.id !== subject.id &&
    candidate.houseId === subject.houseId &&
    candidate.state !== "dead" &&
    candidate.hp > 0 &&
    !candidate.isHero &&
    candidate.heroId === null
  );
}

export function buildSpatialGrid(agents: readonly Agent[]): SpatialGrid {
  const cells = new Map<string, readonly Agent[]>();
  for (const agent of agents) {
    const key = cellKey(cellForPoint(agent));
    const existing = cells.get(key) ?? [];
    cells.set(key, [...existing, agent]);
  }
  return { cells };
}

export function queryFormationNeighbours(
  subject: Agent,
  grid: SpatialGrid,
): readonly Agent[] {
  const subjectCell = cellForPoint(subject);
  const candidates: Agent[] = [];
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const cellAgents = grid.cells.get(
        cellKey({ x: subjectCell.x + offsetX, y: subjectCell.y + offsetY }),
      );
      if (cellAgents !== undefined) {
        candidates.push(...cellAgents);
      }
    }
  }

  return candidates
    .filter((candidate) => isLivingRegularSameHouse(subject, candidate))
    .sort((first, second) => first.id.localeCompare(second.id))
    .slice(0, SPATIAL_GRID_NEIGHBOUR_CAP);
}

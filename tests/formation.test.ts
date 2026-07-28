import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import { formationAdjustment } from "../src/agents/formation";
import {
  SPATIAL_GRID_CELL_SIZE,
  buildSpatialGrid,
  queryFormationNeighbours,
} from "../src/agents/spatialGrid";
import { UNIT_CLASSES } from "../src/content/unitClassConfig";
import { createAgent } from "./dispositionFixtures";

type AgentFixture = Partial<Agent> & {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

function agent(fixture: AgentFixture): Agent {
  return createAgent(fixture);
}

function bruteForceNeighbourIds(
  subject: Agent,
  agents: readonly Agent[],
): readonly string[] {
  const subjectCellX = Math.floor(subject.x / SPATIAL_GRID_CELL_SIZE);
  const subjectCellY = Math.floor(subject.y / SPATIAL_GRID_CELL_SIZE);
  return agents
    .filter((candidate) => {
      const cellX = Math.floor(candidate.x / SPATIAL_GRID_CELL_SIZE);
      const cellY = Math.floor(candidate.y / SPATIAL_GRID_CELL_SIZE);
      return (
        candidate.id !== subject.id &&
        candidate.houseId === subject.houseId &&
        candidate.state !== "dead" &&
        candidate.hp > 0 &&
        !candidate.isHero &&
        candidate.heroId === null &&
        Math.abs(cellX - subjectCellX) <= 1 &&
        Math.abs(cellY - subjectCellY) <= 1
      );
    })
    .sort((first, second) => first.id.localeCompare(second.id))
    .slice(0, 8)
    .map(({ id }) => id);
}

function neighbourIds(
  subject: Agent,
  agents: readonly Agent[],
): readonly string[] {
  return queryFormationNeighbours(subject, buildSpatialGrid(agents)).map(
    ({ id }) => id,
  );
}

test("Given agents around positive cells, when neighbours are queried, then grid results match brute force", () => {
  const subject = agent({ id: "house_a_10", x: 41, y: 41 });
  const agents = [
    agent({ id: "house_a_03", x: 79, y: 79 }),
    agent({ id: "house_a_02", x: 0, y: 40 }),
    subject,
    agent({ id: "house_a_01", x: 81, y: 41 }),
    agent({ id: "house_a_far", x: 122, y: 41 }),
  ];

  assert.deepEqual(
    neighbourIds(subject, agents),
    bruteForceNeighbourIds(subject, agents),
  );
});

test("Given shuffled input, when neighbours are queried, then ids remain ascending and source-order independent", () => {
  const subject = agent({ id: "house_a_00", x: 40, y: 40 });
  const ordered = [
    subject,
    agent({ id: "house_a_03", x: 42, y: 42 }),
    agent({ id: "house_a_01", x: 39, y: 39 }),
    agent({ id: "house_a_02", x: 80, y: 80 }),
  ];
  const shuffled = [
    agent({ id: "house_a_01", x: 39, y: 39 }),
    agent({ id: "house_a_02", x: 80, y: 80 }),
    subject,
    agent({ id: "house_a_03", x: 42, y: 42 }),
  ];

  assert.deepEqual(neighbourIds(subject, ordered), [
    "house_a_01",
    "house_a_02",
    "house_a_03",
  ]);
  assert.deepEqual(neighbourIds(subject, shuffled), neighbourIds(subject, ordered));
});

test("Given crowded mixed agents, when neighbours are queried, then only living regular same-house agents are capped at eight", () => {
  const subject = agent({ id: "house_a_subject", x: 4, y: 4 });
  const valid = Array.from({ length: 10 }, (_, index) =>
    agent({
      id: `house_a_${String(index).padStart(2, "0")}`,
      x: 5 + index,
      y: 5,
    }),
  );
  const agents = [
    subject,
    ...valid,
    agent({ id: "house_b_00", x: 6, y: 6, houseId: "house_b" }),
    agent({ id: "house_a_dead_state", x: 7, y: 7, state: "dead" }),
    agent({ id: "house_a_dead_hp", x: 8, y: 8, hp: 0 }),
    agent({ id: "house_a_hero_flag", x: 9, y: 9, isHero: true }),
    agent({ id: "house_a_hero_id", x: 10, y: 10, heroId: "hero_ashvale" }),
  ];

  assert.deepEqual(
    neighbourIds(subject, agents),
    valid.slice(0, 8).map(({ id }) => id),
  );
});

test("Given negative and boundary coordinates, when neighbours are queried, then floor cell boundaries match brute force", () => {
  const subject = agent({ id: "house_a_subject", x: -0.1, y: 40 });
  const agents = [
    subject,
    agent({ id: "house_a_neg_near", x: -40, y: 79.9 }),
    agent({ id: "house_a_zero_boundary", x: 0, y: 0 }),
    agent({ id: "house_a_pos_boundary", x: 40, y: 80 }),
    agent({ id: "house_a_too_far_x", x: 80, y: 40 }),
    agent({ id: "house_a_too_far_y", x: -0.1, y: 120 }),
  ];

  assert.deepEqual(
    neighbourIds(subject, agents),
    bruteForceNeighbourIds(subject, agents),
  );
});

test("Given close neighbours and a forward target, when formation adjusts, then separation wins while cohesion still pulls toward the group", () => {
  const subject = agent({ id: "house_a_02", x: 100, y: 100 });
  const nudge = formationAdjustment({
    agent: subject,
    neighbours: [
      agent({ id: "house_a_01", x: 90, y: 100 }),
      agent({ id: "house_a_03", x: 125, y: 100 }),
    ],
    target: { x: 140, y: 100 },
    formation: { lineSpacing: 20, cohesion: 0.5 },
    maxMagnitude: 10,
  });

  assert.ok(nudge.x > 0);
  assert.equal(nudge.y, 0);
});

test("Given zero-distance neighbours, when formation adjusts, then deterministic id order chooses a stable side without RNG", () => {
  const lower = formationAdjustment({
    agent: agent({ id: "house_a_02", x: 100, y: 100 }),
    neighbours: [agent({ id: "house_a_01", x: 100, y: 100 })],
    target: { x: 140, y: 100 },
    formation: { lineSpacing: 20, cohesion: 0.5 },
    maxMagnitude: 10,
  });
  const higher = formationAdjustment({
    agent: agent({ id: "house_a_02", x: 100, y: 100 }),
    neighbours: [agent({ id: "house_a_03", x: 100, y: 100 })],
    target: { x: 140, y: 100 },
    formation: { lineSpacing: 20, cohesion: 0.5 },
    maxMagnitude: 10,
  });

  assert.ok(lower.y > 0);
  assert.ok(higher.y < 0);
  assert.equal(lower.x, 0);
  assert.equal(higher.x, 0);
});

test("Given a large formation vector, when capped by movement speed, then the nudge magnitude stays within effective speed", () => {
  const maxMagnitude = UNIT_CLASSES.melee.moveSpeed * 0.5;
  const nudge = formationAdjustment({
    agent: agent({ id: "house_a_99", x: 100, y: 100 }),
    neighbours: [
      agent({ id: "house_a_01", x: 100, y: 100 }),
      agent({ id: "house_a_02", x: 101, y: 100 }),
    ],
    target: { x: 100, y: 150 },
    formation: { lineSpacing: 60, cohesion: 1 },
    maxMagnitude,
  });

  assert.ok(Math.hypot(nudge.x, nudge.y) <= maxMagnitude);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgents,
  createHouses,
} from "../src/agents/agentFactory";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HOUSE_SPAWN_SLOTS } from "../src/content/houseConfig";
import { createRng } from "../src/engine/prng";

test("Given the stronghold spawn slots, when default agents are created, then every regular camp stays inside its configured radius without overlapping", () => {
  const houses = createHouses(createRng(72), [
    "house_a",
    "house_b",
    "house_c",
  ]);

  const agents = createAgents(houses, createRng(72)).filter(
    ({ isHero }) => !isHero,
  );
  const agentsByHouse = houses.map((house, index) => {
    const slot = HOUSE_SPAWN_SLOTS[index];
    if (slot === undefined) {
      throw new RangeError(`Missing spawn slot for ${house.id}.`);
    }
    return {
      agents: agents.filter(({ houseId }) => houseId === house.id),
      slot,
    };
  });
  let minimumInterCampDistance = Number.POSITIVE_INFINITY;
  for (const first of agents) {
    for (const second of agents) {
      if (first.houseId !== second.houseId) {
        minimumInterCampDistance = Math.min(
          minimumInterCampDistance,
          Math.hypot(first.x - second.x, first.y - second.y),
        );
      }
    }
  }

  for (const { agents: houseAgents, slot } of agentsByHouse) {
    assert.ok(
      houseAgents.every(
        ({ x, y }) =>
          Math.hypot(x - slot.x, y - slot.y) <=
          BALANCE_CONFIG.HOUSE_SPAWN_RADIUS,
      ),
    );
  }
  assert.ok(minimumInterCampDistance > 0);
});

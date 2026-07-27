import assert from "node:assert/strict";
import test from "node:test";
import { UNIT_CLASS_IDS } from "../src/content/unitClassConfig";
import {
  advanceTick,
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";
import { populationCapForHouse } from "../src/engine/population";

function enterFirstWave() {
  const world = createInitialState(303);
  let state = world.state;
  while (state.phase === "preparation") {
    state = advanceTick(state, world.rng);
  }
  return { state, rng: world.rng };
}

function clearIntoIntermission() {
  const wave = enterFirstWave();
  if (wave.state.activeThreat === null) {
    throw new RangeError("Expected a first-wave threat.");
  }
  return {
    state: advanceTick(
      {
        ...wave.state,
        activeThreat: {
          ...wave.state.activeThreat,
          creatures: [],
          mage: null,
        },
      },
      wave.rng,
    ),
    rng: wave.rng,
  };
}

test("Given level-three Ashvale at intermission, when wave two starts, then twelve recruits arrive below the level cap in roster proportions without healing wounds", () => {
  const intermission = clearIntoIntermission();
  const wounded = intermission.state.agents.find(
    ({ houseId, isHero, hp }) =>
      houseId === "house_a" && !isHero && hp > 0,
  );
  if (wounded === undefined) {
    throw new RangeError("Expected an Ashvale regular.");
  }
  const before = {
    ...intermission.state,
    agents: intermission.state.agents.map((agent) =>
      agent.id === wounded.id ? { ...agent, hp: 17 } : agent,
    ),
    houseProgress: intermission.state.houseProgress.map((progress) =>
      progress.houseId === "house_a"
        ? { ...progress, level: 3 }
        : progress,
    ),
  };
  const beforeAshvale = before.agents.filter(
    ({ houseId, isHero, hp }) =>
      houseId === "house_a" && !isHero && hp > 0,
  );

  const result = beginNextWave(before, intermission.rng);
  const afterAshvale = result.agents.filter(
    ({ houseId, isHero, hp }) =>
      houseId === "house_a" && !isHero && hp > 0,
  );
  const recruits = afterAshvale.filter(
    ({ id }) => !beforeAshvale.some((agent) => agent.id === id),
  );

  assert.equal(afterAshvale.length, beforeAshvale.length + 12);
  assert.equal(populationCapForHouse("house_a", 3), 64);
  assert.deepEqual(
    UNIT_CLASS_IDS.map((unitClass) =>
      recruits.filter((agent) => agent.unitClass === unitClass).length,
    ),
    [6, 0, 0, 6],
  );
  assert.equal(
    result.agents.find(({ id }) => id === wounded.id)?.hp,
    17,
  );
  assert.ok(recruits.every(({ hp }) => hp > 0));
});

test("Given a destroyed Ashvale hall, when the next wave starts, then that house produces zero recruits", () => {
  const intermission = clearIntoIntermission();
  const before = {
    ...intermission.state,
    halls: intermission.state.halls.map((hall) =>
      hall.houseId === "house_a" ? { ...hall, hp: 0 } : hall,
    ),
  };
  const livingBefore = before.agents.filter(
    ({ houseId, isHero, hp }) =>
      houseId === "house_a" && !isHero && hp > 0,
  ).length;

  const result = beginNextWave(before, intermission.rng);

  assert.equal(
    result.agents.filter(
      ({ houseId, isHero, hp }) =>
        houseId === "house_a" && !isHero && hp > 0,
    ).length,
    livingBefore,
  );
});

test("Given a run reaches two wave starts, when population history is inspected, then every selected house has one entry per wave", () => {
  const first = enterFirstWave();
  const intermission =
    first.state.activeThreat === null
      ? first.state
      : advanceTick(
          {
            ...first.state,
            activeThreat: {
              ...first.state.activeThreat,
              creatures: [],
              mage: null,
            },
          },
          first.rng,
        );
  const second = beginNextWave(intermission, first.rng);

  assert.equal(first.state.populationHistory.length, 3);
  assert.deepEqual(
    first.state.populationHistory.map(({ wave }) => wave),
    [1, 1, 1],
  );
  assert.equal(second.populationHistory.length, 6);
  assert.deepEqual(
    second.populationHistory.slice(3).map(({ wave }) => wave),
    [2, 2, 2],
  );
});

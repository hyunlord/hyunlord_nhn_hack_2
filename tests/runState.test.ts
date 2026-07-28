import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  WAVE_DEFINITIONS,
  type WaveDefinition,
} from "../src/content/waveConfig";
import type { GameState } from "../src/engine/engine.types";
import type { Rng } from "../src/engine/prng";
import { createRng } from "../src/engine/prng";
import {
  DAYLIGHT_RAID_CHANCE,
  DAYLIGHT_RAID_CREATURE_FACTOR,
  DAYLIGHT_RAID_DAMAGE_FACTOR,
  DAYLIGHT_RAID_REWARD_FACTOR,
  advanceTick,
  beginNextWave,
  castMiracle,
  createInitialState,
  isFinalWave,
} from "../src/engine/tick";

function fixedRng(value: number): Rng {
  return {
    next: () => value,
    range: (minimum, maximum) => minimum + value * (maximum - minimum),
    int: (minimum, maximum) =>
      Math.min(maximum - 1, Math.floor(minimum + value * (maximum - minimum))),
    pick: <T>(items: readonly T[]): T => {
      const item = items[0];
      if (item === undefined) {
        throw new RangeError("Cannot pick from an empty array.");
      }
      return item;
    },
  };
}

function withClearedThreat(
  state: GameState,
  overrides: Partial<GameState> = {},
): GameState {
  if (state.activeThreat === null) {
    throw new RangeError("Expected an active wave fixture.");
  }
  return {
    ...state,
    activeThreat: {
      ...state.activeThreat,
      mage: null,
      creatures: [],
    },
    ...overrides,
  };
}

function enterFirstWave(): {
  readonly state: GameState;
  readonly rng: ReturnType<typeof createRng>;
} {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  let state = world.state;
  while (state.phase === "preparation") {
    state = advanceTick(state, world.rng);
  }
  return { state, rng: world.rng };
}

test("Given a new run, when initialized, then halls and preparation state use the configured schema", () => {
  const { state } = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);

  assert.equal(state.phase, "preparation");
  assert.equal(state.waveIndex, 0);
  assert.equal(state.tribute, 0);
  assert.equal(state.halls.length, state.houses.length);
  assert.ok(state.halls.every(({ hp }) => hp === BALANCE_CONFIG.HALL_HP));
  assert.ok(
    state.halls.every(
      ({ houseId, hp, maxHp }) =>
        houseId.startsWith("house_") &&
        hp === maxHp &&
        maxHp === BALANCE_CONFIG.HALL_HP,
    ),
  );
  assert.ok(state.houses.every(({ isTraitor }) => !isTraitor));
});

test("Given the last preparation tick, when time advances, then wave zero spawns exactly once", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const before = {
    ...world.state,
    tick: BALANCE_CONFIG.PREPARATION_TICKS - 1,
  };

  const result = advanceTick(before, world.rng);

  assert.equal(result.phase, "wave");
  assert.equal(result.waveIndex, 0);
  assert.equal(
    result.activeThreat?.creatures.length,
    WAVE_DEFINITIONS[0]?.creatureCount,
  );
  assert.equal(result.activeThreat?.traitorHouseId, null);
});

test("Given a cleared non-final wave without a healing card, when the tick resolves, then reward and intermission apply without free healing", () => {
  const wave = enterFirstWave();
  const wounded = wave.state.agents.map((agent, index) => ({
    ...agent,
    hp: index === 0 ? 40 : agent.hp,
  }));
  const result = advanceTick(
    withClearedThreat(wave.state, { agents: wounded, tribute: 7 }),
    wave.rng,
  );
  const repeated = advanceTick(result, wave.rng);

  assert.equal(result.phase, "intermission");
  assert.equal(
    result.tribute,
    7 + (WAVE_DEFINITIONS[0]?.tributeReward ?? 0),
  );
  assert.equal(result.agents[0]?.hp, 40);
  assert.equal(result.activeThreat, null);
  assert.equal(
    result.lastWaveSummary?.tributeEarned,
    WAVE_DEFINITIONS[0]?.tributeReward,
  );
  assert.equal(repeated.tribute, result.tribute);
  assert.deepEqual(repeated.agents, result.agents);
});

test("Given intermission, when the next wave is requested, then the index advances from data and a fresh wave spawns", () => {
  const wave = enterFirstWave();
  const intermission = advanceTick(
    withClearedThreat(wave.state),
    wave.rng,
  );

  const result = beginNextWave(intermission, wave.rng);

  assert.equal(result.phase, "wave");
  assert.equal(result.waveIndex, 1);
  assert.equal(
    result.activeThreat?.creatures.length,
    WAVE_DEFINITIONS[1]?.creatureCount,
  );
});

test("Given the first assault, when preparation ends, then it can never become a daylight raid", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const result = advanceTick(
    {
      ...world.state,
      tick: BALANCE_CONFIG.PREPARATION_TICKS - 1,
      pendingDaylightRaid: true,
    },
    fixedRng(0),
  );

  assert.equal(result.activeThreat?.daylightRaid, false);
  assert.equal(result.pendingDaylightRaid, false);
  assert.deepEqual(result.daylightRaidWaveNumbers, []);
});

test("Given the seeded intermission roll, when the value crosses fifteen percent, then raid selection follows the exact threshold", () => {
  const wave = enterFirstWave();
  const belowThreshold = advanceTick(
    withClearedThreat(wave.state),
    fixedRng(DAYLIGHT_RAID_CHANCE - Number.EPSILON),
  );
  const atThreshold = advanceTick(
    withClearedThreat(wave.state),
    fixedRng(DAYLIGHT_RAID_CHANCE),
  );

  assert.equal(DAYLIGHT_RAID_CHANCE, 0.15);
  assert.equal(belowThreshold.pendingDaylightRaid, true);
  assert.equal(atThreshold.pendingDaylightRaid, false);
});

test("Given a seeded daylight-raid roll, when intermission starts and the next wave begins, then count and damage use the specified factors", () => {
  const wave = enterFirstWave();
  const intermission = advanceTick(
    withClearedThreat(wave.state),
    fixedRng(0),
  );
  assert.equal(intermission.pendingDaylightRaid, true);

  const normal = beginNextWave(
    { ...intermission, pendingDaylightRaid: false },
    createRng(77),
  );
  const raid = beginNextWave(intermission, createRng(77));
  const definition = WAVE_DEFINITIONS[1];
  const normalCreature = normal.activeThreat?.creatures[0];
  const raidCreature = raid.activeThreat?.creatures[0];
  if (
    definition === undefined ||
    normalCreature === undefined ||
    raidCreature === undefined
  ) {
    throw new RangeError("Expected second-wave creature fixtures.");
  }

  assert.equal(raid.activeThreat?.daylightRaid, true);
  assert.equal(
    raid.activeThreat?.creatures.length,
    Math.floor(definition.creatureCount * DAYLIGHT_RAID_CREATURE_FACTOR),
  );
  assert.equal(
    raidCreature.agentDamage,
    Math.round(normalCreature.agentDamage * DAYLIGHT_RAID_DAMAGE_FACTOR),
  );
  assert.equal(
    raidCreature.hallDamage,
    Math.round(normalCreature.hallDamage * DAYLIGHT_RAID_DAMAGE_FACTOR),
  );
  assert.deepEqual(raid.daylightRaidWaveNumbers, [2]);
});

test("Given a daylight raid is cleared, when its reward resolves, then tribute uses the specified reward factor", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const raid = beginNextWave(
    {
      ...world.state,
      phase: "intermission",
      waveIndex: 0,
      pendingDaylightRaid: true,
    },
    createRng(88),
  );
  const result = advanceTick(withClearedThreat(raid), fixedRng(1));
  const baseReward = WAVE_DEFINITIONS[1]?.tributeReward ?? 0;

  assert.equal(result.phase, "intermission");
  assert.equal(
    result.tribute,
    Math.round(baseReward * DAYLIGHT_RAID_REWARD_FACTOR),
  );
});

test("Given a final wave clear, when resolved, then victory wins and no literal wave-count dependency exists", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const definition = WAVE_DEFINITIONS.at(-1);
  if (definition === undefined) {
    throw new RangeError("Expected a final wave.");
  }
  const threat = {
    ...beginNextWave(
      { ...world.state, phase: "intermission", waveIndex: 1 },
      world.rng,
    ).activeThreat!,
    waveIndex: definition.index,
    creatures: [],
    mage: null,
  };
  const result = advanceTick(
    {
      ...world.state,
      phase: "wave",
      waveIndex: definition.index,
      activeThreat: threat,
    },
    world.rng,
  );
  const extended: readonly WaveDefinition[] = [
    ...WAVE_DEFINITIONS,
    { ...definition, index: definition.index + 1, label: "Aftermath" },
  ];

  assert.equal(result.phase, "victory");
  assert.equal(isFinalWave(definition.index), true);
  assert.equal(isFinalWave(definition.index, extended), false);
});

test("Given the last hall falls while the last enemy dies, when resolved, then defeat takes priority", () => {
  const wave = enterFirstWave();
  const result = advanceTick(
    withClearedThreat(wave.state, {
      halls: wave.state.halls.map((hall) => ({ ...hall, hp: 0 })),
    }),
    wave.rng,
  );

  assert.equal(result.phase, "defeat");
});

test("Given no living hall during a wave, when time advances, then defeat occurs even with enemies remaining", () => {
  const wave = enterFirstWave();
  const result = advanceTick(
    {
      ...wave.state,
      halls: wave.state.halls.map((hall) => ({ ...hall, hp: 0 })),
    },
    wave.rng,
  );

  assert.equal(result.phase, "defeat");
  assert.notEqual(result.activeThreat, null);
});

test("Given a frozen or terminal phase, when ticks and miracles are requested, then combat, economy, and casting stay frozen", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const wave = enterFirstWave();
  for (const phase of ["intermission", "victory", "defeat"] as const) {
    const state = {
      ...world.state,
      phase,
      tribute: 25,
      divinePower: 50,
      activeThreat: wave.state.activeThreat,
    };
    const advanced = advanceTick(state, createRng(4));
    const cast = castMiracle(state, {
      type: "lightning",
      targetX: 100,
      targetY: 100,
      tick: state.tick,
    });

    assert.equal(advanced.tick, state.tick + 1);
    assert.deepEqual(advanced.agents, state.agents);
    assert.deepEqual(advanced.halls, state.halls);
    assert.deepEqual(advanced.activeThreat, state.activeThreat);
    assert.equal(advanced.tribute, state.tribute);
    assert.strictEqual(cast, state);
    if (phase !== "intermission") {
      assert.strictEqual(beginNextWave(state, createRng(4)), state);
    }
  }
});

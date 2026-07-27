import { createAgents, createHouses } from "../agents/agentFactory";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { HOUSE_CONFIG } from "../content/houseConfig";
import {
  WAVE_DEFINITIONS,
  type WaveDefinition,
} from "../content/waveConfig";
import type { Rng } from "./prng";
import { createRng } from "./prng";
import type { GameState } from "./engine.types";
import { advanceWaveCombat } from "./invasionCombat";
import { spawnWave } from "../threat/waveDirector";
import { CARD_DEFINITIONS } from "../content/cardConfig";
import { resolveModifiers } from "../progression/modifiers";
import {
  applyProgressionAwards,
  divineModifiersForState,
  modifiersForHouse,
} from "./progressionEngine";

export { castMiracle } from "./miracleApplication";

function getWaveDefinition(index: number): WaveDefinition {
  const definition = WAVE_DEFINITIONS[index];
  if (definition === undefined) {
    throw new RangeError(`Missing wave definition ${index}.`);
  }
  return definition;
}

export function isFinalWave(
  waveIndex: number,
  definitions: readonly WaveDefinition[] = WAVE_DEFINITIONS,
): boolean {
  return waveIndex === definitions.length - 1;
}

function spawnConfiguredWave(
  state: GameState,
  waveIndex: number,
  rng: Rng,
): GameState {
  return {
    ...state,
    phase: "wave",
    waveIndex,
    activeThreat: spawnWave(
      getWaveDefinition(waveIndex),
      BALANCE_CONFIG.WORLD_WIDTH,
      BALANCE_CONFIG.WORLD_HEIGHT,
      state.tick,
      rng,
    ),
  };
}

export function beginNextWave(state: GameState, rng: Rng): GameState {
  if (state.phase !== "intermission") {
    return state;
  }
  const nextWaveIndex = state.waveIndex + 1;
  if (nextWaveIndex >= WAVE_DEFINITIONS.length) {
    return { ...state, phase: "victory" };
  }
  return spawnConfiguredWave(state, nextWaveIndex, rng);
}

function applyTickMaintenance(state: GameState, tick: number): GameState {
  return {
    ...state,
    tick,
    divinePower: Math.min(
      BALANCE_CONFIG.DIVINE_POWER_MAX,
      state.divinePower +
        BALANCE_CONFIG.DIVINE_POWER_REGEN_PER_TICK *
          divineModifiersForState(state).divineRegenMultiplier,
    ),
    miracleCooldowns: {
      lightning: Math.max(0, state.miracleCooldowns.lightning - 1),
      blessing: Math.max(0, state.miracleCooldowns.blessing - 1),
      curse: Math.max(0, state.miracleCooldowns.curse - 1),
    },
    activeEffects: state.activeEffects.filter(
      (effect) => tick < effect.startTick + effect.durationTicks,
    ),
  };
}

export function advanceTick(state: GameState, rng: Rng): GameState {
  const tick = state.tick + 1;
  if (
    state.phase === "draft" ||
    state.phase === "intermission" ||
    state.phase === "victory" ||
    state.phase === "defeat"
  ) {
    return {
      ...state,
      tick,
      activeEffects: state.activeEffects.filter(
        (effect) => tick < effect.startTick + effect.durationTicks,
      ),
    };
  }

  if (state.phase === "preparation") {
    const maintained = applyTickMaintenance(state, tick);
    return tick >= BALANCE_CONFIG.PREPARATION_TICKS
      ? spawnConfiguredWave(maintained, 0, rng)
      : maintained;
  }

  const combat = advanceWaveCombat(state, tick, rng);
  const cardTribute = combat.creatureKillsByHouse.reduce(
    (sum, { houseId, kills }) =>
      sum +
      kills * modifiersForHouse(state, houseId).tributePerKillBonus,
    0,
  );
  const tribute =
    state.tribute +
    combat.creatureKills * BALANCE_CONFIG.TRIBUTE_PER_CREATURE_KILL +
    cardTribute;
  const maintained = applyTickMaintenance(
    {
      ...state,
      agents: combat.agents,
      halls: combat.halls,
      activeThreat: combat.activeThreat,
      tribute,
    },
    tick,
  );
  let resolved: GameState;
  if (combat.halls.every(({ hp }) => hp <= 0)) {
    resolved = { ...maintained, phase: "defeat" };
  } else {
    const threatCleared =
      combat.activeThreat !== null &&
      combat.activeThreat.creatures.length === 0 &&
      (combat.activeThreat.mage === null ||
        combat.activeThreat.mage.hp <= 0);
    if (!threatCleared) {
      resolved = maintained;
    } else {
      const reward = getWaveDefinition(state.waveIndex).tributeReward;
      if (isFinalWave(state.waveIndex)) {
        resolved = {
          ...maintained,
          phase: "victory",
          tribute: tribute + reward,
          activeThreat: null,
        };
      } else {
        resolved = {
          ...maintained,
          phase: "intermission",
          tribute: tribute + reward,
          activeThreat: null,
          agents: maintained.agents.map((agent) => {
            if (agent.hp <= 0) {
              return agent;
            }
            const modifiers = modifiersForHouse(
              maintained,
              agent.houseId,
            );
            return {
              ...agent,
              hp: Math.min(
                BALANCE_CONFIG.INITIAL_HP + modifiers.maxHpBonus,
                agent.hp +
                  BALANCE_CONFIG.INTERMISSION_AUTO_HEAL +
                  modifiers.interWaveHealBonus,
              ),
            };
          }),
        };
      }
    }
  }
  return applyProgressionAwards(
    resolved,
    combat.xpAwards,
    rng,
  );
}

export function createInitialState(seed: number): {
  state: GameState;
  rng: Rng;
} {
  const rng = createRng(seed);
  const houses = createHouses(rng);
  const agents = createAgents(houses, rng);

  return {
    state: {
      tick: 0,
      phase: "preparation",
      phaseBeforeDraft: null,
      waveIndex: 0,
      tribute: 0,
      houses,
      halls: HOUSE_CONFIG.map(({ id, spawnX, spawnY }) => ({
        houseId: id,
        x: spawnX,
        y: spawnY,
        hp: BALANCE_CONFIG.HALL_HP,
        maxHp: BALANCE_CONFIG.HALL_HP,
      })),
      agents,
      activeThreat: null,
      highlights: [],
      divinePower: BALANCE_CONFIG.DIVINE_POWER_START,
      miracleCooldowns: { lightning: 0, blessing: 0, curse: 0 },
      activeEffects: [],
      houseProgress: houses.map(({ id }) => ({
        houseId: id,
        xp: 0,
        level: 1,
        cards: [],
      })),
      houseModifiers: houses.map(({ id }) => ({
        houseId: id,
        modifiers: resolveModifiers(CARD_DEFINITIONS, [], 0),
      })),
      pendingDrafts: [],
    },
    rng,
  };
}

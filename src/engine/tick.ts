import { createAgents, createHouses } from "../agents/agentFactory";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_CONFIG,
  expandHouseSelection,
  validateHouseSelection,
  type HouseId,
} from "../content/houseConfig";
import {
  resolveHouseSynergies,
} from "../content/houseSynergies";
import {
  WAVE_DEFINITIONS,
  type WaveDefinition,
} from "../content/waveConfig";
import type { Rng } from "./prng";
import { createRng } from "./prng";
import type { GameState } from "./engine.types";
import { advanceWaveCombat } from "./invasionCombat";
import {
  assignTraitor,
  spawnWave,
} from "../threat/waveDirector";
import { CARD_DEFINITIONS } from "../content/cardConfig";
import { resolveModifiers } from "../progression/modifiers";
import {
  applyHeroProgressAwards,
  applyProgressionAwards,
  divineModifiersForState,
  modifiersForHouse,
} from "./progressionEngine";
import { maxHpForAgent, respawnHeroes } from "./heroEngine";
import { EMPTY_PURCHASES } from "../build/shop";
import { TOWER_RUBBLE_TICKS } from "../build/structures";
import type { CardEffect } from "../progression/progression.types";

export { castMiracle } from "./miracleApplication";
export { castSkill } from "./skillApplication";

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
  const betrayalEligible =
    waveIndex === 2 &&
    state.selectedHouseIds.includes("house_a") &&
    state.selectedHouseIds.includes("house_f");
  const traitorHouseId: HouseId | null =
    betrayalEligible && rng.next() < 0.25
      ? assignTraitor(["house_a", "house_f"] as const, rng)
      : null;
  const threat = spawnWave(
    getWaveDefinition(waveIndex),
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    state.tick,
    rng,
  );
  return {
    ...state,
    phase: "wave",
    waveIndex,
    waveStartSnapshot: {
      livingAgents: state.agents.filter(({ hp }) => hp > 0).length,
      hallHp: state.halls.reduce((sum, { hp }) => sum + hp, 0),
    },
    activeThreat: { ...threat, traitorHouseId },
    betrayalHouseId: traitorHouseId ?? state.betrayalHouseId,
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
    skillCooldowns: {
      meteor_fall: Math.max(0, state.skillCooldowns.meteor_fall - 1),
      sanctuary: Math.max(0, state.skillCooldowns.sanctuary - 1),
      chains_of_dusk: Math.max(
        0,
        state.skillCooldowns.chains_of_dusk - 1,
      ),
      resurgence: Math.max(0, state.skillCooldowns.resurgence - 1),
    },
    activeEffects: state.activeEffects.filter(
      (effect) => tick < effect.startTick + effect.durationTicks,
    ),
    towerRubble: state.towerRubble.filter(
      (rubble) => tick < rubble.tick + TOWER_RUBBLE_TICKS,
    ),
  };
}

export function advanceTick(state: GameState, rng: Rng): GameState {
  const tick = state.tick + 1;
  const respawnedAgents = respawnHeroes(
    state.agents,
    state.halls,
    state.houseModifiers,
    tick,
  );
  if (respawnedAgents !== state.agents) {
    state = { ...state, agents: respawnedAgents };
  }
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
      towerRubble: state.towerRubble.filter(
        (rubble) => tick < rubble.tick + TOWER_RUBBLE_TICKS,
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
  const heroDeaths = state.heroDeaths + combat.agents.filter(
    (agent) =>
      agent.isHero &&
      agent.hp <= 0 &&
      (state.agents.find(({ id }) => id === agent.id)?.hp ?? 0) > 0,
  ).length;
  const cardTribute = combat.creatureKillsByHouse.reduce(
    (sum, { houseId, kills }) =>
      sum +
      kills * modifiersForHouse(state, houseId).tributePerKillBonus,
    0,
  );
  const divinePowerFromDeaths = combat.agents.reduce(
    (sum, agent) => {
      const previous = state.agents.find(({ id }) => id === agent.id);
      if (
        agent.hp > 0 ||
        previous === undefined ||
        previous.hp <= 0
      ) {
        return sum;
      }
      return (
        sum +
        modifiersForHouse(
          state,
          agent.houseId,
        ).divinePowerPerAgentDeath
      );
    },
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
      towers: combat.towers,
      towerRubble: [...state.towerRubble, ...combat.destroyedTowers],
      activeThreat: combat.activeThreat,
      tribute,
      heroDeaths,
      divinePower: Math.min(
        BALANCE_CONFIG.DIVINE_POWER_MAX,
        state.divinePower + divinePowerFromDeaths,
      ),
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
        const selectedHeroes = maintained.agents.filter(
          ({ isHero }) => isHero,
        );
        const heroLessWave2Clear =
          maintained.heroLessWave2Clear ||
          (state.waveIndex === 1 &&
            selectedHeroes.length > 0 &&
            selectedHeroes.every(({ hp }) => hp <= 0));
        const lastWaveSummary =
          state.waveStartSnapshot === null
            ? null
            : {
                agentsLost: Math.max(
                  0,
                  state.waveStartSnapshot.livingAgents -
                    maintained.agents.filter(({ hp }) => hp > 0).length,
                ),
                hallDamage: Math.max(
                  0,
                  state.waveStartSnapshot.hallHp -
                    maintained.halls.reduce((sum, { hp }) => sum + hp, 0),
                ),
              };
        const reward = getWaveDefinition(state.waveIndex).tributeReward;
        if (isFinalWave(state.waveIndex)) {
          resolved = {
            ...maintained,
            phase: "victory",
            tribute: tribute + reward,
            activeThreat: null,
            heroLessWave2Clear,
            lastWaveSummary,
            waveStartSnapshot: null,
          };
        } else {
        resolved = {
          ...maintained,
          phase: "intermission",
            tribute: tribute + reward,
            activeThreat: null,
            heroLessWave2Clear,
            lastWaveSummary,
            waveStartSnapshot: null,
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
              hp: Math.max(
                agent.hp,
                Math.min(
                  maxHpForAgent(agent, modifiers),
                  agent.hp + modifiers.interWaveHealBonus,
                ),
              ),
            };
          }),
        };
      }
    }
  }
  return applyProgressionAwards(
    applyHeroProgressAwards(resolved, combat.heroXpAwards, tick),
    combat.xpAwards,
    rng,
  );
}

function traitEffect(houseId: HouseId): CardEffect {
  const config = HOUSE_CONFIG.find(({ id }) => id === houseId);
  if (config === undefined) {
    throw new RangeError(`Missing house configuration for ${houseId}.`);
  }
  return {
    attackDamageMultiplier: config.traits.attackDamageMultiplier,
    attackIntervalMultiplier: config.traits.attackIntervalMultiplier,
    maxHpMultiplier: config.traits.maxHpMultiplier,
    moveSpeedMultiplier: config.traits.moveSpeedMultiplier,
    tributePerKillBonus: config.traits.tributePerKillBonus,
  };
}

export function createInitialState(
  seed: number,
  chosenHouseIds: readonly string[] = DEFAULT_HOUSE_IDS,
): {
  state: GameState;
  rng: Rng;
} {
  const validation = validateHouseSelection(chosenHouseIds);
  if (!validation.valid) {
    throw new RangeError(`Invalid house selection: ${validation.reason}.`);
  }
  const selectedHouseIds = validation.houseIds;
  const placements = expandHouseSelection(selectedHouseIds);
  const activeSynergies = resolveHouseSynergies(selectedHouseIds);
  const rng = createRng(seed);
  const houses = createHouses(rng, selectedHouseIds);
  const agents = createAgents(houses, rng);
  const houseBaseEffects = selectedHouseIds.map((houseId) => ({
    houseId,
    effects: [
      traitEffect(houseId),
      ...activeSynergies.map(({ effect }) => effect),
    ],
  }));

  return {
    state: {
      tick: 0,
      runSeed: seed,
      selectedHouseIds,
      phase: "preparation",
      phaseBeforeDraft: null,
      waveIndex: 0,
      tribute: 0,
      houses,
      halls: placements.map(({ houseId, slot }) => ({
        houseId,
        x: slot.x,
        y: slot.y,
        hp: BALANCE_CONFIG.HALL_HP,
        maxHp: BALANCE_CONFIG.HALL_HP,
      })),
      agents,
      activeThreat: null,
      highlights: [],
      divinePower: BALANCE_CONFIG.DIVINE_POWER_START,
      miracleCooldowns: { lightning: 0, blessing: 0, curse: 0 },
      unlockedSkills: [],
      skillCooldowns: {
        meteor_fall: 0,
        sanctuary: 0,
        chains_of_dusk: 0,
        resurgence: 0,
      },
      activeEffects: [],
      houseProgress: houses.map(({ id }) => ({
        houseId: id,
        xp: 0,
        level: 1,
        cards: [],
      })),
      heroProgress: agents
        .filter(
          (agent) => agent.isHero && agent.heroId !== null,
        )
        .map((agent) => ({
          heroId: agent.heroId ?? agent.id,
          xp: 0,
          level: 1,
        })),
      houseModifiers: houses.map(({ id }) => ({
        houseId: id,
        modifiers: resolveModifiers(
          CARD_DEFINITIONS,
          [],
          0,
          houseBaseEffects.find(({ houseId }) => houseId === id)?.effects ??
            [],
        ),
      })),
      houseBaseEffects,
      activeSynergyIds: activeSynergies.map(({ id }) => id),
      betrayalHouseId: null,
      heroLessWave2Clear: false,
      pendingDrafts: [],
      towers: [],
      towerRubble: [],
      shopPurchases: { ...EMPTY_PURCHASES },
      runUpgrades: { attackDamageMultiplier: 1 },
      lastWaveSummary: null,
      waveStartSnapshot: null,
      heroDeaths: 0,
    },
    rng,
  };
}

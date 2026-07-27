import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type { GameState } from "../src/engine/engine.types";
import type { SimulationMetrics } from "./balanceTypes";

class BalanceTelemetryError extends Error {
  constructor(
    readonly seed: number,
    readonly tick: number,
    message: string,
  ) {
    super(`Seed ${seed}, tick ${tick}: ${message}`);
    this.name = "BalanceTelemetryError";
  }
}

export function createSimulationMetrics(): SimulationMetrics {
  return {
    reached: WAVE_DEFINITIONS.map(() => false),
    startAgents: WAVE_DEFINITIONS.map(() => null),
    endAgents: WAVE_DEFINITIONS.map(() => null),
    creatureSpawns: WAVE_DEFINITIONS.map(() => 0),
    creatureKills: WAVE_DEFINITIONS.map(() => 0),
    clearTicks: WAVE_DEFINITIONS.map(() => null),
    mageOnlyTicks: WAVE_DEFINITIONS.map(() => 0),
    hallDamage: WAVE_DEFINITIONS.map(() => 0),
    classDeaths: {
      melee: 0,
      spear: 0,
      archer: 0,
      skirmisher: 0,
    },
    divinePowerSpent: 0,
  };
}

export function recordWaveStart(
  metrics: SimulationMetrics,
  state: GameState,
  seed: number,
): void {
  if (state.activeThreat === null) {
    throw new BalanceTelemetryError(
      seed,
      state.tick,
      "wave has no active threat",
    );
  }
  if (state.activeThreat.waveIndex !== state.waveIndex) {
    throw new BalanceTelemetryError(seed, state.tick, "wave indexes disagree");
  }
  metrics.reached[state.waveIndex] = true;
  metrics.startAgents[state.waveIndex] = state.agents.filter(
    ({ hp }) => hp > 0,
  ).length;
  metrics.creatureSpawns[state.waveIndex] =
    state.activeThreat.creatures.length;
}

export function recordCombatMetrics(
  metrics: SimulationMetrics,
  before: GameState,
  after: GameState,
): void {
  const waveIndex = before.waveIndex;
  const beforeHallHp = before.halls.reduce((sum, { hp }) => sum + hp, 0);
  const afterHallHp = after.halls.reduce((sum, { hp }) => sum + hp, 0);
  metrics.hallDamage[waveIndex] =
    (metrics.hallDamage[waveIndex] ?? 0) +
    Math.max(0, beforeHallHp - afterHallHp);

  const active = before.activeThreat;
  if (
    active?.mage !== null &&
    active?.mage !== undefined &&
    active.mage.hp > 0 &&
    active.creatures.length === 0
  ) {
    metrics.mageOnlyTicks[waveIndex] =
      (metrics.mageOnlyTicks[waveIndex] ?? 0) + 1;
  }

  const afterAgents = new Map(after.agents.map((agent) => [agent.id, agent]));
  for (const agent of before.agents) {
    const next = afterAgents.get(agent.id);
    if (!agent.isHero && agent.hp > 0 && next !== undefined && next.hp <= 0) {
      metrics.classDeaths[agent.unitClass] += 1;
    }
  }

  const waveEnded =
    after.phase === "intermission" ||
    after.phase === "victory" ||
    after.phase === "defeat" ||
    (after.phase === "draft" && after.phaseBeforeDraft !== "wave");
  if (waveEnded) {
    metrics.endAgents[waveIndex] = after.agents.filter(({ hp }) => hp > 0).length;
  }
}

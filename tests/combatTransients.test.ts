import assert from "node:assert/strict";
import test from "node:test";
import {
  createCombatTransientTracker,
  transientShakeTransform,
  type CombatTransientEvent,
  updateCombatTransients,
} from "../src/render/combatTransients";
import { drawRangedAttackEffects } from "../src/render/drawEffects";
import { createInitialState } from "../src/engine/tick";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { GameState } from "../src/engine/engine.types";

type StrokeOperation =
  | { readonly kind: "beginPath" | "stroke" }
  | { readonly kind: "lineTo" | "moveTo"; readonly x: number; readonly y: number }
  | { readonly kind: "setAlpha" | "setLineWidth"; readonly value: number }
  | { readonly kind: "setStrokeStyle"; readonly value: string };

class StrokeContext {
  private readonly recordedOperations: StrokeOperation[] = [];

  public set globalAlpha(value: number) {
    this.recordedOperations.push({ kind: "setAlpha", value });
  }

  public set lineWidth(value: number) {
    this.recordedOperations.push({ kind: "setLineWidth", value });
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setStrokeStyle", value: String(value) });
  }

  public beginPath(): void {
    this.recordedOperations.push({ kind: "beginPath" });
  }

  public moveTo(x: number, y: number): void {
    this.recordedOperations.push({ kind: "moveTo", x, y });
  }

  public lineTo(x: number, y: number): void {
    this.recordedOperations.push({ kind: "lineTo", x, y });
  }

  public stroke(): void {
    this.recordedOperations.push({ kind: "stroke" });
  }

  public operations(): readonly StrokeOperation[] {
    return this.recordedOperations;
  }
}

function canvasContext(context: StrokeContext): CanvasRenderingContext2D {
  return context as never as CanvasRenderingContext2D;
}

function waveState(tick: number): GameState {
  const state = createInitialState(9_009).state;
  return {
    ...state,
    phase: "wave",
    tick,
    activeThreat: {
      type: "monster_horde",
      waveIndex: 0,
      startTick: 1,
      daylightRaid: false,
      traitorHouseId: null,
      creatures: [
        {
          id: "creature_a",
          x: 700,
          y: 100,
          hp: BALANCE_CONFIG.CREATURE_HP,
          agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
          hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
          lastAttackTick: -1,
          haltedUntilTick: -1,
        },
      ],
      mage: null,
    },
  };
}

test("Given prior agent and threat positions, when both die, then death puffs use the previous position for ten ticks without duplicating", () => {
  const live = waveState(1);
  const firstAgent = live.agents.find(({ isHero }) => !isHero);
  if (firstAgent === undefined) {
    throw new RangeError("Expected a regular agent.");
  }
  let result = updateCombatTransients(live, createCombatTransientTracker());
  const liveThreat = live.activeThreat;
  if (liveThreat === null) {
    throw new RangeError("Expected an active threat.");
  }
  const dead = {
    ...live,
    tick: 2,
    agents: live.agents.map((agent) =>
      agent.id === firstAgent.id
        ? { ...agent, x: firstAgent.x + 40, y: firstAgent.y + 40, hp: 0, state: "dead" as const }
        : agent,
    ),
    activeThreat: {
      ...liveThreat,
      creatures: [],
    },
  };

  result = updateCombatTransients(dead, result.tracker);
  const repeated = updateCombatTransients(dead, result.tracker);
  const late = updateCombatTransients({ ...dead, tick: 12 }, repeated.tracker);

  const puffs = result.events.filter(
    (event): event is Extract<CombatTransientEvent, { kind: "death_puff" }> =>
      event.kind === "death_puff",
  );
  assert.deepEqual(
    puffs.map(({ id, x, y }) => ({ id, x, y })),
    [
      { id: `agent:${firstAgent.id}:2`, x: firstAgent.x, y: firstAgent.y },
      { id: "threat:creature_a:2", x: 700, y: 100 },
    ],
  );
  assert.equal(repeated.events.filter(({ kind }) => kind === "death_puff").length, 2);
  assert.equal(late.events.filter(({ kind }) => kind === "death_puff").length, 0);
});

test("Given a ranged attack effect, when it is drawn, then volley rendering is brighter and lasts exactly three ticks", () => {
  const effect = {
    attackerId: "agent_a",
    houseId: "house_a",
    fromX: 10,
    fromY: 20,
    toX: 30,
    toY: 40,
    startTick: 5,
    durationTicks: 4 as const,
  };
  const colors = new Map([["house_a", "#ffffff"]]);
  const strokesByTick = [5, 6, 7, 8].map((tick) => {
    const context = new StrokeContext();
    drawRangedAttackEffects(canvasContext(context), [effect], colors, tick);
    return context.operations();
  });

  assert.deepEqual(
    strokesByTick.map((operations) => operations.filter(({ kind }) => kind === "stroke").length),
    [1, 1, 1, 0],
  );
  assert.ok(
    strokesByTick[0]?.some(
      (operation) => operation.kind === "setLineWidth" && operation.value >= 1.4,
    ),
  );
  assert.ok(
    strokesByTick[0]?.some(
      (operation) => operation.kind === "setAlpha" && operation.value >= 0.85,
    ),
  );
});

test("Given hall damage and first danger threshold crossing, when transients update, then hall pulse and one shake are emitted with settings gating", () => {
  const live = waveState(3);
  let result = updateCombatTransients(live, createCombatTransientTracker());
  const wounded = {
    ...live,
    tick: 4,
    halls: live.halls.map((hall, index) =>
      index === 0 ? { ...hall, hp: hall.hp - 100 } : hall,
    ),
  };
  result = updateCombatTransients(wounded, result.tracker);
  const critical = {
    ...wounded,
    tick: 5,
    halls: wounded.halls.map((hall, index) =>
      index === 0 ? { ...hall, hp: Math.floor(hall.maxHp * 0.25) - 1 } : hall,
    ),
  };
  result = updateCombatTransients(critical, result.tracker);
  const repeated = updateCombatTransients(critical, result.tracker);

  assert.equal(result.events.filter(({ kind }) => kind === "hall_pulse").length, 1);
  assert.equal(result.events.filter(({ kind }) => kind === "shake").length, 1);
  assert.equal(repeated.events.filter(({ kind }) => kind === "shake").length, 1);
  assert.equal(transientShakeTransform(result.events, critical.tick, false), "");
  assert.match(transientShakeTransform(result.events, critical.tick, true), /^translate3d\(/);
});

test("Given night and daylight waves, when threat identity changes, then localized banner inputs are emitted only for active waves", () => {
  const empty = updateCombatTransients(
    createInitialState(44).state,
    createCombatTransientTracker(),
  );
  assert.equal(empty.events.length, 0);

  const night = waveState(10);
  let result = updateCombatTransients(night, createCombatTransientTracker());
  const daylight = {
    ...night,
    tick: 20,
    activeThreat: night.activeThreat === null
      ? null
      : {
          ...night.activeThreat,
          startTick: 20,
          daylightRaid: true,
          waveIndex: 1,
        },
  };
  result = updateCombatTransients(daylight, result.tracker);
  const terminal = updateCombatTransients(
    { ...daylight, phase: "victory", activeThreat: null, tick: 21 },
    result.tracker,
  );

  const banners = result.events.filter(
    (event): event is Extract<CombatTransientEvent, { kind: "wave_banner" }> =>
      event.kind === "wave_banner",
  );
  assert.deepEqual(
    banners.map(({ daylightRaid, wave }) => ({ daylightRaid, wave })),
    [{ daylightRaid: true, wave: 2 }],
  );
  assert.equal(terminal.events.length, 0);
});

test("Given the configured state shape, when keys are inspected, then render-only transients have not entered GameState", () => {
  assert.deepEqual(Object.keys(createInitialState(12).state), [
    "tick",
    "runSeed",
    "selectedHouseIds",
    "phase",
    "phaseBeforeDraft",
    "waveIndex",
    "tribute",
    "pendingDaylightRaid",
    "daylightRaidWaveNumbers",
    "houses",
    "halls",
    "agents",
    "activeThreat",
    "highlights",
    "divinePower",
    "miracleCooldowns",
    "unlockedSkills",
    "skillCooldowns",
    "activeEffects",
    "rangedAttackEffects",
    "houseProgress",
    "heroProgress",
    "houseModifiers",
    "runSharedModifiers",
    "houseBaseEffects",
    "activeSynergyIds",
    "betrayalHouseId",
    "heroLessWave2Clear",
    "pendingDrafts",
    "towers",
    "towerRubble",
    "shopPurchases",
    "runUpgrades",
    "lastWaveSummary",
    "waveStartSnapshot",
    "heroDeaths",
    "populationHistory",
  ]);
});

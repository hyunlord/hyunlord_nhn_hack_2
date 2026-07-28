import assert from "node:assert/strict";
import test from "node:test";
import { translate, type LocaleKey, type LocaleParams } from "../src/content/locale";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createInitialState } from "../src/engine/tick";
import {
  createCombatTransientTracker,
  type CombatTransientEvent,
  updateCombatTransients,
} from "../src/render/combatTransients";
import type { GameState } from "../src/engine/engine.types";

type WaveBannerEvent = Extract<CombatTransientEvent, { kind: "wave_banner" }>;

function tKo(key: LocaleKey, params?: LocaleParams): string {
  return translate("ko", key, params);
}

function tEn(key: LocaleKey, params?: LocaleParams): string {
  return translate("en", key, params);
}

function bannerEvents(
  events: readonly CombatTransientEvent[],
): readonly WaveBannerEvent[] {
  return events.filter(
    (event): event is WaveBannerEvent => event.kind === "wave_banner",
  );
}

function onlyBanner(events: readonly CombatTransientEvent[]): WaveBannerEvent {
  const banners = bannerEvents(events);
  assert.equal(banners.length, 1);
  const banner = banners[0];
  if (banner === undefined) {
    throw new RangeError("Expected one wave banner.");
  }
  return banner;
}

function waveState(
  tick: number,
  creatureIds: readonly string[],
  daylightRaid: boolean,
): GameState {
  const state = createInitialState(7_701).state;
  return {
    ...state,
    phase: "wave",
    tick,
    activeThreat: {
      type: "monster_horde",
      waveIndex: daylightRaid ? 1 : 0,
      startTick: tick,
      daylightRaid,
      traitorHouseId: null,
      creatures: creatureIds.map((id, index) => ({
        id,
        x: 700 + index * 10,
        y: 100,
        hp: BALANCE_CONFIG.CREATURE_HP,
        agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
        structureDamage: BALANCE_CONFIG.CREATURE_STRUCTURE_DAMAGE,
        lastAttackTick: -1,
        haltedUntilTick: -1,
      })),
      mage: null,
    },
  };
}

test("Given the first active night wave, when combat transients update twice, then one localized banner is emitted once with creature count", async () => {
  const initial = createCombatTransientTracker();
  const firstWave = waveState(1, ["creature_a", "creature_b"], false);

  const first = updateCombatTransients(firstWave, initial);
  const repeated = updateCombatTransients(firstWave, first.tracker);

  assert.deepEqual(
    bannerEvents(first.events).map(({ wave, daylightRaid, creatureCount }) => ({
      wave,
      daylightRaid,
      creatureCount,
    })),
    [{ wave: 1, daylightRaid: false, creatureCount: 2 }],
  );
  assert.deepEqual(bannerEvents(first.newEvents).map(({ id }) => id), [
    "wave:0:1",
  ]);
  assert.deepEqual(bannerEvents(repeated.newEvents), []);
  const { waveBannerText } = await import("../src/render/waveBannerText");
  assert.equal(
    waveBannerText(tEn, onlyBanner(first.events)),
    "Wave 1/3 · 2 creatures",
  );
});

test("Given a daylight raid wave, when the banner is formatted, then daylight text includes wave and creature count in Korean", async () => {
  const daylight = waveState(20, ["creature_a", "creature_b", "creature_c"], true);

  const result = updateCombatTransients(daylight, createCombatTransientTracker());

  assert.deepEqual(
    bannerEvents(result.events).map(({ wave, daylightRaid, creatureCount }) => ({
      wave,
      daylightRaid,
      creatureCount,
    })),
    [{ wave: 2, daylightRaid: true, creatureCount: 3 }],
  );
  const { waveBannerText } = await import("../src/render/waveBannerText");
  assert.equal(
    waveBannerText(tKo, onlyBanner(result.events)),
    "제2파 낮 습격 · 괴수 3체",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocaleProvider } from "../src/content/locale";
import type { RunSummary } from "../src/content/runSummary";
import { createInitialState } from "../src/engine/tick";
import {
  applyRunSummaryToMeta,
  createDefaultMetaState,
} from "../src/meta/legacy";
import { ShopOverlayView } from "../src/ui/components/ShopOverlay";
import { RunSummaryView } from "../src/ui/screens/RunSummaryScreen";

function renderKorean(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { language: "ko" }, element),
  );
}

function runSummary(): RunSummary {
  return {
    runId: "localized-summary",
    selectedHouseIds: ["house_a", "house_b", "house_c"],
    wavesCleared: 3,
    bestWaveReached: 3,
    victory: true,
    agentsStarted: 63,
    survivingAgents: 21,
    agentsLost: 42,
    keepHpRemaining: 2_000,
    bannerHpRemaining: 840,
    keepDamage: 100,
    bannerDamage: 420,
    bannersStarted: 3,
    survivingBanners: 2,
    towersBuilt: 2,
    noTowers: false,
    allBannersStanding: false,
    heroLessWave2Clear: false,
    betrayal: null,
    daylightRaidWaveNumbers: [],
    discoveredSynergyIds: [],
    populationHistory: [],
  };
}

test("Given Korean shop overlay with a last wave summary, when rendered server-side, then the summary is localized", () => {
  const initial = createInitialState(20260810).state;
  const state = {
    ...initial,
    phase: "intermission" as const,
    waveIndex: 0,
    tribute: 77,
    lastWaveSummary: {
      agentsLost: 4,
      keepDamage: 100,
      bannerDamage: 420,
      tributeEarned: 75,
    },
  };

  const html = renderKorean(
    createElement(ShopOverlayView, {
      availability: [],
      onBeginNextWave: () => undefined,
      onBuy: () => undefined,
      onCancelTowerPlacement: () => undefined,
      state,
      towerPlacementActive: false,
    }),
  );

  assert.match(html, /지난 밤 손실 4명/);
  assert.match(html, /성채 피해 100/);
  assert.match(html, /깃발 피해 420/);
  assert.match(html, /공물 75 획득/);
  assert.doesNotMatch(
    html,
    /Last night|keep damage|banner damage|tribute earned|Banners standing|Surviving banners/,
  );
});

test("Given Korean run summary, when rendered server-side, then banner labels do not fall back to English", () => {
  const summary = runSummary();
  const completion = applyRunSummaryToMeta(createDefaultMetaState(), summary);
  const html = renderKorean(
    createElement(RunSummaryView, {
      completion,
      dispatch: () => undefined,
      summary,
    }),
  );

  assert.match(html, /남은 깃발/);
  assert.match(html, /생존 깃발/);
  assert.doesNotMatch(
    html,
    /Banners standing|Surviving banners|Defenses standing|Surviving defenses/,
  );
});

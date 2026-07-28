import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { translate } from "../src/content/locale";

const CSS = readFileSync("src/index.css", "utf8");
const RUN_PRESENTATION_SOURCES = [
  readFileSync("src/ui/components/HUD.tsx", "utf8"),
  readFileSync("src/ui/components/hud/HeroProgressList.tsx", "utf8"),
  readFileSync("src/ui/components/hud/HouseStatusList.tsx", "utf8"),
  readFileSync("src/content/locale/cardEffects.ts", "utf8"),
  readFileSync("src/content/locale/composition.ts", "utf8"),
  readFileSync("src/content/locale/display.ts", "utf8"),
  readFileSync("src/content/locale/domainLabels.ts", "utf8"),
  readFileSync("src/content/locale/investmentDisplay.ts", "utf8"),
  readFileSync("src/content/locale/roleTally.ts", "utf8"),
] as const;

function escapedPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasForbiddenStringLiteral(source: string, forbidden: string): boolean {
  return new RegExp(`[\\\"'\\\`][^\\\"'\\\`\\n]*${escapedPattern(forbidden)}[^\\\"'\\\`\\n]*[\\\"'\\\`]`).test(source);
}

test("Given the run screen styles, when the viewport contract is inspected, then the battlefield is fixed and letterboxed without page scroll", () => {
  assert.match(CSS, /\.run-viewport\s*\{[\s\S]*width:\s*100dvw;/);
  assert.match(CSS, /\.run-viewport\s*\{[\s\S]*height:\s*100dvh;/);
  assert.match(CSS, /\.run-viewport\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(CSS, /\.run-stage\s*\{[\s\S]*width:\s*min\(100dvw,\s*calc\(100dvh \* 1\.6\)\)/);
  assert.match(CSS, /\.run-stage\s*\{[\s\S]*aspect-ratio:\s*8\s*\/\s*5;/);
  assert.match(CSS, /\.game-canvas\s*\{[\s\S]*width:\s*100%;/);
  assert.match(CSS, /\.game-canvas\s*\{[\s\S]*height:\s*100%;/);
});

test("Given run overlay styles, when regions are inspected, then HUD and actions use fixed battlefield anchors", () => {
  for (const className of [
    "run-hud-top-left",
    "run-hud-top-right",
    "run-hud-bottom-left",
    "run-hud-bottom-center",
    "run-hud-bottom-right",
  ] as const) {
    assert.match(CSS, new RegExp(`\\.${className}\\s*\\{[\\s\\S]*position:\\s*absolute;`));
  }
  assert.match(CSS, /\.run-hud-bottom-center\s*\{[\s\S]*left:\s*50%;/);
  assert.match(CSS, /\.miracle-button\s*\{[\s\S]*min-height:\s*44px;/);
  assert.match(CSS, /@media \(max-width:\s*520px\)\s*\{[\s\S]*\.draft-card-list\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
});

test("Given run-facing locale keys, when Korean and English strings are translated, then owned screens do not need hard-coded labels", () => {
  assert.equal(translate("ko", "run.phase.wave"), "밤 — 습격");
  assert.equal(translate("en", "run.phase.wave"), "Night — Assault");
  assert.equal(translate("ko", "shop.category.defense"), "방어");
  assert.equal(translate("en", "shop.beginNight", { wave: 2 }), "Night falls: wave 2");
  assert.equal(translate("ko", "run.daylightRaid.pending"), "다음 밤은 낮 습격으로 시작됩니다.");
});

test("Given run presentation source, when HUD and display helpers are scanned, then visible status and role copy is locale-owned", () => {
  for (const forbidden of [
    "No hero active",
    "Respawning in",
    "Dead",
    " HP",
    " composition",
    "병과 전용",
    "공격 속도",
    "이동 속도",
    "계열은 이 가문 구성에 없습니다",
  ] as const) {
    assert.equal(
      RUN_PRESENTATION_SOURCES.some((source) => hasForbiddenStringLiteral(source, forbidden)),
      false,
      `${forbidden} must come from locale tables or data labels`,
    );
  }
});

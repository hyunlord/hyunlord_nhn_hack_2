import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const designSource = readFileSync("DESIGN.md", "utf8");
const mainSource = readFileSync("src/main.tsx", "utf8");
const cssSource = readFileSync("src/styles/phase4b.css", "utf8");

function pureLineCount(source: string): number {
  return source
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("/*") && !line.trim().startsWith("*"))
    .length;
}

test("Given Phase 4B responsive styles, when imports are inspected, then the scoped CSS layer loads after the base sheet", () => {
  const baseIndex = mainSource.indexOf('import "./index.css";');
  const phase4bIndex = mainSource.indexOf('import "./styles/phase4b.css";');

  assert.ok(baseIndex >= 0);
  assert.ok(phase4bIndex > baseIndex);
  assert.ok(pureLineCount(cssSource) <= 250);
});

test("Given DESIGN.md, when Phase 4B tokens are inspected, then every new responsive surface token is documented", () => {
  const requiredTokens = [
    "--stronghold-ground-core",
    "--stronghold-ground-rim",
    "--composition-empty",
    "--composition-divider",
    "--choice-effect-text",
    "--choice-warning-text",
    "--combat-hit-flash",
    "--combat-death-puff",
    "--hall-pulse",
    "--wave-banner-ink",
    "--motion-quick",
    "--motion-combat",
    "--motion-ease",
  ] as const;

  for (const token of requiredTokens) {
    assert.match(designSource, new RegExp(token));
    assert.match(cssSource, new RegExp(token));
  }

  assert.match(designSource, /Stronghold ground and combat transients/);
  assert.match(designSource, /transform and opacity only/);
});

test("Given Phase 4B CSS, when responsive contracts are inspected, then choice surfaces wrap and targets stay at least 44px", () => {
  assert.match(cssSource, /html:has\(\.run-viewport\)[\s\S]*overflow: hidden/);
  assert.match(cssSource, /\.run-stage[\s\S]*max-width: 100dvw[\s\S]*max-height: 100dvh/);
  assert.match(cssSource, /\.draft-card,[\s\S]*\.shop-card,[\s\S]*min-height: 44px/);
  assert.match(cssSource, /\.draft-card__effect,[\s\S]*\.shop-card__effect,[\s\S]*overflow-wrap: anywhere/);
  assert.match(cssSource, /\.house-composition__bar,[\s\S]*min-width: 44px/);
});



test("Given a phone-width run stage, when draft and shop overlays open, then scoped CSS lets them occupy the viewport with internal scrolling", () => {
  const mobileBlock = cssSource.match(/@media \(max-width: 520px\) \{[\s\S]*\n\}/)?.[0] ?? "";

  assert.match(mobileBlock, /\.run-stage[\s\S]*contain: none[\s\S]*overflow: visible/);
  assert.match(mobileBlock, /\.draft-overlay,[\s\S]*\.shop-overlay:not\(\.shop-overlay--placing\)[\s\S]*position: fixed[\s\S]*inset: 0/);
  assert.match(mobileBlock, /\.draft-overlay,[\s\S]*\.shop-overlay:not\(\.shop-overlay--placing\)[\s\S]*width: 100dvw[\s\S]*height: 100dvh/);
  assert.match(mobileBlock, /\.draft-card-list[\s\S]*overflow-y: auto/);
  assert.match(mobileBlock, /\.shop-grid[\s\S]*overflow-y: auto/);
  assert.doesNotMatch(mobileBlock, /body[\s\S]*overflow: auto/);
});

test("Given Phase 4B motion CSS, when style text is scanned, then it preserves borders-only depth and GPU-composited motion", () => {
  assert.doesNotMatch(cssSource, /box-shadow/);
  assert.doesNotMatch(cssSource, /transition:[^;]*(?:width|height|top|left|margin|padding)/);
  assert.doesNotMatch(cssSource, /@keyframes[\s\S]*?(?:width|height|top|left|margin|padding)\s*:/);
  assert.match(cssSource, /transition:[\s\S]*transform var\(--motion-quick\)/);
  assert.match(cssSource, /filter var\(--motion-quick\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const INDEX_CSS = readFileSync("src/index.css", "utf8");
const PHASE_4B_CSS = readFileSync("src/styles/phase4b.css", "utf8");
const DRAFT_OVERLAY_SOURCE = readFileSync("src/ui/components/DraftOverlay.tsx", "utf8");

function cssBlock(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing CSS block for ${selector}`);
  const bodyStart = source.indexOf("{", start) + 1;
  let depth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      depth += 1;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, index);
      }
    }
  }
  assert.fail(`missing CSS block close for ${selector}`);
}

function cssMediaBlock(source: string, query: string): string {
  const start = source.indexOf(`@media ${query} {`);
  assert.notEqual(start, -1, `missing media query ${query}`);
  const bodyStart = source.indexOf("{", start) + 1;
  let depth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      depth += 1;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, index);
      }
    }
  }
  assert.fail(`missing media query close for ${query}`);
}

test("Given the run viewport is portrait, when CSS applies the narrow-aspect layout, then the stage fills the visual viewport", () => {
  const narrowAspect = cssMediaBlock(PHASE_4B_CSS, "(max-aspect-ratio: 8 / 5)");
  const stage = cssBlock(narrowAspect, ".run-stage");

  assert.match(stage, /width:\s*100dvw;/);
  assert.match(stage, /height:\s*100dvh;/);
  assert.match(stage, /max-width:\s*none;/);
  assert.match(stage, /max-height:\s*none;/);
  assert.match(stage, /aspect-ratio:\s*auto;/);
});

test("Given the run viewport is portrait, when CSS lays out the canvas, then the 8 by 5 battlefield is centered without distortion", () => {
  const narrowAspect = cssMediaBlock(PHASE_4B_CSS, "(max-aspect-ratio: 8 / 5)");
  const canvas = cssBlock(narrowAspect, ".run-stage .game-canvas");

  assert.match(canvas, /aspect-ratio:\s*8\s*\/\s*5;/);
  assert.match(canvas, /width:\s*min\(100dvw,\s*160dvh\);/);
  assert.match(canvas, /height:\s*auto;/);
  assert.match(canvas, /align-self:\s*center;/);
  assert.match(canvas, /justify-self:\s*center;/);
});

test("Given the run viewport is portrait, when HUD and overlays render, then they are anchored to the full viewport", () => {
  const narrowAspect = cssMediaBlock(PHASE_4B_CSS, "(max-aspect-ratio: 8 / 5)");
  const hud = cssBlock(narrowAspect, ".run-hud");
  const draftOverlay = cssBlock(narrowAspect, ".draft-overlay");
  const shopOverlay = cssBlock(narrowAspect, ".shop-overlay:not(.shop-overlay--placing)");

  assert.match(hud, /position:\s*fixed;/);
  assert.match(hud, /inset:\s*0;/);
  assert.match(hud, /pointer-events:\s*none;/);
  assert.match(draftOverlay, /position:\s*fixed;/);
  assert.match(draftOverlay, /width:\s*100dvw;/);
  assert.match(draftOverlay, /height:\s*100dvh;/);
  assert.match(shopOverlay, /position:\s*fixed;/);
  assert.match(shopOverlay, /width:\s*100dvw;/);
  assert.match(shopOverlay, /height:\s*100dvh;/);
});

test("Given the current run DOM, when the draft overlay opens, then inert selectors target current siblings", () => {
  assert.match(DRAFT_OVERLAY_SOURCE, /\.run-stage\s*>\s*:not\(\.draft-overlay\)/);
  assert.match(DRAFT_OVERLAY_SOURCE, /\.run-viewport\s*>\s*:not\(\.run-stage\)/);
  assert.doesNotMatch(DRAFT_OVERLAY_SOURCE, /\.canvas-panel/);
  assert.doesNotMatch(DRAFT_OVERLAY_SOURCE, /\.scaffold-grid/);
});

test("Given mobile overlays render at phone width, when CSS applies the phone breakpoint, then draft and shop content use one readable column", () => {
  const phone = cssMediaBlock(PHASE_4B_CSS, "(max-width: 520px)");

  assert.match(cssBlock(phone, ".draft-card-list"), /grid-template-columns:\s*1fr;/);
  assert.match(cssBlock(phone, ".shop-grid"), /grid-template-columns:\s*1fr;/);
});

test("Given the default landscape layout, when CSS is parsed, then the canvas keeps the established 8 by 5 aspect lock", () => {
  const canvas = cssBlock(INDEX_CSS, ".game-canvas");

  assert.match(canvas, /aspect-ratio:\s*8\s*\/\s*5;/);
  assert.match(canvas, /min-height:\s*240px;/);
});

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const INDEX_CSS = readFileSync("src/index.css", "utf8");
const PHASE5B_PATH = "src/styles/phase5b.css";
const PHASE5B_CSS = existsSync(PHASE5B_PATH) ? readFileSync(PHASE5B_PATH, "utf8") : "";
const MAIN = readFileSync("src/main.tsx", "utf8");
const HOUSE_SELECT = readFileSync("src/ui/screens/HouseSelectScreen.tsx", "utf8");
const DRAFT_OVERLAY = readFileSync("src/ui/components/DraftOverlay.tsx", "utf8");

const REQUIRED_TOKENS = {
  "--bg": "#0f0d14",
  "--surface": "#16131f",
  "--panel": "#1e1a2b",
  "--panel-raised": "#262034",
  "--border": "#3a3350",
  "--border-strong": "#4d4468",
  "--text": "#e8e4f0",
  "--muted": "#9b93ad",
  "--dim": "#6d6580",
  "--divine": "#63c9c2",
  "--gold": "#d9b544",
  "--danger": "#d4693f",
  "--threat": "#8c5ec0",
  "--world": "#1a1613",
} as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    return statSync(entryPath).isDirectory() ? sourceFiles(entryPath) : [entryPath];
  });
}

test("Given the approved Phase 5B palette, when root styles are inspected, then every canonical dark token is exact", () => {
  for (const [token, value] of Object.entries(REQUIRED_TOKENS)) {
    assert.match(INDEX_CSS, new RegExp(`${token}:\\s*${value};`, "i"), `${token} must be ${value}`);
  }
});

test("Given the approved typography, when styles load, then Korean serif display and sans body fonts swap safely", () => {
  assert.match(INDEX_CSS, /family=Noto\+Sans\+KR:wght@400;600&family=Noto\+Serif\+KR:wght@600;800&display=swap/);
  assert.match(INDEX_CSS, /--font-display:\s*"Noto Serif KR"/);
  assert.match(INDEX_CSS, /--font-body:\s*"Noto Sans KR"/);
});

test("Given menu presentation, when Phase 5B styles load last, then field art, 9-slice panels, and reduced motion are owned centrally", () => {
  assert.match(MAIN, /import "\.\/styles\/phase5b\.css";/);
  assert.match(PHASE5B_CSS, /background_field\.png/);
  assert.match(PHASE5B_CSS, /border-image-source:\s*url\(["']?\/assets\/ui\/panel_frame\.png["']?\)/);
  assert.match(PHASE5B_CSS, /border-image-slice:\s*64\s+fill/);
  assert.match(PHASE5B_CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("Given source presentation colors, when files are scanned, then obsolete light surfaces are absent", () => {
  const forbidden = /#(?:f4f1e8|fffdf6|fff8df)\b/i;
  const violations = sourceFiles("src")
    .filter((file) => /\.(?:css|ts|tsx)$/.test(file))
    .filter((file) => forbidden.test(readFileSync(file, "utf8")));
  assert.deepEqual(violations, []);
});

test("Given the broad light-color scan, when protected gameplay config is excluded, then presentation source has no hardcoded near-white values", () => {
  const broadLight = /#f[0-9a-f]{5}\b|#fff\b/i;
  const violations = sourceFiles("src")
    .filter((file) => /\.(?:css|ts|tsx)$/.test(file))
    .filter((file) => broadLight.test(readFileSync(file, "utf8")));
  assert.deepEqual(violations, ["src/divine/miracleTypes.ts"]);
});

test("Given framed choices, when their source is inspected, then transparent art and proportional safe regions own the composition", () => {
  assert.doesNotMatch(HOUSE_SELECT, /backgroundRepeat:\s*"no-repeat,\s*repeat"/);
  assert.doesNotMatch(DRAFT_OVERLAY, /backgroundRepeat:\s*"no-repeat,\s*repeat"/);
  assert.match(PHASE5B_CSS, /--house-safe-inline:\s*13\.5417%/);
  assert.match(PHASE5B_CSS, /--house-safe-top:\s*16\.0156%/);
  assert.match(PHASE5B_CSS, /--draft-safe-inline:\s*7\.8125%/);
  assert.match(PHASE5B_CSS, /--draft-safe-block:\s*7\.2917%/);
});

test("Given dark menu screens, when legacy selectors compete, then critical headings remain readable and each screen keeps one kicker", () => {
  assert.match(PHASE5B_CSS, /\.title-card__identity h1\s*\{[\s\S]*color:\s*var\(--text\)/);
  assert.match(PHASE5B_CSS, /\.settings-screen \.screen-header h1[\s\S]*color:\s*var\(--text\)/);
  assert.match(PHASE5B_CSS, /\.settings-screen \.section-heading h2[\s\S]*color:\s*var\(--text\)/);
  assert.match(PHASE5B_CSS, /\[data-screen="meta"\] \.ledger-section \.eyebrow[\s\S]*display:\s*none/);
  assert.match(PHASE5B_CSS, /\[data-screen="summary"\] \.legacy-award > \.eyebrow[\s\S]*display:\s*none/);
});

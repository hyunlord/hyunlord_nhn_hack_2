import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const DESIGN = readFileSync("DESIGN.md", "utf8");
const HOUSE_SOURCE = readFileSync(
  "src/ui/screens/HouseSelectScreen.tsx",
  "utf8",
);
const DRAFT_SOURCE = readFileSync(
  "src/ui/components/DraftOverlay.tsx",
  "utf8",
);
const SHOP_SOURCE = readFileSync(
  "src/ui/components/ShopOverlay.tsx",
  "utf8",
);
const CSS = readFileSync("src/styles/phase5b.css", "utf8");

test("Given the approved Phase 5C direction, when the design contract is read, then the three-card progressive-disclosure grammar is explicit", () => {
  assert.match(DESIGN, /three-card deck/i);
  assert.match(DESIGN, /population cluster/i);
  assert.match(DESIGN, /shared effect icon/i);
  assert.match(DESIGN, /focus detail panel/i);
  assert.match(DESIGN, /scroll snap/i);
});

test("Given a default house card, when its source is inspected, then numeric composition tracks are not rendered", () => {
  assert.doesNotMatch(HOUSE_SOURCE, /selection-composition__track/);
  assert.doesNotMatch(HOUSE_SOURCE, /Math\.round\(percent\)/);
});

test("Given a default draft card, when its source is inspected, then rarity description and stack rows are not visible", () => {
  assert.doesNotMatch(DRAFT_SOURCE, /cardRarityLabel/);
  assert.doesNotMatch(DRAFT_SOURCE, /draft-card__description/);
  assert.doesNotMatch(DRAFT_SOURCE, /draft-card__stacks/);
});

test("Given a default shop card, when its source is inspected, then prose count and nested purchase controls are absent", () => {
  assert.doesNotMatch(SHOP_SOURCE, /shop-card__count/);
  assert.doesNotMatch(SHOP_SOURCE, /descriptionKey/);
  assert.doesNotMatch(
    SHOP_SOURCE,
    /<article className="shop-card">[\s\S]*?<button/,
  );
});

test("Given the shared deck, when responsive styles are inspected, then three-card and one-card snap geometries both exist", () => {
  assert.match(CSS, /\.choice-deck\s*\{/);
  assert.match(CSS, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(CSS, /scroll-snap-type:\s*x mandatory/);
  assert.match(CSS, /scroll-snap-align:\s*center/);
});

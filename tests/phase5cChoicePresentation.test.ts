import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const DESIGN = readFileSync("DESIGN.md", "utf8");

test("the approved Phase 5C design contract records the progressive-disclosure grammar", () => {
  assert.match(DESIGN, /three-card deck/i);
  assert.match(DESIGN, /population cluster/i);
  assert.match(DESIGN, /shared effect icon/i);
  assert.match(DESIGN, /focus detail panel/i);
  assert.match(DESIGN, /scroll snap/i);
});

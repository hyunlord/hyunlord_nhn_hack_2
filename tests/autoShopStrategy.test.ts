import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/engine/tick";
import {
  runRoundRobinShop,
  type AutoShopState,
} from "../scripts/autoShopStrategy";

function intermissionState(tribute: number) {
  const initial = createInitialState(9301).state;
  const fallenIds = new Set(
    initial.agents
      .filter(({ isHero }) => !isHero)
      .slice(0, 8)
      .map(({ id }) => id),
  );
  return {
    ...initial,
    phase: "intermission" as const,
    tribute,
    agents: initial.agents.map((agent, index) =>
      fallenIds.has(agent.id)
        ? { ...agent, hp: 0, state: "dead" as const }
        : index < 20
          ? { ...agent, hp: Math.max(1, agent.hp - 40) }
          : agent,
    ),
    banners: initial.banners.map((banner, index) =>
      index === 0 ? { ...banner, hp: banner.hp - 350 } : banner,
    ),
  };
}

test("Given ample tribute, when the deterministic auto-shop runs, then it repeats categories and builds more than one tower", () => {
  const strategy: AutoShopState = { nextCategoryIndex: 0 };
  const result = runRoundRobinShop(intermissionState(1_000), strategy);

  assert.ok(result.state.shopPurchases.raise_tower > 1);
  assert.ok(result.state.tribute < 1_000);
  assert.ok(result.diagnostics.raise_tower.succeeded > 1);
  assert.ok(
    Object.values(result.diagnostics).every(
      ({ attempted }) => attempted > 0,
    ),
  );
});

test("Given the same state and cursor, when the auto-shop runs twice, then output and diagnostics are replay-equal", () => {
  const state = intermissionState(460);
  const strategy: AutoShopState = { nextCategoryIndex: 2 };

  assert.deepEqual(
    runRoundRobinShop(state, strategy),
    runRoundRobinShop(state, strategy),
  );
});

test("Given a previous shop cursor, when the next intermission runs, then the returned cursor continues round-robin order", () => {
  const first = runRoundRobinShop(intermissionState(220), {
    nextCategoryIndex: 0,
  });
  const second = runRoundRobinShop(intermissionState(220), first.strategy);

  assert.notEqual(first.strategy.nextCategoryIndex, 0);
  assert.notEqual(second.diagnostics.raise_tower.attempted, 0);
});

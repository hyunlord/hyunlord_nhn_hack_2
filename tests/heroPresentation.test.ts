import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { HERO_DEFINITIONS } from "../src/content/heroConfig";
import { LocaleProvider, translate } from "../src/content/locale";
import { EMPTY_STARTING_MODIFIER_BUNDLE } from "../src/content/runConfiguration";
import { maxHpForAgent } from "../src/engine/heroEngine";
import { modifiersForAgent } from "../src/engine/progressionEngine";
import { createInitialState } from "../src/engine/tick";
import { createHeroRenderTracker, projectHeroRenderState } from "../src/render/heroRenderProjection";
import { GameStoreProvider } from "../src/state/gameStore";
import { HUD } from "../src/ui/components/HUD";

test("Given a living hero moves before dying, when render projection updates, then the fall-site uses the previous living coordinates and clears on respawn", () => {
  const state = createInitialState(77).state;
  const hero = state.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (hero === undefined) {
    throw new RangeError("Expected Ashvale hero.");
  }
  const living = { ...state, tick: 10, agents: state.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 321, y: 222, hp: 40 } : agent) };
  let projection = projectHeroRenderState(living, createHeroRenderTracker());
  const dead = {
    ...living,
    tick: 11,
    agents: living.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 480, y: 185, hp: 0, state: "dead" as const, respawnAtTick: 611 } : agent),
  };

  projection = projectHeroRenderState(dead, projection.tracker);

  assert.deepEqual(projection.fallenHeroes.map(({ heroId, x, y, respawnTicksRemaining }) => ({ heroId, x, y, respawnTicksRemaining })), [
    { heroId: "hero_ashvale", x: 321, y: 222, respawnTicksRemaining: 600 },
  ]);
  assert.equal(projection.livingHeroes.some(({ agent }) => agent.heroId === "hero_ashvale"), false);

  const respawned = {
    ...dead,
    tick: 612,
    agents: dead.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 480, y: 185, hp: 50, state: "idle" as const, respawnAtTick: null } : agent),
  };
  projection = projectHeroRenderState(respawned, projection.tracker);

  assert.equal(projection.fallenHeroes.some(({ heroId }) => heroId === "hero_ashvale"), false);
  assert.equal(projection.livingHeroes.some(({ agent }) => agent.heroId === "hero_ashvale"), true);
});

test("Given disabled respawn leaves a dead hero, when projection updates after the due tick, then countdown stays nonnegative and the marker remains stable", () => {
  const state = createInitialState(78).state;
  const hero = state.agents.find(({ heroId }) => heroId === "hero_greymoor");
  if (hero === undefined) {
    throw new RangeError("Expected Greymoor hero.");
  }
  let projection = projectHeroRenderState({ ...state, tick: 20, agents: state.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 111, y: 333, hp: 20 } : agent) }, createHeroRenderTracker());
  const dead = { ...state, tick: 999, agents: state.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 580, y: 358, hp: 0, state: "dead" as const, respawnAtTick: 800 } : agent) };
  projection = projectHeroRenderState(dead, projection.tracker);

  assert.deepEqual(projection.fallenHeroes.map(({ x, y, respawnTicksRemaining }) => ({ x, y, respawnTicksRemaining })), [{ x: 111, y: 333, respawnTicksRemaining: 0 }]);
});

test("Given Greymoor aura modifiers, when projection resolves living heroes, then Ivy uses the effective aura radius", () => {
  const state = createInitialState(79).state;
  const ivy = state.agents.find(({ heroId }) => heroId === "hero_greymoor");
  const definition = HERO_DEFINITIONS.find(({ id }) => id === "hero_greymoor");
  if (ivy === undefined || definition === undefined) {
    throw new RangeError("Expected Ivy fixture.");
  }
  const boosted = {
    ...state,
    houseBaseEffects: state.houseBaseEffects.map((entry) =>
      entry.houseId === ivy.houseId
        ? { ...entry, effects: [{ heroAuraRadiusBonus: 35 }] }
        : entry,
    ),
  };

  const projection = projectHeroRenderState(boosted, createHeroRenderTracker());
  const ivyProjection = projection.livingHeroes.find(({ agent }) => agent.id === ivy.id);

  assert.equal(ivyProjection?.auraRadius, definition.auraRadius + 35);
});

test("Given localized hero identity, when translations and the HUD render, then roles and status are locale-owned and visible", () => {
  assert.equal(translate("ko", "hero.hero_ashvale.role"), "결투가");
  assert.equal(translate("ko", "hero.hero_thornhold.role"), "방벽");
  assert.equal(translate("ko", "hero.hero_greymoor.role"), "지원");

  const html = renderToString(
    createElement(
      GameStoreProvider,
      {
        houseIds: ["house_a", "house_b", "house_c"],
        onTerminal: () => {},
        seed: 80,
        startingModifiers: EMPTY_STARTING_MODIFIER_BUNDLE,
      },
      createElement(LocaleProvider, { language: "ko" }, createElement(HUD)),
    ),
  );

  assert.match(html, /불씨의 세라/);
  assert.match(html, /결투가/);
  assert.match(html, /철맹의 브렌/);
  assert.match(html, /방벽/);
  assert.match(html, /가시노래 아이비/);
  assert.match(html, /지원/);
  assert.match(html, /HP/);
});

test("Given living heroes in projection, when effective max HP is resolved, then labels can always show HP without engine state additions", () => {
  const state = createInitialState(81).state;
  const projection = projectHeroRenderState(state, createHeroRenderTracker());
  assert.equal(projection.livingHeroes.length, 3);
  for (const { agent, maxHp } of projection.livingHeroes) {
    assert.equal(maxHp, maxHpForAgent(agent, modifiersForAgent(state, agent)));
  }
});

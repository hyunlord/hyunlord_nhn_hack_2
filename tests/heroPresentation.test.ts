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
import { drawHeroes } from "../src/render/drawHeroes";
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


type HeroDrawOperation =
  | { readonly kind: "arc"; readonly x: number; readonly y: number; readonly radius: number; readonly startAngle: number; readonly endAngle: number }
  | { readonly kind: "fillText"; readonly text: string; readonly x: number; readonly y: number }
  | { readonly kind: "setFillStyle" | "setStrokeStyle"; readonly value: string }
  | { readonly kind: "setAlpha" | "setLineWidth"; readonly value: number }
  | { readonly kind: "beginPath" | "fill" | "lineTo" | "moveTo" | "restore" | "save" | "stroke" };

class HeroRecordingContext {
  private readonly recordedOperations: HeroDrawOperation[] = [];
  public globalCompositeOperation: GlobalCompositeOperation = "source-over";
  public imageSmoothingEnabled = false;

  public set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setFillStyle", value: String(value) });
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setStrokeStyle", value: String(value) });
  }

  public set globalAlpha(value: number) {
    this.recordedOperations.push({ kind: "setAlpha", value });
  }

  public set lineWidth(value: number) {
    this.recordedOperations.push({ kind: "setLineWidth", value });
  }

  public set font(_value: string) {}
  public set textAlign(_value: CanvasTextAlign) {}
  public set textBaseline(_value: CanvasTextBaseline) {}

  public beginPath(): void {
    this.recordedOperations.push({ kind: "beginPath" });
  }

  public fill(): void {
    this.recordedOperations.push({ kind: "fill" });
  }

  public fillRect(_x: number, _y: number, _width: number, _height: number): void {}

  public fillText(text: string, x: number, y: number): void {
    this.recordedOperations.push({ kind: "fillText", text, x, y });
  }

  public lineTo(): void {
    this.recordedOperations.push({ kind: "lineTo" });
  }

  public measureText(text: string): { readonly width: number } {
    return { width: text.length * 6 };
  }

  public moveTo(): void {
    this.recordedOperations.push({ kind: "moveTo" });
  }

  public restore(): void {
    this.recordedOperations.push({ kind: "restore" });
  }

  public save(): void {
    this.recordedOperations.push({ kind: "save" });
  }

  public scale(_x: number, _y: number): void {}
  public setLineDash(_segments: readonly number[]): void {}
  public translate(_x: number, _y: number): void {}

  public stroke(): void {
    this.recordedOperations.push({ kind: "stroke" });
  }

  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
    this.recordedOperations.push({ kind: "arc", x, y, radius, startAngle, endAngle });
  }

  public operations(): readonly HeroDrawOperation[] {
    return this.recordedOperations;
  }
}

function heroFillTexts(context: HeroRecordingContext): readonly string[] {
  return context.operations()
    .filter((operation): operation is Extract<HeroDrawOperation, { readonly kind: "fillText" }> => operation.kind === "fillText")
    .map(({ text }) => text);
}

test("Given Sera crosses the field, when render projection tracks her, then the trail caps at six ordered points and resets on death or run change", () => {
  let projection = projectHeroRenderState(createInitialState(201).state, createHeroRenderTracker());
  const base = createInitialState(201).state;
  const sera = base.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (sera === undefined) {
    throw new RangeError("Expected Sera fixture.");
  }
  let movingState = base;

  for (let index = 0; index < 8; index += 1) {
    movingState = {
      ...base,
      tick: index + 1,
      agents: base.agents.map((agent) => agent.id === sera.id ? { ...agent, x: 200 + index, y: 210 + index } : agent),
    };
    projection = projectHeroRenderState(movingState, projection.tracker);
  }
  const tracked = projection.livingHeroes.find(({ agent }) => agent.id === sera.id);
  assert.deepEqual(tracked?.trail.map(({ x, y }) => ({ x, y })), [
    { x: 202, y: 212 },
    { x: 203, y: 213 },
    { x: 204, y: 214 },
    { x: 205, y: 215 },
    { x: 206, y: 216 },
    { x: 207, y: 217 },
  ]);

  const repeated = projectHeroRenderState(movingState, projection.tracker);
  const repeatedSera = repeated.livingHeroes.find(({ agent }) => agent.id === sera.id);
  assert.deepEqual(repeatedSera?.trail, tracked?.trail);

  const dead = projectHeroRenderState({
    ...base,
    tick: 20,
    agents: base.agents.map((agent) => agent.id === sera.id ? { ...agent, hp: 0, state: "dead" as const, respawnAtTick: 620 } : agent),
  }, projection.tracker);
  assert.equal(dead.tracker.trailsByHeroId.get("hero_ashvale")?.length ?? 0, 0);

  const nextRun = createInitialState(202).state;
  const reset = projectHeroRenderState(nextRun, projection.tracker);
  const resetSera = reset.livingHeroes.find(({ agent }) => agent.heroId === "hero_ashvale");
  if (resetSera === undefined) {
    throw new RangeError("Expected reset Sera projection.");
  }
  assert.deepEqual(resetSera.trail, [{ x: resetSera.agent.x, y: resetSera.agent.y }]);
});

test("Given living and fallen heroes, when hero rendering draws labels, then living labels produce no text while fall countdown remains text", () => {
  const state = createInitialState(203).state;
  const livingProjection = projectHeroRenderState(state, createHeroRenderTracker());
  const livingContext = new HeroRecordingContext();

  drawHeroes(livingContext, livingProjection, state.tick, () => "LIVING LABEL");

  assert.deepEqual(heroFillTexts(livingContext), []);

  const hero = state.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (hero === undefined) {
    throw new RangeError("Expected Ashvale hero.");
  }
  const primed = projectHeroRenderState({
    ...state,
    tick: 1,
    agents: state.agents.map((agent) => agent.id === hero.id ? { ...agent, x: 321, y: 222 } : agent),
  }, createHeroRenderTracker());
  const fallen = projectHeroRenderState({
    ...state,
    tick: 2,
    agents: state.agents.map((agent) => agent.id === hero.id ? { ...agent, hp: 0, state: "dead" as const, respawnAtTick: 122 } : agent),
  }, primed.tracker);
  const fallenContext = new HeroRecordingContext();

  drawHeroes(fallenContext, fallen, state.tick, () => "LIVING LABEL", (ticks) => `${ticks} ticks`);

  assert.deepEqual(heroFillTexts(fallenContext), ["120 ticks"]);
});

test("Given hero projection reads threats and allies, when it resolves render-only presentation state, then Bren arc, Ivy pulse, ally brightness, and Sera trail are deterministic", () => {
  const state = createInitialState(204).state;
  const ivy = state.agents.find(({ heroId }) => heroId === "hero_greymoor");
  const bren = state.agents.find(({ heroId }) => heroId === "hero_thornhold");
  const ally = state.agents.find((agent) => !agent.isHero && agent.houseId === "house_c");
  if (ivy === undefined || bren === undefined || ally === undefined) {
    throw new RangeError("Expected Ivy, Bren, and a Greymoor ally.");
  }
  const projectedState = {
    ...state,
    tick: 37,
    activeThreat: {
      type: "monster_horde" as const,
      waveIndex: 0,
      startTick: 0,
      creatures: [{
        id: "creature_front",
        x: bren.x + 100,
        y: bren.y,
        hp: 100,
        agentDamage: 1,
        structureDamage: 1,
        lastAttackTick: -1,
        haltedUntilTick: -1,
      }],
      mage: null,
      traitorHouseId: null,
    },
    agents: state.agents.map((agent) => {
      if (agent.id === ivy.id) {
        return { ...agent, x: 300, y: 300 };
      }
      if (agent.id === ally.id) {
        return { ...agent, x: 350, y: 300 };
      }
      return agent;
    }),
  };

  const first = projectHeroRenderState(projectedState, createHeroRenderTracker());
  const second = projectHeroRenderState(projectedState, createHeroRenderTracker());
  const brenProjection = first.livingHeroes.find(({ agent }) => agent.heroId === "hero_thornhold");
  const ivyProjection = first.livingHeroes.find(({ agent }) => agent.heroId === "hero_greymoor");
  const seraProjection = first.livingHeroes.find(({ agent }) => agent.heroId === "hero_ashvale");

  assert.equal(brenProjection?.frontArc?.targetId, "creature_front");
  assert.ok((brenProjection?.frontArc?.direction.x ?? 0) > 0.99);
  const secondIvy = second.livingHeroes.find(({ agent }) => agent.heroId === "hero_greymoor");
  if (ivyProjection?.auraPulse === null || ivyProjection?.auraPulse === undefined || secondIvy?.auraPulse === null || secondIvy?.auraPulse === undefined) {
    throw new RangeError("Expected Ivy aura pulse projection.");
  }
  assert.equal(ivyProjection.auraPulse.radius, secondIvy.auraPulse.radius);
  assert.ok(ivyProjection.auraPulse.radius > ivyProjection.auraRadius);
  assert.ok(first.brightenedAgentIds.includes(ally.id));
  assert.deepEqual(seraProjection?.trail, second.livingHeroes.find(({ agent }) => agent.heroId === "hero_ashvale")?.trail);
});

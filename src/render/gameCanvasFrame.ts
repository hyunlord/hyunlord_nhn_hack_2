import type { GameState } from "../engine/engine.types";
import type { LocaleKey, LocaleParams } from "../content/locale";
import { heroName } from "../content/locale/display";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { CombatTransientTracker } from "./combatTransients";
import {
  transientShakeTransform,
  updateCombatTransients,
} from "./combatTransients";
import { drawAgents } from "./drawAgents";
import { drawBackground } from "./drawBackground";
import { dayNightFactor, type DayNightTracker } from "./dayNight";
import {
  drawCombatTransients,
  drawEffects,
  drawRangedAttackEffects,
} from "./drawEffects";
import { drawHalls } from "./drawHalls";
import { drawHeroes } from "./drawHeroes";
import {
  projectHeroRenderState,
  type HeroRenderTracker,
} from "./heroRenderProjection";
import { drawThreats } from "./drawThreats";
import {
  drawTowerPreview,
  drawTowerRubble,
  drawTowers,
} from "./drawTowers";
import { waveBannerText } from "./waveBannerText";

type Translate = (key: LocaleKey, params?: LocaleParams) => string;
type TowerPreview = { readonly x: number; readonly y: number } | null;

interface PlacementState {
  readonly active: boolean;
  readonly preview: TowerPreview;
}

interface DrawGameCanvasFrameInput {
  readonly context: CanvasRenderingContext2D;
  readonly devicePixelRatio: number;
  readonly currentState: GameState;
  readonly dayNightTracker: DayNightTracker | undefined;
  readonly transientTracker: CombatTransientTracker;
  readonly heroTracker: HeroRenderTracker;
  readonly wrapper: HTMLDivElement | null;
  readonly screenShakeEnabled: boolean;
  readonly placement: PlacementState;
  readonly translate: Translate;
}

export interface DrawGameCanvasFrameResult {
  readonly dayNightTracker: DayNightTracker | undefined;
  readonly transientTracker: CombatTransientTracker;
  readonly heroTracker: HeroRenderTracker;
}

export function drawGameCanvasFrame(
  input: DrawGameCanvasFrameInput,
): DrawGameCanvasFrameResult {
  input.context.setTransform(
    input.devicePixelRatio,
    0,
    0,
    input.devicePixelRatio,
    0,
    0,
  );
  input.context.clearRect(
    0,
    0,
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
  );
  const transientResult = updateCombatTransients(
    input.currentState,
    input.transientTracker,
  );
  setWrapperShake(input, transientResult.events);
  const lighting = dayNightFactor(
    {
      phase: input.currentState.phase,
      phaseBeforeDraft: input.currentState.phaseBeforeDraft,
      tick: input.currentState.tick,
    },
    input.dayNightTracker,
    { daylightRaidActive: input.currentState.activeThreat?.daylightRaid === true },
  );

  const heroProjection = projectHeroRenderState(
    input.currentState,
    input.heroTracker,
  );
  drawWorld(input, lighting.factor, transientResult.events, heroProjection);
  return {
    dayNightTracker: lighting.tracker,
    transientTracker: transientResult.tracker,
    heroTracker: heroProjection.tracker,
  };
}

function drawWorld(
  input: DrawGameCanvasFrameInput,
  lightingFactor: number,
  events: ReturnType<typeof updateCombatTransients>["events"],
  heroProjection: ReturnType<typeof projectHeroRenderState>,
): void {
  const { context, currentState, translate } = input;
  drawBackground(
    context,
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    lightingFactor,
  );
  drawHalls(context, currentState.halls, currentState.houses, true, translate);
  drawTowers(context, currentState.towers);
  drawTowerRubble(context, currentState.towerRubble, currentState.tick);
  drawAgents(
    context,
    currentState.agents,
    currentState.houses,
    currentState.tick,
    lightingFactor,
    heroProjection.brightenedAgentIds,
  );
  drawHeroes(
    context,
    heroProjection,
    currentState.tick,
    (heroId, level) =>
      translate("canvas.heroLabel", {
        hero: heroName(translate, heroId),
        level,
      }),
    (ticksRemaining) =>
      translate("canvas.heroRespawnCountdown", {
        seconds: Math.ceil(
          ticksRemaining / BALANCE_CONFIG.TICKS_PER_SECOND,
        ),
      }),
  );
  drawThreats(context, currentState.activeThreat, currentState.tick);
  drawRangedAttackEffects(
    context,
    currentState.rangedAttackEffects,
    new Map(currentState.houses.map(({ id, color }) => [id, color])),
    currentState.tick,
  );
  drawEffects(context, currentState.activeEffects, currentState.tick);
  drawCombatTransients(
    context,
    events,
    currentState.tick,
    (event) => waveBannerText(translate, event),
  );
  if (input.placement.active) {
    drawTowerPreview(
      context,
      input.placement.preview,
      currentState.towers,
      currentState.halls,
    );
  }
}

function setWrapperShake(
  input: DrawGameCanvasFrameInput,
  events: ReturnType<typeof updateCombatTransients>["events"],
): void {
  if (input.wrapper !== null) {
    input.wrapper.style.transform = transientShakeTransform(
      events,
      input.currentState.tick,
      input.screenShakeEnabled,
    );
  }
}

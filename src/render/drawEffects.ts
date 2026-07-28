import type { CombatTransientEvent } from "./combatTransients";
import { CANVAS_VISUAL_TOKENS } from "./visualTokens";

interface DivineVisualEffect {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly startTick: number;
  readonly durationTicks: number;
}

export type RangedAttackDrawingContext = Pick<
  CanvasRenderingContext2D,
  | "beginPath"
  | "globalAlpha"
  | "lineTo"
  | "lineWidth"
  | "moveTo"
  | "stroke"
  | "strokeStyle"
>;

export type CombatTransientDrawingContext = Pick<
  CanvasRenderingContext2D,
  | "arc"
  | "beginPath"
  | "fill"
  | "fillStyle"
  | "fillText"
  | "font"
  | "globalAlpha"
  | "lineWidth"
  | "stroke"
  | "strokeStyle"
  | "textAlign"
  | "textBaseline"
>;

export function drawRangedAttackEffects(
  context: RangedAttackDrawingContext,
  effects: readonly {
    readonly houseId: string;
    readonly fromX: number;
    readonly fromY: number;
    readonly toX: number;
    readonly toY: number;
    readonly startTick: number;
    readonly durationTicks: number;
  }[],
  colorsByHouse: ReadonlyMap<string, string>,
  currentTick: number,
): void {
  const visibleVolleyTicks = 3;
  context.lineWidth = 1.4;
  for (const effect of effects) {
    const age = currentTick - effect.startTick;
    if (age < 0 || age >= visibleVolleyTicks) {
      continue;
    }
    const color = colorsByHouse.get(effect.houseId);
    if (color === undefined) {
      continue;
    }
    context.beginPath();
    context.moveTo(effect.fromX, effect.fromY);
    context.lineTo(effect.toX, effect.toY);
    context.globalAlpha = 0.95 * (1 - age / visibleVolleyTicks);
    context.strokeStyle = color;
    context.stroke();
  }
  context.globalAlpha = 1;
}

export function drawCombatTransients(
  context: CombatTransientDrawingContext,
  events: readonly CombatTransientEvent[],
  currentTick: number,
  bannerText: (event: Extract<CombatTransientEvent, { kind: "wave_banner" }>) => string,
): void {
  for (const event of events) {
    const age = currentTick - event.startTick;
    if (age < 0 || age >= event.durationTicks) {
      continue;
    }
    const progress = age / event.durationTicks;
    if (event.kind === "death_puff") {
      drawDeathPuff(context, event, progress);
    } else if (event.kind === "hall_pulse") {
      drawHallPulse(context, event, progress);
    } else if (event.kind === "wave_banner") {
      drawWaveBanner(context, bannerText(event), progress);
    }
  }
  context.globalAlpha = 1;
}

export function drawEffects(
  context: CanvasRenderingContext2D,
  effects: readonly DivineVisualEffect[],
  currentTick: number,
): void {
  for (const effect of effects) {
    const progress = Math.min(
      1,
      Math.max(
        0,
        (currentTick - effect.startTick) / effect.durationTicks,
      ),
    );
    const radius = effect.radius * (0.2 + progress * 0.8);
    const strokeAlpha = Math.max(0.4, 0.9 * (1 - progress));
    const fillAlpha = Math.max(0.15, 0.24 * (1 - progress));

    context.beginPath();
    context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    context.globalAlpha = fillAlpha;
    context.fillStyle = effect.color;
    context.fill();
    context.globalAlpha = strokeAlpha;
    context.lineWidth = 2;
    context.strokeStyle = effect.color;
    context.stroke();
  }

  context.globalAlpha = 1;
}

function drawDeathPuff(
  context: CombatTransientDrawingContext,
  event: Extract<CombatTransientEvent, { kind: "death_puff" }>,
  progress: number,
): void {
  const radius = 7 + progress * 15;
  context.beginPath();
  context.arc(event.x, event.y, radius, 0, Math.PI * 2);
  context.globalAlpha = Math.max(0, 0.5 * (1 - progress));
  context.fillStyle = CANVAS_VISUAL_TOKENS.combatDeathPuff.value;
  context.fill();
  context.globalAlpha = Math.max(0, 0.7 * (1 - progress));
  context.lineWidth = 1.2;
  context.strokeStyle = CANVAS_VISUAL_TOKENS.combatHitFlash.value;
  context.stroke();
}

function drawHallPulse(
  context: CombatTransientDrawingContext,
  event: Extract<CombatTransientEvent, { kind: "hall_pulse" }>,
  progress: number,
): void {
  context.beginPath();
  context.arc(event.x, event.y, 26 + progress * 22, 0, Math.PI * 2);
  context.globalAlpha = Math.max(0, 0.75 * (1 - progress));
  context.lineWidth = 2.5;
  context.strokeStyle = CANVAS_VISUAL_TOKENS.hallPulse.value;
  context.stroke();
}

function drawWaveBanner(
  context: CombatTransientDrawingContext,
  label: string,
  progress: number,
): void {
  const fadeIn = Math.min(1, progress * 8);
  const fadeOut = Math.min(1, (1 - progress) * 5);
  context.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
  context.fillStyle = CANVAS_VISUAL_TOKENS.waveBannerInk.value;
  context.font = "700 24px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(label, 480, 24);
}

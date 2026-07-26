import type { MiracleOutcome } from "../divine/divine.types";

export function drawEffects(
  context: CanvasRenderingContext2D,
  effects: readonly MiracleOutcome[],
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

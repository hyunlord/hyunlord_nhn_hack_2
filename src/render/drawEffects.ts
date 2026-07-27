interface DivineVisualEffect {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly startTick: number;
  readonly durationTicks: number;
}

export function drawRangedAttackEffects(
  context: CanvasRenderingContext2D,
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
  context.lineWidth = 0.8;
  for (const effect of effects) {
    const age = currentTick - effect.startTick;
    if (age < 0 || age >= effect.durationTicks) {
      continue;
    }
    const color = colorsByHouse.get(effect.houseId);
    if (color === undefined) {
      continue;
    }
    context.beginPath();
    context.moveTo(effect.fromX, effect.fromY);
    context.lineTo(effect.toX, effect.toY);
    context.globalAlpha = 1 - age / effect.durationTicks;
    context.strokeStyle = color;
    context.stroke();
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

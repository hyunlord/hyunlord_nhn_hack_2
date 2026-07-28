import type { CombatTransientEvent } from "./combatTransientTypes";

export function transientShakeTransform(
  events: readonly CombatTransientEvent[],
  currentTick: number,
  enabled: boolean,
): string {
  if (!enabled) {
    return "";
  }
  const shake = events.find(
    (event): event is Extract<CombatTransientEvent, { kind: "shake" }> =>
      event.kind === "shake" &&
      currentTick >= event.startTick &&
      currentTick < event.startTick + event.durationTicks,
  );
  if (shake === undefined) {
    return "";
  }
  const progress = (currentTick - shake.startTick) / shake.durationTicks;
  const magnitude = Math.max(0, shake.strength * (1 - progress));
  const direction = currentTick % 2 === 0 ? 1 : -1;
  return `translate3d(${(direction * magnitude).toFixed(2)}px, 0, 0)`;
}

export const LEVEL_THRESHOLDS = [0, 500, 1200, 2200, 3500] as const;
export const HERO_LEVEL_THRESHOLDS = [0, 250, 700, 1400, 2400] as const;

export function xpForDamage(damage: number): number {
  return Math.max(0, damage);
}

export function xpForKill(): number {
  return 25;
}

export function levelForXp(xp: number): number {
  let level = 1;
  for (let index = 1; index < LEVEL_THRESHOLDS.length; index += 1) {
    const threshold = LEVEL_THRESHOLDS[index];
    if (threshold === undefined || xp < threshold) {
      break;
    }
    level = index + 1;
  }
  return level;
}

export function xpToNextLevel(xp: number): number | null {
  const level = levelForXp(xp);
  const nextThreshold = LEVEL_THRESHOLDS[level];
  return nextThreshold === undefined
    ? null
    : Math.max(0, nextThreshold - xp);
}

export function heroLevelForXp(xp: number): number {
  let level = 1;
  for (
    let index = 1;
    index < HERO_LEVEL_THRESHOLDS.length;
    index += 1
  ) {
    const threshold = HERO_LEVEL_THRESHOLDS[index];
    if (threshold === undefined || xp < threshold) {
      break;
    }
    level = index + 1;
  }
  return level;
}

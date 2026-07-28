import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementId,
} from "../content/metaConfig";
import type { RunSummary } from "../content/runSummary";

function achievementIsEarned(
  achievementId: AchievementId,
  summary: RunSummary,
): boolean {
  switch (achievementId) {
    case "first_stand":
      return true;
    case "unbroken":
      return summary.victory && summary.survivingBanners === 3;
    case "pyrrhic":
      return summary.victory && summary.survivingAgents < 10;
    case "no_towers":
      return summary.victory && summary.towersBuilt === 0;
    case "hero_less":
      return summary.wavesCleared >= 2 && summary.heroLessWave2Clear;
    case "betrayed":
      return summary.betrayal !== null;
  }
}
export function evaluateNewAchievements(
  summary: RunSummary,
  unlockedAchievements: readonly AchievementId[],
): readonly AchievementId[] {
  const unlocked = new Set(unlockedAchievements);
  return ACHIEVEMENT_DEFINITIONS.filter(
    ({ id }) => !unlocked.has(id) && achievementIsEarned(id, summary),
  ).map(({ id }) => id);
}

export function achievementReward(
  achievementIds: readonly AchievementId[],
): number {
  const earned = new Set(achievementIds);
  return ACHIEVEMENT_DEFINITIONS.reduce(
    (total, definition) =>
      total + (earned.has(definition.id) ? definition.legacyReward : 0),
    0,
  );
}

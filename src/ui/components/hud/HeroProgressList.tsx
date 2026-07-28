import { BALANCE_CONFIG } from "../../../content/balanceConfig";
import { HERO_DEFINITIONS } from "../../../content/heroConfig";
import type { GameState } from "../../../engine/engine.types";
import { maxHpForAgent } from "../../../engine/heroEngine";
import { modifiersForAgent } from "../../../engine/progressionEngine";
import { HERO_LEVEL_THRESHOLDS } from "../../../progression/xp";
import type { Translate } from "../../../content/locale/display";
import { heroName, heroRole } from "../../../content/locale/display";

interface HeroProgressListProps {
  readonly state: GameState;
  readonly t: Translate;
}

function heroStatus(state: GameState, hero: GameState["agents"][number] | undefined, t: Translate): string {
  if (hero === undefined) {
    return t("hud.heroStatus.inactive");
  }
  if (hero.hp > 0) {
    const maxHp = maxHpForAgent(hero, modifiersForAgent(state, hero));
    return t("hud.heroStatus.alive", { current: Math.round(hero.hp), max: maxHp });
  }
  if (hero.respawnAtTick === null) {
    return t("hud.heroStatus.dead");
  }
  const seconds = Math.max(0, Math.ceil((hero.respawnAtTick - state.tick) / BALANCE_CONFIG.TICKS_PER_SECOND));
  return t("hud.heroStatus.respawning", { seconds });
}

export function HeroProgressList({ state, t }: HeroProgressListProps) {
  const heroById = new Map(
    state.agents.filter(({ isHero }) => isHero).map((agent) => [agent.heroId ?? "", agent] as const),
  );
  return (
    <div className="hero-progress-list" aria-label={t("hud.heroes")}>
      {state.heroProgress.map((progress) => {
        const definition = HERO_DEFINITIONS.find(({ id }) => id === progress.heroId);
        const currentThreshold = HERO_LEVEL_THRESHOLDS[progress.level - 1] ?? 0;
        const nextThreshold = HERO_LEVEL_THRESHOLDS[progress.level];
        const span = nextThreshold === undefined ? 1 : nextThreshold - currentThreshold;
        const name = definition === undefined ? progress.heroId : heroName(t, definition.id);
        const hero = heroById.get(progress.heroId);
        const role = definition === undefined ? "" : heroRole(t, definition.id);
        const isAlive = hero !== undefined && hero.hp > 0;
        const houseColor = definition === undefined
          ? "transparent"
          : state.houses.find(({ id }) => id === definition.houseId)?.color ?? "transparent";
        return (
          <div className={`hero-progress-row${isAlive ? "" : " hero-progress-row--down"}`} key={progress.heroId}>
            <span aria-hidden="true" className="hero-progress-row__swatch" style={{ backgroundColor: houseColor }} />
            <span>
              <strong>{name}</strong>
              <small>
                {t("hud.levelXp", { level: progress.level, xp: Math.round(progress.xp) })}
                {role === "" ? "" : t("hud.heroRoleSuffix", { role })}
              </small>
              <small className="hero-progress-row__status">{heroStatus(state, hero, t)}</small>
            </span>
            <progress
              aria-label={t("hud.heroXp", { hero: name })}
              max={span}
              value={nextThreshold === undefined ? span : progress.xp - currentThreshold}
            />
          </div>
        );
      })}
    </div>
  );
}

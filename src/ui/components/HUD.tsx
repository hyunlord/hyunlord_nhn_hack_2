import type { GameState } from "../../engine/engine.types";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { useLocale, type LocaleKey } from "../../content/locale";
import {
  heroName,
  heroRole,
  houseName,
  unitClassLabel,
  unitTallyByHouse,
} from "../../content/locale/display";
import type { UnitClassId } from "../../content/unitClassConfig";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { HERO_DEFINITIONS } from "../../content/heroConfig";
import { maxHpForAgent } from "../../engine/heroEngine";
import { livingRegularCount, populationCapForHouse } from "../../engine/population";
import { modifiersForAgent } from "../../engine/progressionEngine";
import { HERO_LEVEL_THRESHOLDS, LEVEL_THRESHOLDS } from "../../progression/xp";
import { useGameStore } from "../../state/gameStore";
import type { LegacyRiteGroup } from "../investmentSummary";

const EMPTY_LEGACY_RITES: readonly LegacyRiteGroup[] = [];

type PhaseKey = Extract<GameState["phase"], string>;

const PHASE_LABEL_KEYS: Readonly<Record<PhaseKey, LocaleKey>> = {
  defeat: "run.phase.defeat",
  draft: "run.phase.draft",
  intermission: "run.phase.intermission",
  preparation: "run.phase.preparation",
  victory: "run.phase.victory",
  wave: "run.phase.wave",
};

function formatElapsed(tick: number): string {
  const totalSeconds = Math.floor(tick / BALANCE_CONFIG.TICKS_PER_SECOND);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

const UNIT_CLASS_COMPOSITION: ReadonlyArray<{ readonly id: UnitClassId; readonly color: string }> = [
  { id: "melee", color: "#d2a86a" },
  { id: "spear", color: "#9aa5ff" },
  { id: "archer", color: "#82d1b7" },
  { id: "skirmisher", color: "#f08f8b" },
];

const CLASS_COLOR_BY_ID = new Map(
  UNIT_CLASS_COMPOSITION.map(({ id, color }) => [id, color] as const),
);

export function HUD({
  legacyRites = EMPTY_LEGACY_RITES,
  onOpenSettings,
}: {
  readonly legacyRites?: readonly LegacyRiteGroup[];
  readonly onOpenSettings?: () => void;
}) {
  const { state } = useGameStore();
  const { t } = useLocale();
  const livingHeroesByHouse = new Map<string, readonly { readonly unitClass: UnitClassId; readonly count: number }[]>(
    state.houses.map((house) => [house.id, unitTallyByHouse(state.agents, house.id)]),
  );
  const heroById = new Map(
    state.agents
      .filter(({ isHero }) => isHero)
      .map((agent) => [agent.heroId ?? "", agent] as const),
  );

  return (
    <section className="run-hud" aria-label={t("hud.worldStatus")}>
      <div className="run-hud-top-left hud-panel hud-panel--compact">
        <div className="phase-status phase-status--stacked">
          <span>
            {t("hud.wave", {
              current: state.waveIndex + 1,
              total: WAVE_DEFINITIONS.length,
            })}
          </span>
          <strong>{t(PHASE_LABEL_KEYS[state.phase])}</strong>
        </div>
        <div className="hud-metric-row">
          <span>{t("hud.elapsed")}</span>
          <strong>{formatElapsed(state.tick)}</strong>
        </div>
      </div>

      <div className="run-hud-top-right hud-panel hud-panel--compact divine-power">
        <div className="divine-power-label">
          <span>{t("hud.divinePower")}</span>
          <strong>
            {state.divinePower.toFixed(1)}/{BALANCE_CONFIG.DIVINE_POWER_MAX}
          </strong>
        </div>
        <div className="divine-power__gauge" data-frame-sprite="gauge_frame">
          <progress
            aria-label={t("hud.divinePower")}
            max={BALANCE_CONFIG.DIVINE_POWER_MAX}
            value={state.divinePower}
          />
        </div>
        {state.activeThreat === null ? null : (
          <div className="invasion-status" aria-label={t("hud.invasionStatus")}>
            <span>{t("hud.creatures", { count: state.activeThreat.creatures.length })}</span>
            {state.activeThreat.mage === null ? null : (
              <strong>
                {t("hud.mageHp", {
                  current: state.activeThreat.mage.hp,
                  max: BALANCE_CONFIG.DARK_MAGE_HP,
                })}
              </strong>
            )}
          </div>
        )}
      </div>

      <div className="run-hud-bottom-left hud-panel hud-panel--compact">
        <ul className="house-status-list" aria-label={t("hud.houses")}>
              {state.houses.map((house) => {
            const progress = state.houseProgress.find(({ houseId }) => houseId === house.id);
            const level = progress?.level ?? 1;
            const levelStart = LEVEL_THRESHOLDS[level - 1] ?? 0;
            const nextThreshold = LEVEL_THRESHOLDS[level];
            const xpSpan = nextThreshold === undefined ? 1 : nextThreshold - levelStart;
            const livingCount = state.agents.filter(
              (agent) => agent.houseId === house.id && agent.state !== "dead",
            ).length;
            const composition = livingHeroesByHouse.get(house.id) ?? [];
            const compositionTotal = composition.reduce((sum, { count }) => sum + count, 0);
            return (
              <li key={house.id}>
                <span
                  aria-hidden="true"
                  className="house-swatch"
                  style={{ backgroundColor: house.color }}
                />
                <span className="house-status__name">{houseName(t, house.id)}</span>
                <span className="house-status__details">
                  <strong>
                    {t("hud.levelXp", { level, xp: Math.round(progress?.xp ?? 0) })}
                  </strong>
                  <span>
                    {t("hud.livingCap", {
                      cap: populationCapForHouse(house.id, level),
                      count: livingRegularCount(state, house.id),
                      living: livingCount,
                    })}
                  </span>
                  <progress
                    aria-label={t("hud.houseXp", { house: houseName(t, house.id) })}
                    max={xpSpan}
                    value={
                      nextThreshold === undefined
                        ? xpSpan
                        : Math.max(0, (progress?.xp ?? 0) - levelStart)
                    }
                  />
                </span>
                <div className="house-composition-bars" aria-label={`${houseName(t, house.id)} composition`} role="group">
                  {UNIT_CLASS_COMPOSITION.map(({ id }) => {
                    const count = composition.find((entry) => entry.unitClass === id)?.count ?? 0;
                    const percent = compositionTotal === 0
                      ? 0
                      : (count / compositionTotal) * 100;
                    const color = CLASS_COLOR_BY_ID.get(id) ?? "#999";
                    return (
                      <div className="house-composition-bar-row" key={id}>
                        <span>
                          {unitClassLabel(t, id)}
                          {" "}
                          {count}
                        </span>
                        <div className="house-composition-bar">
                          <span
                            className="house-composition-fill"
                            style={{
                              background: color,
                              width: `${Math.round(percent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

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
                const maxHp = hero === undefined
                  ? null
                  : maxHpForAgent(hero, modifiersForAgent(state, hero));
                const status =
                  hero === undefined
                    ? "No hero active"
                    : isAlive
                      ? `${Math.round(hero.hp)}/${maxHp ?? 0} HP`
                      : hero.respawnAtTick === null
                        ? "Dead"
                        : `Respawning in ${Math.max(
                            0,
                            Math.ceil(
                              (hero.respawnAtTick - state.tick) / BALANCE_CONFIG.TICKS_PER_SECOND,
                            ),
                          )}s`;
                return (
                  <div
                    className={`hero-progress-row${isAlive ? "" : " hero-progress-row--down"}`}
                    key={progress.heroId}
                  >
                    <span>
                      <strong>{name}</strong>
                      <small>
                        {t("hud.levelXp", { level: progress.level, xp: Math.round(progress.xp) })}
                        {role === "" ? "" : ` · ${role}`}
                      </small>
                      <small className="hero-progress-row__status">{status}</small>
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

        {legacyRites.length === 0 ? null : (
          <section className="legacy-rites" aria-labelledby="legacy-rites-heading">
            <h3 id="legacy-rites-heading">{t("hud.legacyRites")}</h3>
            <div className="legacy-rites__groups">
              {legacyRites.map((group) => (
                <section
                  aria-label={t("hud.legacyRitesGroup", { group: group.heading })}
                  className="legacy-rites__group"
                  key={group.heading}
                >
                  <h4>{group.heading}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={`${group.heading}:${item.name}`}>
                        <strong>{item.name}</strong>
                        <span>
                          {item.rank} · {item.effect}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="run-hud-bottom-right hud-panel hud-panel--compact">
        <div className="run-economy">
          <span>{t("hud.tribute")}</span>
          <strong>{state.tribute}</strong>
        </div>
        {onOpenSettings === undefined ? null : (
          <button className="text-action run-settings-button" onClick={onOpenSettings} type="button">
            {t("title.settings")}
          </button>
        )}
      </div>
    </section>
  );
}

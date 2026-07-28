import { useLocale, type LocaleKey } from "../../content/locale";
import { useGameStore } from "../../state/gameStore";
import { houseName } from "../../content/locale/display";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { LEVEL_THRESHOLDS } from "../../progression/xp";
import { livingRegularCount, populationCapForHouse } from "../../engine/population";
import type { GameState } from "../../engine/engine.types";

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

export function HUD({
  onOpenSettings,
}: {
  readonly onOpenSettings?: () => void;
}) {
  const { state } = useGameStore();
  const { t } = useLocale();
  const activeRaid = state.activeThreat !== null && "daylightRaid" in state.activeThreat && state.activeThreat.daylightRaid === true;
  const pendingRaid = "pendingDaylightRaid" in state && state.pendingDaylightRaid === true;
  const isDay =
    state.phase === "intermission" ||
    activeRaid ||
    (state.phase === "draft" && state.phaseBeforeDraft === "intermission");

  return (
    <section className="run-hud" aria-label={t("hud.worldStatus")}>
      <div className="run-hud-top-left hud-panel hud-panel--compact">
        <div className="phase-status phase-status--stacked">
          <span aria-hidden="true" className="day-night-icon">{isDay ? "☀" : "☾"}</span>
          <span>{t("hud.wave", { current: state.waveIndex + 1, total: WAVE_DEFINITIONS.length })}</span>
          <strong>{t(PHASE_LABEL_KEYS[state.phase])}</strong>
        </div>
        <div className="hud-metric-row"><span>{t("hud.elapsed")}</span><strong>{formatElapsed(state.tick)}</strong></div>
        {activeRaid ? <p className="raid-label" aria-live="polite">{t("run.daylightRaid.active", { wave: state.waveIndex + 1 })}</p> : null}
        {pendingRaid ? <p className="raid-label raid-label--warning" aria-live="polite">{t("run.daylightRaid.pending")}</p> : null}
      </div>
      <div className="run-hud-top-right hud-panel hud-panel--compact divine-power">
        <div className="divine-power-label"><span>{t("hud.divinePower")}</span><strong>{state.divinePower.toFixed(1)}/{BALANCE_CONFIG.DIVINE_POWER_MAX}</strong></div>
        <div className="divine-power__gauge" data-frame-sprite="gauge_frame"><progress aria-label={t("hud.divinePower")} max={BALANCE_CONFIG.DIVINE_POWER_MAX} value={state.divinePower} /></div>
        {state.activeThreat === null ? null : <div className="invasion-status" aria-label={t("hud.invasionStatus")}><span>{t("hud.creatures", { count: state.activeThreat.creatures.length })}</span>{state.activeThreat.mage === null ? null : <strong>{t("hud.mageHp", { current: state.activeThreat.mage.hp, max: BALANCE_CONFIG.DARK_MAGE_HP })}</strong>}</div>}
      </div>
      <div className="run-hud-bottom-left hud-panel hud-panel--compact">
        <ul className="house-status-list" aria-label={t("hud.houses")}>
          {state.houses.map((house) => {
            const progress = state.houseProgress.find(({ houseId }) => houseId === house.id);
            const level = progress?.level ?? 1;
            const levelStart = LEVEL_THRESHOLDS[level - 1] ?? 0;
            const nextThreshold = LEVEL_THRESHOLDS[level];
            const xpSpan = nextThreshold === undefined ? 1 : nextThreshold - levelStart;
            const livingCount = state.agents.filter((agent) => agent.houseId === house.id && agent.state !== "dead").length;
            return <li key={house.id}><span aria-hidden="true" className="house-swatch" style={{ backgroundColor: house.color }} /><span className="house-status__name">{houseName(t, house.id)}</span><span className="house-status__details"><strong>{t("hud.levelXp", { level, xp: Math.round(progress?.xp ?? 0) })}</strong><span>{t("hud.livingCap", { cap: populationCapForHouse(house.id, level), count: livingRegularCount(state, house.id), living: livingCount })}</span><progress aria-label={t("hud.houseXp", { house: houseName(t, house.id) })} max={xpSpan} value={nextThreshold === undefined ? xpSpan : Math.max(0, (progress?.xp ?? 0) - levelStart)} /></span></li>;
          })}
        </ul>
      </div>
      <div className="run-hud-bottom-right hud-panel hud-panel--compact"><div className="run-economy"><span>{t("hud.tribute")}</span><strong>{state.tribute}</strong></div>{onOpenSettings === undefined ? null : <button className="text-action run-settings-button" onClick={onOpenSettings} type="button">{t("title.settings")}</button>}</div>
    </section>
  );
}

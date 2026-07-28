import type { GameState } from "../../engine/engine.types";
import { BALANCE_CONFIG } from "../../content/balanceConfig";
import { useLocale, type LocaleKey } from "../../content/locale";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { useGameStore } from "../../state/gameStore";
import type { LegacyRiteGroup } from "../investmentSummary";
import { HeroProgressList } from "./hud/HeroProgressList";
import { HouseStatusList } from "./hud/HouseStatusList";
import { houseName } from "../../content/locale/display";

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

export function HUD({
  legacyRites = EMPTY_LEGACY_RITES,
  onOpenSettings,
}: {
  readonly legacyRites?: readonly LegacyRiteGroup[];
  readonly onOpenSettings?: () => void;
}) {
  const { state } = useGameStore();
  const { t } = useLocale();

  return (
    <section className="run-hud" aria-label={t("hud.worldStatus")}>
      <div className="run-hud-top-left hud-panel hud-panel--compact">
        <div className="phase-status phase-status--stacked">
          <span>{t("hud.wave", { current: state.waveIndex + 1, total: WAVE_DEFINITIONS.length })}</span>
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
          <progress aria-label={t("hud.divinePower")} max={BALANCE_CONFIG.DIVINE_POWER_MAX} value={state.divinePower} />
        </div>
        {state.activeThreat === null ? null : (
          <div className="invasion-status" aria-label={t("hud.invasionStatus")}>
            <span>{t("hud.creatures", { count: state.activeThreat.creatures.length })}</span>
            {state.activeThreat.mage === null ? null : (
              <strong>{t("hud.mageHp", { current: state.activeThreat.mage.hp, max: BALANCE_CONFIG.DARK_MAGE_HP })}</strong>
            )}
          </div>
        )}
      </div>

      <div className="run-hud-bottom-left hud-panel hud-panel--compact">
        <section className="defense-status" aria-label={t("hud.defenses")}>
          <label className="keep-health">
            <span>{t("hud.keepHp", { current: state.keep.hp, max: state.keep.maxHp })}</span>
            <progress max={state.keep.maxHp} value={state.keep.hp} />
          </label>
          <div className="banner-status">
            {state.banners.map((banner) => (
              <span
                aria-label={t("hud.bannerStatus", {
                  house: houseName(t, banner.houseId),
                  status: t(banner.hp > 0 ? "hud.bannerIntact" : "hud.bannerDestroyed"),
                })}
                className="banner-status__pip"
                data-destroyed={banner.hp <= 0}
                key={banner.houseId}
                style={{ backgroundColor: state.houses.find(({ id }) => id === banner.houseId)?.color }}
              />
            ))}
          </div>
        </section>
        <HouseStatusList state={state} t={t} />
        <HeroProgressList state={state} t={t} />
        {legacyRites.length === 0 ? null : (
          <section className="legacy-rites" aria-labelledby="legacy-rites-heading">
            <h3 id="legacy-rites-heading">{t("hud.legacyRites")}</h3>
            <div className="legacy-rites__groups">
              {legacyRites.map((group) => (
                <section aria-label={t("hud.legacyRitesGroup", { group: group.heading })} className="legacy-rites__group" key={group.heading}>
                  <h4>{group.heading}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={`${group.heading}:${item.name}`}>
                        <strong>{item.name}</strong>
                        <span>{item.rank} · {item.effect}</span>
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

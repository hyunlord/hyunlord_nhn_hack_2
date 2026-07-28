import { SIMULATION_SPEEDS } from "../../settings/settings";
import { useSettings } from "../../settings/SettingsContext";
import { useLocale, type Language } from "../../content/locale";
import { useAppFlow } from "../../state/appFlowContext";

const LANGUAGES = ["ko", "en"] as const satisfies readonly Language[];

export function SettingsScreen() {
  const { dispatch } = useAppFlow();
  const { settings, setSettings } = useSettings();
  const { t } = useLocale();

  function resetProgress(): void {
    if (window.confirm(t("settings.reset.confirm"))) {
      dispatch({ type: "resetProgress" });
    }
  }

  return (
    <main className="app-shell screen-shell settings-screen" data-screen="settings">
      <header className="screen-header screen-header--compact">
        <div>
          <p className="eyebrow">{t("settings.eyebrow")}</p>
          <h1>{t("settings.heading")}</h1>
          <p>{t("settings.description")}</p>
        </div>
        <button
          className="text-action"
          onClick={() => dispatch({ type: "closeSettings" })}
          type="button"
        >
          {t("settings.back")}
        </button>
      </header>

      <section className="ledger-section" aria-labelledby="language-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("settings.language")}</p>
          <h2 id="language-heading">{t("settings.language")}</h2>
        </div>
        <div className="screen-actions">
          {LANGUAGES.map((language) => (
            <button
              aria-pressed={settings.language === language}
              className={settings.language === language ? "primary-action" : "text-action"}
              key={language}
              onClick={() => setSettings({ language })}
              type="button"
            >
              {t(language === "ko" ? "settings.language.ko" : "settings.language.en")}
            </button>
          ))}
        </div>
      </section>

      <section className="ledger-section" aria-labelledby="speed-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("settings.speed")}</p>
          <h2 id="speed-heading">{t("settings.speed")}</h2>
        </div>
        <div className="screen-actions">
          {SIMULATION_SPEEDS.map((simulationSpeed) => (
            <button
              aria-pressed={settings.simulationSpeed === simulationSpeed}
              className={settings.simulationSpeed === simulationSpeed ? "primary-action" : "text-action"}
              key={simulationSpeed}
              onClick={() => setSettings({ simulationSpeed })}
              type="button"
            >
              {t("settings.speed.option", { speed: simulationSpeed })}
            </button>
          ))}
        </div>
      </section>

      <section className="ledger-section" aria-labelledby="access-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("settings.screenShake")}</p>
          <h2 id="access-heading">{t("settings.screenShake")}</h2>
        </div>
        <div className="screen-actions">
          <button
            aria-pressed={settings.screenShake}
            className={settings.screenShake ? "primary-action" : "text-action"}
            onClick={() => setSettings({ screenShake: true })}
            type="button"
          >
            {t("settings.screenShake.on")}
          </button>
          <button
            aria-pressed={!settings.screenShake}
            className={settings.screenShake ? "text-action" : "primary-action"}
            onClick={() => setSettings({ screenShake: false })}
            type="button"
          >
            {t("settings.screenShake.off")}
          </button>
        </div>
      </section>

      <section className="ledger-section" aria-labelledby="sound-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("settings.volume")}</p>
          <h2 id="sound-heading">{t("settings.volume")}</h2>
        </div>
        <label>
          <span>{t("settings.volume.pending")}</span>
          <input disabled max={1} min={0} step={0.01} type="range" value={settings.masterVolume} />
        </label>
      </section>

      <section className="ledger-section" aria-labelledby="reset-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("settings.reset")}</p>
          <h2 id="reset-heading">{t("settings.reset")}</h2>
          <p>{t("settings.reset.description")}</p>
        </div>
        <button className="text-action" onClick={resetProgress} type="button">
          {t("settings.reset.button")}
        </button>
      </section>
    </main>
  );
}

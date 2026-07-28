import { useLocale } from "../../content/locale";
import { useAppFlow } from "../../state/appFlowContext";

export function TitleScreen() {
  const { dispatch, state } = useAppFlow();
  const { t } = useLocale();
  const showStats = state.meta.runsPlayed > 0;

  return (
    <main className="title-screen" data-screen="title">
      <section className="title-card">
        <div className="title-card__identity">
          <p className="eyebrow">{t("title.eyebrow")}</p>
          <h1>{t("app.name")}</h1>
          <p className="title-subtitle">{t("app.subtitle")}</p>
          <p className="title-description">{t("title.description")}</p>
        </div>
        {showStats ? (
          <p className="title-stats" aria-label={t("title.stats", {
            bestWave: state.meta.bestWaveReached,
            runs: state.meta.runsPlayed,
            victories: state.meta.victories,
          })}>
            {t("title.stats", {
              bestWave: state.meta.bestWaveReached,
              runs: state.meta.runsPlayed,
              victories: state.meta.victories,
            })}
          </p>
        ) : null}
      </section>

      <nav className="title-actions" aria-label={t("app.name")}>
        <div className="title-actions__buttons">
          <button
            className="primary-action"
            onClick={() => dispatch({ type: "beginSelection" })}
            type="button"
          >
            {t("title.start")}
          </button>
          <button
            className="text-action"
            onClick={() => dispatch({ type: "openMeta" })}
            type="button"
          >
            {t("title.legacy")}
          </button>
          <button
            className="text-action"
            onClick={() => dispatch({ type: "openSettings" })}
            type="button"
          >
            {t("title.settings")}
          </button>
        </div>
      </nav>
    </main>
  );
}

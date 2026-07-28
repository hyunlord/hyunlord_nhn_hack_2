import { ACHIEVEMENT_DEFINITIONS } from "../../content/metaConfig";
import { HOUSE_CONFIG } from "../../content/houseConfig";
import { useLocale } from "../../content/locale";
import { achievementName, houseName } from "../../content/locale/display";
import type { ApplyRunSummaryResult } from "../../meta/legacy";
import { useAppFlow } from "../../state/appFlowContext";
import type { AppAction } from "../../state/appFlow";
import type { RunSummary } from "../../content/runSummary";

export function RunSummaryScreen() {
  const { dispatch, state } = useAppFlow();
  const { summary, completion } = state;
  if (summary === null || completion === null) {
    return null;
  }
  return (
    <RunSummaryView
      completion={completion}
      dispatch={dispatch}
      summary={summary}
    />
  );
}

export function RunSummaryView({
  completion,
  dispatch,
  summary,
}: {
  readonly completion: ApplyRunSummaryResult;
  readonly dispatch: (action: AppAction) => void;
  readonly summary: RunSummary;
}) {
  const { t } = useLocale();
  const traitor = HOUSE_CONFIG.find(({ id }) => id === summary.betrayal?.traitorHouseId);
  const alliance = summary.selectedHouseIds.map((id) => houseName(t, id)).join(" / ");

  return (
    <main className="app-shell screen-shell" data-screen="summary">
      <header className="summary-hero">
        <p className="eyebrow">{t("summary.eyebrow")}</p>
        <h1>{summary.victory ? t("summary.victory") : t("summary.defeat")}</h1>
        <p>{alliance}</p>
      </header>

      <div className="summary-layout">
        <section className="ledger-section" aria-labelledby="run-record-heading">
          <div className="section-heading">
            <p className="eyebrow">{t("summary.record.eyebrow")}</p>
            <h2 id="run-record-heading">{t("summary.record.heading")}</h2>
          </div>
          <dl className="summary-facts">
            <div><dt>{t("summary.waves")}</dt><dd>{summary.wavesCleared}</dd></div>
            <div><dt>{t("summary.survivors")}</dt><dd>{summary.survivingAgents}</dd></div>
            <div><dt>{t("summary.lost")}</dt><dd>{summary.agentsLost}</dd></div>
            <div><dt>{t("summary.banners")}</dt><dd>{summary.survivingBanners}/3</dd></div>
            <div><dt>{t("summary.towers")}</dt><dd>{summary.towersBuilt}</dd></div>
            <div><dt>{t("summary.betrayal")}</dt><dd>{traitor === undefined ? t("common.none") : houseName(t, traitor.id)}</dd></div>
          </dl>
        </section>

        <section className="legacy-award" aria-labelledby="legacy-award-heading">
          <p className="eyebrow">{t("summary.legacy.eyebrow")}</p>
          <h2 id="legacy-award-heading">+{completion.runLegacy.total + completion.achievementLegacyEarned}</h2>
          <dl>
            <div><dt>{t("summary.legacy.base")}</dt><dd>+{completion.runLegacy.base}</dd></div>
            <div><dt>{t("summary.legacy.waves")}</dt><dd>+{completion.runLegacy.waves}</dd></div>
            <div><dt>{t("summary.legacy.victory")}</dt><dd>+{completion.runLegacy.victory}</dd></div>
            <div><dt>{t("summary.legacy.survivingAgents")}</dt><dd>+{completion.runLegacy.survivingAgents}</dd></div>
            <div><dt>{t("summary.legacy.survivingBanners")}</dt><dd>+{completion.runLegacy.survivingBanners}</dd></div>
            <div><dt>{t("summary.legacy.achievements")}</dt><dd>+{completion.achievementLegacyEarned}</dd></div>
          </dl>
        </section>
      </div>

      <section className="ledger-section" aria-labelledby="population-arc-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("summary.population.eyebrow")}</p>
          <h2 id="population-arc-heading">{t("summary.population.heading")}</h2>
        </div>
        <ul className="population-arc">
          {summary.selectedHouseIds.map((houseId) => {
            const arc = summary.populationHistory
              .filter((entry) => entry.houseId === houseId)
              .map(({ wave, count }) => `${wave}: ${count}`)
              .join(" → ");
            return (
              <li key={houseId}>
                <strong>{houseName(t, houseId)}</strong>
                <span>{arc || t("summary.population.empty")}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {completion.newAchievementIds.length > 0 ? (
        <section className="new-achievements" aria-live="polite">
          <p className="eyebrow">{t("summary.newAchievements")}</p>
          <ul>
            {completion.newAchievementIds.map((id) => {
              const achievement = ACHIEVEMENT_DEFINITIONS.find((candidate) => candidate.id === id);
              return <li key={id}>{achievement === undefined ? id : achievementName(t, achievement.id)}</li>;
            })}
          </ul>
        </section>
      ) : null}

      <footer className="screen-actions">
        <button className="text-action" onClick={() => dispatch({ type: "returnToMeta" })} type="button">
          {t("summary.return")}
        </button>
        <button className="primary-action" onClick={() => dispatch({ type: "retryRun" })} type="button">
          {t("summary.retry")}
        </button>
      </footer>
    </main>
  );
}

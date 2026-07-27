import { ACHIEVEMENT_DEFINITIONS } from "../../content/metaConfig";
import { HOUSE_CONFIG } from "../../content/houseConfig";
import { useAppFlow } from "../../state/appFlowContext";

export function RunSummaryScreen() {
  const { dispatch, state } = useAppFlow();
  const { summary, completion } = state;
  if (summary === null || completion === null) {
    return null;
  }
  const traitor = HOUSE_CONFIG.find(
    ({ id }) => id === summary.betrayal?.traitorHouseId,
  );
  const alliance = summary.selectedHouseIds
    .map((id) => HOUSE_CONFIG.find((house) => house.id === id)?.name ?? id)
    .join(" / ");

  return (
    <main className="app-shell screen-shell" data-screen="summary">
      <header className="summary-hero">
        <p className="eyebrow">Run complete</p>
        <h1>{summary.victory ? "The halls endure" : "The covenant is broken"}</h1>
        <p>{alliance}</p>
      </header>

      <div className="summary-layout">
        <section className="ledger-section" aria-labelledby="run-record-heading">
          <div className="section-heading">
            <p className="eyebrow">Field record</p>
            <h2 id="run-record-heading">Run summary</h2>
          </div>
          <dl className="summary-facts">
            <div><dt>Waves cleared</dt><dd>{summary.wavesCleared}</dd></div>
            <div><dt>Agents surviving</dt><dd>{summary.survivingAgents}</dd></div>
            <div><dt>Agents lost</dt><dd>{summary.agentsLost}</dd></div>
            <div><dt>Halls standing</dt><dd>{summary.survivingHalls}/3</dd></div>
            <div><dt>Towers built</dt><dd>{summary.towersBuilt}</dd></div>
            <div><dt>Betrayal</dt><dd>{traitor?.name ?? "None"}</dd></div>
          </dl>
        </section>

        <section className="legacy-award" aria-labelledby="legacy-award-heading">
          <p className="eyebrow">Legacy awarded</p>
          <h2 id="legacy-award-heading">
            +{completion.runLegacy.total + completion.achievementLegacyEarned}
          </h2>
          <dl>
            <div><dt>Base</dt><dd>+{completion.runLegacy.base}</dd></div>
            <div><dt>Waves</dt><dd>+{completion.runLegacy.waves}</dd></div>
            <div><dt>Victory</dt><dd>+{completion.runLegacy.victory}</dd></div>
            <div><dt>Surviving agents</dt><dd>+{completion.runLegacy.survivingAgents}</dd></div>
            <div><dt>Surviving halls</dt><dd>+{completion.runLegacy.survivingHalls}</dd></div>
            <div><dt>Achievements</dt><dd>+{completion.achievementLegacyEarned}</dd></div>
          </dl>
        </section>
      </div>

      {completion.newAchievementIds.length > 0 ? (
        <section className="new-achievements" aria-live="polite">
          <p className="eyebrow">New achievements</p>
          <ul>
            {completion.newAchievementIds.map((id) => {
              const achievement = ACHIEVEMENT_DEFINITIONS.find(
                (candidate) => candidate.id === id,
              );
              return <li key={id}>{achievement?.name ?? id}</li>;
            })}
          </ul>
        </section>
      ) : null}

      <footer className="screen-actions">
        <button
          className="text-action"
          onClick={() => dispatch({ type: "returnToMeta" })}
          type="button"
        >
          Return to Legacy
        </button>
        <button
          className="primary-action"
          onClick={() => dispatch({ type: "retryRun" })}
          type="button"
        >
          Retry same alliance
        </button>
      </footer>
    </main>
  );
}

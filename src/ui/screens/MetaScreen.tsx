import {
  ACHIEVEMENT_DEFINITIONS,
  HOUSE_UNLOCK_DEFINITIONS,
} from "../../content/metaConfig";
import { HOUSE_CONFIG, type HouseId } from "../../content/houseConfig";
import { HOUSE_SYNERGIES } from "../../content/houseSynergies";
import { useAppFlow } from "../../state/appFlowContext";

function traitLine(houseId: HouseId): string {
  switch (houseId) {
    case "house_a":
      return "+10% damage, +12 aggression";
    case "house_b":
      return "+20% health, +10 loyalty, -8% speed";
    case "house_c":
      return "+5% health, +1 tribute per kill";
    case "house_d":
      return "+25% speed, -15% attack interval, -18% health";
    case "house_e":
      return "+45% health, -22% speed, -10% damage";
    case "house_f":
      return "+3 tribute per kill, -8% damage, -8 aggression";
  }
}

function unlockRequirement(
  houseId: HouseId,
  bestWaveReached: number,
  victories: number,
): string | null {
  const definition = HOUSE_UNLOCK_DEFINITIONS.find(
    (candidate) => candidate.houseId === houseId,
  );
  if (definition === undefined) {
    return null;
  }
  if (
    definition.minimumWaveReached !== undefined &&
    bestWaveReached < definition.minimumWaveReached
  ) {
    return `Reach wave ${definition.minimumWaveReached}`;
  }
  if (
    definition.minimumVictories !== undefined &&
    victories < definition.minimumVictories
  ) {
    return `Win ${definition.minimumVictories} run`;
  }
  return null;
}

export function MetaScreen() {
  const { dispatch, state } = useAppFlow();
  const { meta } = state;

  return (
    <main className="app-shell screen-shell" data-screen="meta">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Persistent covenant</p>
          <h1>The Legacy Ledger</h1>
          <p>
            Carry hard-won influence between deterministic defense runs.
          </p>
        </div>
        <dl className="meta-stats" aria-label="Legacy statistics">
          <div><dt>Legacy</dt><dd>{meta.legacyPoints}</dd></div>
          <div><dt>Runs</dt><dd>{meta.runsPlayed}</dd></div>
          <div><dt>Victories</dt><dd>{meta.victories}</dd></div>
          <div><dt>Best wave</dt><dd>{meta.bestWaveReached}</dd></div>
        </dl>
      </header>

      <section className="ledger-section" aria-labelledby="houses-heading">
        <div className="section-heading">
          <p className="eyebrow">Alliance roster</p>
          <h2 id="houses-heading">Houses</h2>
        </div>
        <div className="house-roster">
          {HOUSE_CONFIG.map((house) => {
            const unlocked = meta.unlockedHouses.includes(house.id);
            const definition = HOUSE_UNLOCK_DEFINITIONS.find(
              (candidate) => candidate.houseId === house.id,
            );
            const prerequisite = unlockRequirement(
              house.id,
              meta.bestWaveReached,
              meta.victories,
            );
            const canPurchase =
              definition !== undefined &&
              prerequisite === null &&
              meta.legacyPoints >= definition.legacyCost;
            return (
              <article
                className={`house-record${unlocked ? "" : " house-record--locked"}`}
                key={house.id}
              >
                <div className="house-record__heading">
                  <span
                    aria-hidden="true"
                    className="house-mark"
                    style={{ backgroundColor: house.color }}
                  />
                  <div>
                    <h3>{house.name}</h3>
                    <p>{house.identity}</p>
                  </div>
                  <span className="status-label">
                    {unlocked ? "Available" : "Locked"}
                  </span>
                </div>
                <p className="trait-line">{traitLine(house.id)}</p>
                {!unlocked && definition !== undefined ? (
                  <div className="unlock-row">
                    <span>
                      {prerequisite ?? `${definition.legacyCost} Legacy`}
                    </span>
                    <button
                      disabled={!canPurchase}
                      onClick={() =>
                        dispatch({
                          type: "purchaseUnlock",
                          houseId: house.id,
                        })
                      }
                      type="button"
                    >
                      Unlock for {definition.legacyCost}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="ledger-columns">
        <section className="ledger-section" aria-labelledby="achievements-heading">
          <div className="section-heading">
            <p className="eyebrow">Recorded deeds</p>
            <h2 id="achievements-heading">Achievements</h2>
          </div>
          <ul className="ledger-list">
            {ACHIEVEMENT_DEFINITIONS.map((achievement) => (
              <li key={achievement.id}>
                <span>
                  <strong>{achievement.name}</strong>
                  <small>{achievement.description}</small>
                </span>
                <span>
                  {meta.unlockedAchievements.includes(achievement.id)
                    ? "Earned"
                    : `+${achievement.legacyReward}`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ledger-section" aria-labelledby="synergies-heading">
          <div className="section-heading">
            <p className="eyebrow">Recovered knowledge</p>
            <h2 id="synergies-heading">Hidden synergies</h2>
          </div>
          <ul className="ledger-list">
            {HOUSE_SYNERGIES.filter(({ hidden }) => hidden).map((synergy) => {
              const discovered = meta.discoveredSynergies.includes(synergy.id);
              return (
                <li key={synergy.id}>
                  <span>
                    <strong>{discovered ? synergy.name : "Undiscovered"}</strong>
                    <small>
                      {discovered
                        ? synergy.description
                        : "Complete a run with the right alliance."}
                    </small>
                  </span>
                  <span>{discovered ? "Known" : "Hidden"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer className="screen-actions">
        <p>Choose three houses. Selection order sets their deployment slots.</p>
        <button
          className="primary-action"
          onClick={() => dispatch({ type: "beginSelection" })}
          type="button"
        >
          Begin run
        </button>
      </footer>
    </main>
  );
}

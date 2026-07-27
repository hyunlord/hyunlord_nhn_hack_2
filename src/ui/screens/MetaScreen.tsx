import {
  ACHIEVEMENT_DEFINITIONS,
  HOUSE_UNLOCK_DEFINITIONS,
} from "../../content/metaConfig";
import {
  INVESTMENT_TRACKS,
  type InvestmentTrack,
} from "../../content/investmentConfig";
import {
  HOUSE_CONFIG,
  houseTraitSummary,
  type HouseId,
} from "../../content/houseConfig";
import { HOUSE_SYNERGIES } from "../../content/houseSynergies";
import {
  canPurchase,
  investmentCost,
} from "../../meta/investments";
import { useAppFlow } from "../../state/appFlowContext";
import {
  activeBonusGroups,
  investmentEffectLabel,
} from "../investmentSummary";

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

function trackDisabledReason(
  track: InvestmentTrack,
  currentRank: number,
  legacyPoints: number,
  unlockedHouses: readonly HouseId[],
): string | null {
  if (currentRank >= track.maxRank) {
    return "Max rank reached";
  }
  if (
    track.scope === "house" &&
    (track.houseId === undefined || !unlockedHouses.includes(track.houseId))
  ) {
    const house = HOUSE_CONFIG.find((candidate) => candidate.id === track.houseId);
    return `Unlock ${house?.name ?? "this house"} first`;
  }
  const cost = investmentCost(track, currentRank);
  if (legacyPoints < cost) {
    return `Need ${cost - legacyPoints} more Legacy`;
  }
  return null;
}

function rankPips(currentRank: number, maxRank: number): string {
  return `${"●".repeat(currentRank)}${"○".repeat(maxRank - currentRank)}`;
}

function InvestmentTrackCard({
  currentRank,
  legacyPoints,
  onPurchase,
  track,
  unlockedHouses,
}: {
  readonly currentRank: number;
  readonly legacyPoints: number;
  readonly onPurchase: (trackId: string) => void;
  readonly track: InvestmentTrack;
  readonly unlockedHouses: readonly HouseId[];
}) {
  const reason = trackDisabledReason(
    track,
    currentRank,
    legacyPoints,
    unlockedHouses,
  );
  const nextCost =
    currentRank >= track.maxRank ? null : investmentCost(track, currentRank);
  const purchasable = canPurchase(
    track,
    currentRank,
    legacyPoints,
    unlockedHouses,
  );

  return (
    <article className="investment-track">
      <div className="investment-track__header">
        <div>
          <h4>{track.name}</h4>
          <p>{track.description}</p>
        </div>
        <span
          aria-label={`Rank ${currentRank} of ${track.maxRank}`}
          className="rank-pips"
          role="img"
        >
          {rankPips(currentRank, track.maxRank)}
        </span>
      </div>
      <p className="investment-track__effect">
        {investmentEffectLabel(track.effectPerRank)}
      </p>
      <div className="investment-track__purchase">
        <span>{nextCost === null ? "Max rank" : `Next cost ${nextCost}`}</span>
        <button
          aria-describedby={reason === null ? undefined : `${track.id}-reason`}
          disabled={!purchasable}
          onClick={() => onPurchase(track.id)}
          type="button"
        >
          Purchase
        </button>
      </div>
      {reason === null ? null : (
        <p className="investment-track__reason" id={`${track.id}-reason`}>
          {reason}
        </p>
      )}
    </article>
  );
}

export function MetaScreen() {
  const { dispatch, state } = useAppFlow();
  const { meta } = state;
  const activeBonuses = activeBonusGroups(meta.investmentRanks);
  const globalTracks = INVESTMENT_TRACKS.filter(
    (track) => track.scope === "global",
  );

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

      <section className="ledger-section" aria-labelledby="investments-heading">
        <div className="section-heading">
          <p className="eyebrow">Permanent rites</p>
          <h2 id="investments-heading">Investments</h2>
        </div>
        <div className="investment-layout">
          <section
            aria-labelledby="global-investments-heading"
            className="investment-group"
          >
            <div className="investment-group__heading">
              <h3 id="global-investments-heading">Global tracks</h3>
              <p>Apply to every selected house at the start of each run.</p>
            </div>
            <div className="investment-track-list">
              {globalTracks.map((track) => (
                <InvestmentTrackCard
                  currentRank={meta.investmentRanks[track.id] ?? 0}
                  key={track.id}
                  legacyPoints={meta.legacyPoints}
                  onPurchase={(trackId) =>
                    dispatch({ type: "purchaseInvestment", trackId })
                  }
                  track={track}
                  unlockedHouses={meta.unlockedHouses}
                />
              ))}
            </div>
          </section>

          <aside
            aria-labelledby="bonus-summary-heading"
            className="investment-summary"
          >
            <p className="eyebrow">Running total</p>
            <h3 id="bonus-summary-heading">Active bonuses</h3>
            {activeBonuses.length === 0 ? (
              <p>No permanent bonuses active yet.</p>
            ) : (
              <div className="investment-summary__groups">
                {activeBonuses.map((group) => (
                  <section
                    aria-label={`${group.heading} active bonuses`}
                    className="investment-summary__group"
                    key={group.heading}
                  >
                    <h4>{group.heading}</h4>
                    <ul>
                      {group.labels.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="ledger-section" aria-labelledby="house-investments-heading">
        <div className="section-heading">
          <p className="eyebrow">House rites</p>
          <h2 id="house-investments-heading">Per-house tracks</h2>
        </div>
        <div className="house-investment-grid">
          {HOUSE_CONFIG.map((house) => {
            const houseTracks = INVESTMENT_TRACKS.filter(
              (track) => track.houseId === house.id,
            );
            const unlocked = meta.unlockedHouses.includes(house.id);
            return (
              <section
                aria-labelledby={`${house.id}-investments-heading`}
                className={`house-investment${unlocked ? "" : " house-investment--locked"}`}
                key={house.id}
              >
                <div className="house-investment__heading">
                  <span
                    aria-hidden="true"
                    className="house-mark"
                    style={{ backgroundColor: house.color }}
                  />
                  <div>
                    <h3 id={`${house.id}-investments-heading`}>
                      {house.name}
                    </h3>
                    <p>{unlocked ? "Unlocked" : "Locked house"}</p>
                  </div>
                </div>
                <div className="investment-track-list">
                  {houseTracks.map((track) => (
                    <InvestmentTrackCard
                      currentRank={meta.investmentRanks[track.id] ?? 0}
                      key={track.id}
                      legacyPoints={meta.legacyPoints}
                      onPurchase={(trackId) =>
                        dispatch({ type: "purchaseInvestment", trackId })
                      }
                      track={track}
                      unlockedHouses={meta.unlockedHouses}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

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
                <p className="trait-line">{houseTraitSummary(house.id)}</p>
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

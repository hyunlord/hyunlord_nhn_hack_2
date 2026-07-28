import { ACHIEVEMENT_DEFINITIONS, HOUSE_UNLOCK_DEFINITIONS } from "../../content/metaConfig";
import { INVESTMENT_TRACKS, type InvestmentTrack } from "../../content/investmentConfig";
import { HOUSE_CONFIG, type HouseId } from "../../content/houseConfig";
import { HOUSE_SYNERGIES } from "../../content/houseSynergies";
import { useLocale, type LocaleKey } from "../../content/locale";
import {
  achievementDescription,
  achievementName,
  houseIdentity,
  houseName,
  houseTrait,
  investmentDescription,
  investmentName,
  synergyDescription,
  synergyName,
} from "../../content/locale/display";
import { canPurchase, investmentCost } from "../../meta/investments";
import { useAppFlow } from "../../state/appFlowContext";
import {
  activeBonusGroups,
  investmentEffectLabel,
  purchaseInvestmentLabel,
} from "../investmentSummary";

function unlockRequirement(
  houseId: HouseId,
  bestWaveReached: number,
  victories: number,
): { readonly key: LocaleKey; readonly params: Readonly<Record<string, number>> } | null {
  const definition = HOUSE_UNLOCK_DEFINITIONS.find((candidate) => candidate.houseId === houseId);
  if (definition === undefined) {
    return null;
  }
  if (definition.minimumWaveReached !== undefined && bestWaveReached < definition.minimumWaveReached) {
    return { key: "meta.unlock.wave", params: { wave: definition.minimumWaveReached } };
  }
  if (definition.minimumVictories !== undefined && victories < definition.minimumVictories) {
    return { key: "meta.unlock.victory", params: { count: definition.minimumVictories } };
  }
  return null;
}

function trackDisabledReason(
  track: InvestmentTrack,
  currentRank: number,
  legacyPoints: number,
  unlockedHouses: readonly HouseId[],
  t: (key: LocaleKey, params?: Readonly<Record<string, string | number>>) => string,
): string | null {
  if (currentRank >= track.maxRank) {
    return t("meta.investment.reason.max");
  }
  if (track.scope === "house" && (track.houseId === undefined || !unlockedHouses.includes(track.houseId))) {
    return t("meta.investment.reason.unlock", {
      house: track.houseId === undefined ? t("common.unknown") : houseName(t, track.houseId),
    });
  }
  const cost = investmentCost(track, currentRank);
  if (legacyPoints < cost) {
    return t("meta.investment.reason.legacy", { amount: cost - legacyPoints });
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
  const { t } = useLocale();
  const trackName = investmentName(t, track.id);
  const reason = trackDisabledReason(track, currentRank, legacyPoints, unlockedHouses, t);
  const nextCost = currentRank >= track.maxRank ? null : investmentCost(track, currentRank);
  const purchasable = canPurchase(track, currentRank, legacyPoints, unlockedHouses);

  return (
    <article className="investment-track">
      <div className="investment-track__header">
        <div>
          <h4>{trackName}</h4>
          <p>{investmentDescription(t, track.id)}</p>
        </div>
        <span
          aria-label={t("meta.investment.rank", { current: currentRank, max: track.maxRank })}
          className="rank-pips"
          role="img"
        >
          {rankPips(currentRank, track.maxRank)}
        </span>
      </div>
      <p className="investment-track__effect">{investmentEffectLabel(track.effectPerRank, t)}</p>
      <div className="investment-track__purchase">
        <span>{nextCost === null ? t("meta.investment.max") : t("meta.investment.nextCost", { cost: nextCost })}</span>
        <button
          aria-describedby={reason === null ? undefined : `${track.id}-reason`}
          aria-label={purchaseInvestmentLabel(trackName, t)}
          disabled={!purchasable}
          onClick={() => onPurchase(track.id)}
          type="button"
        >
          {t("meta.investment.purchase")}
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
  const { t } = useLocale();
  const { meta } = state;
  const activeBonuses = activeBonusGroups(meta.investmentRanks, t);
  const globalTracks = INVESTMENT_TRACKS.filter((track) => track.scope === "global");

  return (
    <main className="app-shell screen-shell" data-screen="meta">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("meta.eyebrow")}</p>
          <h1>{t("meta.heading")}</h1>
          <p>{t("meta.description")}</p>
        </div>
        <dl className="meta-stats" aria-label={t("meta.stats.label")}>
          <div><dt>{t("meta.stats.legacy")}</dt><dd>{meta.legacyPoints}</dd></div>
          <div><dt>{t("meta.stats.runs")}</dt><dd>{meta.runsPlayed}</dd></div>
          <div><dt>{t("meta.stats.victories")}</dt><dd>{meta.victories}</dd></div>
          <div><dt>{t("meta.stats.bestWave")}</dt><dd>{meta.bestWaveReached}</dd></div>
        </dl>
      </header>

      <section className="ledger-section" aria-labelledby="investments-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("meta.investments.eyebrow")}</p>
          <h2 id="investments-heading">{t("meta.investments.heading")}</h2>
        </div>
        <div className="investment-layout">
          <section aria-labelledby="global-investments-heading" className="investment-group">
            <div className="investment-group__heading">
              <h3 id="global-investments-heading">{t("meta.global.heading")}</h3>
              <p>{t("meta.global.description")}</p>
            </div>
            <div className="investment-track-list">
              {globalTracks.map((track) => (
                <InvestmentTrackCard
                  currentRank={meta.investmentRanks[track.id] ?? 0}
                  key={track.id}
                  legacyPoints={meta.legacyPoints}
                  onPurchase={(trackId) => dispatch({ type: "purchaseInvestment", trackId })}
                  track={track}
                  unlockedHouses={meta.unlockedHouses}
                />
              ))}
            </div>
          </section>

          <aside aria-labelledby="bonus-summary-heading" className="investment-summary">
            <p className="eyebrow">{t("meta.bonus.eyebrow")}</p>
            <h3 id="bonus-summary-heading">{t("meta.bonus.heading")}</h3>
            {activeBonuses.length === 0 ? (
              <p>{t("meta.bonus.empty")}</p>
            ) : (
              <div className="investment-summary__groups">
                {activeBonuses.map((group) => (
                  <section aria-label={group.heading} className="investment-summary__group" key={group.heading}>
                    <h4>{group.heading}</h4>
                    <ul>{group.labels.map((label) => <li key={label}>{label}</li>)}</ul>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="ledger-section" aria-labelledby="house-investments-heading">
        <div className="section-heading">
          <p className="eyebrow">{t("meta.houseRites.eyebrow")}</p>
          <h2 id="house-investments-heading">{t("meta.houseRites.heading")}</h2>
        </div>
        <div className="house-investment-grid">
          {HOUSE_CONFIG.map((house) => {
            const houseTracks = INVESTMENT_TRACKS.filter((track) => track.houseId === house.id);
            const unlocked = meta.unlockedHouses.includes(house.id);
            return (
              <section
                aria-labelledby={`${house.id}-investments-heading`}
                className={`house-investment${unlocked ? "" : " house-investment--locked"}`}
                key={house.id}
              >
                <div className="house-investment__heading">
                  <span aria-hidden="true" className="house-mark" style={{ backgroundColor: house.color }} />
                  <div>
                    <h3 id={`${house.id}-investments-heading`}>{houseName(t, house.id)}</h3>
                    <p>{unlocked ? t("common.unlocked") : t("common.locked")}</p>
                  </div>
                </div>
                <div className="investment-track-list">
                  {houseTracks.map((track) => (
                    <InvestmentTrackCard
                      currentRank={meta.investmentRanks[track.id] ?? 0}
                      key={track.id}
                      legacyPoints={meta.legacyPoints}
                      onPurchase={(trackId) => dispatch({ type: "purchaseInvestment", trackId })}
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
          <p className="eyebrow">{t("meta.houses.eyebrow")}</p>
          <h2 id="houses-heading">{t("meta.houses.heading")}</h2>
        </div>
        <div className="house-roster">
          {HOUSE_CONFIG.map((house) => {
            const unlocked = meta.unlockedHouses.includes(house.id);
            const definition = HOUSE_UNLOCK_DEFINITIONS.find((candidate) => candidate.houseId === house.id);
            const prerequisite = unlockRequirement(house.id, meta.bestWaveReached, meta.victories);
            const canBuyUnlock = definition !== undefined && prerequisite === null && meta.legacyPoints >= definition.legacyCost;
            return (
              <article className={`house-record${unlocked ? "" : " house-record--locked"}`} key={house.id}>
                <div className="house-record__heading">
                  <span aria-hidden="true" className="house-mark" style={{ backgroundColor: house.color }} />
                  <div>
                    <h3>{houseName(t, house.id)}</h3>
                    <p>{houseIdentity(t, house.id)}</p>
                  </div>
                  <span className="status-label">{unlocked ? t("common.available") : t("common.locked")}</span>
                </div>
                <p className="trait-line">{houseTrait(t, house.id)}</p>
                {!unlocked && definition !== undefined ? (
                  <div className="unlock-row">
                    <span>
                      {prerequisite === null
                        ? t("meta.unlock.cost", { cost: definition.legacyCost })
                        : t(prerequisite.key, prerequisite.params)}
                    </span>
                    <button disabled={!canBuyUnlock} onClick={() => dispatch({ type: "purchaseUnlock", houseId: house.id })} type="button">
                      {t("meta.unlock.button", { cost: definition.legacyCost })}
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
            <p className="eyebrow">{t("meta.achievements.eyebrow")}</p>
            <h2 id="achievements-heading">{t("meta.achievements.heading")}</h2>
          </div>
          <ul className="ledger-list">
            {ACHIEVEMENT_DEFINITIONS.map((achievement) => (
              <li key={achievement.id}>
                <span>
                  <strong>{achievementName(t, achievement.id)}</strong>
                  <small>{achievementDescription(t, achievement.id)}</small>
                </span>
                <span>{meta.unlockedAchievements.includes(achievement.id) ? t("common.earned") : `+${achievement.legacyReward}`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ledger-section" aria-labelledby="synergies-heading">
          <div className="section-heading">
            <p className="eyebrow">{t("meta.synergies.eyebrow")}</p>
            <h2 id="synergies-heading">{t("meta.synergies.heading")}</h2>
          </div>
          <ul className="ledger-list">
            {HOUSE_SYNERGIES.filter(({ hidden }) => hidden).map((synergy) => {
              const discovered = meta.discoveredSynergies.includes(synergy.id);
              return (
                <li key={synergy.id}>
                  <span>
                    <strong>{discovered ? synergyName(t, synergy.id) : t("meta.synergies.undiscovered")}</strong>
                    <small>{discovered ? synergyDescription(t, synergy.id) : t("meta.synergies.clue")}</small>
                  </span>
                  <span>{discovered ? t("common.known") : t("common.hidden")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer className="screen-actions">
        <p>{t("meta.footer.note")}</p>
        <button className="primary-action" onClick={() => dispatch({ type: "beginSelection" })} type="button">
          {t("meta.beginRun")}
        </button>
      </footer>
    </main>
  );
}

import { INVESTMENT_TRACKS, type InvestmentTrack } from "../../../content/investmentConfig";
import type { HouseId } from "../../../content/houseConfig";
import { useLocale, type LocaleKey } from "../../../content/locale";
import {
  houseName,
  investmentDescription,
  investmentName,
} from "../../../content/locale/display";
import { canPurchase, investmentCost } from "../../../meta/investments";
import {
  investmentEffectLabel,
  purchaseInvestmentLabel,
} from "../../investmentSummary";

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

export function InvestmentTrackCard({
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
          <p className="investment-track__effect">{investmentEffectLabel(track.effectPerRank, t)}</p>
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

export function tracksForHouse(houseId: HouseId): readonly InvestmentTrack[] {
  return INVESTMENT_TRACKS.filter((track) => track.houseId === houseId);
}

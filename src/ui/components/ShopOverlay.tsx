import { useState } from "react";
import type { ShopAvailability, ShopItemId } from "../../build/build.types";
import type { GameState } from "../../engine/engine.types";
import { useLocale } from "../../content/locale";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { shopAvailabilityForState } from "../../engine/shopEngine";
import { useGameStore } from "../../state/gameStore";

import {
  localizedShopEffects,
  localizedShopReason,
  shopPresentationFor,
} from "./shopOverlayPresentation";
import { ChoiceIcon } from "./ChoiceIcon";
import {
  pageCount,
  pageItems,
  shopItemIcon,
} from "../choicePresentation/choiceVisuals";

export function ShopOverlay() {
  const {
    dispatch,
    state,
    towerPlacementActive,
  } = useGameStore();
  if (state.phase !== "intermission") {
    return null;
  }

  const availability = shopAvailabilityForState(state);

  function buy(itemId: ShopItemId) {
    if (itemId === "raise_tower") {
      dispatch({ type: "selectTowerPlacement" });
    } else {
      dispatch({
        type: "purchaseShopItem",
        itemId,
      });
    }
  }

  return (
    <ShopOverlayView
      availability={availability}
      onBeginNextWave={() => dispatch({ type: "beginNextWave" })}
      onBuy={buy}
      onCancelTowerPlacement={() => dispatch({ type: "cancelTowerPlacement" })}
      state={state}
      towerPlacementActive={towerPlacementActive}
    />
  );
}

export function ShopOverlayView({
  availability,
  onBeginNextWave,
  onBuy,
  onCancelTowerPlacement,
  state,
  towerPlacementActive,
}: {
  readonly availability: readonly ShopAvailability[];
  readonly onBeginNextWave: () => void;
  readonly onBuy: (itemId: ShopItemId) => void;
  readonly onCancelTowerPlacement: () => void;
  readonly state: GameState;
  readonly towerPlacementActive: boolean;
}) {
  const { t } = useLocale();
  const [page, setPage] = useState(0);
  const clearedWave = WAVE_DEFINITIONS[state.waveIndex];
  const summary = state.lastWaveSummary;
  const totalPages = pageCount(availability);

  return (
    <section
      aria-label={t("shop.label")}
      aria-live="polite"
      className={`shop-overlay${towerPlacementActive ? " shop-overlay--placing" : ""}`}
    >
      <header className="shop-overlay__header">
        <div>
          <p className="shop-overlay__eyebrow">
            {t("shop.waveSecured", { wave: clearedWave?.label ?? state.waveIndex + 1 })}
          </p>
          <h2>{t("shop.heading")}</h2>
          <p className="shop-overlay__summary">
            {summary === null
              ? t("shop.summary.empty")
              : t("shop.summary.lastNight", {
                  bannerDamage: summary.bannerDamage,
                  keepDamage: summary.keepDamage,
                  lost: summary.agentsLost,
                  tribute: summary.tributeEarned,
                })}
          </p>
          {"pendingDaylightRaid" in state &&
          state.pendingDaylightRaid === true ? (
            <p className="shop-overlay__raid-warning">
              {t("run.daylightRaid.pending")}
            </p>
          ) : null}
        </div>
        <p className="shop-overlay__tribute">
          <span>{t("hud.tribute")}</span>
          <strong>{state.tribute}</strong>
        </p>
      </header>

      <div className="choice-deck shop-grid">
        {pageItems(availability, page).map((entry) => (
          <ShopCard
            availability={entry}
            key={entry.item.id}
            onBuy={onBuy}
            purchaseCount={state.shopPurchases[entry.item.id]}
            towerPlacementActive={towerPlacementActive}
          />
        ))}
      </div>
      <nav className="choice-pager" aria-label={t("shop.page", { current: page + 1, total: totalPages })}>
        <button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">
          {t("shop.previous")}
        </button>
        <span>{page + 1} / {totalPages}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} type="button">
          {t("shop.next")}
        </button>
      </nav>

      {towerPlacementActive && (
        <div className="placement-instruction" role="status">
          <strong>{t("shop.placement.title")}</strong>
          <span>{t("shop.placement.body")}</span>
          <button
            onClick={onCancelTowerPlacement}
            type="button"
          >
            {t("shop.placement.cancel")}
          </button>
        </div>
      )}

      <footer className="shop-overlay__footer">
        <span>{t("shop.footer")}</span>
        <button
          disabled={towerPlacementActive}
          onClick={onBeginNextWave}
          type="button"
        >
          {t("shop.beginNight", { wave: state.waveIndex + 2 })}
        </button>
      </footer>
    </section>
  );
}

export function ShopCard({
  availability,
  onBuy,
  purchaseCount,
  towerPlacementActive,
}: {
  readonly availability: ShopAvailability;
  readonly onBuy: (itemId: ShopItemId) => void;
  readonly purchaseCount: number;
  readonly towerPlacementActive: boolean;
}) {
  const { t } = useLocale();
  const { available, cost, item, reason } = availability;
  const presentation = shopPresentationFor(item.id);
  const localizedReason = localizedShopReason(reason, t);
  const effects = localizedShopEffects(item.id, t);
  const effectLine = effects.join(" · ");
  const detail = [
    localizedReason,
    t("shop.purchased", { count: purchaseCount }),
  ].filter((line): line is string => line !== null).join(" · ");
  return (
    <button
      className={`shop-card shop-card--${presentation.category}`}
      disabled={!available || towerPlacementActive}
      onClick={() => onBuy(item.id)}
      title={detail}
      type="button"
    >
      <span className="choice-card__icon-row">
        <ChoiceIcon name={shopItemIcon(item.id)} />
      </span>
      <strong className="choice-card__name">
        {presentation.nameKey === null ? item.name : t(presentation.nameKey)}
      </strong>
      <span className="choice-card__effect">{effectLine}</span>
      <span className="shop-card__cost">{cost}</span>
      <span className="choice-detail-panel" role="tooltip">
        {detail}
      </span>
    </button>
  );
}

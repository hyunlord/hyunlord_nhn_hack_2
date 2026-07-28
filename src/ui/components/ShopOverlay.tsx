import type { ShopAvailability, ShopItemId } from "../../build/build.types";
import type { GameState } from "../../engine/engine.types";
import { useLocale } from "../../content/locale";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { shopAvailabilityForState } from "../../engine/shopEngine";
import { useGameStore } from "../../state/gameStore";

import {
  localizedShopEffects,
  localizedShopReason,
  SHOP_CATEGORY_ORDER,
  shopAvailabilityByCategory,
  shopCategoryLabelKey,
  shopPresentationFor,
} from "./shopOverlayPresentation";

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
  const clearedWave = WAVE_DEFINITIONS[state.waveIndex];
  const summary = state.lastWaveSummary;

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

      <div className="shop-grid">
        {SHOP_CATEGORY_ORDER.map((category) => {
          const entries = shopAvailabilityByCategory(availability, category);
          return (
            <section className="shop-category" key={category}>
              <h3>{t(shopCategoryLabelKey(category))}</h3>
              <div className="shop-category__items">
                {entries.map((availability) => (
                  <ShopCard
                    availability={availability}
                    key={availability.item.id}
                    onBuy={onBuy}
                    purchaseCount={state.shopPurchases[availability.item.id]}
                    towerPlacementActive={towerPlacementActive}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

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
  return (
    <article className="shop-card">
      <div className="shop-card__heading">
        <h4>
          {presentation.nameKey === null ? item.name : t(presentation.nameKey)}
        </h4>
        <strong>{cost}</strong>
      </div>
      <ul className="shop-card__effects">
        {effects.map((effect) => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
      <p>
        {presentation.descriptionKey === null
          ? item.description
          : t(presentation.descriptionKey)}
      </p>
      <p className="shop-card__count">
        {t("shop.purchased", { count: purchaseCount })}
      </p>
      <button
        disabled={!available || towerPlacementActive}
        onClick={() => onBuy(item.id)}
        type="button"
      >
        {item.needsPlacement ? t("shop.choosePosition") : t("shop.purchase")}
      </button>
      {localizedReason === null ? null : (
        <small className="shop-card__reason">{localizedReason}</small>
      )}
    </article>
  );
}

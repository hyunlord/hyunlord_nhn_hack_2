import type { ShopAvailability, ShopItemId } from "../../build/build.types";
import { useLocale, type LocaleKey } from "../../content/locale";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { shopAvailabilityForState } from "../../engine/shopEngine";
import { useGameStore } from "../../state/gameStore";
import { shopChoiceEffects } from "../choicePresentation/shopChoicePresentation";

type ShopCategory = "troops" | "defense" | "recovery" | "upgrade";

type ShopPresentation = {
  readonly category: ShopCategory;
  readonly nameKey: LocaleKey | null;
  readonly descriptionKey: LocaleKey | null;
};

const SHOP_PRESENTATION: Readonly<Record<ShopItemId, ShopPresentation>> = {
  field_medicine: {
    category: "recovery",
    descriptionKey: "shop.item.field_medicine.description",
    nameKey: "shop.item.field_medicine.name",
  },
  raise_tower: {
    category: "defense",
    descriptionKey: "shop.item.raise_tower.description",
    nameKey: "shop.item.raise_tower.name",
  },
  recruit_squad: {
    category: "troops",
    descriptionKey: "shop.item.recruit_squad.description",
    nameKey: "shop.item.recruit_squad.name",
  },
  reinforce_keep: {
    category: "defense",
    descriptionKey: "shop.item.reinforce_keep.description",
    nameKey: "shop.item.reinforce_keep.name",
  },
  revive_hero: {
    category: "recovery",
    descriptionKey: "shop.item.revive_hero.description",
    nameKey: "shop.item.revive_hero.name",
  },
  sharpen_arms: {
    category: "upgrade",
    descriptionKey: "shop.item.sharpen_arms.description",
    nameKey: "shop.item.sharpen_arms.name",
  },
};

const SHOP_CATEGORY_ORDER = ["troops", "defense", "recovery", "upgrade"] as const;

const SHOP_CATEGORY_KEYS: Readonly<Record<ShopCategory, LocaleKey>> = {
  defense: "shop.category.defense",
  recovery: "shop.category.recovery",
  troops: "shop.category.troops",
  upgrade: "shop.category.upgrade",
};

const SHOP_REASON_KEYS: Readonly<Record<string, LocaleKey>> = {
  "no damaged living agents": "shop.reason.noDamagedAgents",
  "no damaged surviving keep or banners": "shop.reason.noDamagedStructures",
  "no dead hero": "shop.reason.noDeadHero",
  "no dead regular agents": "shop.reason.noDeadAgents",
  "not enough tribute": "shop.reason.notEnoughTribute",
  "tower limit reached": "shop.reason.towerLimit",
};

function reasonMessage(
  reason: string | null,
  t: (key: LocaleKey) => string,
): string | null {
  if (reason === null) {
    return null;
  }
  const key = SHOP_REASON_KEYS[reason];
  return key === undefined ? reason : t(key);
}

export function ShopOverlay() {
  const {
    dispatch,
    state,
    towerPlacementActive,
  } = useGameStore();
  const { t } = useLocale();
  if (state.phase !== "intermission") {
    return null;
  }

  const clearedWave = WAVE_DEFINITIONS[state.waveIndex];
  const summary = state.lastWaveSummary;
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
              : `Last night ${summary.agentsLost} lost · ` +
                `keep damage ${summary.keepDamage} · ` +
                `banner damage ${summary.bannerDamage} · ` +
                `${summary.tributeEarned} tribute earned`}
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
          const entries = availability.filter(
            ({ item }) => SHOP_PRESENTATION[item.id].category === category,
          );
          return (
            <section className="shop-category" key={category}>
              <h3>{t(SHOP_CATEGORY_KEYS[category])}</h3>
              <div className="shop-category__items">
                {entries.map((availability) => (
                  <ShopCard
                    availability={availability}
                    key={availability.item.id}
                    onBuy={buy}
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
            onClick={() => dispatch({ type: "cancelTowerPlacement" })}
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
          onClick={() => dispatch({ type: "beginNextWave" })}
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
  const presentation = SHOP_PRESENTATION[item.id];
  const localizedReason = reasonMessage(reason, t);
  const effects = shopChoiceEffects(item.id, t);
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

import type { ShopItemId } from "../../build/build.types";
import { WAVE_DEFINITIONS } from "../../content/waveConfig";
import { shopAvailabilityForState } from "../../engine/shopEngine";
import { useGameStore } from "../../state/gameStore";

type InstantItem = Exclude<ShopItemId, "raise_tower">;

export function ShopOverlay() {
  const {
    dispatch,
    state,
    towerPlacementActive,
  } = useGameStore();
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
        itemId: itemId as InstantItem,
      });
    }
  }

  return (
    <section
      aria-label="Intermission tribute shop"
      aria-live="polite"
      className={`shop-overlay${towerPlacementActive ? " shop-overlay--placing" : ""}`}
    >
      <header className="shop-overlay__header">
        <div>
          <p className="shop-overlay__eyebrow">
            {clearedWave?.label ?? "Wave"} secured
          </p>
          <h2>Prepare the defense</h2>
          <p className="shop-overlay__summary">
            {summary === null
              ? "Review the line before the next assault."
              : `${summary.agentsLost} agents lost · ${summary.hallDamage} hall damage`}
          </p>
        </div>
        <p className="shop-overlay__tribute">
          <span>Tribute</span>
          <strong>{state.tribute}</strong>
        </p>
      </header>

      <div className="shop-grid">
        {availability.map(({ item, cost, available, reason }) => (
          <article className="shop-card" key={item.id}>
            <div className="shop-card__heading">
              <h3>{item.name}</h3>
              <strong>{cost}</strong>
            </div>
            <p>{item.description}</p>
            <p className="shop-card__count">
              Purchased {state.shopPurchases[item.id]}
            </p>
            <button
              disabled={!available || towerPlacementActive}
              onClick={() => buy(item.id)}
              type="button"
            >
              {item.needsPlacement ? "Choose position" : "Purchase"}
            </button>
            {!available && (
              <small className="shop-card__reason">{reason}</small>
            )}
          </article>
        ))}
      </div>

      {towerPlacementActive && (
        <div className="placement-instruction" role="status">
          <strong>Place tower on the map</strong>
          <span>Click to build · Escape or right-click to cancel</span>
          <button
            onClick={() => dispatch({ type: "cancelTowerPlacement" })}
            type="button"
          >
            Cancel placement
          </button>
        </div>
      )}

      <footer className="shop-overlay__footer">
        <span>Purchases are final when committed.</span>
        <button
          disabled={towerPlacementActive}
          onClick={() => dispatch({ type: "beginNextWave" })}
          type="button"
        >
          Begin wave {state.waveIndex + 2}
        </button>
      </footer>
    </section>
  );
}

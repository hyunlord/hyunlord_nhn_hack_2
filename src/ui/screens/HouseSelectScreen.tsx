import type { CSSProperties } from "react";
import { HOUSE_CONFIG, HOUSE_SPAWN_SLOTS } from "../../content/houseConfig";
import type { UnitClassId } from "../../content/unitClassConfig";
import { UNIT_CLASS_IDS } from "../../content/unitClassConfig";
import { useLocale } from "../../content/locale";
import { houseIdentity, houseName, houseTrait, unitClassLabel, synergyDescription, synergyName } from "../../content/locale/display";
import {
  frameBackgroundImage,
  HOUSE_FRAME_CONTENT_PERCENT,
  HOUSE_SELECTION_FRAME,
} from "../../content/framePresentation";
import { previewHouseSynergies } from "../../content/houseSynergies";
import { useAppFlow } from "../../state/appFlowContext";

const FRAME_CONTENT_STYLE = {
  height: `${HOUSE_FRAME_CONTENT_PERCENT.height}%`,
  left: `${HOUSE_FRAME_CONTENT_PERCENT.left}%`,
  top: `${HOUSE_FRAME_CONTENT_PERCENT.top}%`,
  width: `${HOUSE_FRAME_CONTENT_PERCENT.width}%`,
} as const satisfies CSSProperties;

const UNIT_CLASS_COMPOSITION_PALETTE: Readonly<Record<UnitClassId, string>> = {
  melee: "#d2a86a",
  spear: "#9aa5ff",
  archer: "#82d1b7",
  skirmisher: "#f08f8b",
};

function rosterComposition(houseId: typeof HOUSE_CONFIG[number]["id"]) {
  const house = HOUSE_CONFIG.find(({ id }) => id === houseId);
  if (house === undefined) {
    return [];
  }
  const total = UNIT_CLASS_IDS.reduce(
    (sum, id) => sum + (house.roster[id] ?? 0),
    0,
  );
  return UNIT_CLASS_IDS.map((unitClass) => ({
    unitClass,
    count: house.roster[unitClass] ?? 0,
    ratio: total === 0 ? 0 : ((house.roster[unitClass] ?? 0) / total) * 100,
  }));
}

export function HouseSelectScreen() {
  const { dispatch, state } = useAppFlow();
  const { t } = useLocale();
  const synergies = previewHouseSynergies(
    state.selectedHouseIds,
    state.meta.discoveredSynergies,
  );

  return (
    <main className="app-shell screen-shell" data-screen="selection">
      <header className="screen-header screen-header--compact">
        <div>
          <p className="eyebrow">{t("selection.eyebrow")}</p>
          <h1>{t("selection.heading")}</h1>
          <p>{t("selection.description")}</p>
        </div>
        <button className="text-action" onClick={() => dispatch({ type: "returnToMeta" })} type="button">
          {t("selection.back")}
        </button>
      </header>

      <ol className="selection-slots" aria-label={t("selection.orderLabel")}>
        {HOUSE_SPAWN_SLOTS.map((slot, index) => {
          const houseId = state.selectedHouseIds[index];
          return (
            <li key={slot.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{houseId === undefined ? t("selection.openSlot") : houseName(t, houseId)}</strong>
                <small>{t(`selection.slot.${slot.id}` as never)}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="selection-layout">
        <section className="ledger-section" aria-labelledby="choose-heading">
          <div className="section-heading">
            <p className="eyebrow">{t("selection.available.eyebrow")}</p>
            <h2 id="choose-heading">{t("selection.roster")}</h2>
          </div>
          <div className="selection-roster">
            {HOUSE_CONFIG.map((house) => {
              const unlocked = state.meta.unlockedHouses.includes(house.id);
              const order = state.selectedHouseIds.indexOf(house.id);
              const selected = order >= 0;
              const backgroundImage = frameBackgroundImage(
                HOUSE_SELECTION_FRAME,
                selected ? "color-mix(in srgb, var(--accent) 8%, var(--panel))" : "var(--panel)",
              );
              return (
                <button
                  aria-pressed={selected}
                  className={`selection-card${unlocked ? "" : " selection-card--locked"}`}
                  data-frame-sprite={HOUSE_SELECTION_FRAME.frameSpriteId}
                  disabled={!unlocked}
                  key={house.id}
                  onClick={() => dispatch({ type: "toggleHouse", houseId: house.id })}
                  style={
                    backgroundImage === undefined
                      ? undefined
                      : { backgroundImage, backgroundRepeat: "no-repeat, repeat", backgroundSize: "100% 100%, auto" }
                  }
                  type="button"
                >
                  <span className="selection-card__content" style={FRAME_CONTENT_STYLE}>
                    <span aria-hidden="true" className="house-mark" style={{ backgroundColor: house.color }} />
                    <span>
                    <strong>{houseName(t, house.id)}</strong>
                      <small>{houseIdentity(t, house.id)}</small>
                      <small className="trait-line">{houseTrait(t, house.id)}</small>
                    </span>
                    <div className="selection-composition">
                      {rosterComposition(house.id).map(({ unitClass, count, ratio }) => (
                        <div className="selection-composition__row" key={unitClass}>
                          <span>
                            {unitClassLabel(t, unitClass)}
                            {" "}
                            {count}
                          </span>
                          <div className="selection-composition__track">
                            <span
                              className="selection-composition__fill"
                              style={{
                                background: UNIT_CLASS_COMPOSITION_PALETTE[unitClass],
                                width: `${Math.round(ratio)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="status-label">
                      {selected ? t("selection.pick", { order: order + 1 }) : unlocked ? t("selection.choose") : t("common.locked")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="intelligence-panel" aria-labelledby="synergy-preview-heading">
          <p className="eyebrow">{t("selection.intel.eyebrow")}</p>
          <h2 id="synergy-preview-heading">{t("selection.intel.heading")}</h2>
          {synergies.length === 0 ? (
            <p>{t("selection.intel.empty")}</p>
          ) : (
            <ul>
              {synergies.map((synergy) => (
                <li key={synergy.id}>
                  <strong>{synergyName(t, synergy.id)}</strong>
                  <span>{synergyDescription(t, synergy.id)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="intelligence-panel__note">{t("selection.intel.note")}</p>
        </aside>
      </div>

      <footer className="screen-actions">
        <p>{t("selection.count", { count: state.selectedHouseIds.length })}</p>
        <button
          className="primary-action"
          disabled={state.selectedHouseIds.length !== 3}
          onClick={() => dispatch({ type: "confirmSelection" })}
          type="button"
        >
          {t("selection.confirm")}
        </button>
      </footer>
    </main>
  );
}

import { HOUSE_CONFIG, HOUSE_SPAWN_SLOTS } from "../../content/houseConfig";
import { useLocale, type LocaleKey } from "../../content/locale";
import {
  houseIdentity,
  houseName,
  houseTraitLabels,
  synergyDescription,
  synergyName,
  UNIT_CLASS_ORDER,
  unitClassLabel,
} from "../../content/locale/display";
import {
  frameBackgroundImage,
  HOUSE_SELECTION_FRAME,
} from "../../content/framePresentation";
import { previewHouseSynergies } from "../../content/houseSynergies";
import { useAppFlow } from "../../state/appFlowContext";

const SLOT_LABEL_KEYS = {
  north: "selection.slot.north",
  southeast: "selection.slot.southeast",
  southwest: "selection.slot.southwest",
} as const satisfies Record<typeof HOUSE_SPAWN_SLOTS[number]["id"], LocaleKey>;

function rosterComposition(houseId: typeof HOUSE_CONFIG[number]["id"]) {
  const house = HOUSE_CONFIG.find(({ id }) => id === houseId);
  if (house === undefined) {
    return [];
  }
  const total = UNIT_CLASS_ORDER.reduce(
    (sum, id) => sum + (house.roster[id] ?? 0),
    0,
  );
  return UNIT_CLASS_ORDER.map((unitClass) => ({
    unitClass,
    count: house.roster[unitClass] ?? 0,
    percent: total === 0 ? 0 : ((house.roster[unitClass] ?? 0) / total) * 100,
  }));
}

function selectionSegmentFill(houseColor: string, index: number): string {
  return `color-mix(in srgb, ${houseColor} ${40 + index * 14}%, var(--panel))`;
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
                <small>{t(SLOT_LABEL_KEYS[slot.id])}</small>
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
              const backgroundImage = frameBackgroundImage(HOUSE_SELECTION_FRAME);
              return (
                <HouseSelectionCard
                  backgroundImage={backgroundImage}
                  house={house}
                  key={house.id}
                  onToggle={() => dispatch({ type: "toggleHouse", houseId: house.id })}
                  selectedOrder={order}
                  unlocked={unlocked}
                />
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

export function HouseSelectionCard({
  backgroundImage,
  house,
  onToggle,
  selectedOrder,
  unlocked,
}: {
  readonly backgroundImage: string | undefined;
  readonly house: typeof HOUSE_CONFIG[number];
  readonly onToggle: () => void;
  readonly selectedOrder: number;
  readonly unlocked: boolean;
}) {
  const { t } = useLocale();
  const selected = selectedOrder >= 0;
  return (
    <button
      aria-pressed={selected}
      className={`selection-card${unlocked ? "" : " selection-card--locked"}`}
      data-frame-sprite={HOUSE_SELECTION_FRAME.frameSpriteId}
      disabled={!unlocked}
      onClick={onToggle}
      style={
        backgroundImage === undefined
          ? undefined
          : { backgroundImage, backgroundRepeat: "no-repeat", backgroundSize: "100% 100%" }
      }
      type="button"
    >
      <span className="selection-card__content">
        <span aria-hidden="true" className="house-mark" style={{ backgroundColor: house.color }} />
        <span>
          <strong>{houseName(t, house.id)}</strong>
          {houseTraitLabels(t, house).map((label) => (
            <small className="trait-line" key={label}>{label}</small>
          ))}
        </span>
        <div className="selection-composition" aria-label={t("selection.composition", { house: houseName(t, house.id) })}>
          {rosterComposition(house.id).map(({ unitClass, count, percent }, index) => (
            <div className="selection-composition__row" key={unitClass}>
              <span
                aria-label={`${unitClassLabel(t, unitClass)} ${count}`}
                className="selection-composition__label"
              >
                <span>{unitClassLabel(t, unitClass)}</span>
                <strong>{count} · {Math.round(percent)}%</strong>
              </span>
              <div className="selection-composition__track">
                <span
                  className="selection-composition__fill"
                  style={{
                    background: selectionSegmentFill(house.color, index),
                    width: `${Math.round(percent)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <small>{houseIdentity(t, house.id)}</small>
        <span className="status-label">
          {selected ? t("selection.pick", { order: selectedOrder + 1 }) : unlocked ? t("selection.choose") : t("common.locked")}
        </span>
      </span>
    </button>
  );
}

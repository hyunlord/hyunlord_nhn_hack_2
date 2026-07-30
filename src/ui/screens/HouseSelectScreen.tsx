import { useState, type CSSProperties } from "react";
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
import { ChoiceIcon } from "../components/ChoiceIcon";
import {
  houseTraitIcons,
  pageCount,
  pageItems,
} from "../choicePresentation/choiceVisuals";

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
  return UNIT_CLASS_ORDER
    .map((unitClass) => ({
      count: house.roster[unitClass] ?? 0,
      unitClass,
    }))
    .filter(({ count }) => count > 0);
}

export function HouseSelectScreen() {
  const { dispatch, state } = useAppFlow();
  const { t } = useLocale();
  const [page, setPage] = useState(0);
  const totalPages = pageCount(HOUSE_CONFIG);
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
            <h2 id="choose-heading">{t("selection.heading")}</h2>
          </div>
          <div className="choice-deck selection-roster">
            {pageItems(HOUSE_CONFIG, page).map((house) => {
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
          <nav className="choice-pager" aria-label={t("selection.page", { current: page + 1, total: totalPages })}>
            <button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">
              {t("selection.previous")}
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} type="button">
              {t("selection.next")}
            </button>
          </nav>
        </section>

        <aside className="synergy-strip" aria-labelledby="synergy-preview-heading">
          <strong id="synergy-preview-heading">{t("selection.intel.heading")}</strong>
          {synergies.length === 0 ? (
            <span>{t("selection.intel.empty")}</span>
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
  const traitIcons = houseTraitIcons(house);
  const populationDots = Array.from(
    { length: house.startingPopulation },
    (_, index) => index,
  );
  const cardStyle = {
    "--accent": house.color,
    "--population-gap": `${Math.max(2, Math.round(house.formation.spacing / 4))}px`,
    ...(backgroundImage === undefined
      ? {}
      : {
          backgroundImage,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
        }),
  } as CSSProperties;
  return (
    <button
      aria-disabled={!unlocked}
      aria-pressed={selected}
      className={`selection-card${unlocked ? "" : " selection-card--locked"}`}
      data-frame-sprite={HOUSE_SELECTION_FRAME.frameSpriteId}
      onClick={() => {
        if (unlocked) {
          onToggle();
        }
      }}
      style={cardStyle}
      type="button"
    >
      <span className="selection-card__content">
        <span className="choice-card__icon-row">
          {traitIcons.map((icon) => <ChoiceIcon key={icon} name={icon} />)}
        </span>
        <strong className="choice-card__name">{houseName(t, house.id)}</strong>
        <span className="choice-card__effect">
          {houseIdentity(t, house.id)} · {t("selection.population", { count: house.startingPopulation })}
        </span>
        <span aria-hidden="true" className="population-cluster">
          {populationDots.map((dot) => <i key={dot} />)}
        </span>
        <span className="status-label">
          {selected ? t("selection.pick", { order: selectedOrder + 1 }) : unlocked ? t("selection.choose") : t("common.locked")}
        </span>
        <span className="choice-detail-panel" role="tooltip">
          <strong>{t("selection.details", { house: houseName(t, house.id) })}</strong>
          {houseTraitLabels(t, house).map((label) => <small key={label}>{label}</small>)}
          {rosterComposition(house.id).map(({ unitClass, count }) => (
            <small key={unitClass}>{unitClassLabel(t, unitClass)} {count}</small>
          ))}
        </span>
      </span>
    </button>
  );
}

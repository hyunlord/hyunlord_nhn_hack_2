import { HOUSE_CONFIG, HOUSE_SPAWN_SLOTS } from "../../content/houseConfig";
import { previewHouseSynergies } from "../../content/houseSynergies";
import { useAppFlow } from "../../state/appFlowContext";

export function HouseSelectScreen() {
  const { dispatch, state } = useAppFlow();
  const synergies = previewHouseSynergies(
    state.selectedHouseIds,
    state.meta.discoveredSynergies,
  );

  return (
    <main className="app-shell screen-shell" data-screen="selection">
      <header className="screen-header screen-header--compact">
        <div>
          <p className="eyebrow">Alliance assembly</p>
          <h1>Choose the Three</h1>
          <p>Order determines left, right, and bottom-center deployment.</p>
        </div>
        <button
          className="text-action"
          onClick={() => dispatch({ type: "returnToMeta" })}
          type="button"
        >
          Return to Legacy
        </button>
      </header>

      <ol className="selection-slots" aria-label="Deployment order">
        {HOUSE_SPAWN_SLOTS.map((slot, index) => {
          const houseId = state.selectedHouseIds[index];
          const house = HOUSE_CONFIG.find(({ id }) => id === houseId);
          return (
            <li key={slot.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{house?.name ?? "Open slot"}</strong>
                <small>{slot.id.replace("_", " ")}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="selection-layout">
        <section className="ledger-section" aria-labelledby="choose-heading">
          <div className="section-heading">
            <p className="eyebrow">Available houses</p>
            <h2 id="choose-heading">Roster</h2>
          </div>
          <div className="selection-roster">
            {HOUSE_CONFIG.map((house) => {
              const unlocked = state.meta.unlockedHouses.includes(house.id);
              const order = state.selectedHouseIds.indexOf(house.id);
              const selected = order >= 0;
              return (
                <button
                  aria-pressed={selected}
                  className={`selection-card${unlocked ? "" : " selection-card--locked"}`}
                  disabled={!unlocked}
                  key={house.id}
                  onClick={() =>
                    dispatch({ type: "toggleHouse", houseId: house.id })
                  }
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="house-mark"
                    style={{ backgroundColor: house.color }}
                  />
                  <span>
                    <strong>{house.name}</strong>
                    <small>{house.identity}</small>
                  </span>
                  <span className="status-label">
                    {selected ? `Pick ${order + 1}` : unlocked ? "Choose" : "Locked"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="intelligence-panel" aria-labelledby="synergy-preview-heading">
          <p className="eyebrow">Alliance intelligence</p>
          <h2 id="synergy-preview-heading">Synergy preview</h2>
          {synergies.length === 0 ? (
            <p>No known synergy is active in this selection.</p>
          ) : (
            <ul>
              {synergies.map((synergy) => (
                <li key={synergy.id}>
                  <strong>{synergy.name}</strong>
                  <span>{synergy.description}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="intelligence-panel__note">
            Hidden combinations appear only after surviving a run with them.
          </p>
        </aside>
      </div>

      <footer className="screen-actions">
        <p>{state.selectedHouseIds.length}/3 houses selected</p>
        <button
          className="primary-action"
          disabled={state.selectedHouseIds.length !== 3}
          onClick={() => dispatch({ type: "confirmSelection" })}
          type="button"
        >
          Confirm alliance
        </button>
      </footer>
    </main>
  );
}

import { useEffect } from "react";
import { GameCanvas } from "../../render/GameCanvas";
import { useLocale } from "../../content/locale";
import { useSettings } from "../../settings/SettingsContext";
import { useAppFlow } from "../../state/appFlowContext";
import {
  GameStoreProvider,
  gameStoreRunIdentity,
  gameTickIntervalMsForSpeed,
  useGameStore,
} from "../../state/gameStore";
import { validateHouseSelection } from "../../content/houseConfig";
import { deriveStartingModifierBundle } from "../../content/runConfiguration";
import { HighlightFeed } from "../components/HighlightFeed";
import { HUD } from "../components/HUD";
import { MiracleButtons } from "../components/MiracleButtons";
import { DraftOverlay } from "../components/DraftOverlay";
import { ShopOverlay } from "../components/ShopOverlay";

function RunWorld({ onOpenSettings }: { readonly onOpenSettings: () => void }) {
  const { state } = useGameStore();
  const { t } = useLocale();
  return (
    <main className="run-viewport" aria-label={t("run.screenLabel")}>
      {state.betrayalHouseId === null ? null : (
        <aside className="betrayal-notice run-betrayal" aria-live="assertive">
          <strong>{t("run.betrayal.title")}</strong>
          <span>{t("run.betrayal.body")}</span>
        </aside>
      )}
      <section className="run-stage" aria-label={t("run.stageLabel")}>
        <GameCanvas />
        <HUD onOpenSettings={onOpenSettings} />
        <MiracleButtons />
        <HighlightFeed />
        <ShopOverlay />
        <DraftOverlay />
      </section>
    </main>
  );
}

export function RunScreen() {
  const { dispatch, state } = useAppFlow();
  const { settings } = useSettings();
  const validation = validateHouseSelection(state.selectedHouseIds);

  useEffect(() => {
    if (state.appPhase === "run" && (state.runSeed === null || !validation.valid)) {
      dispatch({ type: "returnToMeta" });
    }
  }, [dispatch, state.appPhase, state.runSeed, validation.valid]);

  if (state.runSeed === null || !validation.valid) {
    return null;
  }
  const startingModifiers = deriveStartingModifierBundle(state.meta.investmentRanks);
  const runIdentity = gameStoreRunIdentity({ seed: state.runSeed, houseIds: validation.houseIds, startingModifiers });

  return (
    <GameStoreProvider
      houseIds={validation.houseIds}
      key={runIdentity}
      onTerminal={(summary) => dispatch({ type: "completeRun", summary })}
      seed={state.runSeed}
      startingModifiers={startingModifiers}
      tickIntervalMs={gameTickIntervalMsForSpeed(settings.simulationSpeed)}
    >
      <RunWorld onOpenSettings={() => dispatch({ type: "openSettings" })} />
    </GameStoreProvider>
  );
}

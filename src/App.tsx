import { useEffect } from "react";
import { useAppFlow } from "./state/appFlowContext";
import { SpriteDebugOverlay } from "./ui/components/SpriteDebugOverlay";
import { HouseSelectScreen } from "./ui/screens/HouseSelectScreen";
import { MetaScreen } from "./ui/screens/MetaScreen";
import { RunScreen } from "./ui/screens/RunScreen";
import { RunSummaryScreen } from "./ui/screens/RunSummaryScreen";
import { SettingsScreen } from "./ui/screens/SettingsScreen";
import { TitleScreen } from "./ui/screens/TitleScreen";

export function App() {
  const { dispatch, state } = useAppFlow();
  const debugOverlay = import.meta.env.DEV ? <SpriteDebugOverlay /> : null;

  useEffect(() => {
    const toggleSettings = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat
      ) {
        return;
      }
      if (document.querySelector(".shop-overlay--placing") !== null) {
        return;
      }
      event.preventDefault();
      dispatch({
        type: state.appPhase === "settings" ? "closeSettings" : "openSettings",
      });
    };
    window.addEventListener("keydown", toggleSettings);
    return () => window.removeEventListener("keydown", toggleSettings);
  }, [dispatch, state.appPhase]);

  switch (state.appPhase) {
    case "title":
      return (
        <>
          <TitleScreen />
          {debugOverlay}
        </>
      );
    case "meta":
      return (
        <>
          <MetaScreen />
          {debugOverlay}
        </>
      );
    case "select":
      return (
        <>
          <HouseSelectScreen />
          {debugOverlay}
        </>
      );
    case "run":
      return (
        <>
          <RunScreen />
          {debugOverlay}
        </>
      );
    case "summary":
      return (
        <>
          <RunSummaryScreen />
          {debugOverlay}
        </>
      );
    case "settings":
      return (
        <>
          {state.previousAppPhase === "run" ? <RunScreen /> : null}
          <div className="settings-overlay">
            <SettingsScreen />
          </div>
          {debugOverlay}
        </>
      );
  }
}

import { useAppFlow } from "./state/appFlowContext";
import { SpriteDebugOverlay } from "./ui/components/SpriteDebugOverlay";
import { HouseSelectScreen } from "./ui/screens/HouseSelectScreen";
import { MetaScreen } from "./ui/screens/MetaScreen";
import { RunScreen } from "./ui/screens/RunScreen";
import { RunSummaryScreen } from "./ui/screens/RunSummaryScreen";

export function App() {
  const { state } = useAppFlow();
  const debugOverlay = import.meta.env.DEV ? <SpriteDebugOverlay /> : null;

  switch (state.appPhase) {
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
  }
}

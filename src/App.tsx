import { useAppFlow } from "./state/appFlowContext";
import { HouseSelectScreen } from "./ui/screens/HouseSelectScreen";
import { MetaScreen } from "./ui/screens/MetaScreen";
import { RunScreen } from "./ui/screens/RunScreen";
import { RunSummaryScreen } from "./ui/screens/RunSummaryScreen";

export function App() {
  const { state } = useAppFlow();
  switch (state.appPhase) {
    case "meta":
      return <MetaScreen />;
    case "select":
      return <HouseSelectScreen />;
    case "run":
      return <RunScreen />;
    case "summary":
      return <RunSummaryScreen />;
  }
}

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";
import { loadMetaState, saveMetaState } from "../meta/persistence";
import {
  appReducer,
  createInitialAppState,
  type AppAction,
  type AppState,
} from "./appFlow";

interface AppFlowValue {
  readonly state: AppState;
  readonly dispatch: Dispatch<AppAction>;
}

const AppFlowContext = createContext<AppFlowValue | undefined>(undefined);

function initialSeed(): number {
  return Math.max(1, Math.floor(Date.now() / 1_000));
}

function initializeAppState(): AppState {
  return createInitialAppState(loadMetaState(window.localStorage), initialSeed());
}

export function AppFlowProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    initializeAppState,
  );

  useEffect(() => {
    saveMetaState(window.localStorage, state.meta);
  }, [state.meta]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return createElement(AppFlowContext.Provider, { value }, children);
}

export function useAppFlow(): AppFlowValue {
  const context = useContext(AppFlowContext);
  if (context === undefined) {
    throw new Error("useAppFlow must be used inside AppFlowProvider.");
  }
  return context;
}

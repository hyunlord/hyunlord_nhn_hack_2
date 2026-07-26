import {
  createElement,
  createContext,
  useContext,
  useReducer,
  type PropsWithChildren,
} from "react";
import type { GameState } from "../engine/engine.types";
import type { GameAction, GameStoreValue } from "./gameStore.types";

export const DEFAULT_GAME_STATE: GameState = {
  tick: 0,
  phase: "idle",
  houses: [],
  agents: [],
  activeThreat: null,
  highlights: [],
  ending: null,
};

class GameStoreUnavailableError extends Error {
  public constructor() {
    super("useGameStore must be used inside GameStoreProvider.");
    this.name = "GameStoreUnavailableError";
  }
}

const GameStoreContext = createContext<GameStoreValue | undefined>(undefined);

export function gameReducer(_state: GameState, _action: GameAction): GameState {
  // TODO: implement reducer cases in phase 2
  return DEFAULT_GAME_STATE;
}

export function GameStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, DEFAULT_GAME_STATE);
  return createElement(
    GameStoreContext.Provider,
    { value: { state, dispatch } },
    children,
  );
}

export function useGameStore(): GameStoreValue {
  const store = useContext(GameStoreContext);
  if (store === undefined) {
    throw new GameStoreUnavailableError();
  }
  return store;
}

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type PropsWithChildren,
} from "react";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Rng } from "../engine/prng";
import type { GameState } from "../engine/engine.types";
import { advanceTick, createInitialState } from "../engine/tick";
import type { GameAction, GameStoreValue } from "./gameStore.types";

const TICK_INTERVAL_MS = 1_000 / BALANCE_CONFIG.TICKS_PER_SECOND;
const MAX_CATCH_UP_TICKS = 5;

interface RngReference {
  current: Rng;
}

class GameStoreUnavailableError extends Error {
  public constructor() {
    super("useGameStore must be used inside GameStoreProvider.");
    this.name = "GameStoreUnavailableError";
  }
}

const GameStoreContext = createContext<GameStoreValue | undefined>(undefined);

export function gameReducer(
  state: GameState,
  action: GameAction,
  rngReference: RngReference,
): GameState {
  switch (action.type) {
    case "tick":
      return advanceTick(state, rngReference.current);
    case "reset": {
      const initialWorld = createInitialState(action.seed);
      rngReference.current = initialWorld.rng;
      return initialWorld.state;
    }
  }
}

export function GameStoreProvider({ children }: PropsWithChildren) {
  const initialWorldReference = useRef<ReturnType<
    typeof createInitialState
  > | null>(null);
  if (initialWorldReference.current === null) {
    initialWorldReference.current = createInitialState(
      BALANCE_CONFIG.DEFAULT_SEED,
    );
  }

  const rngReference = useRef(initialWorldReference.current.rng);
  const [state, dispatch] = useReducer(
    (currentState: GameState, action: GameAction) =>
      gameReducer(currentState, action, rngReference),
    initialWorldReference.current.state,
  );

  useEffect(() => {
    let frameId = 0;
    let previousTime: number | null = null;
    let accumulatedTime = 0;

    function runFrame(currentTime: number) {
      if (previousTime !== null) {
        accumulatedTime = Math.min(
          accumulatedTime + currentTime - previousTime,
          TICK_INTERVAL_MS * MAX_CATCH_UP_TICKS,
        );

        let ticksThisFrame = 0;
        while (
          accumulatedTime >= TICK_INTERVAL_MS &&
          ticksThisFrame < MAX_CATCH_UP_TICKS
        ) {
          dispatch({ type: "tick" });
          accumulatedTime -= TICK_INTERVAL_MS;
          ticksThisFrame += 1;
        }
      }

      previousTime = currentTime;
      frameId = requestAnimationFrame(runFrame);
    }

    frameId = requestAnimationFrame(runFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

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

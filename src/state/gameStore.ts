import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { MiracleType } from "../divine/divine.types";
import type { Rng } from "../engine/prng";
import type { GameState } from "../engine/engine.types";
import {
  advanceTick,
  castMiracle,
  createInitialState,
} from "../engine/tick";
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

class UnexpectedGameActionError extends Error {
  public constructor(action: never) {
    super(`Unexpected game action: ${JSON.stringify(action)}`);
    this.name = "UnexpectedGameActionError";
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
    case "castMiracle":
      return castMiracle(state, {
        type: action.miracle,
        targetX: action.x,
        targetY: action.y,
        tick: state.tick,
      });
    case "selectMiracle":
      return state;
    default:
      throw new UnexpectedGameActionError(action);
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
  const [selectedMiracle, setSelectedMiracle] =
    useState<MiracleType | null>(null);
  const [state, simulationDispatch] = useReducer(
    (currentState: GameState, action: GameAction) =>
      gameReducer(currentState, action, rngReference),
    initialWorldReference.current.state,
  );
  const selectMiracle = useCallback((miracle: MiracleType | null) => {
    setSelectedMiracle(miracle);
  }, []);
  const dispatch = useCallback((action: GameAction) => {
    switch (action.type) {
      case "selectMiracle":
        setSelectedMiracle(action.miracle);
        return;
      case "castMiracle":
        simulationDispatch(action);
        setSelectedMiracle(null);
        return;
      case "reset":
        simulationDispatch(action);
        setSelectedMiracle(null);
        return;
      case "tick":
        simulationDispatch(action);
        return;
      default:
        throw new UnexpectedGameActionError(action);
    }
  }, []);

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

  const store = useMemo<GameStoreValue>(
    () => ({
      state,
      dispatch,
      selectedMiracle,
      selectMiracle,
    }),
    [dispatch, selectMiracle, selectedMiracle, state],
  );

  return createElement(
    GameStoreContext.Provider,
    { value: store },
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

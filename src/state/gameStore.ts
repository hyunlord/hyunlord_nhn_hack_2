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
import type { GameState } from "../engine/engine.types";
import {
  advanceTick,
  beginNextWave,
  castMiracle,
  createInitialState,
} from "../engine/tick";
import type {
  CommitStateAction,
  GameAction,
  GameStoreValue,
} from "./gameStore.types";

const TICK_INTERVAL_MS = 1_000 / BALANCE_CONFIG.TICKS_PER_SECOND;
const MAX_CATCH_UP_TICKS = 5;

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
  _state: GameState,
  action: CommitStateAction,
): GameState {
  return action.next;
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
  const seedReference = useRef(BALANCE_CONFIG.DEFAULT_SEED);
  const stateReference = useRef(initialWorldReference.current.state);
  const [selectedMiracle, setSelectedMiracle] =
    useState<MiracleType | null>(null);
  const [state, commitDispatch] = useReducer(
    gameReducer,
    initialWorldReference.current.state,
  );
  const commitState = useCallback((next: GameState) => {
    stateReference.current = next;
    commitDispatch({ type: "commitState", next });
  }, []);
  const selectMiracle = useCallback((miracle: MiracleType | null) => {
    setSelectedMiracle(miracle);
  }, []);
  const dispatch = useCallback((action: GameAction) => {
    switch (action.type) {
      case "selectMiracle":
        setSelectedMiracle(action.miracle);
        return;
      case "castMiracle": {
        const current = stateReference.current;
        commitState(
          castMiracle(current, {
            type: action.miracle,
            targetX: action.x,
            targetY: action.y,
            tick: current.tick,
          }),
        );
        setSelectedMiracle(null);
        return;
      }
      case "beginNextWave":
        commitState(
          beginNextWave(
            stateReference.current,
            rngReference.current,
          ),
        );
        return;
      case "restart": {
        seedReference.current += 1;
        const initialWorld = createInitialState(seedReference.current);
        rngReference.current = initialWorld.rng;
        commitState(initialWorld.state);
        setSelectedMiracle(null);
        return;
      }
      default:
        throw new UnexpectedGameActionError(action);
    }
  }, [commitState]);

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
          commitState(
            advanceTick(stateReference.current, rngReference.current),
          );
          accumulatedTime -= TICK_INTERVAL_MS;
          ticksThisFrame += 1;
        }
      }

      previousTime = currentTime;
      frameId = requestAnimationFrame(runFrame);
    }

    frameId = requestAnimationFrame(runFrame);
    return () => cancelAnimationFrame(frameId);
  }, [commitState]);

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

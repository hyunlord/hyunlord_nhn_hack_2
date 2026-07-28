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
import {
  EMPTY_STARTING_MODIFIER_BUNDLE,
  type StartingModifierBundle,
} from "../content/runConfiguration";
import type { MiracleType } from "../divine/divine.types";
import type { DivineSkillId } from "../divine/skillTypes";
import type { GameState } from "../engine/engine.types";
import { createRunSummary } from "../engine/runSummary";
import {
  advanceTick,
  beginNextWave,
  castMiracle,
  castSkill,
  createInitialState,
} from "../engine/tick";
import { chooseDraftCard } from "../engine/progressionEngine";
import {
  purchaseShopItem,
  purchaseTowerAt,
} from "../engine/shopEngine";
import type {
  CommitStateAction,
  GameAction,
  GameStoreValue,
} from "./gameStore.types";
import type { HouseSelection } from "../content/houseConfig";
import type { RunSummary } from "../content/runSummary";
import type { SimulationSpeed } from "../settings/settings";

const BASE_TICK_INTERVAL_MS = 1_000 / BALANCE_CONFIG.TICKS_PER_SECOND;
const MAX_CATCH_UP_TICKS = 5;

export function gameTickIntervalMsForSpeed(speed: SimulationSpeed): number {
  return BASE_TICK_INTERVAL_MS / speed;
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
  _state: GameState,
  action: CommitStateAction,
): GameState {
  return action.next;
}

interface GameStoreProviderProps extends PropsWithChildren {
  readonly seed: number;
  readonly houseIds: HouseSelection;
  readonly startingModifiers?: StartingModifierBundle;
  readonly onTerminal: (summary: RunSummary) => void;
  readonly tickIntervalMs?: number;
}

interface GameStoreRunIdentityInput {
  readonly seed: number;
  readonly houseIds: HouseSelection;
  readonly startingModifiers: StartingModifierBundle;
}

export function gameStoreRunIdentity({
  seed,
  houseIds,
  startingModifiers,
}: GameStoreRunIdentityInput): string {
  return JSON.stringify({ seed, houseIds, startingModifiers });
}

export function GameStoreProvider({
  children,
  seed,
  houseIds,
  startingModifiers = EMPTY_STARTING_MODIFIER_BUNDLE,
  onTerminal,
  tickIntervalMs = BASE_TICK_INTERVAL_MS,
}: GameStoreProviderProps) {
  const initialWorldReference = useRef<ReturnType<
    typeof createInitialState
  > | null>(null);
  if (initialWorldReference.current === null) {
    initialWorldReference.current = createInitialState(
      seed,
      houseIds,
      startingModifiers,
    );
  }

  const rngReference = useRef(initialWorldReference.current.rng);
  const stateReference = useRef(initialWorldReference.current.state);
  const notifiedRunIdReference = useRef<string | null>(null);
  const [selectedMiracle, setSelectedMiracle] =
    useState<MiracleType | null>(null);
  const [selectedSkill, setSelectedSkill] =
    useState<DivineSkillId | null>(null);
  const [towerPlacementActive, setTowerPlacementActive] =
    useState(false);
  const [towerPreview, setTowerPreview] =
    useState<{ x: number; y: number } | null>(null);
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
    if (miracle !== null) {
      setSelectedSkill(null);
      setTowerPlacementActive(false);
      setTowerPreview(null);
    }
  }, []);
  const selectSkill = useCallback((skill: DivineSkillId | null) => {
    setSelectedSkill(skill);
    if (skill !== null) {
      setSelectedMiracle(null);
      setTowerPlacementActive(false);
      setTowerPreview(null);
    }
  }, []);
  const dispatch = useCallback((action: GameAction) => {
    switch (action.type) {
      case "selectMiracle":
        setSelectedMiracle(action.miracle);
        if (action.miracle !== null) {
          setSelectedSkill(null);
          setTowerPlacementActive(false);
          setTowerPreview(null);
        }
        return;
      case "selectSkill":
        setSelectedSkill(action.skill);
        if (action.skill !== null) {
          setSelectedMiracle(null);
          setTowerPlacementActive(false);
          setTowerPreview(null);
        }
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
      case "castSkill": {
        const current = stateReference.current;
        commitState(
          castSkill(current, {
            type: action.skill,
            targetX: action.x,
            targetY: action.y,
            tick: current.tick,
          }),
        );
        setSelectedSkill(null);
        return;
      }
      case "beginNextWave":
        commitState(
          beginNextWave(
            stateReference.current,
            rngReference.current,
          ),
        );
        setTowerPlacementActive(false);
        setTowerPreview(null);
        return;
      case "chooseDraftCard":
        commitState(
          chooseDraftCard(
            stateReference.current,
            action.offerId,
            action.cardId,
          ),
        );
        return;
      case "purchaseShopItem":
        commitState(
          purchaseShopItem(stateReference.current, action.itemId),
        );
        return;
      case "selectTowerPlacement":
        setSelectedMiracle(null);
        setSelectedSkill(null);
        setTowerPlacementActive(true);
        setTowerPreview(null);
        return;
      case "cancelTowerPlacement":
        setTowerPlacementActive(false);
        setTowerPreview(null);
        return;
      case "updateTowerPreview":
        setTowerPreview({ x: action.x, y: action.y });
        return;
      case "placeTower": {
        const current = stateReference.current;
        const next = purchaseTowerAt(current, action.x, action.y);
        commitState(next);
        if (next !== current) {
          setTowerPlacementActive(false);
          setTowerPreview(null);
        }
        return;
      }
      default:
        throw new UnexpectedGameActionError(action);
    }
  }, [commitState, tickIntervalMs]);

  useEffect(() => {
    if (state.phase !== "victory" && state.phase !== "defeat") {
      return;
    }
    const summary = createRunSummary(state);
    if (notifiedRunIdReference.current === summary.runId) {
      return;
    }
    notifiedRunIdReference.current = summary.runId;
    onTerminal(summary);
  }, [onTerminal, state]);

  useEffect(() => {
    let frameId = 0;
    let previousTime: number | null = null;
    let accumulatedTime = 0;

    function runFrame(currentTime: number) {
      if (previousTime !== null) {
        accumulatedTime = Math.min(
          accumulatedTime + currentTime - previousTime,
          tickIntervalMs * MAX_CATCH_UP_TICKS,
        );

        let ticksThisFrame = 0;
        while (
          accumulatedTime >= tickIntervalMs &&
          ticksThisFrame < MAX_CATCH_UP_TICKS
        ) {
          commitState(
            advanceTick(stateReference.current, rngReference.current),
          );
          accumulatedTime -= tickIntervalMs;
          ticksThisFrame += 1;
        }
      }

      previousTime = currentTime;
      frameId = requestAnimationFrame(runFrame);
    }

    frameId = requestAnimationFrame(runFrame);
    return () => cancelAnimationFrame(frameId);
  }, [commitState, tickIntervalMs]);

  const store = useMemo<GameStoreValue>(
    () => ({
      state,
      dispatch,
      selectedMiracle,
      selectMiracle,
      selectedSkill,
      selectSkill,
      towerPlacementActive,
      towerPreview,
    }),
    [
      dispatch,
      selectMiracle,
      selectSkill,
      selectedMiracle,
      selectedSkill,
      state,
      towerPlacementActive,
      towerPreview,
    ],
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

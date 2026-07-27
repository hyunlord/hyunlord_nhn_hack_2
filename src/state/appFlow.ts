import type {
  HouseId,
  HouseSelection,
} from "../content/houseConfig";
import { validateHouseSelection } from "../content/houseConfig";
import type { RunSummary } from "../content/runSummary";
import {
  applyRunSummaryToMeta,
  purchaseHouseUnlock,
  type ApplyRunSummaryResult,
} from "../meta/legacy";
import type { MetaState } from "../meta/meta.types";

export type AppPhase = "meta" | "select" | "run" | "summary";

export interface AppState {
  readonly appPhase: AppPhase;
  readonly meta: MetaState;
  readonly selectedHouseIds: readonly HouseId[];
  readonly runSeed: number | null;
  readonly nextSeed: number;
  readonly summary: RunSummary | null;
  readonly completion: ApplyRunSummaryResult | null;
}

export type AppAction =
  | { readonly type: "beginSelection" }
  | { readonly type: "toggleHouse"; readonly houseId: HouseId }
  | { readonly type: "confirmSelection" }
  | { readonly type: "completeRun"; readonly summary: RunSummary }
  | { readonly type: "retryRun" }
  | { readonly type: "returnToMeta" }
  | { readonly type: "purchaseUnlock"; readonly houseId: HouseId };

export function createInitialAppState(
  meta: MetaState,
  firstSeed: number,
): AppState {
  return {
    appPhase: "meta",
    meta,
    selectedHouseIds: [],
    runSeed: null,
    nextSeed: firstSeed,
    summary: null,
    completion: null,
  };
}

function confirmedSelection(
  selectedHouseIds: readonly HouseId[],
): HouseSelection | null {
  const validation = validateHouseSelection(selectedHouseIds);
  return validation.valid ? validation.houseIds : null;
}

export function appReducer(
  state: AppState,
  action: AppAction,
): AppState {
  switch (action.type) {
    case "beginSelection":
      return {
        ...state,
        appPhase: "select",
        selectedHouseIds: [],
        runSeed: null,
        summary: null,
        completion: null,
      };
    case "toggleHouse": {
      if (!state.meta.unlockedHouses.includes(action.houseId)) {
        return state;
      }
      if (state.selectedHouseIds.includes(action.houseId)) {
        return {
          ...state,
          selectedHouseIds: state.selectedHouseIds.filter(
            (houseId) => houseId !== action.houseId,
          ),
        };
      }
      if (state.selectedHouseIds.length >= 3) {
        return state;
      }
      return {
        ...state,
        selectedHouseIds: [...state.selectedHouseIds, action.houseId],
      };
    }
    case "confirmSelection": {
      const selection = confirmedSelection(state.selectedHouseIds);
      if (selection === null) {
        return state;
      }
      return {
        ...state,
        appPhase: "run",
        selectedHouseIds: selection,
        runSeed: state.nextSeed,
        nextSeed: state.nextSeed + 1,
        summary: null,
        completion: null,
      };
    }
    case "completeRun": {
      if (state.summary?.runId === action.summary.runId) {
        return state;
      }
      const completion = applyRunSummaryToMeta(state.meta, action.summary);
      return {
        ...state,
        appPhase: "summary",
        meta: completion.state,
        selectedHouseIds: action.summary.selectedHouseIds,
        summary: action.summary,
        completion,
      };
    }
    case "retryRun": {
      if (confirmedSelection(state.selectedHouseIds) === null) {
        return state;
      }
      return {
        ...state,
        appPhase: "run",
        runSeed: state.nextSeed,
        nextSeed: state.nextSeed + 1,
        summary: null,
        completion: null,
      };
    }
    case "returnToMeta":
      return {
        ...state,
        appPhase: "meta",
        selectedHouseIds: [],
        runSeed: null,
        summary: null,
        completion: null,
      };
    case "purchaseUnlock": {
      const purchase = purchaseHouseUnlock(state.meta, action.houseId);
      return purchase.state === state.meta
        ? state
        : { ...state, meta: purchase.state };
    }
  }
}

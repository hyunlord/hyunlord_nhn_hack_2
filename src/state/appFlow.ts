import type {
  HouseId,
  HouseSelection,
} from "../content/houseConfig";
import { validateHouseSelection } from "../content/houseConfig";
import type { RunSummary } from "../content/runSummary";
import {
  applyRunSummaryToMeta,
  createDefaultMetaState,
  purchaseHouseUnlock,
  type ApplyRunSummaryResult,
} from "../meta/legacy";
import { purchaseInvestment } from "../meta/investments";
import type { MetaState } from "../meta/meta.types";

export type AppPhase = "title" | "meta" | "select" | "run" | "summary" | "settings";
export type RestorableAppPhase = Exclude<AppPhase, "settings">;

export interface AppState {
  readonly appPhase: AppPhase;
  readonly previousAppPhase: RestorableAppPhase | null;
  readonly meta: MetaState;
  readonly selectedHouseIds: readonly HouseId[];
  readonly runSeed: number | null;
  readonly nextSeed: number;
  readonly summary: RunSummary | null;
  readonly completion: ApplyRunSummaryResult | null;
}

export type AppAction =
  | { readonly type: "beginSelection" }
  | { readonly type: "openMeta" }
  | { readonly type: "openSettings" }
  | { readonly type: "closeSettings" }
  | { readonly type: "resetProgress" }
  | { readonly type: "toggleHouse"; readonly houseId: HouseId }
  | { readonly type: "confirmSelection" }
  | { readonly type: "completeRun"; readonly summary: RunSummary }
  | { readonly type: "retryRun" }
  | { readonly type: "returnToMeta" }
  | { readonly type: "purchaseUnlock"; readonly houseId: HouseId }
  | { readonly type: "purchaseInvestment"; readonly trackId: string };

export function createInitialAppState(
  meta: MetaState,
  firstSeed: number,
): AppState {
  return {
    appPhase: "title",
    previousAppPhase: null,
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
        previousAppPhase: null,
        selectedHouseIds: [],
        runSeed: null,
        summary: null,
        completion: null,
      };
    case "openMeta":
      return {
        ...state,
        appPhase: "meta",
        previousAppPhase: null,
        selectedHouseIds: [],
        runSeed: null,
        summary: null,
        completion: null,
      };
    case "openSettings":
      if (state.appPhase === "settings") {
        return state;
      }
      return {
        ...state,
        appPhase: "settings",
        previousAppPhase: state.appPhase,
      };
    case "closeSettings":
      return {
        ...state,
        appPhase: state.previousAppPhase ?? "title",
        previousAppPhase: null,
      };
    case "resetProgress":
      return {
        ...createInitialAppState(createDefaultMetaState(), state.nextSeed),
        nextSeed: state.nextSeed,
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
        previousAppPhase: null,
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
        previousAppPhase: null,
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
        previousAppPhase: null,
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
        previousAppPhase: null,
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
    case "purchaseInvestment": {
      const purchase = purchaseInvestment(state.meta, action.trackId);
      return purchase.state === state.meta
        ? state
        : { ...state, meta: purchase.state };
    }
  }
}

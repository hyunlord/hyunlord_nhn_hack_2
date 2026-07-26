import type { Dispatch } from "react";
import type { GameState } from "../engine/engine.types";

export interface GameAction {
  type: "stub";
}

export interface GameStoreValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

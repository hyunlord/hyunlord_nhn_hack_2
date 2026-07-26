import type { Dispatch } from "react";
import type { GameState } from "../engine/engine.types";

export type GameAction =
  | { type: "tick" }
  | { type: "reset"; seed: number };

export interface GameStoreValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

import type { Dispatch } from "react";
import type { MiracleType } from "../divine/divine.types";
import type { GameState } from "../engine/engine.types";

export type GameAction =
  | { type: "tick" }
  | { type: "reset"; seed: number }
  | { type: "selectMiracle"; miracle: MiracleType | null }
  | {
      type: "castMiracle";
      miracle: MiracleType;
      x: number;
      y: number;
    };

export interface GameStoreValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  selectedMiracle: MiracleType | null;
  selectMiracle: (miracle: MiracleType | null) => void;
}

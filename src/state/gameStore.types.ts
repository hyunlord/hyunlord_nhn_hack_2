import type { Dispatch } from "react";
import type { MiracleType } from "../divine/divine.types";
import type { GameState } from "../engine/engine.types";

export type GameAction =
  | { type: "selectMiracle"; miracle: MiracleType | null }
  | { type: "beginNextWave" }
  | { type: "restart" }
  | {
      type: "castMiracle";
      miracle: MiracleType;
      x: number;
      y: number;
    };

export interface CommitStateAction {
  readonly type: "commitState";
  readonly next: GameState;
}

export interface GameStoreValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  selectedMiracle: MiracleType | null;
  selectMiracle: (miracle: MiracleType | null) => void;
}

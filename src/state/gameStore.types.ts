import type { Dispatch } from "react";
import type { MiracleType } from "../divine/divine.types";
import type { GameState } from "../engine/engine.types";
import type { ShopItemId } from "../build/build.types";

export type GameAction =
  | { type: "selectMiracle"; miracle: MiracleType | null }
  | { type: "beginNextWave" }
  | { type: "restart" }
  | { type: "chooseDraftCard"; offerId: string; cardId: string }
  | {
      type: "purchaseShopItem";
      itemId: Exclude<ShopItemId, "raise_tower">;
    }
  | { type: "selectTowerPlacement" }
  | { type: "cancelTowerPlacement" }
  | { type: "updateTowerPreview"; x: number; y: number }
  | { type: "placeTower"; x: number; y: number }
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
  towerPlacementActive: boolean;
  towerPreview: { x: number; y: number } | null;
}

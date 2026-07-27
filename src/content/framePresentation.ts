import {
  SPRITE_MANIFEST,
  type SpriteId,
} from "./assetManifest";
import type { CardRarity } from "../progression/progression.types";

export type UiFrameIdentity = {
  readonly frameSpriteId: SpriteId;
  readonly frameSpriteEnabled: boolean;
};

export type UiFramePresentation = UiFrameIdentity & {
  readonly borderColor: string;
  readonly labelColor: string;
};

export const RARITY_FRAME_PRESENTATION = {
  common: {
    borderColor: "#9aa0a6",
    labelColor: "#50545a",
    frameSpriteId: "card_frame_common",
    frameSpriteEnabled: false,
  },
  rare: {
    borderColor: "#5aa9e6",
    labelColor: "#1f638f",
    frameSpriteId: "card_frame_rare",
    frameSpriteEnabled: false,
  },
  legendary: {
    borderColor: "#e8b73a",
    labelColor: "#73520a",
    frameSpriteId: "card_frame_legendary",
    frameSpriteEnabled: false,
  },
} as const satisfies Readonly<Record<CardRarity, UiFramePresentation>>;

export const HOUSE_SELECTION_FRAME = {
  frameSpriteId: "house_select_frame",
  frameSpriteEnabled: false,
} as const satisfies UiFrameIdentity;

export function frameBackgroundImage(
  frame: UiFrameIdentity,
  fallbackColor: string,
): string | undefined {
  if (!frame.frameSpriteEnabled) {
    return undefined;
  }

  const { src } = SPRITE_MANIFEST[frame.frameSpriteId];
  return `url("${src}"), linear-gradient(${fallbackColor}, ${fallbackColor})`;
}

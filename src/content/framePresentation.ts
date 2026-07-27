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

export type FrameSize = {
  readonly height: number;
  readonly width: number;
};

export type FrameContentRect = FrameSize & {
  readonly left: number;
  readonly top: number;
};

const CARD_FRAME_SOURCE = {
  contentHeight: 656,
  contentWidth: 432,
  contentX: 40,
  contentY: 56,
  height: 768,
  width: 512,
} as const;

const HOUSE_FRAME_SOURCE = {
  contentHeight: 208,
  contentWidth: 304,
  contentX: 40,
  contentY: 72,
  height: 512,
  width: 384,
} as const;

function scaledContentRect(
  size: FrameSize,
  source: {
    readonly contentHeight: number;
    readonly contentWidth: number;
    readonly contentX: number;
    readonly contentY: number;
    readonly height: number;
    readonly width: number;
  },
): FrameContentRect {
  return {
    height: size.height * (source.contentHeight / source.height),
    left: size.width * (source.contentX / source.width),
    top: size.height * (source.contentY / source.height),
    width: size.width * (source.contentWidth / source.width),
  };
}

export function frameContentRect(size: FrameSize): FrameContentRect {
  return scaledContentRect(size, CARD_FRAME_SOURCE);
}

export function houseFrameContentRect(size: FrameSize): FrameContentRect {
  return scaledContentRect(size, HOUSE_FRAME_SOURCE);
}

export const FRAME_CONTENT_PERCENT = frameContentRect({
  height: 100,
  width: 100,
});

export const HOUSE_FRAME_CONTENT_PERCENT = houseFrameContentRect({
  height: 100,
  width: 100,
});

export const RARITY_FRAME_PRESENTATION = {
  common: {
    borderColor: "#9aa0a6",
    labelColor: "#50545a",
    frameSpriteId: "card_frame_common",
    frameSpriteEnabled: true,
  },
  rare: {
    borderColor: "#5aa9e6",
    labelColor: "#1f638f",
    frameSpriteId: "card_frame_rare",
    frameSpriteEnabled: true,
  },
  legendary: {
    borderColor: "#e8b73a",
    labelColor: "#73520a",
    frameSpriteId: "card_frame_legendary",
    frameSpriteEnabled: true,
  },
} as const satisfies Readonly<Record<CardRarity, UiFramePresentation>>;

export const HOUSE_SELECTION_FRAME = {
  frameSpriteId: "house_select_frame",
  frameSpriteEnabled: true,
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

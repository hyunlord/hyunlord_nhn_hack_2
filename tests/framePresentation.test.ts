import assert from "node:assert/strict";
import test from "node:test";
import {
  HOUSE_SELECTION_FRAME,
  RARITY_FRAME_PRESENTATION,
  frameBackgroundImage,
  frameContentRect,
  houseFrameContentRect,
  type UiFramePresentation,
} from "../src/content/framePresentation";
import type { CardRarity } from "../src/progression/progression.types";

const EXPECTED_RARITY_PRESENTATION: Readonly<
  Record<CardRarity, UiFramePresentation>
> = {
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
};

test("Given draft card rarities, when frame presentation is read, then colors and frame sprites match the stable UI contract", () => {
  assert.deepEqual(RARITY_FRAME_PRESENTATION, EXPECTED_RARITY_PRESENTATION);
});

test("Given frame sprites are enabled, when background images are resolved, then every frame uses its manifest asset", () => {
  for (const rarity of [
    "common",
    "rare",
    "legendary",
  ] satisfies readonly CardRarity[]) {
    assert.equal(
      frameBackgroundImage(RARITY_FRAME_PRESENTATION[rarity]),
      `url("/assets/ui/card_frame_${rarity}.png")`,
    );
  }

  assert.equal(
    frameBackgroundImage(HOUSE_SELECTION_FRAME),
    'url("/assets/ui/house_select_frame.png")',
  );
});

test("Given the house selection card frame, when configuration is read, then it points at the enabled shared house frame", () => {
  assert.deepEqual(HOUSE_SELECTION_FRAME, {
    frameSpriteId: "house_select_frame",
    frameSpriteEnabled: true,
  });
});

test("Given a non-native rendered frame, when its transparent interior is mapped, then all source coordinates scale independently", () => {
  const result = frameContentRect({
    height: 450,
    width: 320,
  });

  assert.deepEqual(result, {
    height: 384.375,
    left: 25,
    top: 32.8125,
    width: 270,
  });
});

test("Given the tall house banner, when its safe inset is mapped, then the framed card can contain its full information hierarchy", () => {
  assert.deepEqual(
    houseFrameContentRect({ height: 400, width: 300 }),
    {
      height: 246.875,
      left: 40.625,
      top: 64.0625,
      width: 218.75,
    },
  );
});

test("Given a frame sprite is enabled, when background image is resolved, then no opaque fallback covers the transparent interior", () => {
  const enabledFrame: UiFramePresentation = {
    borderColor: "#5aa9e6",
    labelColor: "#1f638f",
    frameSpriteId: "card_frame_rare",
    frameSpriteEnabled: true,
  };

  assert.equal(
    frameBackgroundImage(enabledFrame),
    'url("/assets/ui/card_frame_rare.png")',
  );
});

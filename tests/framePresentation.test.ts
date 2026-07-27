import assert from "node:assert/strict";
import test from "node:test";
import {
  HOUSE_SELECTION_FRAME,
  RARITY_FRAME_PRESENTATION,
  frameBackgroundImage,
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
};

test("Given draft card rarities, when frame presentation is read, then colors and frame sprites match the stable UI contract", () => {
  assert.deepEqual(RARITY_FRAME_PRESENTATION, EXPECTED_RARITY_PRESENTATION);
});

test("Given frame sprites are disabled, when background images are resolved, then CSS backgrounds remain untouched", () => {
  for (const rarity of [
    "common",
    "rare",
    "legendary",
  ] satisfies readonly CardRarity[]) {
    assert.equal(
      frameBackgroundImage(
        RARITY_FRAME_PRESENTATION[rarity],
        "var(--draft-panel)",
      ),
      undefined,
    );
  }

  assert.equal(
    frameBackgroundImage(HOUSE_SELECTION_FRAME, "var(--panel)"),
    undefined,
  );
});

test("Given the house selection card frame, when configuration is read, then it points at the shared house frame and stays disabled", () => {
  assert.deepEqual(HOUSE_SELECTION_FRAME, {
    frameSpriteId: "house_select_frame",
    frameSpriteEnabled: false,
  });
});

test("Given a frame sprite is enabled, when background image is resolved, then the manifest URL is layered over the fallback color", () => {
  const enabledFrame: UiFramePresentation = {
    borderColor: "#5aa9e6",
    labelColor: "#1f638f",
    frameSpriteId: "card_frame_rare",
    frameSpriteEnabled: true,
  };

  assert.equal(
    frameBackgroundImage(enabledFrame, "var(--draft-panel)"),
    'url("/assets/ui/card_frame_rare.png"), linear-gradient(var(--draft-panel), var(--draft-panel))',
  );
});

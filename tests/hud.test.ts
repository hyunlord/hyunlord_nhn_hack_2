import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { EMPTY_STARTING_MODIFIER_BUNDLE } from "../src/content/runConfiguration";
import { GameStoreProvider } from "../src/state/gameStore";
import { HUD } from "../src/ui/components/HUD";

test("Given the HUD is rendered without Legacy rites, when React renders it, then the run status remains available", () => {
  const html = renderToString(
    createElement(
      GameStoreProvider,
      {
        houseIds: ["house_a", "house_b", "house_c"],
        onTerminal: () => {},
        seed: 100,
        startingModifiers: EMPTY_STARTING_MODIFIER_BUNDLE,
      },
      createElement(HUD),
    ),
  );

  assert.match(html, /Run status/);
  assert.match(html, /class="divine-power__gauge"/);
  assert.match(html, /data-frame-sprite="gauge_frame"/);
  assert.doesNotMatch(html, /Legacy rites/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { TOWER_RADIUS } from "../src/build/structures";
import {
  SPRITE_MANIFEST,
  SPRITE_IDS,
  type SpriteId,
} from "../src/content/assetManifest";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";

const EXPECTED_SPRITE_IDS: readonly SpriteId[] = [
  "keep",
  "keep_rubble",
  "banner",
  "banner_rubble",
  "tower",
  "tower_rubble",
  "agent",
  "agent_melee",
  "agent_spear",
  "agent_archer",
  "agent_skirmisher",
  "creature",
  "dark_mage",
  "hero_ashvale",
  "hero_thornhold",
  "hero_greymoor",
  "hero_duskmere",
  "hero_stonewake",
  "hero_highreach",
  "card_frame_common",
  "card_frame_rare",
  "card_frame_legendary",
  "house_select_frame",
  "panel_frame",
  "background_field",
];

const EXPECTED_SPEC_FIELDS = [
  "id",
  "src",
  "frameWidth",
  "frameHeight",
  "frames",
  "pivotX",
  "pivotY",
  "renderWidth",
  "renderHeight",
  "tintable",
] as const;

const EXPECTED_SPRITE_SRCS: Readonly<Record<SpriteId, string>> = {
  keep: "/assets/world/keep.png",
  keep_rubble: "/assets/world/keep_rubble.png",
  banner: "/assets/world/banner.png",
  banner_rubble: "/assets/world/banner_rubble.png",
  tower: "/assets/world/tower.png",
  tower_rubble: "/assets/world/tower_rubble.png",
  agent: "/assets/world/agent.png",
  agent_melee: "/assets/world/agent_melee.png",
  agent_spear: "/assets/world/agent_spear.png",
  agent_archer: "/assets/world/agent_archer.png",
  agent_skirmisher: "/assets/world/agent_skirmisher.png",
  creature: "/assets/world/creature.png",
  dark_mage: "/assets/world/dark_mage.png",
  hero_ashvale: "/assets/world/hero_ashvale.png",
  hero_thornhold: "/assets/world/hero_thornhold.png",
  hero_greymoor: "/assets/world/hero_greymoor.png",
  hero_duskmere: "/assets/world/hero_duskmere.png",
  hero_stonewake: "/assets/world/hero_stonewake.png",
  hero_highreach: "/assets/world/hero_highreach.png",
  card_frame_common: "/assets/ui/card_frame_common.png",
  card_frame_rare: "/assets/ui/card_frame_rare.png",
  card_frame_legendary: "/assets/ui/card_frame_legendary.png",
  house_select_frame: "/assets/ui/house_select_frame.png",
  panel_frame: "/assets/ui/panel_frame.png",
  background_field: "/assets/world/background_field.png",
};

test("Given the sprite manifest, when asset ids are read, then all required sprites are present in exact order", () => {
  assert.deepEqual(SPRITE_IDS, EXPECTED_SPRITE_IDS);
  assert.deepEqual(Object.keys(SPRITE_MANIFEST), EXPECTED_SPRITE_IDS);
});

test("Given the sprite manifest, when specs are read, then every entry uses the flat asset contract", () => {
  for (const spriteId of EXPECTED_SPRITE_IDS) {
    const spec = SPRITE_MANIFEST[spriteId];

    assert.deepEqual(Object.keys(spec), EXPECTED_SPEC_FIELDS);
    assert.equal(spec.id, spriteId);
    assert.equal(spec.src, EXPECTED_SPRITE_SRCS[spriteId]);
    assert.equal(typeof spec.tintable, "boolean");
  }

  assert.equal(SPRITE_MANIFEST.agent.tintable, true);
  assert.equal(SPRITE_MANIFEST.creature.tintable, false);
});

test("Given world token sprites, when render sizes are read, then they mirror gameplay geometry", () => {
  assert.equal(SPRITE_MANIFEST.keep.renderWidth, BALANCE_CONFIG.KEEP_RADIUS * 2);
  assert.equal(SPRITE_MANIFEST.keep.renderHeight, BALANCE_CONFIG.KEEP_RADIUS * 2);
  assert.equal(SPRITE_MANIFEST.tower.renderWidth, TOWER_RADIUS * 2);
  assert.equal(SPRITE_MANIFEST.tower.renderHeight, TOWER_RADIUS * 2);
  assert.equal(
    SPRITE_MANIFEST.dark_mage.renderWidth,
    BALANCE_CONFIG.DARK_MAGE_RADIUS * 2,
  );
  assert.equal(
    SPRITE_MANIFEST.dark_mage.renderHeight,
    BALANCE_CONFIG.DARK_MAGE_RADIUS * 2,
  );
  assert.equal(
    SPRITE_MANIFEST.creature.renderWidth,
    BALANCE_CONFIG.CREATURE_RADIUS * 2,
  );
  assert.equal(
    SPRITE_MANIFEST.creature.renderHeight,
    BALANCE_CONFIG.CREATURE_RADIUS * 2,
  );
  assert.equal(
    SPRITE_MANIFEST.agent.renderWidth,
    BALANCE_CONFIG.AGENT_RADIUS * 2,
  );
  assert.equal(
    SPRITE_MANIFEST.agent.renderHeight,
    BALANCE_CONFIG.AGENT_RADIUS * 2,
  );
  assert.deepEqual(
    [
      SPRITE_MANIFEST.agent_melee.renderWidth,
      SPRITE_MANIFEST.agent_spear.renderWidth,
      SPRITE_MANIFEST.agent_archer.renderWidth,
      SPRITE_MANIFEST.agent_skirmisher.renderWidth,
    ],
    [8, 9, 7, 6],
  );
  assert.deepEqual(
    [
      SPRITE_MANIFEST.agent_melee.renderHeight,
      SPRITE_MANIFEST.agent_spear.renderHeight,
      SPRITE_MANIFEST.agent_archer.renderHeight,
      SPRITE_MANIFEST.agent_skirmisher.renderHeight,
    ],
    [8, 9, 7, 6],
  );
});

test("Given the sprite manifest, when source frames and pivots are read, then render metadata is stable", () => {
  for (const spriteId of EXPECTED_SPRITE_IDS) {
    const spec = SPRITE_MANIFEST[spriteId];

    assert.equal(spec.frameWidth, 128);
    assert.equal(spec.frameHeight, 128);
    assert.equal(spec.frames, 1);
    assert.equal(spec.pivotX >= 0 && spec.pivotX <= 1, true);
    assert.equal(spec.pivotY >= 0 && spec.pivotY <= 1, true);
  }

  assert.equal(SPRITE_MANIFEST.hero_ashvale.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.hero_thornhold.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.hero_greymoor.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.hero_duskmere.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.hero_stonewake.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.hero_highreach.renderWidth, 16);
  assert.equal(SPRITE_MANIFEST.agent.pivotY, 0.5);
  assert.equal(SPRITE_MANIFEST.creature.pivotY, 0.5);
  assert.equal(SPRITE_MANIFEST.dark_mage.pivotY, 0.5);
  assert.equal(SPRITE_MANIFEST.hero_ashvale.pivotY, 0.75);
});

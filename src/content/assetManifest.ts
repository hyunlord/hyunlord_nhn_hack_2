import { TOWER_RADIUS } from "../build/structures";
import { BALANCE_CONFIG } from "./balanceConfig";

export type SpriteSpec = {
  readonly id: SpriteId;
  readonly src: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: number;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
  readonly tintable: boolean;
};

export const SPRITE_IDS = [
  "hall",
  "hall_rubble",
  "tower",
  "tower_rubble",
  "agent",
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
] as const;

export type SpriteId = (typeof SPRITE_IDS)[number];

const FRAME = {
  frameWidth: 128,
  frameHeight: 128,
  frames: 1,
} as const;

const CENTER_PIVOT = {
  pivotX: 0.5,
  pivotY: 0.5,
} as const;

const FOOT_PIVOT = {
  pivotX: 0.5,
  pivotY: 0.75,
} as const;

const UI_PIVOT = {
  pivotX: 0,
  pivotY: 0,
} as const;

const HERO_RENDER = {
  renderWidth: 16,
  renderHeight: 16,
} as const;

export const SPRITE_MANIFEST = {
  hall: {
    id: "hall",
    src: "/assets/world/hall.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: BALANCE_CONFIG.HALL_RADIUS * 2,
    renderHeight: BALANCE_CONFIG.HALL_RADIUS * 2,
    tintable: true,
  },
  hall_rubble: {
    id: "hall_rubble",
    src: "/assets/world/hall_rubble.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: BALANCE_CONFIG.HALL_RADIUS * 2,
    renderHeight: BALANCE_CONFIG.HALL_RADIUS * 2,
    tintable: true,
  },
  tower: {
    id: "tower",
    src: "/assets/world/tower.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: TOWER_RADIUS * 2,
    renderHeight: TOWER_RADIUS * 2,
    tintable: true,
  },
  tower_rubble: {
    id: "tower_rubble",
    src: "/assets/world/tower_rubble.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: TOWER_RADIUS * 2,
    renderHeight: TOWER_RADIUS * 2,
    tintable: true,
  },
  agent: {
    id: "agent",
    src: "/assets/world/agent.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: BALANCE_CONFIG.AGENT_RADIUS * 2,
    renderHeight: BALANCE_CONFIG.AGENT_RADIUS * 2,
    tintable: true,
  },
  creature: {
    id: "creature",
    src: "/assets/world/creature.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: BALANCE_CONFIG.CREATURE_RADIUS * 2,
    renderHeight: BALANCE_CONFIG.CREATURE_RADIUS * 2,
    tintable: false,
  },
  dark_mage: {
    id: "dark_mage",
    src: "/assets/world/dark_mage.png",
    ...FRAME,
    ...CENTER_PIVOT,
    renderWidth: BALANCE_CONFIG.DARK_MAGE_RADIUS * 2,
    renderHeight: BALANCE_CONFIG.DARK_MAGE_RADIUS * 2,
    tintable: false,
  },
  hero_ashvale: {
    id: "hero_ashvale",
    src: "/assets/world/hero_ashvale.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  hero_thornhold: {
    id: "hero_thornhold",
    src: "/assets/world/hero_thornhold.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  hero_greymoor: {
    id: "hero_greymoor",
    src: "/assets/world/hero_greymoor.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  hero_duskmere: {
    id: "hero_duskmere",
    src: "/assets/world/hero_duskmere.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  hero_stonewake: {
    id: "hero_stonewake",
    src: "/assets/world/hero_stonewake.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  hero_highreach: {
    id: "hero_highreach",
    src: "/assets/world/hero_highreach.png",
    ...FRAME,
    ...FOOT_PIVOT,
    ...HERO_RENDER,
    tintable: true,
  },
  card_frame_common: {
    id: "card_frame_common",
    src: "/assets/ui/card_frame_common.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: 128,
    renderHeight: 128,
    tintable: false,
  },
  card_frame_rare: {
    id: "card_frame_rare",
    src: "/assets/ui/card_frame_rare.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: 128,
    renderHeight: 128,
    tintable: false,
  },
  card_frame_legendary: {
    id: "card_frame_legendary",
    src: "/assets/ui/card_frame_legendary.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: 128,
    renderHeight: 128,
    tintable: false,
  },
  house_select_frame: {
    id: "house_select_frame",
    src: "/assets/ui/house_select_frame.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: 128,
    renderHeight: 128,
    tintable: false,
  },
  panel_frame: {
    id: "panel_frame",
    src: "/assets/ui/panel_frame.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: 128,
    renderHeight: 128,
    tintable: false,
  },
  background_field: {
    id: "background_field",
    src: "/assets/world/background_field.png",
    ...FRAME,
    ...UI_PIVOT,
    renderWidth: BALANCE_CONFIG.WORLD_WIDTH,
    renderHeight: BALANCE_CONFIG.WORLD_HEIGHT,
    tintable: false,
  },
} as const satisfies Readonly<Record<SpriteId, SpriteSpec>>;

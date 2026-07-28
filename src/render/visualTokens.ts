export type CanvasVisualTokenName = keyof typeof CANVAS_VISUAL_TOKENS;

export interface CanvasVisualToken {
  readonly cssName: string;
  readonly value: string;
}

export const STRONGHOLD_PATCH_RADIUS = 170;

export const CANVAS_VISUAL_TOKENS = {
  strongholdGroundCore: {
    cssName: "--stronghold-ground-core",
    value: "rgba(149, 116, 72, 0.18)",
  },
  strongholdGroundRim: {
    cssName: "--stronghold-ground-rim",
    value: "rgba(94, 72, 48, 0.08)",
  },
  combatHitFlash: {
    cssName: "--combat-hit-flash",
    value: "rgba(255, 243, 196, 0.95)",
  },
  combatDeathPuff: {
    cssName: "--combat-death-puff",
    value: "rgba(214, 196, 161, 0.45)",
  },
  defensePulse: {
    cssName: "--defense-pulse",
    value: "rgba(255, 214, 138, 0.32)",
  },
  waveBannerInk: {
    cssName: "--wave-banner-ink",
    value: "#fff8df",
  },
} as const satisfies Record<string, CanvasVisualToken>;

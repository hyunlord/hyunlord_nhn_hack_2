import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { HouseSelection } from "../content/houseConfig";
import type { Banner, Keep } from "./engine.types";

export interface DefenseStructures {
  readonly keep: Keep;
  readonly banners: readonly [Banner, Banner, Banner];
}

const KEEP_CENTER = { x: 480, y: 300 } as const;
const FIRST_BANNER_ANGLE_DEGREES = -90;
const BANNER_ANGLE_STEP_DEGREES = 120;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function createBanner(
  houseId: HouseSelection[number],
  pickIndex: number,
): Banner {
  const angle = degreesToRadians(
    FIRST_BANNER_ANGLE_DEGREES + BANNER_ANGLE_STEP_DEGREES * pickIndex,
  );
  return {
    houseId,
    x: KEEP_CENTER.x + Math.cos(angle) * BALANCE_CONFIG.BANNER_ORBIT_RADIUS,
    y: KEEP_CENTER.y + Math.sin(angle) * BALANCE_CONFIG.BANNER_ORBIT_RADIUS,
    hp: BALANCE_CONFIG.BANNER_HP,
    maxHp: BALANCE_CONFIG.BANNER_HP,
  };
}

export function createDefenseStructures(
  houseIds: HouseSelection,
): DefenseStructures {
  return {
    keep: {
      x: KEEP_CENTER.x,
      y: KEEP_CENTER.y,
      hp: BALANCE_CONFIG.KEEP_HP,
      maxHp: BALANCE_CONFIG.KEEP_HP,
    },
    banners: [
      createBanner(houseIds[0], 0),
      createBanner(houseIds[1], 1),
      createBanner(houseIds[2], 2),
    ],
  };
}

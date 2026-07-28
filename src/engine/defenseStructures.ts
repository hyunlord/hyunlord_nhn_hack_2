import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { HouseSelection } from "../content/houseConfig";
import type { Banner, Keep } from "./engine.types";

export interface DefenseStructures {
  readonly keep: Keep;
  readonly banners: [Banner, Banner, Banner];
}

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
    x: BALANCE_CONFIG.KEEP_X + Math.cos(angle) * BALANCE_CONFIG.BANNER_ORBIT,
    y: BALANCE_CONFIG.KEEP_Y + Math.sin(angle) * BALANCE_CONFIG.BANNER_ORBIT,
    hp: BALANCE_CONFIG.BANNER_HP,
    maxHp: BALANCE_CONFIG.BANNER_HP,
  };
}

export function createDefenseStructures(
  houseIds: HouseSelection,
): DefenseStructures {
  return {
    keep: {
      x: BALANCE_CONFIG.KEEP_X,
      y: BALANCE_CONFIG.KEEP_Y,
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

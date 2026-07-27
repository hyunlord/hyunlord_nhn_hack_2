import type { Tower } from "../build/build.types";
import {
  TOWER_HP,
  TOWER_RADIUS,
  TOWER_RANGE,
  validateTowerPlacement,
} from "../build/structures";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Hall } from "../engine/engine.types";

type Preview = { readonly x: number; readonly y: number };

function drawRange(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  context.beginPath();
  context.arc(x, y, TOWER_RANGE, 0, Math.PI * 2);
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.stroke();
}

export function drawTowers(
  context: CanvasRenderingContext2D,
  towers: readonly Tower[],
): void {
  for (const tower of towers) {
    if (tower.hp <= 0) {
      continue;
    }
    if (tower.lastAttackTick < 0) {
      drawRange(context, tower.x, tower.y, "rgba(202, 196, 180, 0.40)");
    }
    context.beginPath();
    context.moveTo(tower.x, tower.y - TOWER_RADIUS);
    context.lineTo(tower.x + TOWER_RADIUS, tower.y + TOWER_RADIUS);
    context.lineTo(tower.x - TOWER_RADIUS, tower.y + TOWER_RADIUS);
    context.closePath();
    context.fillStyle = "#8f8a7d";
    context.strokeStyle = "rgba(236, 229, 210, 0.78)";
    context.lineWidth = 2;
    context.fill();
    context.stroke();

    const width = 26;
    context.fillStyle = "rgba(26, 22, 19, 0.88)";
    context.fillRect(tower.x - width / 2, tower.y - 18, width, 3);
    context.fillStyle = "#d8c879";
    context.fillRect(
      tower.x - width / 2,
      tower.y - 18,
      width * Math.max(0, Math.min(1, tower.hp / TOWER_HP)),
      3,
    );
  }
}

export function drawTowerPreview(
  context: CanvasRenderingContext2D,
  preview: Preview | null,
  towers: readonly Tower[],
  halls: readonly Hall[],
): void {
  if (preview === null) {
    return;
  }
  const placement = validateTowerPlacement(preview.x, preview.y, {
    worldWidth: BALANCE_CONFIG.WORLD_WIDTH,
    worldHeight: BALANCE_CONFIG.WORLD_HEIGHT,
    halls: halls.map(({ houseId, x, y, hp, maxHp }) => ({
      id: houseId,
      x,
      y,
      hp,
      maxHp,
      radius: BALANCE_CONFIG.HALL_RADIUS,
    })),
    towers,
  });
  const fill = placement.ok
    ? "rgba(108, 190, 132, 0.22)"
    : "rgba(214, 91, 76, 0.22)";
  const stroke = placement.ok
    ? "rgba(142, 224, 166, 0.68)"
    : "rgba(241, 116, 101, 0.68)";
  drawRange(context, preview.x, preview.y, stroke);
  context.beginPath();
  context.arc(preview.x, preview.y, TOWER_RADIUS, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.fill();
  context.stroke();
}

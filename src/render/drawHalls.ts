import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Hall } from "../engine/engine.types";
import type { House } from "../agents/agentTypes";
import { houseName, type Translate } from "../content/locale/display";
import { drawSprite } from "./assets/drawSprite";

const RUBBLE_COLOR = "#3d3732";
const HP_TRACK_COLOR = "rgba(14, 12, 10, 0.85)";
const HP_COLOR = "#d8c879";
const HP_WIDTH = 44;
const HP_HEIGHT = 5;
const STRONGHOLD_LABEL_OFFSET_Y = 24;
const HOUSE_MARK = "*";
const MAX_HALL_LABEL_LENGTH = 18;

function drawHallPrimitive(
  context: CanvasRenderingContext2D,
  hall: Hall,
  color: string,
  isDestroyed: boolean,
): void {
  context.fillStyle = color;
  context.strokeStyle = isDestroyed ? "#211d1a" : "#f4e6bd";
  context.lineWidth = 2;
  context.beginPath();
  if (isDestroyed) {
    context.moveTo(hall.x - 14, hall.y + 10);
    context.lineTo(hall.x - 8, hall.y - 7);
    context.lineTo(hall.x + 2, hall.y - 3);
    context.lineTo(hall.x + 13, hall.y + 11);
    context.closePath();
  } else {
    context.rect(
      hall.x - BALANCE_CONFIG.HALL_RADIUS,
      hall.y - BALANCE_CONFIG.HALL_RADIUS,
      BALANCE_CONFIG.HALL_RADIUS * 2,
      BALANCE_CONFIG.HALL_RADIUS * 2,
    );
    context.moveTo(
      hall.x - BALANCE_CONFIG.HALL_RADIUS - 4,
      hall.y - BALANCE_CONFIG.HALL_RADIUS,
    );
    context.lineTo(hall.x, hall.y - BALANCE_CONFIG.HALL_RADIUS - 12);
    context.lineTo(
      hall.x + BALANCE_CONFIG.HALL_RADIUS + 4,
      hall.y - BALANCE_CONFIG.HALL_RADIUS,
    );
  }
  context.fill();
  context.stroke();
}

function shortHallLabel(label: string): string {
  return label.length > MAX_HALL_LABEL_LENGTH
    ? `${label.slice(0, MAX_HALL_LABEL_LENGTH - 2)}..`
    : label;
}

export function drawHalls(
  context: CanvasRenderingContext2D,
  halls: readonly Hall[],
  houses: readonly House[],
  housesSelected = true,
  translate: Translate = (key) => key,
): void {
  context.save();
  for (const hall of halls) {
    const house = houses.find(({ id }) => id === hall.houseId);
    const isDestroyed = hall.hp <= 0;
    const color = isDestroyed ? RUBBLE_COLOR : (house?.color ?? "#887f70");
    const spriteId = isDestroyed ? "hall_rubble" : "hall";
    if (!drawSprite(context, spriteId, hall.x, hall.y, { tint: color })) {
      drawHallPrimitive(context, hall, color, isDestroyed);
    }

    const hpRatio = Math.max(
      0,
      Math.min(1, hall.hp / hall.maxHp),
    );
    const hpX = hall.x - HP_WIDTH / 2;
    const hpY = hall.y - BALANCE_CONFIG.HALL_RADIUS - 22;
    context.fillStyle = HP_TRACK_COLOR;
    context.fillRect(hpX, hpY, HP_WIDTH, HP_HEIGHT);
    context.fillStyle = HP_COLOR;
    context.fillRect(hpX, hpY, HP_WIDTH * hpRatio, HP_HEIGHT);

    const label = house === undefined
      ? "Stronghold"
      : shortHallLabel(`${HOUSE_MARK} ${houseName(translate, house.id)}`);
    context.textAlign = "center";
    context.fillStyle = housesSelected && !isDestroyed && house !== undefined
      ? house.color
      : "#ddd5be";
    context.strokeStyle = "rgba(14, 12, 10, 0.7)";
    context.lineWidth = 2;
    context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(label, hall.x, hall.y + STRONGHOLD_LABEL_OFFSET_Y);
    context.strokeText(label, hall.x, hall.y + STRONGHOLD_LABEL_OFFSET_Y);
  }
  context.restore();
}

import type { House } from "../agents/agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { houseName, type Translate } from "../content/locale/display";
import type { Banner, Keep } from "../engine/engine.types";
import {
  drawSprite,
  type BrowserSpriteDrawContext,
} from "./assets/drawSprite";

const KEEP_COLOR = "#8f8a7d";
const FALLEN_COLOR = "#3d3732";
const HP_TRACK_COLOR = "rgba(14, 12, 10, 0.85)";
const HP_COLOR = "#d8c879";
const KEEP_HP_WIDTH = 56;
const BANNER_HP_WIDTH = 24;
const HP_HEIGHT = 4;
const BANNER_MARK = "*";

export type DefenseDrawingContext = BrowserSpriteDrawContext &
  Pick<
    CanvasRenderingContext2D,
    | "beginPath"
    | "closePath"
    | "fill"
    | "fillRect"
    | "fillStyle"
    | "fillText"
    | "font"
    | "lineTo"
    | "lineWidth"
    | "moveTo"
    | "rect"
    | "stroke"
    | "strokeStyle"
    | "strokeText"
    | "textAlign"
  >;

function drawKeepPrimitive(
  context: DefenseDrawingContext,
  keep: Keep,
): void {
  context.beginPath();
  context.rect(
    keep.x - BALANCE_CONFIG.KEEP_RADIUS,
    keep.y - BALANCE_CONFIG.KEEP_RADIUS,
    BALANCE_CONFIG.KEEP_RADIUS * 2,
    BALANCE_CONFIG.KEEP_RADIUS * 2,
  );
  context.fillStyle = keep.hp > 0 ? KEEP_COLOR : FALLEN_COLOR;
  context.strokeStyle = "#f4e6bd";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
}

function drawBannerPrimitive(
  context: DefenseDrawingContext,
  banner: Banner,
  color: string,
): void {
  context.beginPath();
  context.moveTo(banner.x, banner.y - BALANCE_CONFIG.BANNER_RADIUS);
  context.lineTo(
    banner.x + BALANCE_CONFIG.BANNER_RADIUS,
    banner.y + BALANCE_CONFIG.BANNER_RADIUS,
  );
  context.lineTo(
    banner.x - BALANCE_CONFIG.BANNER_RADIUS,
    banner.y + BALANCE_CONFIG.BANNER_RADIUS,
  );
  context.closePath();
  context.fillStyle = banner.hp > 0 ? color : FALLEN_COLOR;
  context.strokeStyle = banner.hp > 0 ? "#f4e6bd" : "#211d1a";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
}

function drawHp(
  context: DefenseDrawingContext,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number,
): void {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  context.fillStyle = HP_TRACK_COLOR;
  context.fillRect(x - width / 2, y, width, HP_HEIGHT);
  context.fillStyle = HP_COLOR;
  context.fillRect(x - width / 2, y, width * ratio, HP_HEIGHT);
}

export function drawDefenses(
  context: DefenseDrawingContext,
  keep: Keep,
  banners: readonly Banner[],
  houses: readonly House[],
  translate: Translate,
): void {
  context.save();
  if (!drawSprite(context, keep.hp > 0 ? "keep" : "keep_rubble", keep.x, keep.y)) {
    drawKeepPrimitive(context, keep);
  }
  drawHp(
    context,
    keep.x,
    keep.y - BALANCE_CONFIG.KEEP_RADIUS - 10,
    KEEP_HP_WIDTH,
    keep.hp,
    keep.maxHp,
  );

  for (const banner of banners) {
    const house = houses.find(({ id }) => id === banner.houseId);
    const color = house?.color ?? KEEP_COLOR;
    const spriteId = banner.hp > 0 ? "banner" : "banner_rubble";
    if (!drawSprite(context, spriteId, banner.x, banner.y, { tint: color })) {
      drawBannerPrimitive(context, banner, color);
    }
    drawHp(
      context,
      banner.x,
      banner.y - BALANCE_CONFIG.BANNER_RADIUS - 8,
      BANNER_HP_WIDTH,
      banner.hp,
      banner.maxHp,
    );
    context.textAlign = "center";
    context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = banner.hp > 0 ? color : "#ddd5be";
    context.strokeStyle = "rgba(14, 12, 10, 0.7)";
    context.lineWidth = 2;
    context.fillText(BANNER_MARK, banner.x, banner.y + 3);
    context.strokeText(BANNER_MARK, banner.x, banner.y + 3);
    if (house !== undefined) {
      const label = houseName(translate, house.id);
      context.fillText(label, banner.x, banner.y + 25);
      context.strokeText(label, banner.x, banner.y + 25);
    }
  }
  context.restore();
}

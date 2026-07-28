import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { SpriteId } from "../content/assetManifest";
import { drawSprite, type BrowserSpriteDrawContext } from "./assets/drawSprite";
import type { HeroFrontArc, HeroRenderProjection } from "./heroRenderProjection";


type HeroDrawStyle = string | CanvasGradient | CanvasPattern;
export interface HeroDrawContext {
  globalAlpha: number;
  fillStyle: HeroDrawStyle;
  font: string;
  lineWidth: number;
  strokeStyle: HeroDrawStyle;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  beginPath(): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  lineTo(x: number, y: number): void;
  measureText(text: string): { readonly width: number };
  moveTo(x: number, y: number): void;
  restore(): void;
  save(): void;
  setLineDash(segments: readonly number[]): void;
  stroke(): void;
  translate(x: number, y: number): void;
}

function canDrawSprites(context: HeroDrawContext): context is HeroDrawContext & BrowserSpriteDrawContext {
  return "drawImage" in context && "imageSmoothingEnabled" in context && "scale" in context && "translate" in context;
}

const HERO_RADIUS = 8;
const HP_BAR_WIDTH = 34;
const HP_BAR_HEIGHT = 4;
const LABEL_HEIGHT = 12;
const LABEL_PADDING_X = 3;
const FRONT_ARC_RADIUS = HERO_RADIUS + 11;

export type HeroLabelFormatter = (heroId: string, level: number) => string;
export type HeroFallLabelFormatter = (ticksRemaining: number) => string;

function spriteIdForHero(heroId: string | null): SpriteId | null {
  switch (heroId) {
    case "hero_ashvale":
      return "hero_ashvale";
    case "hero_thornhold":
      return "hero_thornhold";
    case "hero_greymoor":
      return "hero_greymoor";
    case "hero_duskmere":
      return "hero_duskmere";
    case "hero_stonewake":
      return "hero_stonewake";
    case "hero_highreach":
      return "hero_highreach";
    default:
      return null;
  }
}

function drawHeroPrimitiveBody(
  context: HeroDrawContext,
  x: number,
  y: number,
  color: string,
): void {
  context.beginPath();
  context.arc(x, y, HERO_RADIUS, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "rgba(255, 248, 214, 0.96)";
  context.lineWidth = 3;
  context.stroke();
}

function drawAura(
  context: HeroDrawContext,
  x: number,
  y: number,
  radius: number,
  pulse: HeroRenderProjection["livingHeroes"][number]["auraPulse"],
): void {
  if (radius <= 0) {
    return;
  }
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = "rgba(123, 176, 106, 0.15)";
  context.strokeStyle = "rgba(160, 214, 139, 0.40)";
  context.lineWidth = 2;
  context.setLineDash([7, 5]);
  context.fill();
  context.stroke();
  if (pulse !== null) {
    context.beginPath();
    context.arc(x, y, pulse.radius, 0, Math.PI * 2);
    context.globalAlpha = pulse.alpha;
    context.strokeStyle = "rgba(190, 238, 151, 0.64)";
    context.lineWidth = 1.5;
    context.stroke();
    context.globalAlpha = 1;
  }
  context.restore();
}

function drawTrail(
  context: HeroDrawContext,
  trail: HeroRenderProjection["livingHeroes"][number]["trail"],
  color: string,
): void {
  const first = trail[0];
  if (first === undefined || trail.length < 2) {
    return;
  }
  context.save();
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of trail.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.strokeStyle = color;
  context.globalAlpha = 0.38;
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;
  context.restore();
}

function drawFrontArc(
  context: HeroDrawContext,
  x: number,
  y: number,
  arc: HeroFrontArc | null,
): void {
  if (arc === null) {
    return;
  }
  const angle = Math.atan2(arc.direction.y, arc.direction.x);
  context.save();
  context.beginPath();
  context.arc(x, y, FRONT_ARC_RADIUS, angle - 0.72, angle + 0.72);
  context.strokeStyle = "rgba(255, 248, 214, 0.86)";
  context.lineWidth = 3;
  context.stroke();
  context.restore();
}

function drawHpBar(
  context: HeroDrawContext,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
): void {
  const barX = x - HP_BAR_WIDTH / 2;
  const barY = y - HERO_RADIUS - 10;
  context.fillStyle = "rgba(26, 22, 19, 0.88)";
  context.fillRect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);
  context.fillStyle = "#8fe3b0";
  context.fillRect(
    barX,
    barY,
    HP_BAR_WIDTH * Math.max(0, Math.min(1, hp / maxHp)),
    HP_BAR_HEIGHT,
  );
}

function drawHeroLabel(
  context: HeroDrawContext,
  x: number,
  y: number,
  label: string,
): void {
  context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "top";
  const labelY = y + HERO_RADIUS + 12;
  const labelWidth = context.measureText(label).width;
  context.fillStyle = "rgba(26, 22, 19, 0.88)";
  context.fillRect(
    x - labelWidth / 2 - LABEL_PADDING_X,
    labelY - 1,
    labelWidth + LABEL_PADDING_X * 2,
    LABEL_HEIGHT,
  );
  context.fillStyle = "rgba(255, 253, 246, 0.96)";
  context.fillText(label, x, labelY);
}

function drawLevelFlourish(
  context: HeroDrawContext,
  x: number,
  y: number,
  levelUpTick: number,
  currentTick: number,
): void {
  if (levelUpTick < 0 || currentTick - levelUpTick >= 40) {
    return;
  }
  const flourishProgress = (currentTick - levelUpTick) / 40;
  context.beginPath();
  context.arc(x, y, HERO_RADIUS + 8 + flourishProgress * 18, 0, Math.PI * 2);
  context.globalAlpha = Math.max(0, 1 - flourishProgress);
  context.strokeStyle = "#e8b73a";
  context.lineWidth = 2;
  context.stroke();
  context.globalAlpha = 1;
}

function drawFallSite(
  context: HeroDrawContext,
  marker: HeroRenderProjection["fallenHeroes"][number],
  formatLabel: HeroFallLabelFormatter,
): void {
  context.save();
  context.translate(marker.x, marker.y);
  context.strokeStyle = marker.houseColor;
  context.fillStyle = "rgba(26, 22, 19, 0.82)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, HERO_RADIUS + 5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-7, -7);
  context.lineTo(7, 7);
  context.moveTo(7, -7);
  context.lineTo(-7, 7);
  context.stroke();
  context.restore();
  drawHeroLabel(context, marker.x, marker.y, formatLabel(marker.respawnTicksRemaining));
}

export function drawHeroes(
  context: HeroDrawContext,
  projection: HeroRenderProjection,
  currentTick: number,
  formatLabel?: HeroLabelFormatter,
  formatFallLabel: HeroFallLabelFormatter = (ticks) =>
    `${Math.ceil(ticks / BALANCE_CONFIG.TICKS_PER_SECOND)}s`,
): void {
  for (const marker of projection.fallenHeroes) {
    drawFallSite(context, marker, formatFallLabel);
  }

  void formatLabel;
  for (const { agent: hero, auraPulse, auraRadius, frontArc, houseColor, maxHp, trail } of projection.livingHeroes) {
    drawTrail(context, trail, houseColor);
    drawAura(context, hero.x, hero.y, auraRadius, auraPulse);
    const spriteId = spriteIdForHero(hero.heroId);
    if (spriteId === null || (!canDrawSprites(context) || !drawSprite(context, spriteId, hero.x, hero.y, { tint: houseColor }))) {
      drawHeroPrimitiveBody(context, hero.x, hero.y, houseColor);
    }
    drawFrontArc(context, hero.x, hero.y, frontArc);
    drawLevelFlourish(context, hero.x, hero.y, hero.heroLevelUpTick, currentTick);
    drawHpBar(context, hero.x, hero.y, hero.hp, maxHp);
  }
}

import type { Agent, House } from "../agents/agentTypes";
import { HERO_DEFINITIONS } from "../content/heroConfig";
import type { ResolvedModifiers } from "../progression/modifiers";
import { maxHpForAgent } from "../engine/heroEngine";

const HERO_RADIUS = 8;
const HP_BAR_WIDTH = 34;
const HP_BAR_HEIGHT = 4;
const LABEL_HEIGHT = 12;
const LABEL_PADDING_X = 3;

type ModifierEntry = {
  readonly houseId: string;
  readonly modifiers: ResolvedModifiers;
};

export function drawHeroes(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  houses: readonly House[],
  modifiersByHouse: readonly ModifierEntry[],
  currentTick: number,
): void {
  const colorsByHouse = new Map(
    houses.map((house) => [house.id, house.color] as const),
  );

  for (const hero of agents.filter(({ isHero }) => isHero)) {
    const definition = HERO_DEFINITIONS.find(
      ({ id }) => id === hero.heroId,
    );
    const modifiers = modifiersByHouse.find(
      ({ houseId }) => houseId === hero.houseId,
    )?.modifiers;
    const color = colorsByHouse.get(hero.houseId);
    if (
      definition === undefined ||
      modifiers === undefined ||
      color === undefined ||
      hero.hp <= 0
    ) {
      continue;
    }

    const auraRadius =
      definition.auraRadius + modifiers.heroAuraRadiusBonus;
    if (auraRadius > 0) {
      context.beginPath();
      context.arc(hero.x, hero.y, auraRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(123, 176, 106, 0.15)";
      context.strokeStyle = "rgba(160, 214, 139, 0.40)";
      context.lineWidth = 1;
      context.fill();
      context.stroke();
    }

    context.beginPath();
    context.arc(hero.x, hero.y, HERO_RADIUS, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "rgba(255, 248, 214, 0.96)";
    context.lineWidth = 3;
    context.stroke();
    if (
      hero.heroLevelUpTick >= 0 &&
      currentTick - hero.heroLevelUpTick < 40
    ) {
      const flourishProgress =
        (currentTick - hero.heroLevelUpTick) / 40;
      context.beginPath();
      context.arc(
        hero.x,
        hero.y,
        HERO_RADIUS + 8 + flourishProgress * 18,
        0,
        Math.PI * 2,
      );
      context.globalAlpha = Math.max(0, 1 - flourishProgress);
      context.strokeStyle = "#e8b73a";
      context.lineWidth = 2;
      context.stroke();
      context.globalAlpha = 1;
    }

    const maxHp = maxHpForAgent(hero, modifiers);
    const barX = hero.x - HP_BAR_WIDTH / 2;
    const barY = hero.y - HERO_RADIUS - 10;
    context.fillStyle = "rgba(26, 22, 19, 0.88)";
    context.fillRect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    context.fillStyle = "#8fe3b0";
    context.fillRect(
      barX,
      barY,
      HP_BAR_WIDTH * Math.max(0, Math.min(1, hero.hp / maxHp)),
      HP_BAR_HEIGHT,
    );

    context.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.textAlign = "center";
    context.textBaseline = "top";
    const labelY = hero.y + HERO_RADIUS + 12;
    const label = `${definition.name} · Lv ${hero.heroLevel}`;
    const labelWidth = context.measureText(label).width;
    context.fillStyle = "rgba(26, 22, 19, 0.88)";
    context.fillRect(
      hero.x - labelWidth / 2 - LABEL_PADDING_X,
      labelY - 1,
      labelWidth + LABEL_PADDING_X * 2,
      LABEL_HEIGHT,
    );
    context.fillStyle = "rgba(255, 253, 246, 0.96)";
    context.fillText(label, hero.x, labelY);
  }
}

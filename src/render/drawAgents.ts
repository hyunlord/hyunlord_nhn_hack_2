import type { Agent, House } from "../agents/agentTypes";
import {
  UNIT_CLASSES,
  type UnitClassId,
  type UnitClassDefinition,
} from "../content/unitClassConfig";
import type { SpriteId } from "../content/assetManifest";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { drawSprite } from "./assets/drawSprite";

const AGENT_SPRITE_IDS = {
  melee: "agent_melee",
  spear: "agent_spear",
  archer: "agent_archer",
  skirmisher: "agent_skirmisher",
} as const satisfies Readonly<Record<UnitClassId, SpriteId>>;

function traceAgentBody(
  context: CanvasRenderingContext2D,
  agent: Agent,
  definition: UnitClassDefinition,
): void {
  context.beginPath();
  const radius = definition.drawRadius;
  switch (definition.drawShape) {
    case "circle":
    case "dot":
      context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
      break;
    case "diamond":
      context.moveTo(agent.x, agent.y - radius);
      context.lineTo(agent.x + radius, agent.y);
      context.lineTo(agent.x, agent.y + radius);
      context.lineTo(agent.x - radius, agent.y);
      context.closePath();
      break;
    case "triangle": {
      const first = agent.heading;
      const second = first + (Math.PI * 2) / 3;
      const third = first + (Math.PI * 4) / 3;
      context.moveTo(
        agent.x + Math.cos(first) * radius,
        agent.y + Math.sin(first) * radius,
      );
      context.lineTo(
        agent.x + Math.cos(second) * radius,
        agent.y + Math.sin(second) * radius,
      );
      context.lineTo(
        agent.x + Math.cos(third) * radius,
        agent.y + Math.sin(third) * radius,
      );
      context.closePath();
      break;
    }
  }
}

function drawAgentPrimitiveBody(
  context: CanvasRenderingContext2D,
  agent: Agent,
  color: string,
  definition: UnitClassDefinition,
): void {
  traceAgentBody(context, agent, definition);
  context.fillStyle = color;
  context.globalAlpha = agent.state === "fleeing" ? 0.42 : 1;
  context.fill();
  context.globalAlpha = 1;
}

export function drawAgents(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  houses: readonly House[],
  currentTick: number,
): void {
  const colorsByHouse = new Map(
    houses.map((house) => [house.id, house.color] as const),
  );

  context.lineWidth = 1;
  context.strokeStyle = "rgba(0, 0, 0, 0.72)";

  for (const agent of agents) {
    if (agent.isHero) {
      continue;
    }
    const definition = UNIT_CLASSES[agent.unitClass];
    const radius = definition.drawRadius;
    context.globalAlpha = 1;
    if (agent.state === "dead") {
      context.beginPath();
      context.moveTo(
        agent.x - radius,
        agent.y - radius,
      );
      context.lineTo(
        agent.x + radius,
        agent.y + radius,
      );
      context.moveTo(
        agent.x + radius,
        agent.y - radius,
      );
      context.lineTo(
        agent.x - radius,
        agent.y + radius,
      );
      context.lineWidth = 1.5;
      context.strokeStyle = "rgba(175, 164, 151, 0.65)";
      context.stroke();
      continue;
    }

    const color = colorsByHouse.get(agent.houseId);
    if (color === undefined) {
      continue;
    }

    const alpha = agent.state === "fleeing" ? 0.42 : 1;
    const spriteDrawn = drawSprite(
      context,
      AGENT_SPRITE_IDS[agent.unitClass],
      agent.x,
      agent.y,
      { tint: color, alpha },
    );
    if (!spriteDrawn) {
      drawAgentPrimitiveBody(context, agent, color, definition);
    }
    const recentlyDamaged =
      agent.lastDamagedTick >= 0 &&
      currentTick - agent.lastDamagedTick < BALANCE_CONFIG.DAMAGE_FLASH_TICKS;
    if (agent.state !== "fleeing") {
      if (spriteDrawn) {
        traceAgentBody(context, agent, definition);
      }
      context.lineWidth =
        recentlyDamaged || agent.state === "helping" ? 2.5 : 1.5;
      context.strokeStyle = recentlyDamaged
        ? "rgba(255, 243, 196, 0.95)"
        : agent.state === "helping"
          ? "rgba(255, 250, 230, 0.90)"
          : agent.state === "fighting"
            ? color
            : "rgba(0, 0, 0, 0.72)";
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}

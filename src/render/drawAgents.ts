import type { Agent, House } from "../agents/agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";

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
    context.globalAlpha = 1;
    if (agent.state === "dead") {
      context.beginPath();
      context.moveTo(
        agent.x - BALANCE_CONFIG.AGENT_RADIUS,
        agent.y - BALANCE_CONFIG.AGENT_RADIUS,
      );
      context.lineTo(
        agent.x + BALANCE_CONFIG.AGENT_RADIUS,
        agent.y + BALANCE_CONFIG.AGENT_RADIUS,
      );
      context.moveTo(
        agent.x + BALANCE_CONFIG.AGENT_RADIUS,
        agent.y - BALANCE_CONFIG.AGENT_RADIUS,
      );
      context.lineTo(
        agent.x - BALANCE_CONFIG.AGENT_RADIUS,
        agent.y + BALANCE_CONFIG.AGENT_RADIUS,
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

    context.beginPath();
    context.arc(
      agent.x,
      agent.y,
      BALANCE_CONFIG.AGENT_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fillStyle = color;
    context.globalAlpha = agent.state === "fleeing" ? 0.42 : 1;
    context.fill();
    context.globalAlpha = 1;
    const recentlyDamaged =
      agent.lastDamagedTick >= 0 &&
      currentTick - agent.lastDamagedTick < BALANCE_CONFIG.DAMAGE_FLASH_TICKS;
    if (agent.state !== "fleeing") {
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

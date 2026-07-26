import type { Agent, House } from "../agents/agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";

export function drawAgents(
  context: CanvasRenderingContext2D,
  agents: readonly Agent[],
  houses: readonly House[],
): void {
  const colorsByHouse = new Map(
    houses.map((house) => [house.id, house.color] as const),
  );

  context.lineWidth = 1;
  context.strokeStyle = "rgba(0, 0, 0, 0.72)";

  for (const agent of agents) {
    if (agent.state === "dead") {
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
    context.fill();
    context.stroke();
  }
}

import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { ThreatEvent } from "../threat/threatTypes";

const CREATURE_COLOR = "#6b3f8f";
const CREATURE_RIM = "#b58ad0";
const MAGE_COLOR = "#c04ad8";
const MAGE_PULSE = "rgba(226, 165, 239, 0.65)";
const MAGE_HP_TRACK = "rgba(26, 22, 19, 0.85)";
const MAGE_HP_WIDTH = 32;
const MAGE_HP_HEIGHT = 4;

export function drawThreats(
  context: CanvasRenderingContext2D,
  threat: ThreatEvent | null,
  currentTick: number,
): void {
  if (threat === null) {
    return;
  }

  context.save();
  context.globalAlpha = 1;
  for (const creature of threat.creatures) {
    context.beginPath();
    context.arc(
      creature.x,
      creature.y,
      BALANCE_CONFIG.CREATURE_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fillStyle = CREATURE_COLOR;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = CREATURE_RIM;
    context.stroke();
  }

  if (threat.mage === null) {
    context.restore();
    return;
  }

  const pulse =
    (Math.sin(currentTick / BALANCE_CONFIG.TICKS_PER_SECOND) + 1) / 2;
  context.beginPath();
  context.arc(
    threat.mage.x,
    threat.mage.y,
    BALANCE_CONFIG.DARK_MAGE_RADIUS + 4 + pulse * 3,
    0,
    Math.PI * 2,
  );
  context.lineWidth = 1.5;
  context.strokeStyle = MAGE_PULSE;
  context.stroke();

  context.beginPath();
  context.arc(
    threat.mage.x,
    threat.mage.y,
    BALANCE_CONFIG.DARK_MAGE_RADIUS,
    0,
    Math.PI * 2,
  );
  context.fillStyle = MAGE_COLOR;
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = MAGE_PULSE;
  context.stroke();

  const hpRatio = Math.max(
    0,
    Math.min(1, threat.mage.hp / BALANCE_CONFIG.DARK_MAGE_HP),
  );
  const hpX = threat.mage.x - MAGE_HP_WIDTH / 2;
  const hpY =
    threat.mage.y -
    BALANCE_CONFIG.DARK_MAGE_RADIUS -
    BALANCE_CONFIG.AGENT_RADIUS -
    MAGE_HP_HEIGHT;
  context.fillStyle = MAGE_HP_TRACK;
  context.fillRect(hpX, hpY, MAGE_HP_WIDTH, MAGE_HP_HEIGHT);
  context.fillStyle = MAGE_COLOR;
  context.fillRect(
    hpX,
    hpY,
    MAGE_HP_WIDTH * hpRatio,
    MAGE_HP_HEIGHT,
  );
  context.restore();
}

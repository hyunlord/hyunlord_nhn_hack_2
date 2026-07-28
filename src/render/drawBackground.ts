import { drawSprite } from "./assets/drawSprite";
import { mixRgba } from "./dayNight";

const GRID_SIZE = 40;

function drawBackgroundPrimitive(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightFactor: number,
): void {
  context.fillStyle = mixRgba(
    { red: 18, green: 23, blue: 33, alpha: 1 },
    { red: 102, green: 78, blue: 38, alpha: 1 },
    dayNightFactor,
  );
  context.fillRect(0, 0, width, height);

  context.strokeStyle = mixRgba(
    { red: 194, green: 218, blue: 255, alpha: 0.055 },
    { red: 255, green: 238, blue: 184, alpha: 0.13 },
    dayNightFactor,
  );
  context.lineWidth = 1;
  context.beginPath();
  for (let x = GRID_SIZE; x < width; x += GRID_SIZE) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let y = GRID_SIZE; y < height; y += GRID_SIZE) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
}

function drawLighting(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightFactor: number,
): void {
  context.save();
  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    120,
    width / 2,
    height / 2,
    580,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0.000)");
  vignette.addColorStop(
    1,
    mixRgba(
      { red: 1, green: 5, blue: 14, alpha: 0.62 },
      { red: 55, green: 30, blue: 8, alpha: 0.12 },
      dayNightFactor,
    ),
  );
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  context.globalCompositeOperation = "screen";
  context.fillStyle = mixRgba(
    { red: 42, green: 70, blue: 118, alpha: 0.14 },
    { red: 255, green: 185, blue: 82, alpha: 0.3 },
    dayNightFactor,
  );
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightFactor = 0,
): void {
  if (!drawSprite(context, "background_field", 0, 0)) {
    drawBackgroundPrimitive(context, width, height, dayNightFactor);
  }
  drawLighting(context, width, height, dayNightFactor);
}

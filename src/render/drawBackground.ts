const GRID_SIZE = 40;

export function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = "#1a1613";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 245, 220, 0.055)";
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

  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    120,
    width / 2,
    height / 2,
    580,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.62)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

import { useEffect, useRef } from "react";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 480;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context === null || context === undefined) {
      return;
    }

    let frameId = 0;
    const clearFrame = () => {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      frameId = requestAnimationFrame(clearFrame);
    };
    frameId = requestAnimationFrame(clearFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <canvas
      aria-label="Game canvas placeholder"
      className="game-canvas"
      height={CANVAS_HEIGHT}
      ref={canvasRef}
      role="img"
      width={CANVAS_WIDTH}
    />
  );
}

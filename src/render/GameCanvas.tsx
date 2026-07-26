import { useEffect, useRef } from "react";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { useGameStore } from "../state/gameStore";
import { drawAgents } from "./drawAgents";
import { drawBackground } from "./drawBackground";
import { drawEffects } from "./drawEffects";

export function GameCanvas() {
  const { dispatch, selectedMiracle, state } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const context = canvas.getContext("2d");
    if (context === null || context === undefined) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(BALANCE_CONFIG.WORLD_WIDTH * devicePixelRatio);
    canvas.height = Math.round(BALANCE_CONFIG.WORLD_HEIGHT * devicePixelRatio);

    let frameId = 0;
    const drawFrame = () => {
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(
        0,
        0,
        BALANCE_CONFIG.WORLD_WIDTH,
        BALANCE_CONFIG.WORLD_HEIGHT,
      );
      drawBackground(
        context,
        BALANCE_CONFIG.WORLD_WIDTH,
        BALANCE_CONFIG.WORLD_HEIGHT,
      );
      drawAgents(
        context,
        stateRef.current.agents,
        stateRef.current.houses,
        stateRef.current.tick,
      );
      drawEffects(
        context,
        stateRef.current.activeEffects,
        stateRef.current.tick,
      );
      frameId = requestAnimationFrame(drawFrame);
    };
    frameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (selectedMiracle === null) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    dispatch({
      type: "castMiracle",
      miracle: selectedMiracle,
      x:
        (event.clientX - bounds.left) *
        (BALANCE_CONFIG.WORLD_WIDTH / bounds.width),
      y:
        (event.clientY - bounds.top) *
        (BALANCE_CONFIG.WORLD_HEIGHT / bounds.height),
    });
  }

  return (
    <canvas
      aria-label="Living world with sixty wandering house agents"
      className={
        selectedMiracle === null
          ? "game-canvas"
          : "game-canvas game-canvas--targeting"
      }
      height={BALANCE_CONFIG.WORLD_HEIGHT}
      onClick={handleClick}
      ref={canvasRef}
      role="img"
      width={BALANCE_CONFIG.WORLD_WIDTH}
    />
  );
}

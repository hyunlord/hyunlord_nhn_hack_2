import { useEffect, useRef } from "react";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { useGameStore } from "../state/gameStore";
import { drawAgents } from "./drawAgents";
import { drawBackground } from "./drawBackground";
import { drawEffects } from "./drawEffects";
import { drawHalls } from "./drawHalls";
import { drawHeroes } from "./drawHeroes";
import { drawThreats } from "./drawThreats";
import {
  drawTowerPreview,
  drawTowerRubble,
  drawTowers,
} from "./drawTowers";

export function GameCanvas() {
  const {
    dispatch,
    selectedMiracle,
    selectedSkill,
    state,
    towerPlacementActive,
    towerPreview,
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const placementRef = useRef({
    active: towerPlacementActive,
    preview: towerPreview,
  });
  useEffect(() => {
    placementRef.current = {
      active: towerPlacementActive,
      preview: towerPreview,
    };
  }, [towerPlacementActive, towerPreview]);

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
      drawHalls(
        context,
        stateRef.current.halls,
        stateRef.current.houses,
      );
      drawTowers(context, stateRef.current.towers);
      drawTowerRubble(
        context,
        stateRef.current.towerRubble,
        stateRef.current.tick,
      );
      drawAgents(
        context,
        stateRef.current.agents,
        stateRef.current.houses,
        stateRef.current.tick,
      );
      drawHeroes(
        context,
        stateRef.current.agents,
        stateRef.current.houses,
        stateRef.current.houseModifiers,
        stateRef.current.tick,
      );
      drawThreats(
        context,
        stateRef.current.activeThreat,
        stateRef.current.tick,
      );
      drawEffects(
        context,
        stateRef.current.activeEffects,
        stateRef.current.tick,
      );
      if (placementRef.current.active) {
        drawTowerPreview(
          context,
          placementRef.current.preview,
          stateRef.current.towers,
          stateRef.current.halls,
        );
      }
      frameId = requestAnimationFrame(drawFrame);
    };
    frameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  function worldPoint(event: React.MouseEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x:
        (event.clientX - bounds.left) *
        (BALANCE_CONFIG.WORLD_WIDTH / bounds.width),
      y:
        (event.clientY - bounds.top) *
        (BALANCE_CONFIG.WORLD_HEIGHT / bounds.height),
    };
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const point = worldPoint(event);
    if (towerPlacementActive) {
      dispatch({ type: "placeTower", ...point });
      return;
    }
    if (selectedMiracle !== null) {
      dispatch({
        type: "castMiracle",
        miracle: selectedMiracle,
        ...point,
      });
      return;
    }
    if (selectedSkill !== null) {
      dispatch({
        type: "castSkill",
        skill: selectedSkill,
        ...point,
      });
    }
  }

  useEffect(() => {
    if (!towerPlacementActive) {
      return;
    }
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({ type: "cancelTowerPlacement" });
      }
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [dispatch, towerPlacementActive]);

  return (
    <canvas
      aria-label="Living world with house agents and named heroes"
      className={
        selectedMiracle === null &&
        selectedSkill === null &&
        !towerPlacementActive
          ? "game-canvas"
          : "game-canvas game-canvas--targeting"
      }
      height={BALANCE_CONFIG.WORLD_HEIGHT}
      onClick={handleClick}
      onContextMenu={(event) => {
        if (towerPlacementActive) {
          event.preventDefault();
          dispatch({ type: "cancelTowerPlacement" });
        }
      }}
      onMouseMove={(event) => {
        if (towerPlacementActive) {
          dispatch({ type: "updateTowerPreview", ...worldPoint(event) });
        }
      }}
      ref={canvasRef}
      role="img"
      width={BALANCE_CONFIG.WORLD_WIDTH}
    />
  );
}

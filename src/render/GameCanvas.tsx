import { useEffect, useRef } from "react";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { useLocale } from "../content/locale";
import { useSettings } from "../settings/SettingsContext";
import { useGameStore } from "../state/gameStore";
import { createCombatTransientTracker } from "./combatTransients";
import { createHeroRenderTracker } from "./heroRenderProjection";
import type { DayNightTracker } from "./dayNight";
import { drawGameCanvasFrame } from "./gameCanvasFrame";

export function GameCanvas() {
  const { t } = useLocale();
  const { settings } = useSettings();
  const localeRef = useRef(t);
  const screenShakeRef = useRef(settings.screenShake);
  const {
    dispatch,
    selectedMiracle,
    selectedSkill,
    state,
    towerPlacementActive,
    towerPreview,
  } = useGameStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const dayNightTrackerRef = useRef<DayNightTracker | undefined>(undefined);
  const transientTrackerRef = useRef(createCombatTransientTracker());
  const heroTrackerRef = useRef(createHeroRenderTracker());

  useEffect(() => {
    localeRef.current = t;
  }, [t]);

  useEffect(() => {
    screenShakeRef.current = settings.screenShake;
  }, [settings.screenShake]);

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
      const currentState = stateRef.current;
      const frameResult = drawGameCanvasFrame({
        context,
        currentState,
        dayNightTracker: dayNightTrackerRef.current,
        devicePixelRatio,
        placement: placementRef.current,
        screenShakeEnabled: screenShakeRef.current,
        transientTracker: transientTrackerRef.current,
        heroTracker: heroTrackerRef.current,
        translate: localeRef.current,
        wrapper: wrapperRef.current,
      });
      dayNightTrackerRef.current = frameResult.dayNightTracker;
      transientTrackerRef.current = frameResult.transientTracker;
      heroTrackerRef.current = frameResult.heroTracker;
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
        event.preventDefault();
        event.stopImmediatePropagation();
        dispatch({ type: "cancelTowerPlacement" });
      }
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [dispatch, towerPlacementActive]);

  return (
    <div
      ref={wrapperRef}
      style={{
        height: "100%",
        transformOrigin: "center",
        width: "100%",
      }}
    >
      <canvas
        aria-label={t("run.canvasLabel")}
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
    </div>
  );
}

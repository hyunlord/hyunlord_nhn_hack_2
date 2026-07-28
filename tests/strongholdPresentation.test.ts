import assert from "node:assert/strict";
import test from "node:test";
import {
  TOWER_CONFIG,
  validateTowerPlacement,
} from "../src/build/structures";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  HOUSE_CONFIG,
  HOUSE_SPAWN_SLOTS,
  STRONGHOLD_CENTER,
} from "../src/content/houseConfig";
import type { LocaleKey, LocaleParams } from "../src/content/locale";
import type { House } from "../src/agents/agentTypes";
import { drawBackground } from "../src/render/drawBackground";
import { drawHalls } from "../src/render/drawHalls";

type DrawOperation =
  | { readonly kind: "arc"; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly kind: "beginPath" | "closePath" | "fill" | "restore" | "save" | "stroke" }
  | { readonly kind: "fillRect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | { readonly kind: "fillText" | "strokeText"; readonly text: string; readonly x: number; readonly y: number }
  | { readonly kind: "gradient"; readonly x: number; readonly y: number; readonly innerRadius: number; readonly outerRadius: number }
  | { readonly kind: "lineTo" | "moveTo"; readonly x: number; readonly y: number }
  | { readonly kind: "rect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | { readonly kind: "setFillStyle" | "setStrokeStyle"; readonly value: string }
  | { readonly kind: "setFont" | "setTextAlign"; readonly value: string }
  | { readonly kind: "setLineWidth"; readonly value: number };

class RecordingGradient {
  public addColorStop(_offset: number, _color: string): void {}

  public toString(): string {
    return "recording-gradient";
  }
}

class RecordingContext {
  private readonly recordedOperations: DrawOperation[] = [];

  public set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setFillStyle", value: String(value) });
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setStrokeStyle", value: String(value) });
  }

  public set lineWidth(value: number) {
    this.recordedOperations.push({ kind: "setLineWidth", value });
  }

  public set textAlign(value: CanvasTextAlign) {
    this.recordedOperations.push({ kind: "setTextAlign", value });
  }

  public set font(value: string) {
    this.recordedOperations.push({ kind: "setFont", value });
  }

  public beginPath(): void {
    this.recordedOperations.push({ kind: "beginPath" });
  }

  public closePath(): void {
    this.recordedOperations.push({ kind: "closePath" });
  }

  public fill(): void {
    this.recordedOperations.push({ kind: "fill" });
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.recordedOperations.push({ kind: "fillRect", x, y, width, height });
  }

  public fillText(text: string, x: number, y: number): void {
    this.recordedOperations.push({ kind: "fillText", text, x, y });
  }

  public lineTo(x: number, y: number): void {
    this.recordedOperations.push({ kind: "lineTo", x, y });
  }

  public moveTo(x: number, y: number): void {
    this.recordedOperations.push({ kind: "moveTo", x, y });
  }

  public rect(x: number, y: number, width: number, height: number): void {
    this.recordedOperations.push({ kind: "rect", x, y, width, height });
  }

  public restore(): void {
    this.recordedOperations.push({ kind: "restore" });
  }

  public save(): void {
    this.recordedOperations.push({ kind: "save" });
  }

  public stroke(): void {
    this.recordedOperations.push({ kind: "stroke" });
  }

  public strokeText(text: string, x: number, y: number): void {
    this.recordedOperations.push({ kind: "strokeText", text, x, y });
  }

  public arc(x: number, y: number, radius: number): void {
    this.recordedOperations.push({ kind: "arc", x, y, radius });
  }

  public createRadialGradient(
    x: number,
    y: number,
    innerRadius: number,
    _outerX: number,
    _outerY: number,
    outerRadius: number,
  ): RecordingGradient {
    this.recordedOperations.push({ kind: "gradient", x, y, innerRadius, outerRadius });
    return new RecordingGradient();
  }

  public operations(): readonly DrawOperation[] {
    return this.recordedOperations;
  }
}

function canvasContext(context: RecordingContext): CanvasRenderingContext2D {
  return context as never as CanvasRenderingContext2D;
}

const TEST_HOUSES: readonly House[] = HOUSE_CONFIG.map((house) => ({
  id: house.id,
  name: house.name,
  color: house.color,
  power: house.initialPower,
  isTraitor: false,
}));

function translate(key: LocaleKey, _params?: LocaleParams): string {
  const labels: Partial<Record<LocaleKey, string>> = {
    "house.house_a.name": "Ashvale Local",
  };
  return labels[key] ?? key;
}

test("Given the world background, when it is drawn, then a worn-earth stronghold patch is centered below hall actors", () => {
  const context = new RecordingContext();

  drawBackground(
    canvasContext(context),
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
  );
  drawHalls(
    canvasContext(context),
    [
      {
        houseId: "house_a",
        x: HOUSE_SPAWN_SLOTS[0].x,
        y: HOUSE_SPAWN_SLOTS[0].y,
        hp: 900,
        maxHp: 900,
      },
    ],
    TEST_HOUSES,
    true,
    translate,
  );

  const patchIndex = context.operations().findIndex(
    (operation) =>
      operation.kind === "gradient" &&
      operation.x === STRONGHOLD_CENTER.x &&
      operation.y === STRONGHOLD_CENTER.y &&
      operation.innerRadius === 0 &&
      operation.outerRadius === 170,
  );
  const labelIndex = context.operations().findIndex(
    (operation) => operation.kind === "fillText" && operation.text.includes("Ashvale Local"),
  );
  const hallPrimitiveIndex = context.operations().findIndex(
    (operation) =>
      operation.kind === "rect" &&
      operation.x === HOUSE_SPAWN_SLOTS[0].x - BALANCE_CONFIG.HALL_RADIUS &&
      operation.y === HOUSE_SPAWN_SLOTS[0].y - BALANCE_CONFIG.HALL_RADIUS,
  );

  assert.notEqual(patchIndex, -1);
  assert.notEqual(hallPrimitiveIndex, -1);
  assert.notEqual(labelIndex, -1);
  assert.ok(patchIndex < hallPrimitiveIndex);
  assert.ok(patchIndex < labelIndex);
});

test("Given a selected house hall, when its banner is drawn, then only localized short name and color mark are rendered", () => {
  const context = new RecordingContext();

  drawHalls(
    canvasContext(context),
    [
      {
        houseId: "house_a",
        x: HOUSE_SPAWN_SLOTS[0].x,
        y: HOUSE_SPAWN_SLOTS[0].y,
        hp: 900,
        maxHp: 900,
      },
    ],
    TEST_HOUSES,
    true,
    translate,
  );

  const textOperations = context.operations().filter(
    (operation): operation is Extract<DrawOperation, { readonly kind: "fillText" | "strokeText" }> =>
      operation.kind === "fillText" || operation.kind === "strokeText",
  );

  assert.deepEqual(
    textOperations.map(({ text }) => text),
    ["* Ashvale Local", "* Ashvale Local"],
  );
  assert.ok(
    context.operations().some(
      (operation) =>
        operation.kind === "setFillStyle" && operation.value === HOUSE_CONFIG[0]?.color,
    ),
  );
});

test("Given deterministic stronghold-region candidates, when production placement validation runs, then viable build slots and hall rejections are stable", () => {
  const halls = HOUSE_SPAWN_SLOTS.map((slot, index) => ({
    id: slot.id,
    x: slot.x,
    y: slot.y,
    hp: 900,
    maxHp: 900,
    radius: BALANCE_CONFIG.HALL_RADIUS,
    houseId: HOUSE_CONFIG[index]?.id ?? "house_a",
  }));
  const offsets = [-160, -120, -80, -40, 0, 40, 80, 120, 160] as const;
  const candidates = offsets.flatMap((xOffset) =>
    offsets.map((yOffset) => ({
      x: STRONGHOLD_CENTER.x + xOffset,
      y: STRONGHOLD_CENTER.y + yOffset,
    })),
  ).filter(
    (candidate) =>
      Math.hypot(candidate.x - STRONGHOLD_CENTER.x, candidate.y - STRONGHOLD_CENTER.y) <=
      170,
  );

  const validCandidates = candidates.filter(
    (candidate) =>
      validateTowerPlacement(candidate.x, candidate.y, {
        worldWidth: BALANCE_CONFIG.WORLD_WIDTH,
        worldHeight: BALANCE_CONFIG.WORLD_HEIGHT,
        halls,
        towers: [],
      }).ok,
  );

  assert.equal(TOWER_CONFIG.TOWER_MIN_SPACING, 60);
  assert.ok(validCandidates.length >= 5);
  for (const hall of halls) {
    assert.equal(
      validateTowerPlacement(hall.x, hall.y, {
        worldWidth: BALANCE_CONFIG.WORLD_WIDTH,
        worldHeight: BALANCE_CONFIG.WORLD_HEIGHT,
        halls,
        towers: [],
      }).reason,
      "too close to a hall",
    );
  }
});

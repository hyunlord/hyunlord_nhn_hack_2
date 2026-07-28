import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STRONGHOLD_CENTER } from "../src/content/houseConfig";
import { drawBackground } from "../src/render/drawBackground";
import { drawCombatTransients } from "../src/render/drawEffects";
import type { BrowserSpriteSource } from "../src/render/assets/drawSprite";
import {
  CANVAS_VISUAL_TOKENS,
  STRONGHOLD_PATCH_RADIUS,
  type CanvasVisualTokenName,
} from "../src/render/visualTokens";
import type { CombatTransientEvent } from "../src/render/combatTransientTypes";

interface ColorStop {
  readonly offset: number;
  readonly color: string;
}

type RenderTokenOperation =
  | { readonly kind: "arc"; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly kind: "fillRect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | { readonly kind: "gradient"; readonly stops: readonly ColorStop[]; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly kind: "setFillStyle" | "setStrokeStyle"; readonly value: string }
  | { readonly kind: "setAlpha" | "setLineWidth"; readonly value: number }
  | { readonly kind: "fillText"; readonly text: string; readonly x: number; readonly y: number }
  | { readonly kind: "beginPath" | "fill" | "lineTo" | "moveTo" | "restore" | "save" | "stroke" };

class TokenGradient {
  private readonly stops: ColorStop[] = [];

  public constructor(private readonly onStop: (stops: readonly ColorStop[]) => void) {}

  public addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color });
    this.onStop(this.stops);
  }

  public toString(): string {
    return "token-gradient";
  }
}

class TokenContext {
  private readonly recordedOperations: RenderTokenOperation[] = [];
  public globalCompositeOperation: GlobalCompositeOperation = "source-over";
  public imageSmoothingEnabled = false;

  public drawImage(
    _image: BrowserSpriteSource,
    _sx: number,
    _sy: number,
    _sw: number,
    _sh: number,
    _dx: number,
    _dy: number,
    _dw: number,
    _dh: number,
  ): void {}

  public set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setFillStyle", value: String(value) });
  }

  public set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.recordedOperations.push({ kind: "setStrokeStyle", value: String(value) });
  }

  public set globalAlpha(value: number) {
    this.recordedOperations.push({ kind: "setAlpha", value });
  }

  public set lineWidth(value: number) {
    this.recordedOperations.push({ kind: "setLineWidth", value });
  }

  public set font(_value: string) {}

  public set textAlign(_value: CanvasTextAlign) {}

  public set textBaseline(_value: CanvasTextBaseline) {}

  public beginPath(): void {
    this.recordedOperations.push({ kind: "beginPath" });
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

  public lineTo(): void {
    this.recordedOperations.push({ kind: "lineTo" });
  }

  public moveTo(): void {
    this.recordedOperations.push({ kind: "moveTo" });
  }

  public restore(): void {
    this.recordedOperations.push({ kind: "restore" });
  }

  public scale(_x: number, _y: number): void {}

  public save(): void {
    this.recordedOperations.push({ kind: "save" });
  }

  public stroke(): void {
    this.recordedOperations.push({ kind: "stroke" });
  }

  public translate(_x: number, _y: number): void {}

  public arc(x: number, y: number, radius: number): void {
    this.recordedOperations.push({ kind: "arc", x, y, radius });
  }

  public createRadialGradient(
    x: number,
    y: number,
    _innerRadius: number,
    _outerX: number,
    _outerY: number,
    radius: number,
  ): TokenGradient {
    const operation: RenderTokenOperation = { kind: "gradient", stops: [], x, y, radius };
    this.recordedOperations.push(operation);
    return new TokenGradient((stops) => {
      const index = this.recordedOperations.indexOf(operation);
      this.recordedOperations.splice(index, 1, { ...operation, stops });
    });
  }

  public operations(): readonly RenderTokenOperation[] {
    return this.recordedOperations;
  }
}

function designTokenValue(cssName: string): string {
  const designSource = readFileSync("DESIGN.md", "utf8");
  for (const line of designSource.split("\n")) {
    if (!line.includes(`\`${cssName}\``)) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim());
    const valueCell = cells[3];
    if (valueCell === undefined) {
      break;
    }
    return valueCell.replace(/^`|`$/g, "");
  }
  throw new RangeError(`Missing DESIGN token ${cssName}.`);
}

test("Given documented canvas tokens, when the render token module is inspected, then names and values match DESIGN.md exactly", () => {
  const expectedTokenNames = [
    "strongholdGroundCore",
    "strongholdGroundRim",
    "combatHitFlash",
    "combatDeathPuff",
    "defensePulse",
    "waveBannerInk",
  ] as const satisfies readonly CanvasVisualTokenName[];

  assert.deepEqual(Object.keys(CANVAS_VISUAL_TOKENS), [...expectedTokenNames]);
  for (const tokenName of expectedTokenNames) {
    const token = CANVAS_VISUAL_TOKENS[tokenName];
    assert.equal(token.value, designTokenValue(token.cssName));
  }
});

test("Given the stronghold background, when it is drawn, then gradient stops consume documented ground tokens", () => {
  const context = new TokenContext();

  drawBackground(context, 960, 600);

  const gradient = context.operations().find(
    (operation): operation is Extract<RenderTokenOperation, { readonly kind: "gradient" }> =>
      operation.kind === "gradient" &&
      operation.x === STRONGHOLD_CENTER.x &&
      operation.y === STRONGHOLD_CENTER.y &&
      operation.radius === STRONGHOLD_PATCH_RADIUS,
  );
  assert.ok(gradient);
  assert.deepEqual(gradient.stops.slice(0, 2), [
    { offset: 0, color: CANVAS_VISUAL_TOKENS.strongholdGroundCore.value },
    { offset: 0.72, color: CANVAS_VISUAL_TOKENS.strongholdGroundRim.value },
  ]);
});

test("Given render-only combat transients, when they are drawn, then death puff, defense pulse, and wave banner use documented tokens", () => {
  const context = new TokenContext();
  const events: readonly CombatTransientEvent[] = [
    { kind: "death_puff", id: "death:1", target: "agent", x: 10, y: 20, startTick: 5, durationTicks: 10 },
    { kind: "defense_pulse", id: "hall:1", x: 30, y: 40, startTick: 5, durationTicks: 10, hpBefore: 900, hpAfter: 650 },
    { kind: "wave_banner", id: "wave:1", wave: 1, creatureCount: 9, daylightRaid: false, startTick: 5, durationTicks: 60 },
  ];

  drawCombatTransients(context, events, 5, () => "Wave 1 · Creatures 9");

  const operations = context.operations();
  assert.ok(
    operations.some(
      (operation) =>
        operation.kind === "setFillStyle" && operation.value === CANVAS_VISUAL_TOKENS.combatDeathPuff.value,
    ),
  );
  assert.ok(
    operations.some(
      (operation) =>
        operation.kind === "setStrokeStyle" && operation.value === CANVAS_VISUAL_TOKENS.defensePulse.value,
    ),
  );
  assert.ok(
    operations.some(
      (operation) =>
        operation.kind === "setFillStyle" && operation.value === CANVAS_VISUAL_TOKENS.waveBannerInk.value,
    ),
  );
});

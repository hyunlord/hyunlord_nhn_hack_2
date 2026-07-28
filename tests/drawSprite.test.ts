import assert from "node:assert/strict";
import test from "node:test";
import type { SpriteId, SpriteSpec } from "../src/content/assetManifest";
import {
  calculateSpriteDestination,
  createSpriteDrawer,
  type DrawSpriteOptions,
  type SpriteDrawContext,
  type SpriteDrawSource,
} from "../src/render/assets/drawSprite";

type DrawOperation =
  | { readonly kind: "drawImage"; readonly image: FakeSource; readonly sx: number; readonly sy: number; readonly sw: number; readonly sh: number; readonly dx: number; readonly dy: number; readonly dw: number; readonly dh: number }
  | { readonly kind: "save" | "restore" }
  | { readonly kind: "translate" | "scale"; readonly x: number; readonly y: number }
  | { readonly kind: "setAlpha"; readonly value: number }
  | { readonly kind: "setSmoothing"; readonly value: boolean };

class FakeSource implements SpriteDrawSource {
  public constructor(public readonly name: string, public readonly width: number, public readonly height: number) {}
}

class FakeContext implements SpriteDrawContext<FakeSource> {
  private readonly recordedOperations: DrawOperation[] = [];
  private smoothingEnabled: boolean;
  private alpha: number;

  public constructor(
    options: {
      readonly smoothing: boolean;
      readonly alpha: number;
      readonly throwOnDraw?: boolean;
    },
  ) {
    this.smoothingEnabled = options.smoothing;
    this.alpha = options.alpha;
    this.throwOnDraw = options.throwOnDraw ?? false;
  }

  private readonly throwOnDraw: boolean;

  public set imageSmoothingEnabled(value: boolean) {
    this.smoothingEnabled = value;
    this.recordedOperations.push({ kind: "setSmoothing", value });
  }

  public get imageSmoothingEnabled(): boolean {
    return this.smoothingEnabled;
  }

  public set globalAlpha(value: number) {
    this.alpha = value;
    this.recordedOperations.push({ kind: "setAlpha", value });
  }

  public get globalAlpha(): number {
    return this.alpha;
  }

  public drawImage(image: FakeSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    this.recordedOperations.push({ kind: "drawImage", image, sx, sy, sw, sh, dx, dy, dw, dh });
    if (this.throwOnDraw) {
      throw new Error("draw failed");
    }
  }

  public save(): void {
    this.recordedOperations.push({ kind: "save" });
  }

  public restore(): void {
    this.recordedOperations.push({ kind: "restore" });
  }

  public translate(x: number, y: number): void {
    this.recordedOperations.push({ kind: "translate", x, y });
  }

  public scale(x: number, y: number): void {
    this.recordedOperations.push({ kind: "scale", x, y });
  }

  public operations(): readonly DrawOperation[] {
    return this.recordedOperations;
  }
}

class FakeSpriteStore {
  private readonly images = new Map<SpriteId, FakeSource>();
  private readonly tintedImages = new Map<string, FakeSource | null>();

  public constructor(private enabled = true) {}

  public setImage(id: SpriteId, image: FakeSource): void {
    this.images.set(id, image);
  }

  public setTintedImage(id: SpriteId, tint: string, image: FakeSource | null): void {
    this.tintedImages.set(`${id}:${tint}`, image);
  }

  public spritesEnabled(): boolean {
    return this.enabled;
  }

  public disableSprites(): void {
    this.enabled = false;
  }

  public getImage(id: SpriteId): FakeSource | null {
    return this.images.get(id) ?? null;
  }

  public getTintedSprite(id: SpriteId, tint: string): FakeSource | null {
    return this.tintedImages.get(`${id}:${tint}`) ?? null;
  }
}

const TEST_SPEC: SpriteSpec = { id: "keep", src: "/assets/world/keep.png", frameWidth: 32, frameHeight: 16, frames: 4, pivotX: 0.25, pivotY: 1, renderWidth: 20, renderHeight: 10, tintable: true };

const MANIFEST = {
  keep: TEST_SPEC,
  creature: { ...TEST_SPEC, id: "creature", tintable: false },
} satisfies Partial<Record<SpriteId, SpriteSpec>>;

function makeDrawer(options: {
  readonly store: FakeSpriteStore;
  readonly dpr?: number;
  readonly manifest?: Partial<Record<SpriteId, SpriteSpec>>;
}) {
  return createSpriteDrawer<FakeSource>({
    getImage: (id) => options.store.getImage(id),
    getTintedSprite: (id, tint) => options.store.getTintedSprite(id, tint),
    spritesEnabled: () => options.store.spritesEnabled(),
    devicePixelRatio: () => options.dpr ?? 1,
    manifest: options.manifest ?? MANIFEST,
  });
}

function source(name = "base"): FakeSource {
  return new FakeSource(name, 128, 16);
}

function context(smoothing = true, alpha = 1): FakeContext {
  return new FakeContext({ smoothing, alpha });
}

function readyHarness(id: SpriteId = "keep"): {
  readonly image: FakeSource;
  readonly store: FakeSpriteStore;
  readonly draw: ReturnType<typeof makeDrawer>;
} {
  const store = new FakeSpriteStore();
  const image = source();
  store.setImage(id, image);
  return { image, store, draw: makeDrawer({ store }) };
}

function expectedDraw(image: FakeSource, options: { readonly sx?: number; readonly dx?: number } = {}): DrawOperation {
  return { kind: "drawImage", image, sx: options.sx ?? 0, sy: 0, sw: 32, sh: 16, dx: options.dx ?? 45, dy: 70, dw: 20, dh: 10 };
}

function operationAt(context: FakeContext, index: number): DrawOperation {
  const operation = context.operations()[index];
  if (operation === undefined) {
    throw new Error(`Expected operation at ${index}`);
  }
  return operation;
}

test("Given a missing sprite image, when drawing, then it returns false and makes zero context calls", () => {
  const store = new FakeSpriteStore();
  const draw = makeDrawer({ store });
  const canvas = context(true, 0.8);

  assert.equal(draw(canvas, "keep", 10, 20), false);
  assert.deepEqual(canvas.operations(), []);
});

test("Given sprites are disabled, when drawing, then it returns false and makes zero context calls", () => {
  const { store, draw } = readyHarness();
  store.disableSprites();
  const canvas = context(true, 0.8);

  assert.equal(draw(canvas, "keep", 10, 20), false);
  assert.deepEqual(canvas.operations(), []);
});

test("Given bottom and center pivots, when destination geometry is calculated, then top-left uses the fractional pivot", () => {
  const anchor = { x: 50, y: 80 };

  assert.deepEqual(calculateSpriteDestination(TEST_SPEC, anchor, { scale: 2, dpr: 1 }), { x: 40, y: 60, width: 40, height: 20 });
  assert.deepEqual(
    calculateSpriteDestination({ ...TEST_SPEC, pivotY: 0.5 }, anchor, {
      scale: 2,
      dpr: 1,
    }),
    { x: 40, y: 70, width: 40, height: 20 },
  );
});

test("Given fractional destination coordinates, when geometry is calculated, then top-left snaps to device pixels", () => {
  const destination = calculateSpriteDestination(TEST_SPEC, { x: 10.2, y: 20.2 }, { scale: 1, dpr: 2 });

  assert.deepEqual(destination, { x: 5, y: 10, width: 20, height: 10 });
});

test("Given a ready sprite, when drawing frame defaults, then the 9-argument source and destination rectangles are used", () => {
  const { image, draw } = readyHarness();
  const canvas = context(true, 0.8);

  assert.equal(draw(canvas, "keep", 50, 80), true);
  assert.deepEqual(canvas.operations(), [
    { kind: "setSmoothing", value: false },
    { kind: "setAlpha", value: 1 },
    expectedDraw(image),
    { kind: "setSmoothing", value: true },
    { kind: "setAlpha", value: 0.8 },
  ]);
});

test("Given the canvas rejects a ready sprite, when drawing, then it returns false and restores context state", () => {
  const { draw } = readyHarness();
  const canvas = new FakeContext({
    smoothing: true,
    alpha: 0.8,
    throwOnDraw: true,
  });

  assert.equal(draw(canvas, "keep", 50, 80), false);
  assert.equal(canvas.imageSmoothingEnabled, true);
  assert.equal(canvas.globalAlpha, 0.8);
});

test("Given alpha outside the valid range, when drawing, then alpha is clamped and original state is restored", () => {
  const { draw } = readyHarness();
  const canvas = context(false, 0.4);

  assert.equal(draw(canvas, "keep", 50, 80, { alpha: 3 }), true);
  assert.equal(canvas.imageSmoothingEnabled, false);
  assert.equal(canvas.globalAlpha, 0.4);
  assert.deepEqual(
    canvas.operations().filter((operation) => operation.kind === "setAlpha"),
    [
      { kind: "setAlpha", value: 1 },
      { kind: "setAlpha", value: 0.4 },
    ],
  );
});

test("Given tint is requested for a tintable sprite, when the cache returns a surface, then that surface is drawn", () => {
  const { store, draw } = readyHarness();
  const tinted = source("tinted");
  store.setTintedImage("keep", "#ff0000", tinted);
  const canvas = context();

  assert.equal(draw(canvas, "keep", 50, 80, { tint: "#ff0000" }), true);
  assert.deepEqual(operationAt(canvas, 2), expectedDraw(tinted));
});

test("Given tinting fails for a tintable sprite, when drawing, then no untinted fallback is drawn", () => {
  const { store, draw } = readyHarness();
  store.setTintedImage("keep", "#ff0000", null);
  const canvas = context();

  assert.equal(draw(canvas, "keep", 50, 80, { tint: "#ff0000" }), false);
  assert.deepEqual(canvas.operations(), []);
});

test("Given tint is requested for an untintable sprite, when drawing, then the base image is drawn", () => {
  const { image, draw } = readyHarness("creature");
  const canvas = context();

  assert.equal(draw(canvas, "creature", 50, 80, { tint: "#ff0000" }), true);
  assert.deepEqual(operationAt(canvas, 2), expectedDraw(image));
});

test("Given overflowing and negative frame numbers, when drawing, then the horizontal frame is normalized modulo frame count", () => {
  const { image, draw } = readyHarness();
  const overflowCanvas = context();
  const negativeCanvas = context();

  assert.equal(draw(overflowCanvas, "keep", 50, 80, { frame: 5 }), true);
  assert.equal(draw(negativeCanvas, "keep", 50, 80, { frame: -1 }), true);
  assert.deepEqual(operationAt(overflowCanvas, 2), expectedDraw(image, { sx: 32 }));
  assert.deepEqual(operationAt(negativeCanvas, 2), expectedDraw(image, { sx: 96 }));
});

test("Given a nonpositive or nonfinite scale, when drawing, then drawing is rejected before touching the context", () => {
  const { draw } = readyHarness();
  const cases: readonly DrawSpriteOptions[] = [
    { scale: 0 },
    { scale: Number.POSITIVE_INFINITY },
  ];

  for (const options of cases) {
    const canvas = context();
    assert.equal(draw(canvas, "keep", 50, 80, options), false);
    assert.deepEqual(canvas.operations(), []);
  }
});

test("Given flipX is enabled, when drawing, then the transform is saved and restored around the same destination geometry", () => {
  const { image, draw } = readyHarness();
  const canvas = context();

  assert.equal(draw(canvas, "keep", 50, 80, { flipX: true }), true);
  assert.deepEqual(canvas.operations(), [
    { kind: "setSmoothing", value: false },
    { kind: "setAlpha", value: 1 },
    { kind: "save" },
    { kind: "translate", x: 65, y: 0 },
    { kind: "scale", x: -1, y: 1 },
    expectedDraw(image, { dx: 0 }),
    { kind: "restore" },
    { kind: "setSmoothing", value: true },
    { kind: "setAlpha", value: 1 },
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  SPRITE_TINT_CACHE_LIMIT,
  SpriteTintCache,
  getTintedSprite,
  type SpriteTintContext,
  type SpriteTintSource,
} from "../src/render/assets/spriteCache";

type Operation =
  | {
      readonly kind: "drawImage";
      readonly image: FakeSource;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly kind: "setComposite";
      readonly value: GlobalCompositeOperation;
    }
  | {
      readonly kind: "setFillStyle";
      readonly value: string;
    }
  | {
      readonly kind: "fillRect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };

class FakeSource implements SpriteTintSource {
  public constructor(
    public readonly width: number,
    public readonly height: number,
  ) {}
}

class FakeContext implements SpriteTintContext<FakeSource> {
  private readonly recordedOperations: Operation[] = [];
  private compositeOperation: GlobalCompositeOperation = "source-over";
  private style = "";

  public set globalCompositeOperation(value: GlobalCompositeOperation) {
    this.compositeOperation = value;
    this.recordedOperations.push({ kind: "setComposite", value });
  }

  public get globalCompositeOperation(): GlobalCompositeOperation {
    return this.compositeOperation;
  }

  public set fillStyle(value: string) {
    this.style = value;
    this.recordedOperations.push({ kind: "setFillStyle", value });
  }

  public get fillStyle(): string {
    return this.style;
  }

  public drawImage(image: FakeSource, x: number, y: number): void {
    this.recordedOperations.push({ kind: "drawImage", image, x, y });
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.recordedOperations.push({ kind: "fillRect", x, y, width, height });
  }

  public operations(): readonly Operation[] {
    return this.recordedOperations;
  }
}

class FakeSurface {
  public readonly context: FakeContext | null;
  public width = 0;
  public height = 0;

  public constructor(context: FakeContext | null = new FakeContext()) {
    this.context = context;
  }

  public getContext(contextId: "2d"): FakeContext | null {
    assert.equal(contextId, "2d");
    return this.context;
  }
}

class FakeSurfaceFactory {
  private readonly surfaces: FakeSurface[] = [];
  private attempts = 0;

  public constructor(private readonly createContext: () => FakeContext | null) {}

  public create(): FakeSurface | null {
    this.attempts += 1;
    const context = this.createContext();
    if (context === null) {
      return null;
    }
    const surface = new FakeSurface(context);
    this.surfaces.push(surface);
    return surface;
  }

  public createdCount(): number {
    return this.surfaces.length;
  }

  public attemptCount(): number {
    return this.attempts;
  }

  public created(): readonly FakeSurface[] {
    return this.surfaces;
  }
}

function makeCache(): {
  readonly cache: SpriteTintCache<FakeSource, FakeSurface>;
  readonly factory: FakeSurfaceFactory;
} {
  const factory = new FakeSurfaceFactory(() => new FakeContext());
  return {
    cache: new SpriteTintCache(() => factory.create()),
    factory,
  };
}

function requireSurface(
  factory: FakeSurfaceFactory,
  index: number,
): FakeSurface {
  const surface = factory.created()[index];
  if (surface === undefined) {
    throw new Error(`Expected fake surface at index ${index}`);
  }
  return surface;
}

test("Given a sprite and color pair, when tinted twice, then the same surface is reused without another factory call", () => {
  // Given
  const { cache, factory } = makeCache();
  const source = new FakeSource(32, 16);

  // When
  const first = cache.getTintedSprite("hero", " #AABBCC ", source);
  const second = cache.getTintedSprite("hero", "#aabbcc", source);

  // Then
  assert.equal(first, second);
  assert.equal(factory.createdCount(), 1);
});

test("Given different sprite ids or colors, when tinted, then each cache key receives a distinct surface", () => {
  // Given
  const { cache } = makeCache();
  const source = new FakeSource(32, 16);

  // When
  const first = cache.getTintedSprite("hero", "#00ff00", source);
  const second = cache.getTintedSprite("threat", "#00ff00", source);
  const third = cache.getTintedSprite("hero", "#ff0000", source);

  // Then
  assert.notEqual(first, second);
  assert.notEqual(first, third);
  assert.notEqual(second, third);
});

test("Given a tint request, when the surface is generated, then the source is composited in the documented order", () => {
  // Given
  const { cache, factory } = makeCache();
  const source = new FakeSource(8, 4);

  // When
  const tinted = cache.getTintedSprite("hero", "RED", source);

  // Then
  assert.equal(tinted, requireSurface(factory, 0));
  assert.deepEqual(requireSurface(factory, 0).context?.operations(), [
    { kind: "drawImage", image: source, x: 0, y: 0 },
    { kind: "setComposite", value: "source-in" },
    { kind: "setFillStyle", value: "red" },
    { kind: "fillRect", x: 0, y: 0, width: 8, height: 4 },
    { kind: "setComposite", value: "multiply" },
    { kind: "drawImage", image: source, x: 0, y: 0 },
    { kind: "setComposite", value: "source-over" },
  ]);
});

test("Given a full tint cache after a hit, when one more variant is inserted, then the oldest insertion is still evicted", () => {
  // Given
  const { cache } = makeCache();
  const source = new FakeSource(16, 16);
  const first = cache.getTintedSprite("sprite-0", "#000000", source);
  cache.getTintedSprite("sprite-1", "#000000", source);
  cache.getTintedSprite("sprite-2", "#000000", source);

  // When
  cache.getTintedSprite("sprite-0", "#000000", source);
  for (let index = 3; index <= SPRITE_TINT_CACHE_LIMIT; index += 1) {
    cache.getTintedSprite(`sprite-${index}`, "#000000", source);
  }
  const recreatedFirst = cache.getTintedSprite("sprite-0", "#000000", source);

  // Then
  assert.notEqual(recreatedFirst, first);
});

test("Given invalid source dimensions, when tinting is requested twice, then no surface is cached", () => {
  // Given
  const { cache, factory } = makeCache();
  const source = new FakeSource(0, 16);

  // When
  const first = cache.getTintedSprite("hero", "#00ff00", source);
  const second = cache.getTintedSprite("hero", "#00ff00", source);

  // Then
  assert.equal(first, null);
  assert.equal(second, null);
  assert.equal(factory.attemptCount(), 0);
  assert.equal(factory.createdCount(), 0);
});

test("Given the surface factory cannot create a drawable surface, when tinting is requested twice, then the miss is not cached", () => {
  // Given
  const factory = new FakeSurfaceFactory(() => null);
  const cache = new SpriteTintCache<FakeSource, FakeSurface>(() =>
    factory.create(),
  );
  const source = new FakeSource(16, 16);

  // When
  const first = cache.getTintedSprite("hero", "#00ff00", source);
  const second = cache.getTintedSprite("hero", "#00ff00", source);

  // Then
  assert.equal(first, null);
  assert.equal(second, null);
  assert.equal(factory.attemptCount(), 2);
  assert.equal(factory.createdCount(), 0);
});

test("Given a created surface has no context, when tinting is retried, then the later valid surface is cached", () => {
  // Given
  const source = new FakeSource(16, 16);
  const createdSurfaces: FakeSurface[] = [];
  let attempts = 0;
  const cache = new SpriteTintCache<FakeSource, FakeSurface>(() => {
    attempts += 1;
    const surface =
      attempts === 1
        ? new FakeSurface(null)
        : new FakeSurface(new FakeContext());
    createdSurfaces.push(surface);
    return surface;
  });

  // When
  const first = cache.getTintedSprite("hero", "#00ff00", source);
  const second = cache.getTintedSprite("hero", "#00ff00", source);
  const third = cache.getTintedSprite("hero", "#00ff00", source);

  // Then
  assert.equal(first, null);
  assert.notEqual(second, null);
  assert.equal(third, second);
  assert.equal(attempts, 2);
  assert.equal(createdSurfaces.length, 2);
});

test("Given a browser environment has not been initialized, when the module is imported, then singleton access stays callable", () => {
  // Given
  const expectedType = "function";

  // When
  const exportedType = typeof getTintedSprite;

  // Then
  assert.equal(exportedType, expectedType);
});

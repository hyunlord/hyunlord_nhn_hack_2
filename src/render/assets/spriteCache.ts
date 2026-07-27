import type { SpriteId } from "../../content/assetManifest";

export const SPRITE_TINT_CACHE_LIMIT = 64;

export type SpriteTintSource = {
  readonly width: number;
  readonly height: number;
};

export type SpriteTintContext<TSource extends SpriteTintSource> = {
  globalCompositeOperation: GlobalCompositeOperation;
  fillStyle: string | CanvasGradient | CanvasPattern;
  drawImage(image: TSource, x: number, y: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
};

export type SpriteTintSurface<TSource extends SpriteTintSource> = {
  width: number;
  height: number;
  getContext(contextId: "2d"): SpriteTintContext<TSource> | null;
};

type SurfaceFactory<TSource extends SpriteTintSource, TSurface> = (
  width: number,
  height: number,
) => (TSurface & SpriteTintSurface<TSource>) | null;

export class SpriteTintCache<
  TSource extends SpriteTintSource,
  TSurface extends SpriteTintSurface<TSource>,
> {
  private readonly entries = new Map<string, TSurface>();

  public constructor(
    private readonly createSurface: SurfaceFactory<TSource, TSurface>,
  ) {}

  public getTintedSprite(
    spriteId: string,
    color: string,
    source: TSource,
  ): TSurface | null {
    if (source.width <= 0 || source.height <= 0) {
      return null;
    }

    const key = tintCacheKey(spriteId, color);
    const cachedSurface = this.entries.get(key);
    if (cachedSurface !== undefined) {
      return cachedSurface;
    }

    const surface = this.createSurface(source.width, source.height);
    if (surface === null) {
      return null;
    }

    surface.width = source.width;
    surface.height = source.height;

    const context = surface.getContext("2d");
    if (context === null) {
      return null;
    }

    tintSurface(context, source, normalizeTintColor(color));
    this.evictOldestIfFull();
    this.entries.set(key, surface);
    return surface;
  }

  private evictOldestIfFull(): void {
    if (this.entries.size < SPRITE_TINT_CACHE_LIMIT) {
      return;
    }

    const oldestKey = this.entries.keys().next().value;
    if (typeof oldestKey === "string") {
      this.entries.delete(oldestKey);
    }
  }
}

function tintCacheKey(spriteId: string, color: string): string {
  return `${spriteId}:${normalizeTintColor(color)}`;
}

function normalizeTintColor(color: string): string {
  return color.trim().toLowerCase();
}

function tintSurface<TSource extends SpriteTintSource>(
  context: SpriteTintContext<TSource>,
  source: TSource,
  color: string,
): void {
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, source.width, source.height);
  // Multiply the original sheet back over the tint so sprite shading survives.
  context.globalCompositeOperation = "multiply";
  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = "source-over";
}

type BrowserSpriteSource = CanvasImageSource & SpriteTintSource;

const browserTintCache = new SpriteTintCache<
  BrowserSpriteSource,
  HTMLCanvasElement
>((width, height) => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
});

export function getTintedSprite(
  spriteId: SpriteId,
  color: string,
  source: BrowserSpriteSource,
): HTMLCanvasElement | null {
  return browserTintCache.getTintedSprite(spriteId, color, source);
}

import {
  SPRITE_MANIFEST,
  type SpriteId,
  type SpriteSpec,
} from "../../content/assetManifest";
import { getTintedSprite } from "./spriteCache";
import { getImage } from "./spriteLoader";
import { readDevicePixelRatio, readSpritesEnabled } from "./spriteSettings";

export type SpriteDrawSource = { readonly width: number; readonly height: number };

export type SpriteDrawContext<TSource extends SpriteDrawSource> = {
  imageSmoothingEnabled: boolean;
  globalAlpha: number;
  drawImage(image: TSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
};

export type DrawSpriteOptions = { readonly tint?: string; readonly frame?: number; readonly scale?: number; readonly alpha?: number; readonly flipX?: boolean };

export type SpriteDestination = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export type SpriteAnchor = { readonly x: number; readonly y: number };

export type SpriteGeometryOptions = { readonly scale?: number; readonly dpr?: number };

export type SpriteDrawerDependencies<TSource extends SpriteDrawSource> = {
  readonly getImage: (id: SpriteId) => TSource | null;
  readonly getTintedSprite: (
    id: SpriteId,
    tint: string,
    source: TSource,
  ) => TSource | null;
  readonly spritesEnabled: () => boolean;
  readonly devicePixelRatio: () => number;
  readonly manifest?: Partial<Record<SpriteId, SpriteSpec>>;
};

type SpriteDrawFunction<TSource extends SpriteDrawSource> = (context: SpriteDrawContext<TSource>, id: SpriteId, x: number, y: number, options?: DrawSpriteOptions) => boolean;

type SpriteFrame = { readonly sx: number; readonly sy: number; readonly sw: number; readonly sh: number };

type ResolvedSprite<TSource extends SpriteDrawSource> = {
  readonly image: TSource;
  readonly destination: SpriteDestination;
  readonly frame: SpriteFrame;
  readonly alpha: number;
  readonly flipX: boolean;
};

export function calculateSpriteDestination(
  spec: SpriteSpec,
  anchor: SpriteAnchor,
  options: SpriteGeometryOptions = {},
): SpriteDestination | null {
  const scale = options.scale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  const dpr = normalizeDevicePixelRatio(options.dpr);
  const width = spec.renderWidth * scale;
  const height = spec.renderHeight * scale;
  return {
    x: snapToDevicePixel(anchor.x - width * spec.pivotX, dpr),
    y: snapToDevicePixel(anchor.y - height * spec.pivotY, dpr),
    width,
    height,
  };
}

export function createSpriteDrawer<TSource extends SpriteDrawSource>(
  dependencies: SpriteDrawerDependencies<TSource>,
): SpriteDrawFunction<TSource> {
  return (
    context: SpriteDrawContext<TSource>,
    id: SpriteId,
    x: number,
    y: number,
    options: DrawSpriteOptions = {},
  ): boolean => {
    const sprite = resolveSprite(dependencies, id, { x, y }, options);
    if (sprite === null) {
      return false;
    }

    drawResolvedSprite(context, sprite);
    return true;
  };
}

type BrowserSpriteSource = CanvasImageSource & SpriteDrawSource;

const browserSpriteDrawer = createSpriteDrawer<BrowserSpriteSource>({
  getImage,
  getTintedSprite,
  spritesEnabled: readSpritesEnabled,
  devicePixelRatio: readDevicePixelRatio,
});

export function drawSprite(
  context: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  y: number,
  options?: DrawSpriteOptions,
): boolean {
  return browserSpriteDrawer(context, id, x, y, options);
}

function resolveSprite<TSource extends SpriteDrawSource>(
  dependencies: SpriteDrawerDependencies<TSource>,
  id: SpriteId,
  anchor: SpriteAnchor,
  options: DrawSpriteOptions,
): ResolvedSprite<TSource> | null {
  if (!dependencies.spritesEnabled()) {
    return null;
  }

  const spec = (dependencies.manifest ?? SPRITE_MANIFEST)[id];
  if (spec === undefined) {
    return null;
  }

  const image = dependencies.getImage(id);
  if (image === null) {
    return null;
  }

  const drawableImage = selectDrawableImage(dependencies, spec, image, options);
  if (drawableImage === null) {
    return null;
  }

  const geometryOptions: SpriteGeometryOptions =
    options.scale === undefined
      ? { dpr: dependencies.devicePixelRatio() }
      : { scale: options.scale, dpr: dependencies.devicePixelRatio() };
  const destination = calculateSpriteDestination(spec, anchor, geometryOptions);
  if (destination === null) {
    return null;
  }

  return {
    image: drawableImage,
    destination,
    frame: calculateFrame(spec, options.frame),
    alpha: clampAlpha(options.alpha),
    flipX: options.flipX ?? false,
  };
}

function selectDrawableImage<TSource extends SpriteDrawSource>(
  dependencies: SpriteDrawerDependencies<TSource>,
  spec: SpriteSpec,
  image: TSource,
  options: DrawSpriteOptions,
): TSource | null {
  if (options.tint === undefined || !spec.tintable) {
    return image;
  }

  return dependencies.getTintedSprite(spec.id, options.tint, image);
}

function calculateFrame(spec: SpriteSpec, frame: number | undefined): SpriteFrame {
  const frameIndex =
    frame === undefined || !Number.isFinite(frame) || spec.frames <= 0
      ? 0
      : ((Math.trunc(frame) % spec.frames) + spec.frames) % spec.frames;
  return {
    sx: frameIndex * spec.frameWidth,
    sy: 0,
    sw: spec.frameWidth,
    sh: spec.frameHeight,
  };
}

function clampAlpha(alpha: number | undefined): number {
  if (alpha === undefined) {
    return 1;
  }

  if (!Number.isFinite(alpha)) {
    return 1;
  }

  return Math.min(1, Math.max(0, alpha));
}

function normalizeDevicePixelRatio(dpr: number | undefined): number {
  return dpr === undefined || !Number.isFinite(dpr) || dpr < 1 ? 1 : dpr;
}

function snapToDevicePixel(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr;
}

function drawResolvedSprite<TSource extends SpriteDrawSource>(
  context: SpriteDrawContext<TSource>,
  sprite: ResolvedSprite<TSource>,
): void {
  const previousSmoothing = context.imageSmoothingEnabled;
  const previousAlpha = context.globalAlpha;

  context.imageSmoothingEnabled = false;
  context.globalAlpha = sprite.alpha;

  try {
    if (sprite.flipX) {
      drawFlippedSprite(context, sprite);
    } else {
      drawUnflippedSprite(context, sprite);
    }
  } finally {
    context.imageSmoothingEnabled = previousSmoothing;
    context.globalAlpha = previousAlpha;
  }
}

function drawFlippedSprite<TSource extends SpriteDrawSource>(
  context: SpriteDrawContext<TSource>,
  sprite: ResolvedSprite<TSource>,
): void {
  const rightEdge = sprite.destination.x + sprite.destination.width;
  context.save();
  try {
    context.translate(rightEdge, 0);
    context.scale(-1, 1);
    drawUnflippedSprite(context, {
      ...sprite,
      destination: {
        ...sprite.destination,
        x: 0,
      },
    });
  } finally {
    context.restore();
  }
}

function drawUnflippedSprite<TSource extends SpriteDrawSource>(
  context: SpriteDrawContext<TSource>,
  sprite: ResolvedSprite<TSource>,
): void {
  context.drawImage(
    sprite.image,
    sprite.frame.sx,
    sprite.frame.sy,
    sprite.frame.sw,
    sprite.frame.sh,
    sprite.destination.x,
    sprite.destination.y,
    sprite.destination.width,
    sprite.destination.height,
  );
}

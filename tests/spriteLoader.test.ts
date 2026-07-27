import assert from "node:assert/strict";
import test from "node:test";
import { SPRITE_IDS, type SpriteId } from "../src/content/assetManifest";
import { SpriteLoader } from "../src/render/assets/spriteLoader";

type FakeLoadHandler = () => void;

class FakeImage {
  public onload: FakeLoadHandler | null = null;
  public onerror: FakeLoadHandler | null = null;
  public src = "";

  public completeLoad(): void {
    this.onload?.();
  }

  public failLoad(): void {
    this.onerror?.();
  }
}

class ThrowingSrcImage {
  public onload: FakeLoadHandler | null = null;
  public onerror: FakeLoadHandler | null = null;

  public get src(): string {
    return "";
  }

  public set src(_src: string) {
    throw new Error("src assignment failed");
  }
}

class FakeImageFactory {
  private readonly createdImages: FakeImage[] = [];

  public create(): FakeImage {
    const image = new FakeImage();
    this.createdImages.push(image);
    return image;
  }

  public createdCount(): number {
    return this.createdImages.length;
  }

  public created(): readonly FakeImage[] {
    return this.createdImages;
  }
}

function makeLoader(): {
  readonly factory: FakeImageFactory;
  readonly loader: SpriteLoader<FakeImage>;
} {
  const factory = new FakeImageFactory();
  return {
    factory,
    loader: new SpriteLoader(() => factory.create()),
  };
}

function requireCreatedImage(
  factory: FakeImageFactory,
  index: number,
): FakeImage {
  const image = factory.created()[index];
  if (image === undefined) {
    throw new Error(`Expected fake image at index ${index}`);
  }
  return image;
}

test("Given every sprite file is missing, when all sprites preload, then the promise resolves and terminal statuses are missing", async () => {
  // Given
  const { factory, loader } = makeLoader();

  // When
  const preload = loader.preloadAll();
  for (const image of factory.created()) {
    image.failLoad();
  }
  await preload;

  // Then
  assert.equal(factory.createdCount(), SPRITE_IDS.length);
  assert.deepEqual(loader.loadedCount(), {
    ready: 0,
    missing: SPRITE_IDS.length,
    total: 19,
  });
  for (const spriteId of SPRITE_IDS) {
    assert.equal(loader.getStatus(spriteId), "missing");
    assert.equal(loader.getImage(spriteId), null);
  }
});

test("Given an idle sprite, when image reads happen immediately, then exactly one image request is shared", () => {
  // Given
  const { factory, loader } = makeLoader();

  // When
  const firstRead = loader.getImage("hall");
  const secondRead = loader.getImage("hall");
  const thirdRead = loader.getImage("hall");

  // Then
  assert.equal(firstRead, null);
  assert.equal(secondRead, null);
  assert.equal(thirdRead, null);
  assert.equal(factory.createdCount(), 1);
  assert.equal(loader.getStatus("hall"), "loading");
});

test("Given a sprite image loads, when it is read again, then the exact cached image is returned", () => {
  // Given
  const { factory, loader } = makeLoader();
  assert.equal(loader.getImage("hall"), null);
  const image = requireCreatedImage(factory, 0);

  // When
  image.completeLoad();
  const loadedImage = loader.getImage("hall");

  // Then
  assert.equal(loadedImage, image);
  assert.equal(loader.getStatus("hall"), "ready");
  assert.equal(factory.createdCount(), 1);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
});

test("Given a mixed preload, when some sprites load and some are missing, then counts include only terminal states", async () => {
  // Given
  const { factory, loader } = makeLoader();
  const preload = loader.preloadAll();

  // When
  for (const [index, image] of factory.created().entries()) {
    if (index < 2) {
      image.completeLoad();
    } else {
      image.failLoad();
    }
  }
  await preload;

  // Then
  assert.deepEqual(loader.loadedCount(), {
    ready: 2,
    missing: SPRITE_IDS.length - 2,
    total: 19,
  });
});

test("Given a failed sprite request, when status and image are read repeatedly, then reads stay null and do not throw", async () => {
  // Given
  const { factory, loader } = makeLoader();
  const spriteId: SpriteId = "hall";
  const preload = loader.preload(spriteId);
  requireCreatedImage(factory, 0).failLoad();
  await preload;

  // When
  const status = loader.getStatus(spriteId);
  const image = loader.getImage(spriteId);

  // Then
  assert.equal(status, "missing");
  assert.equal(image, null);
  assert.doesNotThrow(() => loader.getImage(spriteId));
  assert.doesNotThrow(() => loader.getStatus(spriteId));
});

test("Given src assignment throws synchronously, when a sprite loads, then it resolves missing without throwing", async () => {
  // Given
  const throwingImage = new ThrowingSrcImage();
  const loader = new SpriteLoader(() => throwingImage);
  const spriteId: SpriteId = "hall";

  // When
  await assert.doesNotReject(() => loader.preload(spriteId));
  const status = loader.getStatus(spriteId);
  const image = loader.getImage(spriteId);

  // Then
  assert.equal(status, "missing");
  assert.equal(image, null);
  assert.equal(throwingImage.onload, null);
  assert.equal(throwingImage.onerror, null);
  assert.doesNotThrow(() => loader.getImage(spriteId));
});

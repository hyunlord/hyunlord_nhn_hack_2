import {
  SPRITE_IDS,
  SPRITE_MANIFEST,
  type SpriteId,
} from "../../content/assetManifest";

export type LoadStatus = "idle" | "loading" | "ready" | "missing";

export type LoadedCount = {
  readonly ready: number;
  readonly missing: number;
  readonly total: number;
};

export type SpriteLoadImage = {
  onload: unknown;
  onerror: unknown;
  src: string;
};

type LoaderEntry<TImage extends SpriteLoadImage> = {
  status: LoadStatus;
  image: TImage | null;
  promise: Promise<void> | null;
};

type ImageFactory<TImage extends SpriteLoadImage> = () => TImage;
type ImageCreation<TImage extends SpriteLoadImage> =
  | {
      readonly kind: "created";
      readonly image: TImage;
    }
  | {
      readonly kind: "missing";
    };

function createIdleEntry<TImage extends SpriteLoadImage>(): LoaderEntry<TImage> {
  return {
    status: "idle",
    image: null,
    promise: null,
  };
}

export class SpriteLoader<TImage extends SpriteLoadImage> {
  private readonly entries = new Map<SpriteId, LoaderEntry<TImage>>();
  private readonly createImage: ImageFactory<TImage>;

  public constructor(createImage: ImageFactory<TImage>) {
    this.createImage = createImage;
    for (const spriteId of SPRITE_IDS) {
      this.entries.set(spriteId, createIdleEntry());
    }
  }

  public preloadAll(): Promise<void> {
    return Promise.all(SPRITE_IDS.map((spriteId) => this.preload(spriteId))).then(
      () => undefined,
      () => undefined,
    );
  }

  public preload(id: SpriteId): Promise<void> {
    const entry = this.getEntry(id);
    switch (entry.status) {
      case "ready":
      case "missing":
        return Promise.resolve();
      case "loading":
        return entry.promise ?? Promise.resolve();
      case "idle":
        return this.startLoad(id, entry);
    }
  }

  public getStatus(id: SpriteId): LoadStatus {
    return this.getEntry(id).status;
  }

  public getImage(id: SpriteId): TImage | null {
    const entry = this.getEntry(id);
    switch (entry.status) {
      case "ready":
        return entry.image;
      case "idle":
        void this.startLoad(id, entry);
        return null;
      case "loading":
      case "missing":
        return null;
    }
  }

  public loadedCount(): LoadedCount {
    let ready = 0;
    let missing = 0;

    for (const entry of this.entries.values()) {
      switch (entry.status) {
        case "ready":
          ready += 1;
          break;
        case "missing":
          missing += 1;
          break;
        case "idle":
        case "loading":
          break;
      }
    }

    return {
      ready,
      missing,
      total: SPRITE_IDS.length,
    };
  }

  private getEntry(id: SpriteId): LoaderEntry<TImage> {
    const entry = this.entries.get(id);
    if (entry !== undefined) {
      return entry;
    }

    const nextEntry = createIdleEntry<TImage>();
    this.entries.set(id, nextEntry);
    return nextEntry;
  }

  private startLoad(id: SpriteId, entry: LoaderEntry<TImage>): Promise<void> {
    entry.status = "loading";
    entry.image = null;

    const creation = this.tryCreateImage();
    switch (creation.kind) {
      case "created":
        return this.loadCreatedImage(id, entry, creation.image);
      case "missing":
        entry.status = "missing";
        return Promise.resolve();
    }
  }

  private tryCreateImage(): ImageCreation<TImage> {
    try {
      return {
        kind: "created",
        image: this.createImage(),
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          kind: "missing",
        };
      }
      return {
        kind: "missing",
      };
    }
  }

  private loadCreatedImage(
    id: SpriteId,
    entry: LoaderEntry<TImage>,
    image: TImage,
  ): Promise<void> {
    let resolveLoad: (() => void) | null = null;
    const promise = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });

    const settle = (status: "ready" | "missing"): void => {
      image.onload = null;
      image.onerror = null;
      entry.status = status;
      entry.image = status === "ready" ? image : null;
      entry.promise = null;
      resolveLoad?.();
    };

    entry.promise = promise;
    image.onload = () => settle("ready");
    image.onerror = () => settle("missing");

    try {
      image.src = SPRITE_MANIFEST[id].src;
    } catch (error) {
      if (error instanceof Error) {
        settle("missing");
        return promise;
      }
      settle("missing");
    }

    return promise;
  }
}

const browserSpriteLoader = new SpriteLoader<HTMLImageElement>(() => new Image());

export function preloadAll(): Promise<void> {
  return browserSpriteLoader.preloadAll();
}

export function getStatus(id: SpriteId): LoadStatus {
  return browserSpriteLoader.getStatus(id);
}

export function getImage(id: SpriteId): HTMLImageElement | null {
  return browserSpriteLoader.getImage(id);
}

export function loadedCount(): LoadedCount {
  return browserSpriteLoader.loadedCount();
}

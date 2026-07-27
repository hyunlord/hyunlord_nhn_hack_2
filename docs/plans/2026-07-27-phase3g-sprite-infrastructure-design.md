# Phase 3G-1 Sprite Rendering Infrastructure Design

## Intent

Add a sprite pipeline without shipping art or changing the simulation. Every
world drawable will attempt one cached sprite draw and retain its current
Canvas 2D primitive as the exact fallback. With every manifest file absent, the
rendered game must remain visually identical to commit `63ebb58`.

## Baseline

The implementation starts from clean `main` at
`63ebb58a41ac19d0a33a2ab1582fda0c15ac9bcc`.

- Organic determinism: defeat, tick 2344, tribute 85, halls `0/0/0`
- Full-state-machine determinism: victory, tick 1718, tribute 178, halls
  `0/234/900`
- Test suite: 197 passing

No balance, engine, progression, threat, build, divine, agent, or meta values
will change.

## Architecture

### Declarative manifest

`src/content/assetManifest.ts` owns the nineteen specified sprite IDs and their
source-frame geometry, fractional pivot, world render size, and tintability.
Source dimensions are intentionally independent from render dimensions.
Individual PNG paths live below `/assets`; no atlas or art files ship in this
slice.

### Loader lifecycle

`src/render/assets/spriteLoader.ts` owns a process-lifetime cache with
`idle/loading/ready/missing` states. A single `preloadAll()` call starts before
React mounts. Each ID has one shared in-flight promise, failures resolve as
`missing`, and synchronous render reads never start loads inside the animation
loop.

The loader is implemented as a small instance-backed service so Node tests can
provide a controlled image factory. The app-facing named exports delegate to
one browser singleton. A failed `Image` load is handled through `onerror`
without logging, because missing art is expected during this phase.

### Tint cache

`src/render/assets/spriteCache.ts` creates offscreen canvases lazily, keyed by
sprite ID and normalized color. It draws the source, applies the color with
`source-in`, then redraws source shading with `multiply`. This keeps transparent
edges and preserves flat pixel-art value variation. The insertion-ordered cache
is capped at 64 variants; the oldest entry is evicted when the cap is exceeded.

### Drawing contract

`src/render/assets/drawSprite.ts` is the only `drawImage` path. It returns
`false` unless a ready image can be drawn, allowing each caller to execute its
existing primitive code unchanged. It:

- calculates frame source rectangles;
- applies fractional pivots in world units;
- snaps destination coordinates to device pixels;
- supports scale, alpha, frame, tint, and horizontal flip;
- disables image smoothing only for the draw and restores canvas state.

The destination-rectangle calculation is exported as a pure helper for exact
pivot tests.

### World integration

The existing draw order stays:

`background -> halls -> towers -> agents -> heroes -> threats -> effects`

Each entity module extracts its existing body primitive into a focused helper,
tries `drawSprite`, and calls that helper when the result is `false`. HP bars,
labels, auras, damage outlines, range rings, rubble fades, and placement
previews retain their current ordering and primitive implementation.

`background_field` draws across the complete logical world only when available;
the current ground, grid, and vignette remain the fallback.

### Developer controls

`?sprites=off` is parsed once by the rendering settings module and makes
`drawSprite` return `false`. A development-only `Shift+D` overlay displays
ready, missing, and total counts plus missing IDs. Production builds omit the
overlay branch through `import.meta.env.DEV`.

`npm run assets:check` imports the TypeScript manifest, checks
`public/assets/<src>`, prints one copy-pasteable checkbox per entry, and exits
successfully while assets are intentionally absent.

### UI frame configuration

A new presentation-only content module maps each rarity to its existing border
and label colors plus a frame SpriteId and disabled-by-default sprite flag.
`DraftOverlay` reads only this module. The same module exposes the
`house_select_frame` configuration used by `HouseSelectScreen`. No CSS image
request is made while the flags are disabled, so today’s UI remains unchanged
and adding frames later is a configuration change.

## Verification

Node tests use image, canvas, and drawing-context fakes rather than a browser
dependency. They cover all requested loader, draw, pivot, tint-cache, manifest
size, determinism, and reducer-purity contracts. Final verification includes
typecheck, build, the full suite, both determinism lanes, the balance harness,
asset checklist, import-boundary grep, and real-browser checks for default
fallback rendering, `?sprites=off`, `Shift+D`, and console cleanliness.

# Phase 3G-1 Sprite Rendering Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a manifest-driven sprite pipeline whose absent-asset fallback is pixel-identical to the existing primitive renderer.

**Architecture:** A content-owned manifest feeds an instance-backed asynchronous loader, bounded tint cache, and single synchronous `drawSprite` entry point. Existing draw modules retain their primitive bodies and use the boolean sprite result as the fallback contract; development diagnostics and UI frame configuration remain presentation-only.

**Tech Stack:** TypeScript 7, React 19, Vite 8, Canvas 2D, Node test runner through `tsx --test`

---

### Task 1: Lock manifest geometry

**Files:**
- Create: `src/content/assetManifest.ts`
- Create: `tests/assetManifest.test.ts`

**Step 1: Write the failing test**

Assert all nineteen required IDs exist and assert hall, tower, dark mage,
creature, and agent render dimensions directly against `BALANCE_CONFIG` and
`TOWER_RADIUS`.

**Step 2: Run the focused test**

Run: `npx tsx --test tests/assetManifest.test.ts`

Expected: FAIL because `assetManifest.ts` does not exist.

**Step 3: Implement the manifest**

Declare readonly `SpriteSpec`, the exact `SpriteId` union, and a
`Readonly<Record<SpriteId, SpriteSpec>>`. Use individual paths below
`world/` and `ui/`, 128px source frames, centered token pivots, foot pivots for
heroes, and exact world render sizes.

**Step 4: Re-run the focused test**

Run: `npx tsx --test tests/assetManifest.test.ts`

Expected: PASS.

### Task 2: Build the failure-safe loader

**Files:**
- Create: `src/render/assets/spriteLoader.ts`
- Create: `tests/spriteLoader.test.ts`

**Step 1: Write loader tests**

Use a controllable fake image factory. Prove all-missing preloads resolve,
status becomes `missing`, reads never throw, and repeated reads while loading
create exactly one image.

**Step 2: Run the focused test**

Run: `npx tsx --test tests/spriteLoader.test.ts`

Expected: FAIL because the loader does not exist.

**Step 3: Implement the loader**

Create an instance-backed `SpriteLoader` with one status, image, and in-flight
record per ID. Export singleton wrappers for `preloadAll`, `getStatus`,
`getImage`, and `loadedCount`. Failed events resolve internally without logging
or rejection.

**Step 4: Re-run the focused test**

Run: `npx tsx --test tests/spriteLoader.test.ts`

Expected: PASS.

### Task 3: Build the bounded tint cache

**Files:**
- Create: `src/render/assets/spriteCache.ts`
- Create: `tests/spriteCache.test.ts`

**Step 1: Write the failing cache test**

Provide a fake canvas factory and verify a repeated `(SpriteId, color)` request
returns the same canvas instance. Verify the composite sequence contains
`source-in` followed by `multiply`.

**Step 2: Run the focused test**

Run: `npx tsx --test tests/spriteCache.test.ts`

Expected: FAIL because the cache does not exist.

**Step 3: Implement the cache**

Create a 64-entry insertion-ordered `SpriteTintCache`, normalize color keys,
draw only the selected frame, and evict the oldest key on overflow. Export one
browser singleton accessor.

**Step 4: Re-run the focused test**

Run: `npx tsx --test tests/spriteCache.test.ts`

Expected: PASS.

### Task 4: Add the single sprite draw path

**Files:**
- Create: `src/render/assets/drawSprite.ts`
- Create: `src/render/assets/spriteSettings.ts`
- Create: `tests/drawSprite.test.ts`

**Step 1: Write draw tests**

Prove a missing image returns false with zero draw calls. Prove destination
geometry for pivotY `1.0` and `0.5`, device-pixel snapping, and canvas-state
restoration.

**Step 2: Run the focused test**

Run: `npx tsx --test tests/drawSprite.test.ts`

Expected: FAIL because the draw module does not exist.

**Step 3: Implement geometry and drawing**

Export a pure destination-rectangle calculator and synchronous `drawSprite`.
Clamp/wrap frames, apply scale/alpha/flip, select a tint canvas only for
tintable specs, disable smoothing around the call, and return true only after
`drawImage`.

**Step 4: Re-run the focused test**

Run: `npx tsx --test tests/drawSprite.test.ts`

Expected: PASS.

### Task 5: Convert the world renderer

**Files:**
- Modify: `src/render/drawHalls.ts`
- Modify: `src/render/drawTowers.ts`
- Modify: `src/render/drawThreats.ts`
- Modify: `src/render/drawAgents.ts`
- Modify: `src/render/drawHeroes.ts`
- Modify: `src/render/drawBackground.ts`
- Verify: `src/render/GameCanvas.tsx`

**Step 1: Extract primitive body helpers**

Move, without changing statements or constants, only the primitive body of each
drawable into a local helper.

**Step 2: Add sprite-first calls**

Use exact IDs, house tint where applicable, and destroyed/rubble IDs. Keep HP
bars, labels, rings, flashes, ranges, previews, and effect ordering outside the
fallback block.

**Step 3: Run the existing suite**

Run: `npm test`

Expected: all previous tests plus new sprite tests PASS.

**Step 4: Run determinism**

Run: `npm run check:determinism`

Expected: organic `2344/85/0-0-0`; full-state `1718/178/0-234-900`.

### Task 6: Add startup loading and developer diagnostics

**Files:**
- Modify: `src/main.tsx`
- Create: `src/ui/components/SpriteDebugOverlay.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Step 1: Start one preload**

Call `preloadAll()` once before React mounting without awaiting or logging
missing failures.

**Step 2: Add the development-only overlay**

Mount only behind `import.meta.env.DEV`, toggle with Shift+D, and show counts
plus sorted missing IDs. Preserve existing design tokens and borders-only
surface rules.

**Step 3: Verify production removal**

Run: `npm run build`

Expected: PASS and no runtime overlay in the production bundle path.

### Task 7: Centralize UI frame configuration

**Files:**
- Create: `src/content/framePresentation.ts`
- Modify: `src/content/cardConfig.ts`
- Modify: `src/ui/components/DraftOverlay.tsx`
- Modify: `src/ui/screens/HouseSelectScreen.tsx`

**Step 1: Add configuration tests**

Assert every rarity has its existing border color, label color, correct frame
ID, and a disabled sprite flag; assert house selection points to
`house_select_frame`.

**Step 2: Implement the mappings**

Move presentation colors out of `cardConfig.ts`. Make both components consume
only `framePresentation.ts`, expose frame identity as a data attribute, and
avoid requesting a CSS image while the flag is false.

**Step 3: Run tests and typecheck**

Run: `npm test && npm run typecheck`

Expected: PASS.

### Task 8: Add the asset work-queue command

**Files:**
- Create: `scripts/checkAssets.ts`
- Modify: `package.json`

**Step 1: Implement the checker**

Resolve each manifest entry beneath `public/assets`, print a stable checkbox
line with ID and relative path, summarize present/missing/total, and keep exit
zero while assets are absent.

**Step 2: Run the checker**

Run: `npm run assets:check`

Expected: nineteen unchecked entries and `0 ready, 19 missing, 19 total`.

### Task 9: Document decisions and close automated gates

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/DEV_LOG.md`

**Step 1: Document the pipeline**

Record startup loading, boolean fallback, pivot convention, multiply tint,
64-entry cache, retained primitives, developer controls, and no DGX offload.

**Step 2: Run all required gates**

Run:

```sh
npm run typecheck
npm run build
npm test
npm run check:determinism
npm run balance
npm run assets:check
grep -rn "from ['\"].*render" src/agents src/divine src/threat src/progression src/build src/meta src/engine
```

Expected: all commands exit zero, the boundary grep prints nothing, and
determinism matches the baseline exactly.

### Task 10: Browser QA, integration, and remote proof

**Files:**
- Verify only

**Step 1: Run real-browser QA**

Use the development server to verify default fallback visuals, Shift+D,
`?sprites=off`, desktop/tablet/mobile layouts, and zero console warnings or
errors under StrictMode.

**Step 2: Review the complete diff**

Confirm no balance or simulation files changed and every requirement has direct
evidence.

**Step 3: Integrate to main**

Merge the verified feature branch into local `main`.

**Step 4: Run mandatory push preflight**

Run:

```sh
git remote -v
git branch --show-current
```

Expected: origin is `https://github.com/hyunlord/hyunlord_nhn_hack_2.git` and
branch is `main`.

**Step 5: Push and prove remote landing**

Push `main`, run `git ls-remote origin refs/heads/main`, and confirm remote SHA
equals local SHA.

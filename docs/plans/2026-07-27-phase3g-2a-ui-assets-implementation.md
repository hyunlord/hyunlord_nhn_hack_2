# Phase 3G-2a UI Assets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate, post-process, verify, document, and deliver eight coherent pixel-art UI assets without modifying `src/`.

**Architecture:** ComfyUI on DGX Spark owns SDXL inference and candidate storage. Deterministic DGX post-processing enforces target sizes, alpha masks, the shared card interior, 9-slice geometry, palette limits, and nearest-neighbour pixel grids; the repository receives only selected PNGs, documentation, and a dependency-free TypeScript checker.

**Tech Stack:** ComfyUI, SDXL 1.0, Pixel Art XL LoRA, IPAdapter Plus, Python/Pillow already available on DGX, TypeScript and Node built-ins in the repository.

---

### Task 1: Inspect and prepare the DGX workflow

**Files:**
- Create on DGX only: candidate prompts, workflow JSON, and post-processing helpers

1. Confirm the configured checkpoint, LoRA, IPAdapter, CLIP Vision model, GPU,
   and ComfyUI Python environment.
2. Start the existing ComfyUI installation if it is not already running.
3. Query object metadata and build an API workflow using only installed nodes.
4. Keep every candidate and intermediate outside the repository on DGX.

### Task 2: Generate and select candidates

**Files:**
- Create on DGX only: at least three candidates per requested asset

1. Generate the common card family source with a fixed seed and flat chroma
   interior.
2. Generate rare and legendary variants from the same base prompt and seed,
   referencing the common source through IPAdapter Plus.
3. Generate multiple candidates for the house frame, panel, battlefield,
   draft backdrop, and gauge.
4. Reject candidates with mismatched silhouettes, noisy focal geometry,
   unreadable tier ornament, chroma contamination, or edge seams.

### Task 3: Post-process selected assets

**Files:**
- Create: `public/assets/ui/card_frame_common.png`
- Create: `public/assets/ui/card_frame_rare.png`
- Create: `public/assets/ui/card_frame_legendary.png`
- Create: `public/assets/ui/house_select_frame.png`
- Create: `public/assets/ui/panel_frame.png`
- Create: `public/assets/ui/background_field.png`
- Create: `public/assets/ui/draft_backdrop.png`
- Create: `public/assets/ui/gauge_frame.png`

1. Downscale through a deliberately coarse pixel grid using nearest-neighbour.
2. Enforce exact target dimensions.
3. Build alpha masks and remove chroma fringe.
4. Force the card interior to the identical `(40, 56)-(471, 711)` rectangle.
5. Quantise RGB while retaining alpha and copy only final PNGs into the repo.

### Task 4: Add verification and documentation

**Files:**
- Create: `scripts/checkUiAssets.ts`
- Preserve: `scripts/checkAssets.ts` from `origin/main`
- Create: `public/assets/ui/panel_frame_slices.md`
- Create: `docs/assets/contact_sheet.png`
- Modify: `docs/DEV_LOG.md`

1. Preserve the remote sprite-manifest checker without local edits. Implement
   dependency-free UI PNG parsing for dimensions, decompressed alpha,
   coverage, and transparent interior bounds.
2. Run the checker and require all dimensions and shared card bounds to pass.
3. Document 64-pixel 9-slice insets and create the eight-asset contact sheet.
4. Record DGX models, LoRA, IPAdapter use, alpha method, candidate counts, and
   selection criteria.

### Task 5: Verify and deliver

**Files:**
- Verify all paths above; do not modify `src/`

1. Inspect every final image and the contact sheet.
2. Run the checker, `git diff --check`,
   `git diff --name-only origin/main -- src/`, `npm run typecheck`,
   `npm run build`, and `npm test`.
3. Run the TypeScript no-excuse audit and pure-LOC measurement for the checker.
4. Review the complete diff and stage only this slice.
5. Commit with Lore trailers.
6. Run `git remote -v` and `git branch --show-current`; require the expected
   repository and `main`.
7. Push without force, compare local SHA with `git ls-remote`, and report the
   GitHub commit URL.

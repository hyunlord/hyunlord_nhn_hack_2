# Phase 4A Game Framing Implementation Plan

**Goal:** Make 영광의 밤 a Korean-first full-screen game without weakening
determinism or protected balance.

**Architecture:** Presentation preferences remain outside GameState. Locale
keys project stable domain IDs into Korean/English. The run becomes a layered
viewport. Render-only lighting derives from phase/tick. Daylight raids cross
explicit seeded engine state.

## 1. Flow and preferences

Red-test and implement title as initial phase, settings return paths, versioned
settings persistence, speed, shake, disabled volume, and meta-only reset.

## 2. Locale boundary

Create matching ko/en dictionaries and a locale context. Red-test exact key
parity, Korean default, interpolation, persistence fallback, and representative
terminology. Replace every player-facing literal in UI and display projections.

## 3. Title and settings

Create title/settings screens, non-zero-only stats, title actions, settings
controls, reset confirmation, and the in-run settings overlay.

## 4. Layered run viewport and intermission

Red-test semantic/layout contracts. Convert RunScreen, HUD, abilities, feed,
shop, draft, and CSS into an 8:5 letterboxed viewport with four HUD anchors.
Keep the daylit battlefield under a grouped settlement shop and preserve clear
tower placement plus an isolated next-night action.

## 5. Tick-driven lighting

Red-test a 30-tick interpolation helper and raid-day override. Apply it through
GameCanvas, background luminance/tint/vignette, and agent outline contrast.

## 6. Deterministic daylight raid

Red-test first-wave exclusion, the 15-percent seeded roll, 70-percent floored
count, 1.4-times damage, 1.5-times reward, summary recording, and replay.
Implement explicit pending/active/recorded raid state only.

## 7. Verify and deliver

On DGX run typecheck, full tests, build, determinism, balance, asset checks,
locale boundary checks, and browser QA at 375/768/1280. Confirm protected
balance definitions did not change. Verify origin/branch, create a Lore commit,
push main, and prove remote SHA equals local SHA.

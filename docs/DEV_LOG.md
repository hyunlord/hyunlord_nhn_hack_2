# Development Log

## 2026-07-27 — Scaffolding pass

- Initialized a static Vite + React + TypeScript project.
- Added every requested system, state, render, UI, content, asset, API, and
  documentation path.
- Kept all game-system functions as empty or hardcoded compiling stubs.
- Added only a canvas clear-frame lifecycle and labeled React placeholders.
- Centralized `HouseId` in `content` to uphold the three-axis import boundary.
- No work was offloaded to DGX Spark because this pass required no heavy
  compute, dependency installation, test workload, or asset generation.

## 2026-07-27 — Phase 2A living world

- Added a seeded Mulberry32 RNG and deterministic world initializer.
- Created Ashvale, Thornhold, and Greymoor with 20 stable-ID agents each.
- Added immutable wandering, probabilistic turns, wall reflection, and a
  fixed-rate 20 Hz simulation loop capped at five catch-up ticks per frame.
- Rendered the 960 by 600 world with a cheap grid/vignette and house-colored
  agents, including device-pixel-ratio canvas scaling.
- Replaced the HUD placeholder with tick and per-house living counts.
- Added Node/TypeScript unit tests plus a required 500-tick determinism check.
- Left divine, threat, narrative, ending, miracle, disposition, and asset
  systems untouched.
- No work was offloaded to DGX Spark because the deterministic simulation,
  build, and browser checks are lightweight local workloads.

## 2026-07-27 — Phase 2B divine intervention

- Added exact metadata and pure structural-snapshot resolution for lightning,
  blessing, and curse without cross-axis imports or new RNG consumption.
- Added divine power, cooldowns, effect lifetime, damage feedback, immutable
  damage/heal application, death, and clamped house-power changes.
- Added UI-only miracle selection, scaled canvas click casting, accessible
  cooldown-aware controls, divine-power meter, and house-power HUD values.
- Added expanding effect rings/discs, recent-damage outlines, and visible
  fallen-agent markers using cheap Canvas 2D primitives.
- Extended the Node test suite for falloff, dead-target exclusion, deterministic
  dominance, purity, cast rejection, immutability, power clamping, regen,
  cooldown decay, and effect expiry.
- No work was offloaded to DGX Spark because unit, build, and browser workloads
  remained lightweight locally.

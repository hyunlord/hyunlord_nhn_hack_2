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

## 2026-07-27 — Phase 2C invasion and betrayal

- Added a deterministic dark-mage invasion with 24 bounded, stable-ID
  creatures, seeded traitor assignment, nearest-target movement, attack
  cadence, damage aggregation, deaths, and first-blood phase handoff.
- Added structural cross-axis contracts so agent disposition and narrative
  threats remain independent while engine-owned orchestration resolves
  movement, helping, and simultaneous two-way combat.
- Added visible fighting, fleeing, helping, recent-damage, creature, mage, HP,
  phase, and combat status rendering without revealing the traitor in text.
- Removed the React development `StrictMode` wrapper after browser QA proved
  its double reducer invocation consumed the stateful RNG twice; development,
  tests, and production now follow the same seeded timeline.
- Preserved the existing miracle costs and agent/house-only effects throughout
  invasion and observation.
- Extended tests for spawn bounds and IDs, order-independent betrayal, pure
  threat stepping, targeting ties, attack cadence, traitor decisions, RNG-free
  directed movement, phase transitions, combat, miracle availability, and a
  1,400-tick full-state deterministic replay.
- No work was offloaded to DGX Spark because the implementation, test, build,
  and browser-playthrough workloads remained lightweight locally.

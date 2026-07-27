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

## 2026-07-27 — Phase 3A wave structure, halls, and run state

- Restored React `StrictMode` after replacing the RNG-consuming reducer with a
  pure committed-state reducer; all random work now happens in provider-side
  event handlers or the fixed tick loop.
- Renamed the narrative enemy module to `threat/`, removed four-branch ending
  state, retained dormant deterministic traitor assignment, and split threat
  motion/spawning into focused pure modules.
- Added three data-driven waves, unique run-wide creature IDs, optional mage
  spawning, HP/damage scaling, hall targeting, per-kill tribute, and clear
  rewards.
- Added one 500-HP hall per house, hall damage and rubble rendering, exact
  defeat-before-clear priority, preparation/intermission/victory/defeat flow,
  deterministic restart seeds, and temporary intermission healing.
- Replaced legacy phase placeholders with a compact wave HUD plus intermission,
  victory, and defeat overlays. Miracles are disabled while the world is
  frozen.
- Extended tests for reducer purity, wave scaling and IDs, hall targeting,
  every state transition, frozen phases, defeat ties, and configurable run
  length. Extended deterministic verification through all three waves.
- Kept carried-over agent disposition, directed movement, combat cadence, and
  miracle effects unchanged. The baseline no-input run remains too difficult
  and loses during wave 1; browser QA reached defeat at tick 2,191 with 39
  agents alive, four tribute, and 12 of 14 creatures remaining. A later
  balancing pass should address it explicitly.
- A completion audit sampled 200 consecutive deterministic seeds: none reached
  wave 2, while the strongest run killed 11 creatures before defeat. Fresh
  StrictMode browser QA measured exactly 40 ticks over two seconds, captured no
  console warnings or errors, and reconfirmed visible hall rubble, terminal
  controls, and full restart reset. Tests now exercise a creature's complete
  hall-approach path and the first configured HP multiplier directly.
- No work was offloaded to DGX Spark because implementation, tests, build, and
  browser QA were lightweight local workloads.

## 2026-07-27 — Phase 3A-fix defensive behavior and balance

- Replaced the personal aggression lottery with deterministic, ordered
  behavior: broken-agent retreat, dormant betrayal, nearby engagement, own-hall
  defense, cross-house rally, and home-leash return.
- Carried stable threat IDs through intent and attack resolution so defenders
  focus the attacker nearest their hall with ascending-ID ties.
- Added rally-directed fleeing without RNG, living-hall context construction,
  and a helping state for agents reinforcing another house after their own hall
  is destroyed.
- Split the oversized wave test module into spawning and threat-behavior seams,
  then added pure threshold/order/movement tests plus engine-level rally wiring
  coverage.
- Added `npm run balance -- [runs]`, a no-miracle headless harness with automatic
  intermissions, crash-only non-zero exits, terminal outcome distribution,
  conditional per-wave medians, and terminal run-length metrics.
- The exact requested baseline produced 0/200 victories. The only subsequent
  retune was `AGENT_ATTACK_DAMAGE: 9 -> 20`; all other requested starting
  values remained unchanged.
- Final 200-seed results: 69 victory (34.5%), 131 wave-3 defeat (65.5%), zero
  wave-1 or wave-2 defeats; median terminal tick 2,603. Wave clear medians were
  213.5, 414.5, and 1,456 ticks, with wave 3 cleared in 69 runs.
- The default organic seed now wins at tick 2,826 with hall HP `900/0/0`.
  Determinism verification accepts either terminal outcome and still forces
  complete configurable state-machine coverage when organic combat does not.
- StrictMode browser play cleared waves 1 and 2, showed defenders visibly
  clustering around surviving halls during wave 3, and reached victory with
  Ashvale at 900 HP and 15 living agents. The displayed tick was 3,910 because
  the UI deliberately continued effect-only ticks while waiting at both manual
  intermission buttons. The destroyed houses had no surviving agents in this
  natural run, so cross-house movement was verified at the engine integration
  seam rather than claimed as a visual observation. Console warnings/errors
  remained empty throughout.
- No work was offloaded to DGX Spark because 200 complete local simulations,
  tests, build, and browser QA remained lightweight.

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
  natural run. A second browser run used deterministic seed
  `DEFAULT_SEED + 35`, selected from a 200-seed read-only scan: after
  Thornhold's hall fell, its sole blue survivor remained visibly outlined as
  helping in the Greymoor defense, while a 32-HP timid Greymoor agent was in
  the semi-transparent fleeing state at the surviving hall. Console
  warnings/errors remained empty throughout both runs.
- No work was offloaded to DGX Spark because 200 complete local simulations,
  tests, build, and browser QA remained lightweight.

## 2026-07-27 — Phase 3B level-up card drafts

- Added progression as the sixth simulation axis: exact contribution XP,
  cumulative five-level thresholds, deterministic house-weighted 1-of-3
  offers, 14 bounded cards, multiplicative/flat modifier resolution, and
  automatic per-level damage/HP growth.
- Added immutable FIFO draft state with explicit return-phase storage,
  same-reference rejection for invalid choices, immediate max-HP healing,
  cached per-house modifiers, and effect-only draft ticks.
- Split agent attack resolution out of the oversized invasion module. Attacks
  now resolve in stable agent order and attribute actual damage plus the exact
  killing blow to the attacking house.
- Applied cards to attack damage/cadence, movement, threat sense, break ratio,
  hall defense, max HP, intermission healing, tribute, divine regeneration,
  miracle cost/radius/healing, and affordability display.
- Added a house-colored, keyboard-accessible draft overlay with responsive
  three-column desktop/tablet and single-column mobile layouts. HUD rows now
  expose level, cumulative XP, and progress to the next threshold.
- Extended deterministic and balance automation with first-card autopick and a
  separate seeded random-pick stream. The harness reports drafts/run, final
  level/house, and most-picked cards.
- An initial 20-seed smoke run produced 90% victories. Per the card-power
  constraint, wave 2 HP scaling changed from 1.15 to 1.30 and wave 3 from 1.30
  to 1.60; no card was weakened.
- Final 200-seed first-pick results: 104 victories (52.0%), 96 wave-3 defeats,
  6.33 drafts/run, and 3.11 average final level/house. Random-pick results:
  104 victories (52.0%), 6.24 drafts/run, 3.08 average final level/house, and
  `divine_open_channel` most picked at 112 selections.
- Browser play reached organic Greymoor, Thornhold, and Ashvale drafts; number
  key selection worked, the HUD filled, the world remained visibly dimmed,
  and computed layouts were three columns at 768/1280 and one scrollable column
  at 375. Browser logs contained no warnings or errors.
- No work was offloaded to DGX Spark because implementation, 400 complete
  simulations, tests, build, and responsive browser QA remained lightweight
  locally.

## 2026-07-27 — Phase 3C heroes, tribute shop, and towers

- Added Sera of Greymoor, Bren of Thornhold, and Ivy of Ashvale as deterministic
  named agents with exact hero stats, six hero-specific draft cards, 600-tick
  respawns, Ivy's aura, and Green Mercy killing-blow healing.
- Added the independent `build/` leaf with six shop entries, pure tower
  placement validation, exact tower range/cadence/damage/durability, and no
  imports from the agent, divine, threat, or progression axes.
- Added immutable intermission purchasing for recruitment, medicine, tower
  placement, sharpening, hall repair, and immediate hero return. Invalid,
  unavailable, out-of-phase, or unaffordable requests preserve the exact state
  reference and never deduct tribute.
- Integrated tower targeting after agent attacks, creature attacks against
  towers, hero/tower rendering, wave summaries, purchase counts, and a
  responsive six-card shop. Tower placement is transient, uses a visible
  valid/invalid preview, and cancels with Escape or right-click.
- Removed automatic intermission healing. The Part 0 reinforcement/edge pass
  reduced level-1 hall loss from 25/180 houses (13.9%) and 19/60 affected runs
  (31.7%) to 6/180 houses (3.3%) and 6/60 affected runs (10.0%). The house-level
  target passed; the affected-run checkpoint missed its strict threshold and
  was carried honestly into the full-system tune.
- Final wave pressure uses counts `20/34/64` and HP multipliers `1.8/2.5/4.0`.
  The final 200-seed auto-shop run produced 81 victories (40.5%), 1 wave-2
  defeat, and 118 wave-3 defeats. No house ended at level 1. Runs averaged
  1.05 towers, 234.12 unspent tribute, and 4.95 hero deaths. Wave clear rates
  were 100.0%, 99.5%, and 40.7%.
- The matching `--shop=none` counterfactual produced 26 victories (13.0%), 9
  wave-2 defeats, and 165 wave-3 defeats. No house ended at level 1. Runs
  averaged 0 towers, 384.36 unspent tribute, and 5.23 hero deaths. Wave clear
  rates were 100.0%, 95.5%, and 13.6%. The identical seed range and pick policy
  isolate the material benefit of intermission spending.
- StrictMode browser QA reached the first organic intermission with 100
  tribute, verified six item cards and disabled reasons, cancelled placement,
  then committed a valid tower. Tribute changed to 30 and the tower purchase
  count to one before wave 2 began. Desktop, tablet, and full-flow mobile
  layouts were captured; the mobile Begin Wave action remained reachable.
  The placed tower, heroes, HP bars, and Ivy aura were visible in wave 2.
  Browser warnings/errors remained empty.
- No work was offloaded to DGX Spark because the deterministic simulation,
  tests, build, and responsive browser QA remained lightweight locally.

## 2026-07-27 — Phase 3D houses, synergies, and Legacy

- Removed destroyed towers from live placement/combat state in ascending ID
  order and added deterministic 80-tick rubble records. Destroyed structures
  now free both their capacity slot and former ground.
- Replaced the one-pass auto-shop with a deterministic tower-weighted
  round-robin cycle and per-category failure diagnostics. The 200-seed default
  run recorded zero placement failures; affordability, not geometry, was the
  remaining limiter.
- Expanded the roster to six houses with ordered three-house deployment,
  selected-only heroes, exact base traits, four pair synergies, and two
  terminally discoverable hidden combinations.
- Added seeded wave-three betrayal for eligible alliances, unnamed in-run
  presentation, stable terminal summaries, and hero-less wave-two tracking.
- Added versioned local Legacy persistence, exact reward itemization, six
  achievements, three purchasable house unlocks, free Stonewake betrayal
  unlock, duplicate-run protection, retry, and summary flows.
- Replaced the terminal canvas overlay with responsive Legacy, selection, run,
  and summary screens. Selection previews public and discovered synergies;
  persistent state stays outside the replayable simulation.
- Extended the balance CLI with fixed ordered `--houses=a,b,c` and
  deterministic `--houses=random` coverage of all 20 trios, per-trio victory
  rates, median Legacy, and over-70% flags.
- Retuned tower price growth from 1.40 to 1.15 and wave-three HP scaling from
  4.0 to 5.0. The authoritative 200-seed default run produced 77 victories
  (38.5%), 2.04 towers per run, and 22 median tribute after the final shop.
  The 400-seed all-trio run flagged no combination above 70%; `abc` and `abe`
  tied for strongest at 45.0% in their 20-seed slices.
- A completion audit added the explicit `legacyForRun` numeric API, shared
  mechanical trait summaries on both Legacy and selection screens, exact
  destroyed-tower-ground replacement coverage, negative achievement
  boundaries, and same-seed full-state betrayal verification.
- All 134 tests, both determinism lanes, TypeScript, the production build, and
  the no-excuse static rules passed. Production browser QA completed two
  victories, preserved 289 Legacy across reload, reached 502 earned Legacy,
  purchased Duskmere for 300, previewed Wildfire Charge, and started a run
  with Duskmere selected. Responsive 375/768/1280 checks had no horizontal
  overflow, and browser warnings/errors remained empty.
- No work was offloaded to DGX Spark because Phase 3D required no heavy compute
  or generated assets. The planned 3E sprite pass can replace draw helpers
  without changing simulation state.

## 2026-07-27 — Phase 3E rarity, active skills, and hero levels

- Added weighted common, rare, and legendary draft tiers with downward-only
  fallback, one-pass offer variety, the retained house-card guarantee, and
  centralized placeholder colours. The pool now contains 30 cards, including
  six run-defining legendary effects and four one-stack skill grants.
- Kept Sharpened Edge's existing `+12%` effect and classified it rare rather
  than retuning it to fit the new common ceiling.
- Added Meteor Fall, Sanctuary, Chains of Dusk, and Resurgence as earned divine
  skills. Pure divine resolution remains separated from engine application;
  cooldowns, power spending, creature rooting, tower damage, break immunity,
  deterministic revival, acquisition-order hotkeys, and new-skill feedback
  are explicit run/UI state.
- Added personal hero XP and five levels. Hero damage compounds by `1.08`, max
  HP gains 30 per level, and respawn duration compounds by `0.92`; level-ups
  update HUD/canvas feedback without pausing or opening a draft.
- Extended the deterministic harness with offered/picked rarity distribution,
  per-skill acquisition rates, final hero levels, and skill casts under a
  largest-enemy-cluster auto strategy. Results are observations only; no wave,
  creature, base shop, house-trait, or existing-card balance value was tuned.
- The required 200-seed first-pick observation completed with 88 victories
  (44.0%), 3.30 average final hero level, and 0.34 skill casts/run. Offered
  cards were 51.2% common, 37.4% rare, and 11.4% legendary after eligibility,
  fallback, variety, and house-guarantee rules; picked cards were 9.8%, 78.0%,
  and 12.2%. Acquisition rates were Meteor 1.5%, Sanctuary 3.5%, Chains 2.0%,
  and Resurgence 0.5%. These values were recorded without correction.
- No work was offloaded to DGX Spark because implementation, tests, local
  simulation, and browser validation remained within local resource limits.

## 2026-07-27 — Phase 3F rarity and investments

- Reworked the card pool into a 38-card 14/14/10 layout after the explicit
  keep/reclass/add list beat the approximate 36-card headline. Five
  unconditional cards moved down from rare to common, the common/rare/
  legendary stack caps stay 3/2/1, and common rolls still never climb upward.
- Added the new common floor cards plus Zealot's Bargain and Hollow Crown,
  then attached the visible tradeoffs to Ash Crown, Deeproot, Twin Souls,
  Meteor Fall, and Resurgence. Hollow Crown is the wrong-build trap: it
  doubles divine regen but disables the owning house hero's respawn.
- Added `investmentConfig.ts`, `meta/investments.ts`, `MetaState` v2
  migration, and the plain starting-bundle handoff so investment ranks never
  enter `GameState` or the deterministic engine snapshot. The eleven
  global/house tracks sum to 7261 Legacy for full global maxing.
- Reworked the balance harness around neutral sampling and the dedicated
  choice RNG. `first` remains as a rarity-biased legacy mode, the report now
  shows offered/picked rarity side by side, and the final 200-run default
  sample landed at 51.6% common offers / 50.0% common picks, 37.5% rare offers
  / 38.6% rare picks, 10.9% legendary offers / 11.4% legendary picks, 137.49
  Legacy per run, and 53 observed runs to max globals. Those values remain
  observations only, not tuning targets.
- Expanded the meta screen into a scoped ledger with global tracks, house
  tracks, rank pips, next-cost labels, disabled reasons, and active-bonus
  summaries.
- Added a run-visible `Legacy rites` HUD summary after browser QA showed that
  purchased bonuses applied mechanically but were not visible in the next
  run. Track-specific purchase labels and narrow hero-row wrapping keep the
  ledger and HUD accessible.
- Split global starting effects into per-house and shared run modifiers after
  final review caught Divine Grace multiplying once per selected house.
  Rank one now resolves to exactly 1.08 and rank four to 1.36048896, while
  Vigor still grants +10 max HP to every selected house.
- Kept the renderer on primitive canvas draws. There is still no asset
  loader/cache/atlas or `drawImage` path, and `public/assets` only contains
  placeholder directories, so any sprite pass needs a separate preload/draw-
  module slice.
- Balance tuning was not done in this slice. DGX/heavy compute stayed unused
  because the local tests and harness were enough for the verification needed
  here.
- Final verification passed 197/197 tests, TypeScript, the production build,
  both determinism lanes, the meta-boundary grep, and diff hygiene. Browser QA
  completed two runs, spent 120 of 165 Legacy on Vigor rank one, and confirmed
  `Legacy rites · Vigor of the Faithful · Rank 1 · +10 max HP per rank` on
  the following run with no fresh-session warning/error logs. The browser
  surface was fixed at 1280px; 375px and 768px rules were reviewed but could
  not be freshly captured because alternate viewport emulation was blocked by
  browser security policy.

## 2026-07-27 — Phase 3G-1 sprite infrastructure

- Added the sprite-backed living-world pipeline across the manifest, loader,
  tint cache, single `drawSprite` entry point, dev overlay, and frame
  presentation module. The loader now tracks `idle`, `loading`, `ready`, and
  `missing` states; the draw path stays boolean-first and falls back to the
  existing primitive renderers when art is absent or sprites are disabled.
- Kept the current UI frame visuals intact by leaving the frame sprite flags
  disabled. House selection and rarity cards still present the existing
  border-and-label treatment, and the borders-only rule remains unchanged.
- The asset checklist is still intentionally incomplete: `npm run assets:check`
  reports `0 ready, 19 missing, 19 total` for the 19 manifest entries. The
  current test suite reports `231` passing tests.
- Determinism stayed exact before and after the sprite slice: organic defeat at
  tick 2344 with tribute `85` and halls `0/0/0`; full victory at tick 1718
  with tribute `178` and halls `0/234/900`.
- The boundary check stayed clean, no DGX offload was needed because this slice
  had no generation or heavy compute, and asset generation is next.
- Automated gates passed during the implementation slices, but final browser QA
  and push have not been run yet.

## 2026-07-28 — Phase 3G-2a UI and frame assets

- Offloaded every generative pass to the existing ComfyUI installation on DGX
  Spark (`aitopatom-d6bb`). The workflow used SDXL 1.0
  (`sd_xl_base_1.0.safetensors`) with Pixel Art XL
  (`pixel-art-xl.safetensors`) at 0.82 model/CLIP strength.
- Common, rare, and legendary shared the same base prompt and family seed
  `731946`. Rare and legendary additionally used IPAdapter Plus
  (`ip-adapter-plus_sdxl_vit-h.safetensors`) with
  `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`, referencing the selected
  common frame at 0.48 style-and-composition weight.
- Generated three candidates for each of the eight assets, 24 candidates in
  total. Rejected card candidates nested extra cards, drifted from the shared
  silhouette, added unreadable pseudo-text, or overused purple. Rejected house
  and panel candidates were sprite sheets rather than single frames. Rejected
  battlefields painted walls or too many well-like focal objects; rejected
  draft and gauge candidates were too dense or contained multiple stacked
  panels. All rejected candidates remain under DGX
  `ComfyUI/output/phase3g2a/`.
- A learned Pixelization-node batch was abandoned after it saturated the DGX
  CPU and the host temporarily dropped off Tailscale. Final candidates instead
  followed the required large-generation path and were snapped to a coarse
  pixel grid, then resized with nearest-neighbour only. The DGX post-process
  palette-quantised each final while retaining RGBA output.
- The prompts requested a flat magenta interior, but SDXL introduced colour
  drift and nested decorations in some candidates. Chroma-only keying was
  therefore rejected. The final alpha method uses an exact programmatic
  geometry mask on DGX: the requested interior and exterior regions are forced
  to hard alpha zero after pixel-grid conversion, with the border forced
  opaque. This removes chroma fringe entirely; the three cards share the exact
  `(x=40, y=56, width=432, height=656)` transparent rectangle and contain zero
  partial-alpha pixels.
- `panel_frame.png` uses fixed 64-pixel corners and a repeated 16-pixel source
  segment across every edge, so the 384-pixel edge spans tile evenly.
  `draft_backdrop.png` is the intentional exception to hard alpha: its
  programmatic vignette ranges from alpha 128 at the centre to 191 at the
  corners.

## 2026-07-28 — Phase 3I unit classes and dynamic population

- Added Warrior, Spearman, Archer, and Skirmisher as data-owned regular-unit
  classes. Starting armies and recruits use deterministic largest-remainder
  roster allocation for all six houses.
- Added per-wave hall production with level-scaled growth and caps. Destroyed
  halls produce zero, recruitment never heals wounded agents, and both HUD and
  terminal summary expose the recorded army arc.
- Added deterministic preferred-range advance/retreat/hold behavior and
  four-tick ranged attack traces. Rendering now uses class sprite IDs first and
  distinct circle, diamond, triangle, and dot fallbacks.
- Added four rare class-scoped cards and changed only structural wave counts to
  36, 60, and 112. Existing prices, traits, rarity weights, and non-structural
  balance multipliers were left unchanged.
- Activated the Phase 3G-2a house/card frames, panel nine-slice, draft
  backdrop, divine gauge, and world background. The manifest now covers 23
  assets, including four optional class sprites.
- Added focused tests for class stats, allocations, recruitment, caps,
  destroyed halls, wounded-unit preservation, class cards, range bands,
  zero-RNG movement, ranged traces, frame scaling, and population history.
- DGX Spark was not used because this slice required no model generation or
  heavy compute.
- The contact-sheet review kept the cards as one escalating family: restrained
  brown wood, teal-gray tarnished metal, then gilding with explicit sun, eye,
  and moon glyphs. It also caused a second pass that removed white spill from
  the neutral house banner and raised the battlefield from nearly black to a
  still-flat, low-contrast ground texture.
- The final 200-seed `abc` balance observation produced 181 victories and 19
  wave-three defeats: a 90.5% victory rate, median terminal tick 3035.5,
  median 30.5 surviving agents, and median 1800 combined hall HP. This is
  explicitly flagged `OVER 70%`; no additional tuning was made because this
  slice limits structural balance changes to the requested 36/60/112 wave
  counts.
- Isolated performance runs stayed below the 35 ms tick ceiling. Across the
  `abc`, `bde`, and `adf` trios the overall average was 1.674 ms, worst tick
  6.594 ms, and peak entity count 294. Their population arcs also remained
  distinct: `abc` finished at 21/34/41, `bde` at 50/42/28, and `adf` at
  14/47/42.
- Browser QA at 1280, 768, and 375 px confirmed the activated house/card
  frames, panel nine-slice, gauge, backdrop, class silhouettes, and responsive
  house grid without horizontal overflow. The final warning/error console was
  empty. A visual review caught the tall house-frame source being stretched
  horizontally; the corrected 3:4 card layout passed the follow-up review.
- A final movement audit narrowed standoff retreat/hold behavior to Spearmen
  and Archers. Warriors and Skirmishers retain their original advance
  behavior, and the exact 1.1 preferred-range boundary is covered by zero-RNG
  regression tests.
- Final verification passed 255/255 tests, TypeScript, production build,
  both determinism paths, the 23-entry manifest check, all eight PNG
  dimension/alpha checks, diff hygiene, and the independent code re-review.

## 2026-07-28 — Phase 3J rough balance restore and parallel harness

- Split balance execution into contiguous worker-thread blocks, defaulting to
  `os.cpus().length` with a `--workers=N` override. Parent aggregation sorts by
  seed; regression coverage proves serial and parallel samples and their full
  formatted output are identical.
- Added wave start/end population, kills/spawns, clear time, mage-only time,
  hall damage, divine power use, and regular-class death diagnostics.
- The untuned `abc` baseline was 90.5% victory. It entered wave three with a
  median 103.5 agents, killed 112/112 enemies, and spent zero median divine
  power; waves one and two both cleared 100%.
- Changed only wave-three creature HP: 5.0→7.5 produced 55.5% victory, then
  7.5→8.5 produced 44.5%. The final wave-three median is 92/112 kills with
  hall damage in 98.5% of runs.
- This is deliberately a playability restore, not the full balance pass.
  Waves one and two still need a later curve pass informed by hand play-tests;
  player growth, classes, rosters, cards, shops, heroes, and meta progression
  were not nerfed.
- All implementation, installs, tests, builds, balance runs, and browser
  automation for this slice ran on DGX Spark `aitopatom-d6bb`.
- The measured untuned 200-seed wall time improved from 2608.10 seconds with
  one worker to 215.07 seconds with 20 workers, a 12.13× speedup.
- The 2,000-seed trio sweep took 2261.19 seconds and sampled every trio 100
  times. `abe` was below 10%; thirteen trios were above 75%. These extremes
  are recorded for the later full balance pass and were not tuned in this
  narrow restore.

## 2026-07-28 — Phase 4A game framing

- Named the game **영광의 밤 / Night of Glory**, made the title screen the
  initial app phase, and moved the empty-save investment ledger behind the
  explicit 유산 action.
- Reframed preparation, combat, intermission, draft, and terminal phases as
  여명, 밤 — 습격, 낮 — 내정, 계시, and 승리/함락. A render-only 30-tick
  day/night tween now produces cold night and warm day palettes without adding
  presentation state to `GameState`.
- Rebuilt the run as a fixed 8:5 viewport with the canvas dominant and HUD,
  abilities, draft, and settlement shop overlaid. The day shop groups 병력,
  방어, 회복, and 강화, shows loss/damage/tribute context, keeps disabled
  shortfall reasons visible, and separates 밤이 온다 from purchases.
- Added a Korean-default, English-optional locale contract covering screens,
  HUD, content data, summaries, errors, and developer overlays. Dictionary
  parity and warn-once missing-key behavior are tested.
- Added versioned settings for language, 0.5×/1×/2× dispatch rate, screen
  shake intent, disabled audio volume marked 준비 중, and confirmed progress
  reset. Settings and language remain outside simulation state.
- Added the seeded daylight raid with the exact 15% probability, first-wave
  exclusion, 70% count, 1.4× damage, 1.5× tribute, day lighting, warning
  banner, and run-summary record.
- Chrome QA exercised Korean and English, title/settings/run/shop flows,
  normal night and flagged daylight combat, and 375/768/1280 widths. All three
  sizes retained an 8:5 stage, 44px controls, and no page scrollbar. A 375px
  regression that hid the shop and next-wave button was found and fixed.
  Final warning/error console output was empty.
- DGX Spark `aitopatom-d6bb` ran all implementation and heavy verification.
  Typecheck passed in 0.33s; 283/283 tests passed in 27.80s; production build
  passed in 0.47s; both determinism lanes passed in 27.36s; asset inspection
  passed in 0.22s with six UI assets ready and 17 documented primitive
  fallbacks; the 200-seed balance run took 233.34s.
- The balance harness reported `abc` at 52.5% victory, up 8.0 percentage
  points from the Phase 3J baseline and outside the requested 35–45% band.
  No prohibited compensating balance change was made; the specified daylight
  raid is left for the next balance pass to evaluate.

## 2026-07-28 — Phase 4B visible stronghold command lane

- Consolidated the default battlefield around one central stronghold triangle and added tests for exact slot geometry, spawn radius, cross-house defense, render draw order, tower placement, and responsive presentation boundaries.
- Added typed numeric presentation for card effects, applicability warnings, shop effects, investment rows, house traits, class composition, and hero status. This command-lane snapshot preceded final review; later follow-up corrected directional break-threshold copy, replaced canvas test casts with narrow production context contracts, and extracted Phase 4B coverage from pre-existing oversized test modules.
- Historical command-gate results at this point were: typecheck 0; production build 0; full test suite 340/340; determinism 0; asset check 0 with the known six ready assets and 17 primitive sprite fallbacks; balance 0; `git diff --check` 0.
- Determinism baseline: organic seed 20260810 reached victory at tick 2585 with tribute 543 and halls 900/900/900; full-state-machine lane reached victory at tick 1791 with tribute 190 and halls 900/900/900.
- Balance observation: `abc` 200 runs, 87.5% victory, median Legacy 232.5. Prior recorded Phase 4A observation was 52.5%; no tuning was performed in this pass.
- Additional gates in that earlier snapshot: render/import boundary grep 0; the changed-source size check accepted `houseConfig.ts` as a documented pure-data exception; structural no-excuse fallback 0; missing-locale negative control failed as expected and restored `src/content/locale/en.ts` from backup with restore status 0.
- Todo12 initially remained open after command gates because browser QA found 375px clipping and double-plus numeric copy; the post-fix PASS record below supersedes that blocker.

## 2026-07-28 — Phase 4B Todo12 post-fix PASS

- Initial Chrome QA failed for two concrete reasons: mobile 375px choice surfaces clipped/overlapped, and Korean max-HP card lines rendered double signs (`++`).
- Red-green fix evidence is in `.omo/evidence/task-12-fix-phase4b-visible-stronghold.md`: focused red tests failed, then `tests/cardEffects.test.ts` and `tests/phase4bResponsive.test.ts` passed 11/11 after the locale/CSS fix.
- Post-fix browser evidence is in `.omo/evidence/task-12-browser-phase4b-visible-stronghold.md` and `.omo/evidence/phase4b-visible-stronghold/browser-postfix/`: Chrome PASS at 375/768/1280, console warn/error log `[]`, no `++`, no clipping/overlap in the 375 shop layout audit, and no horizontal document scroll in captured metrics.
- Browser-fix DGX gates at this point were: typecheck 0; production build 0 (`dist/assets/index-ITmSIBu1.css`, `dist/assets/index-DriTRFkR.js`); full test suite 342/342; determinism 0; asset check 0 with six ready assets and 17 documented primitive fallbacks; `git diff --check` 0; boundary grep 0. Final-review follow-up subsequently replaced implementation-mirroring tests and moved new coverage into focused files; its current counts and size checks are recorded in `.omo/evidence/phase4b-final-blocker-fix.md`.
- Balance was not rerun after the fix because the only post-measurement changes were locale copy, responsive CSS, tests, and static documentation/comments. The recorded Phase 4B observation remains `abc` 200 runs at 87.5% victory, median Legacy 232.5, with no tuning performed.
- Todo12 is complete. Commit/push/restart remain Todo13 and were not performed here.

## 2026-07-28 — Phase 4B final-review follow-up

- Phase 4B additions were extracted from the pre-existing oversized
  disposition and run-configuration suites into focused behavior files. Every
  modified or new test file is now at or below 250 pure LOC.
- The removed responsive tests parsed CSS source and therefore mirrored an
  implementation rather than proving browser behavior. Real-Chrome computed
  layout is the responsive gate. The reusable
  `scripts/phase4bResponsiveQa.js` module checks the 375/768/1280 matrix for
  document overflow, overlay containment, phone viewport escape, internal
  scrolling, 44px targets, and live long-text wrapping. DGX has no Chrome, so
  the module is served by Vite for the independent Mac Chrome/CDP QA lane.

## 2026-07-29 — Phase 5A one-keep closure Task8

- Removed the remaining product-boundary hall wording from `src tests scripts`:
  divine resurgence copy, Unbroken achievement copy, summary defense labels,
  and the card-effect presentation test now use banners, keep, or generic
  defenses. The exact boundary greps for `\bhalls\b|\bHall\b|HALL_` and
  `reinforce_hall` both returned exit 1 with no matches.
- Kept the atomic keep/banner migration line from the prior Phase 5A commits:
  `drawDefenses` owns one neutral keep plus three house-colour banners,
  compact HUD pips expose banner integrity, and no `drawHalls` compatibility
  alias was retained.
- Recorded the presentation choices that shaped the closeout: the rank line
  stays as compact legacy rite pips plus localized effect text, the palette
  stays neutral keep stone with house-colour banner identity, and stale hero
  labels/fall markers are pruned by rebuilding the living-hero tracker from the
  current projected state.
- The repair choice remains `reinforce_keep` and routes through localized shop
  presentation keys. The rejected compatibility model was to keep hall wording,
  hall sprite names, or fallback aliases visible beside the keep/banner model.
- Updated `scripts/checkDeterminism.ts` baselines only after two identical DGX
  probe runs. New organic baseline: seed 20260810, victory, tick 2179, tribute
  987, keep 2400, banners 420/420/420. New full-state-machine baseline: seed
  20260810, three waves, victory, tick 1707, tribute 598, keep 2400, banners
  420/420/420.
- No balance tuning was performed: no roster, card, shop-price, investment,
  wave-count, unit-stat, hero-stat, or multiplier changes were made in this
  task.

## 2026-07-29 — Phase 5A final audit and verification

- The final geometry audit made the Phase 5A contract literal: the keep is at
  `(480, 300)` with `2400` HP and radius `26`; the defense radius is `230`;
  each banner has `420` HP, radius `11`, and orbit radius `52`.
- Formation configuration now uses the specified `spacing` field. Intact
  banners suppress ordinary idle jitter while an active threat is present;
  a destroyed banner switches only that house to deterministic fracture
  scatter, preserving the specified `0.6` scatter behavior.
- Focused tests cover exact formation rank-error and spread after fracture,
  hue-distance between all three house palettes, and Ivy's actual ticked
  movement to the exact 40px standoff. The render remains label-free for
  heroes so class/house silhouettes and the battle line carry identity.
- Fresh DGX gates passed: typecheck, production build, 398/398 tests, and both
  determinism lanes. Asset inspection found six ready UI assets and 19 known
  world-sprite fallbacks; missing art continues to render as primitive shapes.
  Audio remains intentionally unavailable.
- Final determinism baselines are organic victory at tick `2172`, tribute
  `556`, keep `2400`, banners `0/420/420`; and full-state-machine victory at
  tick `1695`, tribute `388`, keep `2400`, banners `216/420/420`.
- Performance changed from the recorded Phase 4B baseline average/worst/peak
  of `3.830 ms / 14.289 ms / 288 MB` to
  `4.825 ms / 28.888 ms / 287 MB` in the final DGX run.
- The final 200-seed balance observation was 198 victories and two defeats
  (`99.0%` victory), compared with the recorded Phase 4B `87.5%`. This is an
  observation only; no compensating balance tuning was made.
- Real Chrome visual QA captured the intact rest formation and live engaged
  formation at the direct DGX URL. The exact fracture geometry is additionally
  locked by deterministic automated tests. The browser extension disconnected
  after a debugger pause before a third fracture screenshot could be retained,
  so that specific screenshot is not claimed as verified evidence.

# Architecture

This repository is a browser-based fantasy wave-defense god-sim built with
Vite, React, TypeScript, and raw Canvas 2D. Phase 3D wraps the deterministic
three-wave defense run in a persistent Legacy loop with ordered house
selection, terminal summaries, achievements, and unlocks.

## Runtime structure

```text
src/
├── agents/              # pure disposition, movement, and agent data
├── divine/              # pure miracle definitions and resolution
├── threat/              # pure wave spawning and enemy behavior
│   ├── threatTypes.ts
│   ├── threatMotion.ts
│   ├── waveSpawner.ts
│   ├── waveDirector.ts
│   └── highlightRecorder.ts
├── progression/         # pure XP, card-pool, and modifier resolution
│   ├── progression.types.ts
│   ├── xp.ts
│   ├── cardPool.ts
│   └── modifiers.ts
├── engine/              # cross-domain orchestration and run state
│   ├── engine.types.ts
│   ├── agentCombat.ts
│   ├── combatDamage.ts
│   ├── invasionCombat.ts
│   ├── miracleApplication.ts
│   ├── progressionEngine.ts
│   ├── prng.ts
│   └── tick.ts
├── state/               # React provider and pure commit reducer
├── meta/                # versioned persistent progression outside GameState
├── render/              # Canvas 2D rendering
├── ui/                  # React HUD, controls, and run overlays
└── content/             # houses, balance, waves, and shared RNG contract
```

`agents`, `divine`, `threat`, `progression`, `build`, and `meta` are independent
pure-TypeScript leaves. They do not import one another or import `engine`.
Alongside `content` and the integrating `engine`, build is the seventh
simulation axis and meta is the eighth application axis.
`engine` may combine structural snapshots and outcomes. React, DOM, and Canvas
APIs remain outside all simulation directories.

`build/` owns the tribute-shop catalogue, tower definitions, and pure placement
validation. The integrating engine owns live hall/tower snapshots and composes
their combat effects. Tower-placement mode and its hover point are transient
React store state, so cancelling or moving a preview cannot alter the
replayable simulation snapshot.

`meta/` owns Legacy calculation, achievement evaluation, house purchases, and
versioned localStorage validation. It consumes only plain terminal
`RunSummary` data. Persistent state never enters `GameState`, the seeded RNG,
or tick resolution, so a save cannot alter replay behavior. The top-level
`appPhase` context coordinates `meta -> select -> run -> summary`; only the run
phase mounts the simulation provider.

## State and randomness

`GameState` contains the complete replayable world snapshot: phase, wave
index, tribute, houses, halls, towers, agents, heroes, active threats, miracle
resources, effects, house progression, cached modifiers, shop history, wave
summaries, and queued drafts. The provider
owns the stateful seeded RNG. Event handlers and the
animation-frame loop compute a complete next snapshot before dispatching
`{ type: "commitState", next }`; the reducer only returns that snapshot and
never reads or advances RNG. Offer generation runs inside `advanceTick`, before
the provider commits the complete next snapshot.

The fixed simulation clock runs at 20 ticks per second with a five-tick
catch-up cap. Preparation and wave phases run maintenance. Draft, intermission,
victory, and defeat allow only tick advancement and visual-effect expiry;
movement, combat, spawning, resource regeneration, cooldowns, and miracles
are frozen.

## Wave flow

`content/waveConfig.ts` is the single source of truth for run length and wave
scaling.

```text
preparation
    ↓ tick 300, spawn wave 0
wave ── all halls destroyed ──→ defeat
  │
  ├── non-final clear ──→ intermission ── explicit continue ──→ next wave
  │
  └── final clear ──→ victory
```

Any combat phase may detour through one or more FIFO draft offers when a house
crosses an XP threshold. The engine stores the pre-draft phase explicitly and
restores it only after the final queued card is selected.

On each wave tick the engine:

1. derives ID-bearing structural threat presences and per-agent hall contexts;
2. decides personal response, hall defense, reinforcement, or retreat and
   applies directed movement;
3. resolves defender attacks in stable agent-array order, preserving exact
   damage and killing-blow attribution;
4. resolves tower fire in stable tower order;
5. advances creatures and the optional mage;
6. aggregates agent, tower, and hall damage;
7. awards per-creature tribute and house XP;
8. checks defeat before wave clear, then awards the clear reward;
9. applies threshold growth, generates sorted house drafts, and pauses.

Creatures prioritize a living agent within aggro range, then the nearest
surviving tower or hall. The mage ignores agents and towers and moves directly
toward a hall.
Distance ties and returned damage arrays are ordered by stable IDs.

Agents whose hall survives defend threats near that objective even when the
threat is outside personal sense range. Once their hall falls, they rally to
the nearest surviving hall and enter the helping state while engaging its
attackers. Low-HP timid agents fall back toward that same rally point, and
agents outside the home leash return before resuming idle wandering.

## Rendering

Canvas draw order is background → halls → towers → tower rubble → agents →
heroes → threats → effects, followed by the transient tower preview. Halls
remain visible as rubble at zero HP; destroyed towers leave a timed visual
record but no longer occupy a placement slot. Rendering reads immutable
snapshots and never consumes RNG or advances the simulation. React owns only
presentation and user actions: house selection, miracle selection/casting,
draft selection, intermission purchases and tower placement, continuation,
summary processing, and retry with a fresh deterministic seed.

## Sprite pipeline

`src/content/assetManifest.ts` is the content-owned manifest for the nineteen
sprite IDs. Each spec keeps source-frame geometry, fractional pivots, world
render size, and tintability as separate fields, so source sheet size and world
geometry stay independent.

`src/render/assets/spriteLoader.ts` owns a process-lifetime
`idle`/`loading`/`ready`/`missing` cache. `preloadAll()` is called once during
startup from `src/main.tsx` before React mounts, and preload failures resolve
to `missing` instead of rejecting. `getImage()` returns `null` for loading or
missing entries, so absent assets never throw during draw time.

`src/render/assets/drawSprite.ts` is the only world/entity render-loop
`drawImage` path. It resolves a manifest spec, optional tinted surface, frame
rectangle, DPR-snapped destination, and sprite draw state, then returns `true`
only after the canvas draw succeeds. Every caller keeps its existing primitive
renderer on the `false` path, so sprite absence does not mutate simulation
behavior. `spriteCache.ts` also uses `drawImage`, but only offscreen while
generating tinted variants.

`src/render/assets/spriteCache.ts` lazily builds tinted full sheets. It
composites the source with `source-in`, multiplies the original sheet back over
the tint so shading survives, and evicts the oldest insertion once the
64-entry cap would be exceeded.

The runtime chain is `manifest -> one startup preload -> ready/missing cache ->
drawSprite -> optional tint cache -> boolean primitive fallback`. That chain is
presentation-only. Render code never imports from simulation domains, and
simulation code never mutates render state.

`?sprites=off` is parsed once in `spriteSettings.ts` and makes `drawSprite`
return `false` for the whole app. The dev-only
`src/ui/components/SpriteDebugOverlay.tsx` is mounted behind `import.meta.env.DEV`,
toggles with `Shift+D`, and reports ready, missing, and total counts plus the
missing IDs. `npm run assets:check` reads the same manifest and prints the
asset checklist without changing runtime state.

`src/content/framePresentation.ts` is presentation-only. It maps rarity cards
and the house-selection screen to their enabled frame sprite IDs. Card and
house screens calculate their transparent content rectangles from normalized
source insets, while panels use the shipped fixed-corner nine-slice. Missing
frame assets still retain the border-and-label fallback.

## Unit classes and population

`src/content/unitClassConfig.ts` owns the four regular-unit stat lines and the
stable largest-remainder allocator. Houses own only roster weights and
population rules. Creation, wave recruitment, combat, movement, and rendering
all read the same unit-class definition instead of copying combat constants.

At each wave boundary, `src/engine/population.ts` recruits by current house
level and living regular count. A destroyed hall produces nothing, caps are
hard, and existing agents are never healed. The population history is stored
in deterministic run state and copied into the terminal summary.

Modifier resolution is normalized in this order: class base, house traits,
global investment, house investment, drafted cards, then situation-specific
combat conditions. Additive fields are summed and multiplier fields are
multiplied within the relevant layer; consumers apply the resolved bundle to
the class base exactly once.

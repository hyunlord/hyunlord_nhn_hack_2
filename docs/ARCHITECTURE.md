# Architecture

This repository is a browser-based fantasy wave-defense god-sim built with
Vite, React, TypeScript, and raw Canvas 2D. Phase 3A wraps the deterministic
agent and miracle foundations in a three-wave run with halls, intermissions,
and terminal victory or defeat.

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
├── engine/              # cross-domain orchestration and run state
│   ├── engine.types.ts
│   ├── combatDamage.ts
│   ├── invasionCombat.ts
│   ├── miracleApplication.ts
│   ├── prng.ts
│   └── tick.ts
├── state/               # React provider and pure commit reducer
├── render/              # Canvas 2D rendering
├── ui/                  # React HUD, controls, and run overlays
└── content/             # houses, balance, waves, and shared RNG contract
```

`agents`, `divine`, and `threat` are independent pure-TypeScript leaves. They
do not import one another or import `engine`. `engine` is the integration axis
and may combine their structural snapshots and outcomes. React, DOM, and
Canvas APIs remain outside all four simulation directories.

Halls live in `engine.types.ts` for Phase 3A because they are run objectives
coordinated by the engine. When walls and towers arrive in Phase 3C, halls are
expected to migrate with them into a dedicated `build/` domain rather than
turning the engine type module into a construction-system owner.

## State and randomness

`GameState` contains the complete replayable world snapshot: phase, wave
index, tribute, houses, halls, agents, active threats, miracle resources, and
effects. The provider owns the stateful seeded RNG. Event handlers and the
animation-frame loop compute a complete next snapshot before dispatching
`{ type: "commitState", next }`; the reducer only returns that snapshot and
never reads or advances RNG.

The fixed simulation clock runs at 20 ticks per second with a five-tick
catch-up cap. Preparation and wave phases run maintenance. Intermission,
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

On each wave tick the engine:

1. derives ID-bearing structural threat presences and per-agent hall contexts;
2. decides personal response, hall defense, reinforcement, or retreat and
   applies directed movement;
3. resolves simultaneous defender attacks;
4. advances creatures and the optional mage;
5. aggregates agent and hall damage;
6. awards per-creature tribute;
7. checks defeat before wave clear, then awards the clear reward.

Creatures prioritize a living agent within aggro range, then the nearest
surviving hall. The mage ignores agents and moves directly toward a hall.
Distance ties and returned damage arrays are ordered by stable IDs.

Agents whose hall survives defend threats near that objective even when the
threat is outside personal sense range. Once their hall falls, they rally to
the nearest surviving hall and enter the helping state while engaging its
attackers. Low-HP timid agents fall back toward that same rally point, and
agents outside the home leash return before resuming idle wandering.

## Rendering

Canvas draw order is background → halls → agents → threats → effects. Halls
remain visible as rubble at zero HP. Rendering reads immutable snapshots and
never consumes RNG or advances the simulation. React owns only presentation
and user actions: miracle selection/casting, intermission continuation, and
deterministically seeded restart.

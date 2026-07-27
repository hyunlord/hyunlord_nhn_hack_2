# Architecture

This repository is a browser-based fantasy wave-defense god-sim built with
Vite, React, TypeScript, and raw Canvas 2D. Phase 3B wraps the deterministic
agent and miracle foundations in a three-wave roguelite run with halls,
intermissions, level-up card drafts, and terminal victory or defeat.

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
├── render/              # Canvas 2D rendering
├── ui/                  # React HUD, controls, and run overlays
└── content/             # houses, balance, waves, and shared RNG contract
```

`agents`, `divine`, `threat`, `progression`, and `build` are independent
pure-TypeScript leaves. They do not import one another or import `engine`.
Alongside `content` and the integrating `engine`, build is the seventh
simulation axis.
`engine` may combine structural snapshots and outcomes. React, DOM, and Canvas
APIs remain outside all simulation directories.

`build/` owns the tribute-shop catalogue, tower definitions, and pure placement
validation. The integrating engine owns live hall/tower snapshots and composes
their combat effects. Tower-placement mode and its hover point are transient
React store state, so cancelling or moving a preview cannot alter the
replayable simulation snapshot.

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

Canvas draw order is background → halls → towers → agents → heroes → threats →
effects, followed by the transient tower preview. Halls remain visible as
rubble at zero HP. Rendering reads immutable snapshots and never consumes RNG
or advances the simulation. React owns only presentation and user actions:
miracle selection/casting, draft selection, intermission purchases and tower
placement, continuation, and deterministically seeded restart.

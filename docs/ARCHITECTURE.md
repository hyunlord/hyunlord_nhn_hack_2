# Architecture

This repository is a browser-based fantasy god-sim built with Vite, React,
TypeScript, and raw Canvas 2D. Phase 2C provides a deterministic living world,
playable divine intervention, and an invasion in which agents fight, help, or
betray their houses.

## Structure

```text
public/assets/
├── houses/.gitkeep
├── backgrounds/.gitkeep
└── ui/.gitkeep
src/
├── main.tsx
├── App.tsx
├── divine/
│   ├── miracleTypes.ts
│   ├── miracleResolver.ts
│   └── divine.types.ts
├── agents/
│   ├── agentTypes.ts
│   ├── agentFactory.ts
│   ├── dispositionEngine.ts
│   └── movement.ts
├── narrative/
│   ├── threatTypes.ts
│   ├── invasionDirector.ts
│   ├── highlightRecorder.ts
│   └── endingResolver.ts
├── engine/
│   ├── prng.ts
│   ├── invasionCombat.ts
│   ├── tick.ts
│   └── engine.types.ts
├── state/
│   ├── gameStore.ts
│   └── gameStore.types.ts
├── render/
│   ├── GameCanvas.tsx
│   ├── drawBackground.ts
│   ├── drawAgents.ts
│   ├── drawThreats.ts
│   └── drawEffects.ts
├── ui/
│   ├── screens/
│   │   ├── InterventionScreen.tsx
│   │   ├── ObservationScreen.tsx
│   │   ├── EndingScreen.tsx
│   │   └── IdleScreen.tsx
│   └── components/
│       ├── MiracleButtons.tsx
│       ├── HighlightFeed.tsx
│       └── HUD.tsx
└── content/
    ├── houseConfig.ts
    ├── threatConfig.ts
    ├── balanceConfig.ts
    └── random.ts
docs/
├── ARCHITECTURE.md
├── DEV_LOG.md
└── DECISIONS.md
api/.gitkeep
```

## Three independent axes

The game has three independent systems:

- `src/divine/`: player miracle interventions
- `src/agents/`: agent disposition and simulation
- `src/narrative/`: invasion, betrayal, highlights, and endings

These three directories never import from one another. Each may import shared
types or data from `src/content/`. Coordination belongs in `src/engine/`.

## Folder rules

- `divine`, `agents`, and `narrative` are pure TypeScript with no React, DOM,
  or Canvas access and no imports between the three axes.
- `engine` is pure TypeScript and may combine the independent axes.
- `render` reads state and owns Canvas 2D drawing; it never mutates state.
- `ui` contains React components and no inline simulation math.
- `content` contains data and shared type declarations only.
- `api` remains empty except for `.gitkeep`.

## Phase 2C simulation flow

At 20 fixed ticks per second, `engine/tick.ts` advances global time and divine
maintenance, then delegates invasion coordination to
`engine/invasionCombat.ts`. The invasion coordinator owns the cross-axis order:

1. spawn the seeded threat and assign one traitor at the intervention boundary;
2. derive structural threat presences for each living agent;
3. decide intent, move agents, and classify nearby helpers;
4. resolve simultaneous defender attacks from one threat snapshot;
5. step surviving threats and collect their attacks;
6. aggregate and apply damage in both directions;
7. resolve first-blood or timeout phase handoff.

`narrative/invasionDirector.ts` owns pure threat behavior, while
`agents/dispositionEngine.ts` and `agents/movement.ts` own pure agent choices
and motion. Only the engine combines their structural contracts.

## Render layering

The canvas draws background, agents, threats, then transient divine effects.
Threat animation derives solely from the simulation tick. Rendering reads the
immutable world snapshot and never advances combat or consumes RNG.

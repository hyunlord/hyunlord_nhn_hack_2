# Architecture

This repository is a browser-based fantasy god-sim built with Vite, React,
TypeScript, and raw Canvas 2D. Phase 2A provides a deterministic living-world
foundation; miracle, disposition, threat, and narrative behavior remain
scaffolded for later phases.

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
│   ├── tick.ts
│   └── engine.types.ts
├── state/
│   ├── gameStore.ts
│   └── gameStore.types.ts
├── render/
│   ├── GameCanvas.tsx
│   ├── drawBackground.ts
│   ├── drawAgents.ts
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
    └── balanceConfig.ts
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

# Divine Intervention Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make lightning, blessing, and curse selectable and castable on the deterministic living world with visible, tested consequences.

**Architecture:** `divine/` resolves structural target snapshots into plain immutable outcomes without importing `agents/` or consuming RNG. `engine/` applies those outcomes to `GameState`; React keeps the selected miracle outside simulation state and converts canvas clicks into world-space cast events.

**Tech Stack:** React 19, TypeScript 7 strict mode, Canvas 2D, Node test runner through `tsx`, Vite.

---

### Task 1: Lock miracle resolution contracts

**Files:**
- Create: `tests/miracles.test.ts`
- Modify: `src/divine/divine.types.ts`
- Modify: `src/divine/miracleTypes.ts`
- Modify: `src/divine/miracleResolver.ts`

1. Add failing tests for linear falloff, dead-target exclusion, deterministic
   dominant-house tie breaking, outcome sorting, purity, and `canCast`.
2. Run `npm test` and confirm the tests fail because the resolver contract is
   not implemented.
3. Add the structural snapshot/outcome types, exact metadata table, pure
   resolver, and affordability rule.
4. Run `npm test` and confirm all resolver tests pass.

### Task 2: Lock and implement immutable world application

**Files:**
- Modify: `tests/miracles.test.ts`
- Modify: `tests/world.test.ts`
- Modify: `src/content/balanceConfig.ts`
- Modify: `src/agents/agentTypes.ts`
- Modify: `src/agents/agentFactory.ts`
- Modify: `src/engine/engine.types.ts`
- Modify: `src/engine/tick.ts`

1. Add failing tests for insufficient power, active cooldown, immutable damage,
   healing, death, house-power clamping, regen, cooldown decay, and expiry.
2. Run `npm test` and confirm the new application tests fail.
3. Add the exact divine constants and state fields, initialize them, implement
   `castMiracle`, and extend `advanceTick` in the specified order.
4. Run `npm test && npm run check:determinism` and confirm both pass.

### Task 3: Wire selection, casting, and presentation

**Files:**
- Modify: `src/state/gameStore.types.ts`
- Modify: `src/state/gameStore.ts`
- Modify: `src/render/GameCanvas.tsx`
- Modify: `src/render/drawEffects.ts`
- Modify: `src/render/drawAgents.ts`
- Modify: `src/ui/components/MiracleButtons.tsx`
- Modify: `src/ui/components/HUD.tsx`
- Modify: `src/index.css`
- Modify: `DESIGN.md`

1. Keep `selectedMiracle` in provider `useState`, expose a toggle setter, and
   clear selection after a cast action.
2. Convert scaled client coordinates to world coordinates and draw in
   background → agents → effects order.
3. Render visible fallen agents, damage flashes, effect rings/discs, accessible
   miracle controls, cooldown seconds, divine power, and house power.
4. Update the design tokens/components before using new visual values.

### Task 4: Document and verify

**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/DEV_LOG.md`

1. Record structural typing, new simulation fields, and UI-only selection.
2. Run `npm run typecheck && npm run build && npm test &&
   npm run check:determinism`.
3. Run the three dependency grep gates plus `grep -rn "Math.random" src/`.
4. Run the production app in a real browser, cast all three miracles, verify
   power/cooldown/HP/house consequences, deselected-click behavior, responsive
   canvas coordinates, visual effects, and an empty warning/error console.

### Task 5: Deliver

1. Run `git remote -v`, `git branch --show-current`, and `git status`; require
   the expected GitHub origin and `main`.
2. Review the complete diff and commit with Lore trailers.
3. Push `main`.
4. Fetch and prove `HEAD == origin/main == git ls-remote`, then spot-check the
   remote Phase 2B file tree.

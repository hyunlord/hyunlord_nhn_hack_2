# Phase 3F Rarity and Investment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign card frequency, add permanent Legacy investments as isolated run inputs, and make neutral slot sampling the balance default.

**Architecture:** Content owns cards and investment definitions; meta owns ranks and purchases; the app boundary converts ranks into a plain starting-modifier bundle consumed by run construction. The simulation never imports or stores `MetaState`, and the harness uses a dedicated choice RNG.

**Tech Stack:** TypeScript, React, Node test runner through `tsx`, Vite, deterministic in-repository PRNG.

---

### Task 1: Lock the rarity contract

**Files:**
- Modify: `tests/phase3eRarity.test.ts`
- Modify: `tests/progression.test.ts`
- Modify: `tests/divineSkills.test.ts`

1. Add assertions for 14/14/10 composition, 38 total cards, commons exceeding
   legendaries, tier stack limits, required reclassifications, and all skill
   grant eligibility behavior.
2. Add a fixture whose common pool is exhausted while rare cards remain and
   assert the offer is shorter rather than upward-falling.
3. Run `npx tsx --test tests/phase3eRarity.test.ts tests/progression.test.ts tests/divineSkills.test.ts`
   and confirm the new expectations fail for the missing redesign.
4. Do not change product code until the failures have been observed.

### Task 2: Implement the rarity content and tradeoffs

**Files:**
- Modify: `src/content/cardConfig.ts`
- Modify: `src/progression/progression.types.ts`
- Modify: `src/progression/cardPool.ts`
- Modify: `src/progression/modifiers.ts`
- Modify: `src/engine/heroEngine.ts`
- Modify: `tests/phase3eRarity.test.ts`
- Modify: `tests/progression.test.ts`

1. Reclassify the five specified unconditional cards and normalize every
   definition's `maxStacks` by tier.
2. Add six low-impact commons, Zealot's Bargain, and Hollow Crown.
3. Add the explicit existing-legendary costs and descriptions from the design.
4. Add the minimum typed effect field needed for Hollow Crown and enforce it in
   hero respawn.
5. Preserve 65/27/8 weights and downward-only fallback.
6. Run the focused rarity/progression/hero tests until green.

### Task 3: Lock investment economics and composition

**Files:**
- Create: `tests/investments.test.ts`
- Modify: `tests/meta.test.ts`

1. Write failing tests for every exact track definition and rank cost.
2. Cover insufficient funds, max rank, locked house, unknown track, successful
   immutable purchase, multiplier multiplication, flat addition, empty neutral
   effect, and per-house filtering.
3. Cover persistence round-trip, version-1 migration with empty ranks, corrupt
   fallback, and unknown-version fallback.
4. Run `npx tsx --test tests/investments.test.ts tests/meta.test.ts` and verify
   expected missing-module/schema failures.

### Task 4: Implement investment content and meta state

**Files:**
- Create: `src/content/investmentConfig.ts`
- Create: `src/meta/investments.ts`
- Modify: `src/meta/meta.types.ts`
- Modify: `src/meta/legacy.ts`
- Modify: `src/meta/persistence.ts`
- Modify: `src/state/appFlow.ts`

1. Add the eleven exact tracks and typed scope/track contracts.
2. Implement pure cost, availability, purchase, and effect-resolution
   functions with exhaustive typed results.
3. Add `investmentRanks`, version-1 migration, and strict rank parsing.
4. Add the `purchaseInvestment` app action; reducer rejections must preserve
   the exact state reference.
5. Run the focused investment/meta/app-flow tests until green.

### Task 5: Lock and implement run-configuration isolation

**Files:**
- Modify: `tests/runConfiguration.test.ts`
- Modify: `tests/store.test.ts`
- Modify: `src/content/runConfiguration.ts`
- Modify: `src/engine/tick.ts`
- Modify: `src/state/gameStore.ts`
- Modify: `src/ui/screens/RunScreen.tsx`

1. Write a failing test proving equal seed/trio/bundle state equality
   regardless of unrelated `MetaState` contents.
2. Write tests proving global effects reach all selected houses, house effects
   reach only their house, and empty bundles preserve the former state.
3. Introduce a plain `StartingModifierBundle` content contract and derive it at
   the app/UI boundary.
4. Pass the bundle through `GameStoreProvider` to `createInitialState`; include
   it in the provider's run identity key.
5. Fold the effects into existing `houseBaseEffects`, never adding meta fields
   to `GameState`.
6. Run run-configuration, store, progression, and determinism tests until green.

### Task 6: Lock and implement neutral harness sampling

**Files:**
- Create: `tests/balanceNeutralPick.test.ts`
- Modify: `tests/balanceHouseSampling.test.ts`
- Modify: `scripts/balanceOptions.ts`
- Modify: `scripts/balanceHarness.ts`
- Modify: `scripts/balanceReport.ts`

1. Write failing parser tests showing `neutral` is accepted/default, `first`
   remains accepted with a bias warning, and malformed modes exit with usage.
2. Export a pure slot-choice seam and test a large deterministic sample whose
   picked rarity rates stay within tolerance of offered rates.
3. Implement neutral sampling with the dedicated choice RNG and keep
   `first`/`random`.
4. Add exact global investment cost total and observed runs-to-max reporting.
5. Run focused harness tests, then a small balance smoke.

### Task 7: Lock and implement the investment UI

**Files:**
- Modify: `src/ui/screens/MetaScreen.tsx`
- Modify: `src/index.css`
- Modify: `DESIGN.md`
- Modify: `tests/appFlow.test.ts`

1. Add reducer-level failing tests for UI purchase actions and starting-bundle
   use before writing the component.
2. Render global/house groups, accessible headings, pips, next cost, effect,
   disabled reason, and total active summary.
3. Extend existing design tokens and responsive ledger styles; retain 44px
   controls, visible focus, and non-color status text.
4. Run app-flow tests, typecheck, and build.

### Task 8: Complete evidence, docs, review, and delivery

**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/DEV_LOG.md`

1. Record rarity-as-frequency, legendary tradeoffs, the 38-card resolution,
   `first` bias, isolation, harness observations, and DGX use or non-use.
2. Run `npm test`, `npm run typecheck`, `npm run build`,
   `npm run check:determinism`, `npm run balance`, both boundary greps, and
   `git diff --check`.
3. Browser-test investment purchases visibly applying to the next run, draft
   rarity/legendary decisions, 375/768/1280 layouts, and console cleanliness.
4. Run visual QA and the five required post-implementation review lanes; fix
   every blocker and rerun affected gates.
5. Run mandatory `git remote -v`, `git branch --show-current`, and `git status`.
6. Commit with Lore trailers, push `main` without force, compare local SHA to
   `git ls-remote origin refs/heads/main`, and spot-check the remote tree.

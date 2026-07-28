# Phase 5A One Keep, One Battle Line Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace three independent halls with one keep and three banners, then organize every army into one deterministic, role-layered battle line whose house sections and fractures are visible without HUD reading.

**Architecture:** Migrate the replayable state atomically from `halls` to `keep` plus `banners`. A pure line/formation layer derives rank targets, lateral sectors, engagement rhythm, and fracture from current state, using one bounded spatial grid per tick. Presentation-only trails, pulses, and announcements remain render-local.

**Tech Stack:** TypeScript, React, Canvas 2D, Node test runner, Vite, deterministic seeded PRNG.

---

### Task 1: Lock the content and defensive-structure contracts

**Files:**
- Modify: `src/content/balanceConfig.ts`
- Modify: `src/content/houseConfig.ts`
- Modify: `src/content/unitClassConfig.ts`
- Modify: `src/engine/engine.types.ts`
- Test: `tests/houses.test.ts`
- Test: `tests/unitClasses.test.ts`
- Create: `tests/keepBannerStructures.test.ts`

**Step 1: Write failing contract tests**

Assert the exact six house colours and formation rows, the four exact
`lineRank` values, and the keep/banner constants and orbit positions:

```typescript
assert.deepEqual(
  HOUSE_CONFIG.map(({ id, color, formation }) => ({ id, color, formation })),
  EXPECTED_HOUSE_PRESENTATION,
);
assert.deepEqual(
  UNIT_CLASS_IDS.map((id) => [id, UNIT_CLASSES[id].lineRank]),
  [["melee", 78], ["spear", 96], ["archer", 52], ["skirmisher", 78]],
);
assert.deepEqual(createBanners(DEFAULT_HOUSE_IDS), EXPECTED_BANNERS);
```

Add an RGB-to-HSL helper in the test and assert circular hue distance from
`#6b3f8f` and `#c04ad8` is above the documented small threshold.

**Step 2: Run the targeted tests and verify failure**

Run:

```bash
npx tsx --test tests/houses.test.ts tests/unitClasses.test.ts tests/keepBannerStructures.test.ts
```

Expected: FAIL because formation, line ranks, keep/banner contracts, and new
palette do not exist.

**Step 3: Implement immutable content and structure types**

Add:

```typescript
export type FormationStyle = "hold" | "charge" | "harass";

export interface HouseFormation {
  readonly spacing: number;
  readonly cohesion: number;
  readonly jitter: number;
  readonly style: FormationStyle;
}
```

Add exact `Keep` and `Banner` interfaces to `engine.types.ts`, replace the
`halls` field with `keep` and `banners`, and add pure keep/banner creation
helpers using the supplied constants.

**Step 4: Run targeted tests and typecheck**

Run:

```bash
npx tsx --test tests/houses.test.ts tests/unitClasses.test.ts tests/keepBannerStructures.test.ts
npm run typecheck
```

Expected: contract tests PASS; typecheck lists the remaining `halls` migration
surface and no unrelated errors.

**Step 5: Commit**

Commit intent: establish one canonical defensive-state contract before
downstream migration.

### Task 2: Migrate threat targeting and structure damage atomically

**Files:**
- Modify: `src/threat/threatTypes.ts`
- Modify: `src/threat/waveDirector.ts`
- Modify: `src/engine/combatDamage.ts`
- Modify: `src/engine/invasionCombat.ts`
- Test: `tests/threatBehavior.test.ts`
- Test: `tests/keepBannerStructures.test.ts`

**Step 1: Write failing combat tests**

Cover:

```typescript
assert.equal(nearestDamage.structureId, "banner:house_a");
assert.equal(stateAfterBannerLoss.keep.hp, stateBefore.keep.hp);
assert.equal(stateAfterKeepLoss.keep.hp, 0);
```

Construct equal-distance inputs in reversed order and assert stable structure-id
tie-breaking. Verify banners are selected before the keep when both are viable
at their shipped positions.

**Step 2: Verify failure**

Run:

```bash
npx tsx --test tests/threatBehavior.test.ts tests/keepBannerStructures.test.ts
```

Expected: FAIL on absent generic defense objectives.

**Step 3: Implement generic defense objectives**

Replace hall snapshots/damages with a discriminated structure identity:

```typescript
type DefenseStructureId = "keep" | `banner:${HouseId}`;
```

Build living objectives from banners, keep, and towers, preserving agent aggro
priority. Route keep/banner damage through one pure reducer and tower damage
through the existing tower reducer. The mage must use the same nearest
keep/banner objective rather than a hall-only path.

**Step 4: Run tests and typecheck**

Expected: targeting/damage tests PASS; no `HallDamage` or `HallSnapshot` remains.

**Step 5: Commit**

Commit intent: make every enemy resolve one stable defensive-objective model.

### Task 3: Migrate lifecycle, production, repair, skills, heroes, and reports

**Files:**
- Modify: `src/engine/tick.ts`
- Modify: `src/engine/population.ts`
- Modify: `src/engine/heroEngine.ts`
- Modify: `src/engine/shopEngine.ts`
- Modify: `src/engine/shopEffectEngine.ts`
- Modify: `src/engine/skillApplication.ts`
- Modify: `src/divine/skillResolver.ts`
- Modify: `src/build/build.types.ts`
- Modify: `src/build/shop.ts`
- Modify: `src/build/shopEffects.ts`
- Modify: `src/build/structures.ts`
- Modify: `src/progression/cardApplicability.ts`
- Modify: `src/content/runSummary.ts`
- Modify: `src/engine/runSummary.ts`
- Modify: `scripts/autoShopStrategy.ts`
- Modify: `scripts/balanceReport.ts`
- Modify: `scripts/balanceSimulation.ts`
- Modify: `scripts/balanceTelemetry.ts`
- Modify: `scripts/checkDeterminism.ts`
- Modify: `scripts/performanceHarness.ts`
- Test: `tests/population.test.ts`
- Test: `tests/shopEngine.test.ts`
- Test: `tests/runState.test.ts`
- Test: `tests/runSummary.test.ts`
- Test: `tests/divineSkills.test.ts`

**Step 1: Write failing lifecycle tests**

Assert:

- keep HP zero produces defeat, banner HP zero does not;
- a destroyed banner yields zero new recruits for its house;
- living-banner houses still recruit;
- `reinforce_keep` preserves the old price/300 repair and targets the lowest HP
  ratio across keep and living banners with stable tie-breaking;
- hero/recruit revival uses the owning live banner and falls back to the keep;
- tower placement rejects overlap with keep and banners;
- summaries and balance telemetry report keep/banner damage without hall fields.

**Step 2: Verify targeted failures**

Run the five listed test files and record expected contract failures.

**Step 3: Implement the full state migration**

Initialize one keep and three banners in `createInitialState`. Replace all
production and respawn lookups with banner ownership. Rename shop ids,
localization keys, purchase records, auto-shop references, and choice
presentation fixtures from `reinforce_hall` to `reinforce_keep`.

Keep existing price curves and repair amount unchanged. Replace `hallHp` and
`hallDamage` report fields with explicit keep/banner equivalents; do not retain
deprecated aliases.

**Step 4: Run targeted tests and typecheck**

Expected: lifecycle tests PASS and TypeScript has no defensive-state migration
errors.

**Step 5: Commit**

Commit intent: finish the atomic runtime migration with no shadow hall state.

### Task 4: Build the deterministic spatial grid and formation adjustment

**Files:**
- Create: `src/agents/spatialGrid.ts`
- Create: `src/agents/formation.ts`
- Modify: `src/agents/movement.ts`
- Create: `tests/formation.test.ts`
- Modify: `tests/disposition.test.ts`

**Step 1: Write failing pure tests**

Construct fixed agents crossing cell boundaries and assert:

```typescript
assert.deepEqual(gridNeighbours, bruteForceNeighbours);
assert.deepEqual(neighbours(shuffled), neighbours(original));
assert.ok(Math.hypot(adjustment.x, adjustment.y) <= effectiveMoveSpeed);
assert.equal(countingRng.count(), 0);
```

The shuffled-input test must compare ascending ids and enforce the eight-agent
cap. Directed intents include engage, flee, keep return, and rank seeking.

**Step 2: Verify failure**

Run:

```bash
npx tsx --test tests/formation.test.ts tests/disposition.test.ts
```

**Step 3: Implement grid and bounded adjustment**

Use 40-unit integer cell coordinates and rebuild once in the combat tick.
Formation receives preselected neighbours and returns one immutable clamped
vector. Zero-distance separation uses deterministic id ordering rather than RNG.
Only the existing idle wander branch may consume jitter RNG.

**Step 4: Run tests and typecheck**

Expected: grid/brute-force, shuffle, clamp, and zero-RNG tests PASS.

**Step 5: Commit**

Commit intent: bound formation cost while retaining deterministic motion.

### Task 5: Implement the shared rank line, house sectors, styles, and fracture

**Files:**
- Create: `src/agents/battleLine.ts`
- Modify: `src/agents/dispositionEngine.ts`
- Modify: `src/engine/invasionCombat.ts`
- Create: `tests/battleLine.test.ts`
- Modify: `tests/defenseIntegration.test.ts`
- Modify: `tests/dispositionDefense.test.ts`

**Step 1: Write failing behavioural tests**

After 200 deterministic ticks assert:

- median spear radius exceeds median archer radius;
- same-house/same-class distance is lower than cross-house distance without
  disjoint sector bounds;
- Stonewake nearest-neighbour median is lower than Duskmere's;
- hold never advances outside `lineRank`;
- harass retreats after a landed hit and re-engages by tick 25;
- destroyed-banner agents have lower rank radius and greater spread than their
  intact-banner baseline.

**Step 2: Verify failure**

Run the three listed behavioural test files.

**Step 3: Implement line targets and styles**

Compute the nearby-hostile centroid with stable nearest fallback. Resolve class
rank, tangent lateral displacement from selected-house order, style offset, and
fracture override as pure target helpers. Feed the target through directed
movement, then the bounded formation adjustment.

Use current `lastAttackTick` for harass retreat. Do not add timers or consume RNG
for rank/engagement movement.

**Step 4: Run tests, determinism probe, and performance smoke**

Run targeted tests, `npm run check:determinism` to expose the expected baseline
change, and `npm run performance` to catch accidental all-pairs work.

**Step 5: Commit**

Commit intent: turn composition, cooperation, and fracture into battlefield
geometry.

### Task 6: Express hero roles through behaviour and render-local motion

**Files:**
- Modify: `src/engine/heroEngine.ts`
- Modify: `src/agents/battleLine.ts`
- Modify: `src/render/heroRenderProjection.ts`
- Modify: `src/render/drawHeroes.ts`
- Modify: `src/render/drawAgents.ts`
- Modify: `src/render/gameCanvasFrame.ts`
- Modify: `src/render/GameCanvas.tsx`
- Test: `tests/heroes.test.ts`
- Test: `tests/heroPresentation.test.ts`

**Step 1: Write failing tests**

Assert Sera's nearest-threat distance is below her house average, Ivy's is
above it, Bren stays on the spear rank, the render tracker retains at most six
ordered Sera points, and living hero labels make zero `fillText` calls while
fall countdown text remains.

**Step 2: Verify failure**

Run hero engine and presentation tests.

**Step 3: Implement deterministic hero targets and drawing**

Override generic targets for the three hero ids without changing hero stats.
Extend the render-local tracker with Sera trail history and threat-facing data.
Draw the trail, shield arc, pulsing Ivy aura, and brighter in-aura allies. Keep
HP bars, outlines, level flourish, fall marker, and countdown.

**Step 4: Run tests and typecheck**

Expected: hero distance and presentation-boundary tests PASS.

**Step 5: Commit**

Commit intent: replace unreadable hero labels with spatial role signals.

### Task 7: Render the keep, banners, fracture, and compact HUD

**Files:**
- Replace: `src/render/drawHalls.ts` with `src/render/drawDefenses.ts`
- Modify: `src/render/gameCanvasFrame.ts`
- Modify: `src/render/drawAgents.ts`
- Modify: `src/render/combatTransientEvents.ts`
- Modify: `src/render/combatTransientSnapshots.ts`
- Modify: `src/render/combatTransientTypes.ts`
- Modify: `src/ui/components/hud/HouseStatusList.tsx`
- Modify: `src/ui/components/HUD.tsx`
- Modify: `src/index.css`
- Modify: `src/styles/phase4b.css`
- Modify: `src/content/locale/en.ts`
- Modify: `src/content/locale/ko.ts`
- Modify: `DESIGN.md`
- Test: `tests/strongholdPresentation.test.ts`
- Test: `tests/combatTransients.test.ts`
- Test: `tests/heroPresentation.test.ts`

**Step 1: Write failing render and markup tests**

Assert one keep and three banners are drawn, fractured agents use reduced alpha
and no outline, a banner transition produces one localized announcement, HUD
markup contains one keep progress element and three banner pips, and the role
word tag is absent while composition labels remain accessible.

**Step 2: Verify failure**

Run the three render/presentation test files.

**Step 3: Implement the visual layer**

Draw keep and banners with tokens declared first in `DESIGN.md`. Rename hall
render modules and sprite presentation references rather than retaining dead
aliases. Add render-local banner-transition tracking. Reduce composition track
height to a thin strip and remove `.house-role-tag` markup/styles.

**Step 4: Run tests, typecheck, and build**

Expected: targeted tests, `npm run typecheck`, and `npm run build` PASS.

**Step 5: Commit**

Commit intent: make one line, three sectors, and banner fracture immediately
legible.

### Task 8: Complete boundary migration, docs, and deterministic baselines

**Files:**
- Modify: every remaining test or script named by the boundary grep
- Modify: `scripts/checkDeterminism.ts`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/DEV_LOG.md`
- Modify: `docs/plans/2026-07-28-phase-5a-house-identity-design.md` only if implementation evidence changes an approved detail

**Step 1: Run boundary greps**

Run:

```bash
grep -R -nE '\\bhalls\\b|\\bHall\\b|HALL_' src tests scripts
grep -R -n 'reinforce_hall' src tests scripts
```

Expected before cleanup: only intentional test descriptions or migration
misses. Update language and contracts until both commands return no product
matches.

**Step 2: Run the full deterministic suite**

Run:

```bash
npm test
npm run check:determinism
```

Record the exact new organic and full-state baselines only after running twice
and proving deep equality. Update the prior 335 tests only where hall semantics
were intentionally replaced and state each reason in `DEV_LOG.md`.

**Step 3: Update decision and development records**

Document the atomic keep/banner migration, rank line, palette, hero-label
removal, repair choice, rejected compatibility model, baseline changes, and no
balance tuning.

**Step 4: Commit**

Commit intent: close the migration with auditable boundaries and replay proof.

### Task 9: Run full DGX verification and real-browser visual QA

**Files:**
- Create evidence screenshots under a non-product QA artifact directory
- Modify product files only if verification exposes a defect

**Step 1: Run full DGX gates**

Run:

```bash
npm run typecheck
npm run build
npm test
npm run check:determinism
npm run performance
npm run balance
```

Record full outputs. Compare performance with 3.830 ms average, 14.289 ms worst,
288 peak entities and balance with 87.5 percent.

**Step 2: Restart the DGX dev server for QA**

Start the existing `hyunlord-game` tmux session on port 3100 with strict port
and `0.0.0.0`, then verify listener, external HTTP 200, and app-shell body.

**Step 3: Run real Chrome QA**

At 375, 768, and 1280 CSS pixels:

- capture StrictMode console errors and warnings;
- capture the mustered line at rest;
- capture an engaged line showing spear/archer layering and house sectors;
- destroy or naturally lose one banner and capture the fracture;
- verify keyboard/focus and HUD readability are not regressed.

The visual verdict must explicitly answer whether front/back ranks, house-held
sections, and the fracture moment read without the HUD. Iterate if any answer is
no.

**Step 4: Re-run affected gates after every fix**

No screenshot or HTTP 200 substitutes for compile, console, or behaviour proof.

### Task 10: Deliver and verify `main`

**Files:**
- No new product changes expected

**Step 1: Mandatory pre-push safety check**

Run on DGX:

```bash
git remote -v
git branch --show-current
git status
```

Require exact origin `https://github.com/hyunlord/hyunlord_nhn_hack_2.git`,
branch `main`, and only intended changes.

**Step 2: Commit final evidence/docs if needed and push**

Use a Lore-protocol commit message, then:

```bash
git push -u origin main
```

Stop on wrong remote, auth, or remote-history conflict.

**Step 3: Prove remote landing**

Run:

```bash
git ls-remote origin refs/heads/main
```

Require remote SHA equals local HEAD. Spot-check remote tree paths for the new
defense, battle-line, tests, and decision docs.

**Step 4: Restart on the pushed commit**

Replace the `hyunlord-game` tmux session, then prove:

- process cwd is the DGX repo;
- `git rev-parse HEAD` equals remote main;
- `ss` shows `0.0.0.0:3100`;
- external address returns HTTP 200 and the app shell.

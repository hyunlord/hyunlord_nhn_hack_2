# Phase 5C Radical Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace text-heavy house, draft, and shop choice surfaces with one progressive-disclosure three-card deck while leaving simulation behavior byte-identical.

**Architecture:** Add pure presentation projections for icon vocabulary, house identity, detail content, and three-item paging. Keep reducers, availability, card effects, and game state untouched. React screens render those projections through existing locale and frame helpers; one Phase 5C stylesheet layer owns the card-deck geometry.

**Tech Stack:** React 19, strict TypeScript, vanilla CSS, Node test runner through `tsx`, Playwright Chromium on DGX for browser evidence.

---

### Task 1: Lock the Phase 5C presentation contract

**Files:**
- Modify: `DESIGN.md`
- Create: `tests/phase5cChoicePresentation.test.ts`

**Step 1: Write the failing test**

Add source-contract tests that require:

- `DESIGN.md` documents the three-card deck, population cluster, shared effect
  icon vocabulary, focus detail panel, and mobile snap behavior.
- house card markup contains no `.selection-composition__track`.
- draft markup contains no visible rarity label or description row.
- shop markup contains no visible description, purchase count, or standalone
  purchase button.
- the Phase 5C stylesheet contains three-column desktop/tablet geometry and
  one-card `scroll-snap` phone geometry.

**Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/phase5cChoicePresentation.test.ts
```

Expected: FAIL because the Phase 5C contract and implementation do not exist.

**Step 3: Document the contract**

Update `DESIGN.md` before component work:

- replace the Phase 5B house/draft/shop component descriptions
- document `--choice-card-*` and `--choice-detail-*` tokens
- document exactly four default information groups
- document page size `3` and mobile snap
- preserve the existing dark palette and frame ownership

**Step 4: Run the focused test**

Expected: design assertions pass; implementation assertions remain RED.

**Step 5: Commit**

Commit the design-system contract with Lore trailers.

### Task 2: Build the typed icon and paging vocabulary

**Files:**
- Create: `src/ui/choicePresentation/choiceVisuals.ts`
- Create: `src/ui/components/ChoiceIcon.tsx`
- Modify: `tests/phase5cChoicePresentation.test.ts`

**Step 1: Write failing unit tests**

Given every `keyof CardEffect`, assert that:

- every field resolves to one of `attack`, `defense`, `healing`, `tribute`,
  `divine`, `mobility`, or `population`
- a multi-effect card selects the first meaningful icon by stable priority
- every shop item resolves to a shared icon
- `pageChoices(items, page, 3)` returns stable non-overlapping groups and clamps
  invalid page indices

**Step 2: Verify RED**

Run the focused test and confirm missing exports cause the expected failure.

**Step 3: Implement minimal pure projections**

Use an `as const` `Record<keyof CardEffect, ChoiceIconName>` and exhaustive shop
item mapping. Keep `unitClass` mapped to population rather than treating it as a
new category. Implement a small generic `pageChoices`.

Render icons as inline SVG with `aria-hidden` controlled by the caller. Do not
add an icon dependency and do not use emoji.

**Step 4: Verify GREEN**

Run focused tests plus `npm run typecheck`.

**Step 5: Commit**

Commit pure projections, SVG component, and tests together.

### Task 3: Simplify house selection

**Files:**
- Create: `src/ui/choicePresentation/houseChoicePresentation.ts`
- Modify: `src/content/locale/en.ts`
- Modify: `src/content/locale/ko.ts`
- Modify: `src/ui/screens/HouseSelectScreen.tsx`
- Modify: `tests/choicePresentation.test.ts`
- Modify: `tests/phase5cChoicePresentation.test.ts`

**Step 1: Write failing behavior tests**

Assert:

- each house has one localized functional identity including its exact
  `startingPopulation`
- dot count equals starting population and spacing comes from formation spacing
- only the strongest one or two trait icons are projected
- initial page contains houses A–C and second page D–F
- default card static markup includes name, identity, cluster, icons, and
  interaction status but excludes trait-number rows and composition bars
- focus detail markup retains all localized numeric traits and class counts
- Korean and English locale keys remain identical

**Step 2: Verify RED**

Run:

```bash
npx tsx --test tests/phase5cChoicePresentation.test.ts tests/choicePresentation.test.ts tests/locale.test.ts
```

**Step 3: Implement the presentation**

- add six functional identity locale keys
- add detail labels for army and formation
- hold `page` and `focusedHouseId` in screen-local React state
- render exactly three `HouseSelectionCard` elements per page
- set focus on hover/focus/click without changing selection semantics
- render exact-count dot spans with one spacing CSS variable
- render one or two shared SVG icons
- collapse deployment slots and synergy output into strips
- remove the standalone roster heading and boxed intelligence panel

**Step 4: Verify GREEN**

Run focused tests and typecheck.

**Step 5: Commit**

Commit house presentation, locale changes, and tests.

### Task 4: Simplify draft cards

**Files:**
- Modify: `src/ui/components/DraftOverlay.tsx`
- Modify: `tests/phase5cChoicePresentation.test.ts`
- Modify: `tests/choicePresentation.test.ts`

**Step 1: Write failing markup tests**

For a real draft offer, assert that each rendered card contains:

- one shared icon
- one name
- one joined typed effect line
- one number-key corner

Assert no visible rarity label, kind label, description, or stack row. Assert a
warning icon keeps the full localized warning in accessible text.

**Step 2: Verify RED**

Run focused tests and confirm old meta/description/stacks markup fails.

**Step 3: Implement minimal draft markup**

- select the icon from `CardEffect`
- join existing `formatCardEffect` output with ` · `
- keep rarity frame variables but remove rarity text
- expose description/stacks through an accessible detail string
- replace warning sentences with a warning symbol plus tooltip/description
- keep current focus trap and number shortcuts unchanged

**Step 4: Verify GREEN**

Run focused tests and typecheck.

**Step 5: Commit**

Commit the draft density reduction.

### Task 5: Simplify and page the shop

**Files:**
- Modify: `src/ui/components/shopOverlayPresentation.ts`
- Modify: `src/ui/components/ShopOverlay.tsx`
- Modify: `tests/choicePresentation.test.ts`
- Modify: `tests/phase5cChoicePresentation.test.ts`

**Step 1: Write failing behavior tests**

Assert:

- stable category ordering flattens into two pages of three
- default shop card contains icon, name, one typed effect line, and cost
- default card contains no description, purchase count, reason sentence, or
  child purchase button
- unavailable cards stay focusable with `aria-disabled`
- clicking an available whole card buys; clicking unavailable does not
- focused detail retains localized description, purchase count, and reason

**Step 2: Verify RED**

Run focused tests.

**Step 3: Implement minimal shop UI**

- add local `page` and focused-item state
- flatten existing category groups without changing their order
- use exactly three cards per page
- use a whole-card button with an `aria-disabled` guard
- show a corner warning symbol for unavailable reasons
- render one attached detail strip for the focused item
- keep tribute, tower placement, and next-wave actions unchanged

**Step 4: Verify GREEN**

Run focused tests and typecheck.

**Step 5: Commit**

Commit the shop deck and its tests.

### Task 6: Apply the shared responsive card-deck presentation

**Files:**
- Modify: `src/styles/phase5b.css`
- Modify: `src/index.css`
- Modify: `tests/phase5bPresentation.test.ts`
- Modify: `tests/responsiveRunLayout.test.ts`
- Modify: `tests/runPresentation.test.ts`

**Step 1: Write failing CSS contract tests**

Require:

- three portrait cards at 768px and 1280px
- one snap-aligned card at 375px
- `transform`/`filter` hover lift and visible focus ring
- no layout-property transition
- reduced-motion override
- translucent draft/shop veils exposing the world
- no legacy numeric house-bar selectors in selection markup

**Step 2: Verify RED**

Run the CSS contract tests.

**Step 3: Implement shared styles**

- introduce one `.choice-deck` geometry shared by all three surfaces
- size cards near 1:1.4 with frame-safe insets
- use CSS custom properties from `DESIGN.md`
- add population-cluster and icon treatment
- add compact page, slot, synergy, and detail strips
- preserve the frame images and transparent interiors
- at phone width, constrain the track to one snap card without body overflow

**Step 4: Verify GREEN**

Run focused tests and typecheck.

**Step 5: Commit**

Commit shared styling and updated responsive contracts.

### Task 7: Browser QA and visual iteration

**Files:**
- Evidence only under `/tmp/phase5c-qa/`

**Step 1: Start isolated DGX server**

Run the worktree in tmux `phase5c-qa` on port `3101`.

**Step 2: Capture after screenshots**

Use Playwright Chromium to capture:

- house selection before/after at 1280×900
- draft before/after at 1280×900
- shop before/after at 1280×900
- house, draft, shop at 375×900 and 768×900
- hover/focus/detail/warning states

**Step 3: Measure behavior**

Record:

- exact default information-group count per card
- visible card count
- body/document scroll width and height
- console warnings/errors
- focused detail visibility
- warning accessible text

**Step 4: Run dual visual QA**

Use `omo:visual-qa` with:

- Pass A: design-system and functional-integrity reviewer
- Pass B: visual fidelity and Korean/CJK reviewer

Both must PASS. Fix any blocking finding and repeat capture/review.

**Step 5: Report the Part 5 checklist**

Record a truthful pass/fail row for house, draft, and shop.

### Task 8: Final verification and delivery

**Files:**
- No new production files unless a verification failure requires a fix

**Step 1: Run complete gates on DGX**

```bash
npm run typecheck
npm run build
npm test
npm run check:determinism
```

Extract the two determinism result lines, hash them, and compare byte-for-byte
with `/tmp/phase5c-determinism-before.txt`.

**Step 2: Audit boundaries**

Confirm no diff from `4fbb805` under protected gameplay directories and verify
the locale key-set parity test covers all keys.

**Step 3: Fast-forward main**

Verify feature and main worktrees are clean, fetch `origin`, require
`origin/main` to be an ancestor, and fast-forward the DGX main worktree.

**Step 4: Verify merged result**

Run the full test suite once more from main.

**Step 5: Push and prove remote landing**

Run mandatory remote/branch/status preflight, push `main`, and require local
HEAD to equal `git ls-remote origin refs/heads/main`.

**Step 6: Restart production tmux**

Replace `hyunlord-game` with the pushed main commit on
`0.0.0.0:3100 --strictPort`. Verify:

- `ss` shows `0.0.0.0:3100`
- DGX localhost and external-IP curls return 200
- a curl from the local Mac returns 200
- root HTML is the app shell
- referenced TypeScript module has JavaScript MIME

**Step 7: Final report**

Include implementation by part, before/after screenshots, Part 5 checklist,
determinism before/after, all test evidence, DGX runtime evidence, commit/branch,
remote landing, GitHub URL, and the required one-sentence house-card density
audit.

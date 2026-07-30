# Phase 5B Dark Interface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the document-like light presentation with the approved dark-fantasy interface without changing simulation behavior or deterministic output.

**Architecture:** Keep current React screen ownership and app-flow state unchanged. Define the dark design system in CSS, add a final Phase 5B stylesheet for cohesive menu/run overrides, and make only the minimum component markup changes needed for correct frame geometry and semantic hierarchy. Verify runtime layout through temporary Playwright tooling outside the product dependency graph.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, CSS, temporary Playwright Chromium on DGX.

---

### Task 1: Lock the visual contract

**Files:**
- Modify: `DESIGN.md`
- Create: `tests/phase5bPresentation.test.ts`
- Test: `tests/phase5bPresentation.test.ts`

**Step 1: Write the failing presentation-contract test**

Assert the exact Phase 5B root tokens, font families, field background, reduced
motion rule, 9-slice panel frame, house safe-inset selectors, and absence of the
three forbidden light literals in `src/`.

**Step 2: Run the focused test to verify it fails**

Run: `npx vitest run tests/phase5bPresentation.test.ts`
Expected: FAIL because the old light tokens and Phase 5B stylesheet remain.

**Step 3: Update `DESIGN.md` to the approved dark system**

Replace stale light/monospace/borders-only guidance with the approved tokens,
typography, backdrop, frame, depth, responsive, accessibility, and
presentation-only contracts.

**Step 4: Commit the contract**

Commit the design system and failing test using the Lore commit protocol.

### Task 2: Implement the shared dark visual system

**Files:**
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Create: `src/styles/phase5b.css`
- Test: `tests/phase5bPresentation.test.ts`

**Step 1: Replace canonical root tokens and global typography**

Set the exact required dark tokens in `src/index.css`, load Noto Serif KR and
Noto Sans KR with `display=swap`, and reserve mono for numeric telemetry.

**Step 2: Add and import the Phase 5B stylesheet last**

Implement shared menu backdrops, panel depth, buttons, type scale, bounded
layouts, panel-frame 9-slice, run viewport containment, reduced motion, and
responsive rules in `src/styles/phase5b.css`. Import it after Phase 4B.

**Step 3: Remove forbidden light literals**

Replace obsolete light surfaces with semantic dark tokens without changing
simulation-owned canvas colors.

**Step 4: Run the focused contract test**

Run: `npx vitest run tests/phase5bPresentation.test.ts`
Expected: PASS.

**Step 5: Commit the shared system**

Commit using the Lore protocol.

### Task 3: Repair framed choice components

**Files:**
- Modify: `src/content/framePresentation.ts`
- Modify: `src/ui/screens/HouseSelectScreen.tsx`
- Modify: `src/ui/components/DraftOverlay.tsx`
- Modify: `src/styles/phase5b.css`
- Test: `tests/phase5bPresentation.test.ts`

**Step 1: Add assertions for transparent frame behavior**

Extend the focused test to reject opaque frame fallbacks and require the
documented house/draft safe-inset custom properties.

**Step 2: Verify the new assertions fail**

Run the focused test and confirm the old solid fallback is reported.

**Step 3: Correct frame composition**

Use the frame art as a transparent decorative layer, expose proportional safe
insets, order composition labels/values before tracks, and keep state and
selection behavior untouched.

**Step 4: Run focused tests**

Run: `npx vitest run tests/phase5bPresentation.test.ts`
Expected: PASS.

**Step 5: Commit the frame repair**

Commit using the Lore protocol.

### Task 4: Refine every menu and run surface

**Files:**
- Modify: `src/ui/screens/TitleScreen.tsx`
- Modify: `src/ui/screens/MetaScreen.tsx`
- Modify: `src/ui/screens/SettingsScreen.tsx`
- Modify: `src/ui/screens/RunSummaryScreen.tsx`
- Modify: `src/ui/components/ShopOverlay.tsx`
- Modify: `src/styles/phase5b.css`
- Modify only if copy changes: `src/locales/en.ts`, `src/locales/ko.ts`

**Step 1: Apply semantic hierarchy**

Ensure one kicker maximum, a dominant Korean serif title, English subtitle,
clear primary actions, muted metadata, and conditional title statistics.

**Step 2: Consolidate dense screens**

Use surface depth and grouped content instead of repeated bordered documents.
Keep every existing action and state transition.

**Step 3: Run locale and focused tests**

Run: `npm test -- --run` and inspect locale-key parity output.
Expected: all existing tests plus Phase 5B contract pass.

**Step 4: Commit screen refinements**

Commit using the Lore protocol.

### Task 5: Run browser layout and visual QA

**Files:**
- No product dependency changes.
- Evidence: `/tmp/phase5b-qa/final/`

**Step 1: Start the isolated worktree server**

Run it in a separate tmux session on a free strict port bound to `0.0.0.0`.

**Step 2: Assert computed layout at three widths**

At 375, 768, and 1280 pixels, verify house content does not overflow its safe
region, run pages have no body scrollbar, and StrictMode produces zero console
errors/warnings.

**Step 3: Capture all required states**

Capture title, house selection, run night, run day/shop, draft, settings, and
run summary with temporary Playwright Chromium.

**Step 4: Perform dual read-only visual review**

Run independent visual-fidelity and layout/accessibility reviews. Fix every
actionable issue, recapture, and repeat until both pass.

**Step 5: Commit any QA fixes**

Commit using the Lore protocol.

### Task 6: Run the complete regression gate

**Files:**
- No expected changes.

**Step 1: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both pass.

**Step 2: Run all tests**

Run: `npm test -- --run`
Expected: 398 baseline tests plus the new presentation contract pass.

**Step 3: Prove determinism parity**

Run the repository determinism command and compare the output byte-for-byte
with `/tmp/phase5b-determinism-before.txt`.
Expected: identical SHA-256
`51ea20ca83b2eec65920b663a3dba8b75b41688f740aa0f12f490826d85549b6`.

**Step 4: Re-run source scans**

Run the exact forbidden-light scans and confirm they return no disallowed
matches. Confirm protected gameplay directories are unchanged from `35f602c`.

### Task 7: Deliver to main and restart DGX

**Files:**
- Git history and DGX tmux runtime only.

**Step 1: Pre-push safety check**

Run `git remote -v`, `git branch --show-current`, and `git status`. Confirm
origin is exactly `hyunlord/hyunlord_nhn_hack_2`.

**Step 2: Integrate without force**

Fetch origin, verify ancestry, fast-forward `main` to the completed branch, and
push `main` without force.

**Step 3: Verify remote landing**

Use `git ls-remote origin refs/heads/main` and require the remote SHA to equal
local `main`.

**Step 4: Restart the product server**

Replace the existing `hyunlord-game` tmux session with
`npm run dev -- --host 0.0.0.0 --port 3100 --strictPort`.

**Step 5: Verify external runtime**

Confirm `ss` reports `0.0.0.0:3100`, fetch the external address from outside
DGX, verify root HTML and referenced JS/CSS bodies, and confirm the runtime HEAD
equals the pushed remote SHA.

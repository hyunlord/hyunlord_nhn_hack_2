# Phase 3F Rarity and Investment Design

## Goal

Make rarity describe frequency rather than a power ladder, add permanent
Legacy-funded starting bonuses without contaminating replay state, and replace
the balance harness's rarity-biased default draft policy with a neutral slot
sample.

## Content composition

The detailed card instructions take precedence over the approximate pool
headline. Preserving every requested house, hero, and skill card produces 38
cards: 14 common, 14 rare, and 10 legendary. The 65/27/8 roll weights remain
unchanged. Five unconditional stat cards move from rare to common, six small
general-purpose commons fill the frequency floor, and two new legendaries add
explicit upside/downside decisions.

Every common has `maxStacks: 3`, every rare has `maxStacks: 2`, and every
legendary has `maxStacks: 1`. Skill grants remain practically one-time because
acquiring the skill removes the card from eligibility, even though their rare
tier declares the common two-stack schema. A common roll never climbs upward;
if no common remains, that slot is omitted.

The new commons cover small max-HP, cadence, tribute, divine-regeneration,
hall-defense-radius, and intermission-heal increments. They deliberately reuse
the existing effect schema and remain useful across alliances.

## Legendary decisions

Existing conditional cards remain situational. Flat legendary cards gain
visible costs:

- Ash Crown prevents Ashvale breaking but slows its attacks.
- Deeproot improves tribute and tower costs but slows Greymoor movement.
- Twin Souls accelerates and strengthens hero returns while reducing regular
  agent durability for the owning house.
- Meteor Fall and Resurgence descriptions expose their high-cost, narrow-use
  active-skill constraints.

The new Zealot's Bargain raises damage while making agents break much earlier.
The new Hollow Crown doubles divine regeneration for its owning house but
prevents that house's hero from reviving. Hollow Crown is a deliberate trap
when that hero is central to the build.

## Persistent investments

`content/investmentConfig.ts` owns the eleven immutable track definitions and
their typed IDs. `meta/investments.ts` owns costs, validation, purchases, and
effect composition. `MetaState` adds an `investmentRanks` record. The
persistence parser migrates the prior version to empty ranks while malformed
or unknown-version data still fails closed to a complete default state.

The app reducer owns investment purchases. The meta screen renders global and
house groups, rank pips, next cost, effect text, disabled reason, and a computed
active-bonus summary.

## Replay isolation

`MetaState` never enters `GameState`, `engine/`, or leaf simulation domains.
Immediately before mounting a run, the app converts ranks into a plain
`StartingModifierBundle`:

- one global `CardEffect`;
- one optional `CardEffect` per house.

`createInitialState(seed, trio, bundle)` folds the global and matching
house effect into the existing trait/synergy `houseBaseEffects`. The bundle is
plain run input and does not become persistent metadata inside `GameState`.
Progression recomputation keeps using those base effects, so investment bonuses
survive card picks and level changes. Retry derives a fresh bundle from the
same current ranks.

## Harness

`PickMode` adds `neutral` and makes it the default. Neutral uniformly samples
an available slot using the existing dedicated card-choice RNG stream, never
the world RNG. `first` remains available but the usage text and decisions
document call it rarity-biased and unsuitable for balance. `random` remains a
backward-compatible alias with its current dedicated-stream behavior.

The report keeps offered and picked counts side by side and adds a global-track
Legacy sink estimate. The estimate divides the exact sum of global rank costs
by observed Legacy per run and reports the result as an observation without
changing rewards.

## UI and renderer

The investment ledger extends the existing border-led meta surface rather than
creating a new navigation layer. It uses semantic sections and buttons,
explicit disabled reasons, readable rank pips, and responsive single-column
fallbacks.

The current canvas renderer has no asset loader and every entity layer draws
primitives directly. Phase 3F does not refactor it. The handoff will call out
the need for a centralized preload/cache plus sprite atlas keys before the
next slice replaces `arc`/`fillRect` calls with `drawImage`.

## Verification

All behavior begins with a failing test. Completion requires the full
test/typecheck/build/determinism/balance gates, exact meta-boundary grep,
desktop/mobile browser purchase-and-next-run proof, draft play showing common
frequency and meaningful legendary choices, StrictMode console cleanliness,
visual QA, five-lane post-implementation review, and remote SHA/tree equality.

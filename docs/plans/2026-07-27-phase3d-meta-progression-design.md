# Phase 3D House Selection and Meta Progression Design

## Goal

Turn the existing deterministic three-house run into a replayable four-screen
loop: persistent meta progression, ordered three-house selection, the familiar
run-loop surface, and an itemized terminal summary. Engine initialization and
wave-start behavior change only through explicit seed and ordered-trio inputs.
Preserve seed reproducibility and every leaf-domain import boundary.

## Architecture

`meta/` is the eighth pure TypeScript axis. It imports content contracts only
and owns legacy accounting, unlock rules, achievements, and versioned storage.
Persistent state never enters `GameState`. A top-level React provider owns
`MetaState`, `appPhase`, the selected trio, the current seed, and the frozen
terminal summary. `GameStoreProvider` mounts only for the `run` phase and
receives the seed and ordered house IDs as inputs.

The engine exposes `createInitialState(seed, chosenHouseIds)` and derives
houses, halls, regular agents, configured heroes, progression state, starting
trait effects, and active synergies exclusively from those inputs. The default
argument remains Ashvale, Thornhold, Greymoor so historic harness invocations
remain comparable. A plain `RunSummary` contract lives in `content/` so engine,
meta, UI, and harness reporting share one contract without leaf domains
importing each other. It includes a stable `runId`, ordered house IDs, outcome
and wave facts, started/surviving agent and hall counts, tower history,
selected-hero survival, active synergies, and betrayal facts. A pure engine
summarizer is the only production source of terminal summaries.

## House setup and synergies

Six houses live in content data. Selection order maps to three fixed spawn
slots: left, right, and bottom-center. Starting traits are structural inputs to
agent creation and are also folded into per-house resolved modifiers. Pair
synergies are order-independent and their effects apply to all three selected
houses once at run start.

Only the three existing houses have named hero definitions in this slice. A
selected trio spawns heroes only for selected houses with definitions, so a
trio can have zero to three heroes. New houses deliberately add no hero or
hero-card content; their identity comes from the specified starting traits and
synergies. Achievement evaluation treats "every hero dead" as false unless at
least one selected hero existed, avoiding a vacuous achievement.

Hidden synergies are resolved mechanically on the first matching run but are
not previewed during selection until discovered. Discovery is included in the
terminal `RunSummary` and persisted only when the run completes; subsequent
selection screens reveal it. Ashvale plus Stonewake and Highreach plus Greymoor
are the two hidden pairs.

## Tower destruction and economy

Tower damage resolution returns both living towers and sorted destruction
records. `GameState` retains short-lived rubble records containing id, position,
and destruction tick, but removes dead towers from the live array immediately.
Placement limits and spacing therefore consider only live structures.

The pre-change diagnosis records attempts, unaffordable purchases, unavailable
domain reasons, placement failures, successes, and remaining tribute for every
category. The working hypothesis is the fixed one-pass sequence across only two
shop windows, but measurement must prove it before behavior changes. The
default harness then becomes a deterministic round-robin shopper that continues
cycling available categories until no purchase can be made, carrying its next
category across intermissions. Tower placement keeps the deterministic
40-pixel scan and consumes no RNG. Prices or kill tribute change only if this
strategy alone misses median unspent tribute under 80 and average towers above
two.

## Betrayal

At wave three start (`nextWaveIndex === 2`), the engine checks for Ashvale plus
Highreach. Immediately before `spawnWave`, it consumes one seeded 25% roll; on
success it uses the next deterministic RNG draw through `assignTraitor` to
choose between exactly those two houses. Non-eligible trios consume no betrayal
draw. The active threat and run facts retain the selected house ID. Combat uses
the existing low-loyalty flee behavior, the run UI shows an unnamed warning,
and the terminal summary reveals the identity.

## Meta accounting

Storage uses a small structural `StorageLike` parameter, allowing browser
`localStorage` in production and in-memory fakes in tests. Missing, corrupt, or
wrong-version payloads return a fresh default without throwing. The meta schema
adds a `victories` counter because Highreach's one-victory prerequisite cannot
be derived reliably from the requested fields.

Finishing a run produces one immutable summary. A pure
`applyRunSummaryToMeta` transaction awards formula legacy once, adds rewards
only for newly earned achievements, updates counters, applies the free
Stonewake betrayal unlock, records synergy discovery, and persists atomically.
`MetaState` retains processed run IDs so React StrictMode or repeated callbacks
cannot double-award a summary. Explicit unlock purchases validate currency and
run prerequisites before deducting points; already-unlocked purchases are
no-ops.

## Screens

- Meta: balance, lifetime stats, six house cards, explicit unlock purchases,
  achievement checklist, and discovered synergies.
- Select: exactly three ordered picks with visible slot numbers, trait summaries,
  and live non-hidden/discovered synergy results.
- Run: existing canvas/HUD/draft/shop loop plus an unnamed betrayal banner.
- Summary: outcome, loss/survival facts, itemized legacy, new achievements,
  betrayal reveal, retry, and return-to-meta actions.

All screens remain routerless, keyboard-operable, and responsive at 375, 768,
and 1280 pixels. Existing border-led visual language and `DESIGN.md` tokens are
extended rather than replaced.

## Harness and verification

`--houses=a,b,c` maps shorthand letters to the six typed IDs. `--houses=random`
deterministically cycles a seed-shuffled list of all 20 three-house
combinations from all six configured houses. It intentionally bypasses player
locks so the balance report can expose future unlock combinations above 70%
victory without sampling gaps. House-choice ordering is separate from world and
draft-pick RNG streams.

Every behavior begins with a failing test. Final evidence includes the complete
test/typecheck/build/determinism/balance gates, boundary greps, production
browser play through all four screens, localStorage reload proof, unlock reuse,
responsive screenshots, console logs, and exact Git remote landing.

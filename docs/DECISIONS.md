# Decisions

## Shared `HouseId` ownership

The initial sample `threatTypes.ts` imported `HouseId` from `agents`, while the
hard dependency rule and completion grep prohibit imports between `threat`
and `agents`. The boundary rule wins: `HouseId` is declared in
`content/houseConfig.ts`, re-exported by `agents/agentTypes.ts`, and imported
directly by `threat/threatTypes.ts`. No specified data field changed.

## Stub return values

Scaffold functions return identity values, empty arrays, `null`, or `0` only
where TypeScript requires a return. They do not represent phase-2 behavior.

## Store skeleton fields

The unspecified `gameStore.types.ts` contains the minimum fields required by
the requested Context + reducer scaffold: `GameAction.type` is the literal
`"stub"`, and `GameStoreValue` exposes `state` and `dispatch`. These fields
belong only to the store API; no fields were added to the specified core game
data types.

## Supporting presentation files

`DESIGN.md` and `src/index.css` are supporting scaffold files. They keep the
placeholder layout organized and token-based without adding interaction,
responsive-design work, or game behavior.

## 2026-07-27 — Deterministic living-world foundation

### Agent heading belongs to simulation state

`Agent.heading` is a persisted radian value rather than an internal render
detail. Movement consumes and updates it deterministically, and replay checks
can therefore compare complete agent trajectories from the same seed.

### Seeded RNG is an explicit dependency

World creation and tick advancement accept the same stateful Mulberry32 `Rng`
instance. No simulation code calls `Math.random`, which keeps spawn positions,
dispositions, turns, and movement reproducible.

### Fixed simulation clock, independent render clock

The store advances at 20 ticks per second from a request-animation-frame
accumulator, capped at five catch-up ticks per frame. Canvas rendering uses its
own animation frame and reads the latest state through a ref. This prevents
React rerenders at display refresh rate while avoiding an unbounded catch-up
spiral after a suspended tab resumes.

### Mutable RNG ref is a deliberate boundary tradeoff

Game state remains immutable, while the seeded RNG is held in a provider ref
and consumed only by reducer actions. Reset replaces that ref together with the
world. This small mutable boundary avoids storing generator internals in UI
state without allowing nondeterministic calls into the simulation. The app does
not use React's development `StrictMode` wrapper because its deliberate
double-invocation of reducers would consume the stateful RNG twice and make
development play diverge from tests and production.

### Phase 2A remains foundation-only

The initial phase is `intervention`, but threats, highlights, endings,
disposition behavior, miracles, and narrative systems remain inactive. Dead
agents are skipped; every other agent state uses the same bounded wander step.

## 2026-07-27 — Playable divine intervention

### Divine targeting uses structural snapshots

`divine/` declares `MiracleTargetSnapshot` with only `id`, string `houseId`,
position, and HP. The concrete `Agent` type satisfies that contract
structurally, so `engine/` can pass agent snapshots to the resolver without
creating a forbidden `divine/` → `agents/` import. Divine code describes plain
outcomes; only engine code mutates the world through immutable state copies.

### Divine state belongs to deterministic world snapshots

`GameState` now stores `divinePower`, per-type `miracleCooldowns`, and
`activeEffects`; `Agent` stores `lastDamagedTick`. These values affect replay,
world consequences, or rendering derived from a specific simulation tick and
therefore belong in the deterministic snapshot.

### Miracle selection remains UI-only

`selectedMiracle` lives in provider `useState`, outside `GameState`. Selection
does not describe the world and must not perturb deterministic no-input runs.
The provider handles selection actions, dispatches cast actions to the engine,
and clears selection after each cast.

### Miracle resolution consumes no RNG

Damage/heal falloff, dominant-house selection, and outcome sorting are pure
functions of event and structural snapshots. Dominance ties sort by ascending
house ID, and effect arrays sort by agent ID. Later narrative randomness must
continue through the engine-owned seeded RNG rather than reusing this resolver.

## 2026-07-27 — Deterministic invasion and betrayal

### RNG contracts are shared, implementations remain engine-owned

`content/random.ts` declares the narrow `Rng` interface used by agents and
narrative systems. `engine/prng.ts` remains the sole generator implementation.
This preserves the no-reverse-import boundary while keeping one ordered random
stream for spawn geometry, traitor assignment, and idle movement. Invasion
spawn draws the mage edge and position before choosing the traitor, then draws
creature positions; this order is part of the deterministic replay contract.

### Cross-axis combat uses structural snapshots in both directions

Narrative threat logic accepts minimal agent snapshots and returns sorted damage
outcomes. Agent disposition logic accepts minimal threat-presence snapshots.
Neither axis imports the other's concrete types. The engine owns orchestration,
aggregates simultaneous hits from a shared pre-attack snapshot, and applies
immutable results.

### First blood starts observation

An invasion becomes `engaged` when either a defender or a threat first lands
damage. The phase changes from `invasion` to `observation` on the following
phase-resolution step; a fixed handoff timeout prevents an indefinitely quiet
invasion. No ending or highlight behavior is activated in this phase.

### Betrayal remains visible but unnamed

Exactly one `House.isTraitor` mirrors the active threat's
`traitorHouseId`. That state affects agent intent, but the HUD and canvas never
print or label the traitor. Fleeing opacity, combat outlines, helping rims, and
stable house colors let players infer disloyal behavior from the simulation.

### Helping and attacks use stable snapshots

Helping is classified after movement from a living-agent snapshot; distance
ties resolve by ascending agent ID. Defender attacks choose from one
pre-attack threat snapshot, ordered by stable target key with creatures before
the mage, and all hits are aggregated before application. This removes
array-order and mid-loop casualty bias.

### Miracles stay available without threat-specific effects

All three existing miracles remain castable during invasion and observation.
Their established agent and house effects are unchanged: they do not directly
damage, heal, or retarget threats in Phase 2C.

## 2026-07-27 — Phase 3A wave-defense skeleton

### Pure reducer supersedes the StrictMode removal

The Phase 2A decision to omit React `StrictMode` contained the symptom but left
an RNG-consuming reducer. It is superseded. Simulation advancement, wave
spawning, casting, and restart now compute their complete next state in the
provider before dispatch. The reducer accepts only a committed snapshot and is
therefore safe under repeated development invocations. `StrictMode` is restored.

### Wave data owns run length

`WAVE_DEFINITIONS` is the sole run-length source. Transition and victory checks
use its length, and creature IDs include the wave index. Extending the array
does not require a parallel literal count in engine code.

### Betrayal is dormant

`assignTraitor` remains as a deterministic, tested function for later
achievement or unlock work, but `spawnWave` does not call it and every Phase
3A threat has `traitorHouseId: null`. All houses remain loyal. Randomly
disabling a player-selected house was judged punitive in the new defense loop.

### Frozen phases use effect-only ticks

Intermission, victory, and defeat increment the clock only so transient visual
effects can expire. They do not move entities, resolve combat, spawn enemies,
regenerate divine power, decrement cooldowns, or accept miracle casts. This
keeps the screen settled without leaving hidden simulation work active.

### Restart seeds advance deterministically

Restart uses `DEFAULT_SEED + run number`. `Math.random` and wall-clock time stay
outside the simulation while each restart still creates a fresh replayable run.

### Intermission healing is temporary

Living agents recover 30 HP when a non-final wave clears. This is scaffolding,
not the final economy. The Phase 3C shop replaces it with purchased recovery.
Dead agents remain dead and the last wave transitions directly to victory.

### Determinism has organic and full-state-machine lanes

The verifier first runs an unmodified no-input simulation to either terminal
outcome and compares the complete state across equal seeds. A second lane
exercises up to 500 live combat ticks per configured wave, then injects the
same deterministic cleared-threat fixture used by transition tests only when
the wave has not already cleared. The two lanes deliberately separate organic
replay proof from complete state-machine coverage without assuming balance
must produce a particular outcome for the default seed.

### Defense is objective-centered and deterministic

Agents first react to personal danger, then defend their own hall, reinforce
the nearest surviving hall after losing their own, and finally return inside a
130-pixel home leash. Hall defense selects the threat nearest the defended
hall, with ascending threat ID as the distance tie-break. That target identity
flows into attack resolution so focus fire is behavioral rather than merely a
movement hint. Wounded timid agents below 35% HP retreat toward a surviving
rally hall; directed engage, return, and retreat paths consume no RNG.

### Phase 3A-fix balance uses measured no-miracle runs

The requested starting values were applied first. Across 200 seeds they
cleared wave 1 in every run but produced 0 victories: 113 runs fell in wave 2
and 87 in wave 3. Agent attack damage was the only post-baseline parameter
changed, from 9 to 20. This preserves enemy cadence and objective durability
while reducing accumulated combat attrition.

The final 200-seed harness measured 69 victories (34.5%), inside the 25–50%
target band. Waves 1 and 2 cleared in all 200 runs; wave 3 cleared in 69. The
median terminal tick was 2,603, while victorious runs ended at a median of
2,383 ticks. Phase 3B draft pacing should therefore reserve roughly two minutes
for a typical 20 Hz no-input run, with the main decision pressure concentrated
in wave 3.

### Halls are engine-owned temporarily

Halls are run objectives in `engine.types.ts` for Phase 3A. They are expected
to move into a `build/` domain with walls and towers in Phase 3C.

## 2026-07-27 — Phase 3B level-up card drafts

### Progression is an independent leaf axis

`progression/` imports only content contracts. It owns XP thresholds, card
eligibility, deterministic offer generation, and modifier folding, but does
not know concrete agents, threats, or miracles. Agent and divine axes declare
the narrow modifier shapes they accept; the engine adapts cached progression
bundles into those structural contracts.

### Draft offers consume world RNG before commit

Threshold processing and offer generation happen in `advanceTick`, where the
provider-owned seeded RNG is available. The pure commit reducer still receives
only a completed snapshot. The balance harness uses a second RNG seeded from
the run seed exclusively for `--pick=random`, so changing the pick strategy
does not consume the world stream.

### Exact contribution supersedes simultaneous defender-hit aggregation

The Phase 2C shared-snapshot attack decision is superseded for damage
application. Defender attacks now resolve sequentially in existing agent-array
order against the current immutable threat snapshot. This retains deterministic
target choice while assigning actual non-overkill damage and the 25-XP killing
blow to the exact attacking house.

### Cached modifiers change only with progression

Each house stores a resolved modifier bundle beside `houseProgress`. Level
growth and card selection are the only recomputation points. Global divine
modifiers multiply across all three house bundles because any house may draft a
divine card; agent modifiers remain scoped to the owning house.

### Draft phase stores its return phase

`draft` is not an alias for intermission. The state records
`phaseBeforeDraft`, freezes everything except tick/effect expiry, and restores
the recorded phase after the FIFO queue empties. This preserves a distinct
intermission seam for Phase 3C's tribute shop.

### Card appeal is preserved; waves absorb the balance correction

The first smoke harness reached 90% victories with default first-card picks.
Rather than weakening the 14-card pool, wave 2 creature HP scaling increased
from 1.15 to 1.30 and wave 3 from 1.30 to 1.60. The final 200-seed first-pick
run measured 52.0% victories and 6.33 drafts per run; random picks also measured
52.0%, with 6.24 drafts per run.

## 2026-07-27 — Phase 3C heroes and tribute construction

### Walls remain out of scope

The existing threat model moves directly toward point targets and has no
pathfinding or collision graph. Adding walls would therefore create decoration
or require a second movement system. Phase 3C spends that complexity budget on
placeable towers with explicit range, cadence, durability, and targeting.

### Heroes are regular deterministic agents with explicit exceptions

Sera, Bren, and Ivy share the normal movement/combat pipeline and stable agent
ordering. Their configured HP, damage, speed, and cadence are folded through
the same progression modifiers. They never flee, revive exactly 600 global
ticks after death at their own living hall or the nearest surviving hall, and
remain dead when no hall survives. Global ticks include frozen intermissions;
this keeps replay timing independent of how long the player studies the shop.

### The build axis stays pure; the engine commits purchases

`build/` owns catalogue data and pure placement checks only. The engine checks
phase, availability, affordability, and placement before deducting tribute.
Rejected purchases return the exact same state reference. Recruit applies only
to houses with a living hall and revives at most five dead regular agents from
the house with the fewest living eligible agents. Tower capacity counts every
committed tower record, including destroyed structures, making the advertised
run-wide limit deterministic.

### Auto-shop has one deterministic priority pass

The balance harness performs at most one purchase for each priority
(`recruit → medicine → tower → hall`) per intermission. Tower positions scan a
40-pixel grid and never consume RNG. `--shop=none` provides the explicit
counterfactual lane. This measures the shipped shop without silently turning
the harness into an optimizer.

### Phase 3C balance moves pressure into later waves

The final wave definitions use creature count/HP multipliers of
`20 × 1.8`, `34 × 2.5`, and `64 × 4.0`; damage multipliers remain
`1.0`, `1.1`, and `1.2`. The foreign-hall reinforcement threshold is 45
pixels and waves enter from one, two, then three edges. Shop prices and hero
stats were not tuned away from their specification.

## 2026-07-27 — Phase 3D persistent Legacy loop

### Persistent progression stays outside replay state

The simulation emits one plain terminal `RunSummary`; meta code applies it
idempotently by stable run ID. Legacy points, unlocks, achievements, discovered
hidden synergies, and lifetime counters live in a versioned localStorage
record, never in `GameState`. Retry preserves the ordered trio but advances the
seed, so persistence cannot contaminate deterministic replay.

### House order is gameplay data

Selection requires exactly three unique unlocked houses. The first, second, and
third picks map to left, right, and bottom-center spawn slots. Traits and
order-independent pair synergies are folded into the existing modifier cache;
only selected houses and their configured heroes are created.

### Betrayal returns as a seeded wave-three event

Eligible alliances roll immediately before wave-three spawning. The chosen
traitor is deterministic, presentation does not name it during the run, and the
terminal summary may reveal it and grant the one-time Stonewake unlock. Hidden
synergies likewise become persistent knowledge only through terminal summary
processing.

### Auto-shop measurements use spendable residue

The Phase 3C priority pass starved towers; diagnostics found zero placement
failures and concentrated failures in affordability. The harness now uses a
tower-weighted round-robin cycle, retains its cursor between intermissions, and
continues until a complete unsuccessful cycle. "Unspent tribute" is measured
after the final actual shop, excluding final-wave income that has no remaining
purchase phase.

### Only measured constants moved

Tower price growth changed from `1.40` to `1.15`. Wave-three creature HP changed
from `4.0` to `5.0`; its damage multiplier remains `1.2`. The final 200-seed
default report measured 38.5% victories, 2.04 towers per run, and 22 median
tribute after the final shop.

## 2026-07-27 — Phase 3E rarity, divine skills, and hero levels

### Rarity budgets preserve the existing card effects

Draft slots roll independently at `65/27/8` common/rare/legendary weights and
fall back only toward lower rarities. A one-time third-slot reroll prevents a
same-rarity offer when another tier remains eligible, while the existing house
card guarantee stays intact. Sharpened Edge remains at its shipped `+12%`
effect and is classified rare rather than being weakened to the common
`+8%` raw-damage ceiling. Rarity colours are centralized beside the weights so
the later art pass can replace presentation without changing draft logic.

### Conditional legends are evaluated at the damage boundary

Static owned-card effects remain cached in `ResolvedModifiers`. Last Bastion
and Ironblood instead use the pure `conditionalModifiers` layer at outgoing
and incoming damage application, where current hall and agent HP ratios are
available. This prevents volatile combat state from entering the modifier
cache. Strict thresholds mean exactly 25% hall HP and exactly 40% agent HP do
not activate the effects.

### Earned skills follow the existing divine resolver boundary

Skill definitions and structural target snapshots live in `divine/`; the
engine alone mutates agents, threats, towers, cooldowns, and power. Skills are
absent at run start and enter `unlockedSkills` in acquisition order through
one-stack draft cards. That order also owns the `R/T/Y/U` hotkeys. The balance
harness uses the same engine casting path and deterministically targets the
enemy position containing the largest in-radius cluster.

### Hero growth is run state, not house or meta progression

Hero XP is awarded only from that hero's actual damage and killing blows.
Level thresholds and derived damage, flat HP, and respawn-time changes are
stored in the deterministic run snapshot. Hero level-ups never open a draft or
change phase. Persistent Legacy state remains outside `GameState`.

### Balance remains deliberately deferred

Phase 3E changes the shipped power surface, so harness results are structural
observations only. No wave multiplier, creature count, shop base price, house
trait, or existing card effect was adjusted to pursue a win-rate target.
Balancing waits until the remaining content slices are complete.

## 2026-07-27 — Phase 3F rarity and investments

### Rarity means frequency, not a power ladder

The approximate 36-card headline gave way to the explicit keep/reclass/add
list. The live pool resolves to 38 cards: 14 common, 14 rare, and 10
legendary. Five unconditional cards moved down from rare to common, six small
commons filled the frequency floor, and the 65/27/8 weights stayed fixed.
Common, rare, and legendary stack limits remain 3/2/1, skill-grant cards stay
effectively one-time once drafted, and common rolls never climb upward. When
the common tier is exhausted, the offer drops the slot instead of falling
back into a higher rarity.

### Legendary tradeoffs stay explicit

The new legendaries carry visible costs and traps rather than quiet upside.
Ash Crown stops Ashvale from breaking but slows its attacks; Deeproot raises
tribute and tower efficiency but slows Greymoor; Twin Souls halves hero
respawn time and boosts respawn HP while lowering regular durability;
Zealot's Bargain adds 40% damage but pushes the break threshold up; Hollow
Crown doubles divine regeneration but disables the owning house's hero
respawn, which makes it a wrong-build trap when that hero is the core of the
plan. Meteor Fall costs 55 divine power and can hit friendly towers, while
Resurgence costs 70 divine power and carries a 600 tick cooldown.

### Investments stay outside replay state

`content/investmentConfig.ts` owns eleven immutable tracks, and the global
lane sums to 7261 Legacy to max. `meta/investments.ts` owns cost, rank
validation, purchase, and effect resolution. `MetaState` v2 adds
`investmentRanks`; the persistence loader migrates v1 to empty ranks and fails
closed on malformed or unknown-version data. Before a run mounts, the app
converts ranks into a plain `StartingModifierBundle` with global effects plus
per-house effects. That bundle is run input only; `GameState`, `engine/`, and
the deterministic leaf domains never store meta state.

### Neutral sampling is the balance default

The harness now defaults to `neutral` slot sampling, which uses the dedicated
choice RNG to sample an available slot uniformly. `first` remains accepted but
is documented as rarity-biased and unsuitable for balance measurement. The
report keeps offered and picked rarity counts side by side, and it also prints
the global investment cost total plus an observed runs-to-max-globals
estimate. The final default 200-run report records 51.6% common offers with
50.0% common picks, 37.5% rare offers with 38.6% rare picks, and 10.9%
legendary offers with 11.4% legendary picks. It averages 137.49 Legacy per
run, implies 53 observed runs to max globals against the 7261 total global
cost, and records 51.5% victories as an observation only. A later default
harness may still supersede these numbers.

### The ledger surface is intentional

The meta screen adds a ledger-style investment action surface rather than a
new navigation branch. Global and house tracks are separated, each card shows
rank pips, next cost, effect text, and a disabled reason, and the right rail
summarizes the active bonuses currently in force. That keeps investment spend
legible without mixing house-scoped bonuses into the global story.

### Sprite swaps are still a later slice

The canvas path is still primitive-based. `GameCanvas` coordinates the draw
helpers directly, and the draw modules use `arc`, `fillRect`, `stroke`,
`moveTo`, and `lineTo`; there is no centralized asset loader, cache, atlas, or
`drawImage` path yet. `public/assets` currently only contains placeholder
`.gitkeep` directories. Moving to sprites will therefore need preload/cache/
atlas work plus draw-module changes, not a simple asset swap.

### Shared global rites resolve once per run

Global investments split into per-house agent effects and once-per-run shared
effects before engine initialization. This prevents Divine Grace from
compounding once for every selected house: rank one resolves to exactly
`1.08`, and rank four resolves to `1.08^4 = 1.36048896`. Per-house effects
such as Vigor still reach every selected house, while house tracks remain
scoped to their owner.

### Verification is complete with one viewport limitation

The final gate passed 197 tests, TypeScript, the production build, both
determinism lanes, boundary greps, diff hygiene, and the default 200-run
neutral harness. Real-browser QA completed two runs, purchased Vigor rank one,
and confirmed the next run HUD displayed `Legacy rites`, the track rank, and
the `+10 max HP` effect with no fresh-session console warnings or errors.
The available in-app browser surface was fixed at 1280px and its security
policy rejected alternate viewport emulation, so 375px and 768px were verified
through the shipped responsive rules and focused review rather than fresh
browser captures.

## 2026-07-27 — Phase 3G-1 sprite infrastructure

### Fractional pivots keep source and world geometry separate

The sprite manifest stores source-frame geometry and world render size as
distinct fields. That lets the art stay sheet-sized while world placement stays
measured in gameplay units. Center pivots remain the default for halls,
towers, agents, creatures, and the dark mage; hero sprites use a centered x
pivot with a 0.75 y pivot so the feet sit on the ground line.

### Tinting keeps shading through source-in plus multiply

Tinting first applies `source-in` to colorize the sprite mask, then multiplies
the original sheet back over the tint. That choice preserves transparent edges
and flat pixel-art shading better than a single flat fill.

### The tint cache is capped at 64 entries

Tint surfaces are cached by sprite ID and normalized color. The cache evicts
the oldest insertion when the next variant would exceed 64 entries.

### Primitives stay as the fallback until art proves itself

`drawSprite` returns `false` on missing assets, disabled sprites, bad geometry,
or any render failure. Every world drawable keeps its existing primitive draw
path behind that boolean, and those primitives remain the permanent fallback
for now because the asset folder is still empty and tiny agent/creature
legibility is not yet proven by art.

### First art slice uses separate files, not an atlas

The first sprite slice uses individual PNG files for each drawable rather than
a packed atlas. That keeps the initial art work independent and avoids adding
atlas plumbing before the asset set exists.

### This slice does not change balance

Sprite infrastructure is presentation-only. No balance, simulation, or tuning
values changed in this slice.

## 2026-07-28 — Phase 3I unit classes and living armies

### Class stats have one content owner

The four regular classes live in `unitClassConfig.ts`. Combat, movement,
factories, and fallback drawing all consume that table, which prevents a
rendering radius or attack cadence from becoming an accidental second balance
source. Heroes retain their existing identity and progression but use melee as
their regular-unit baseline.

### Roster allocation is deterministic integer apportionment

House roster weights are converted to exact counts with largest remainder.
Equal fractional remainders resolve in fixed order: melee, spear, archer,
skirmisher. This same allocator creates starting armies and wave recruits, so
the configured total is never lost to independent rounding.

### Population is production, not healing

Wave starts add fresh regulars at each living hall. Growth and cap scale from
the house's current level, living regulars count against the cap, dead regulars
do not, and destroyed halls add zero. Existing wounded agents keep their HP.
Recruit Squad shares the cap boundary so the shop cannot bypass production
limits.

### Range control stays deterministic

Preferred-range movement has three bands: advance beyond 110%, retreat at 90%
speed inside 70%, and hold between them. Directed movement consumes no RNG.
Attacks beyond 25 world units create a four-tick house-colored line effect;
the effect is presentation state and cannot affect combat results.

### Modifier order is explicit

Class base stats are followed by house traits, global investment, house
investment, drafted cards, and lastly conditional combat effects. Modifier
bundles normalize additive bonuses by summation and multipliers by product,
then each consumer applies the bundle to the class base once.

### Phase 3G-2a art is now active

The battlefield background moved into the world asset namespace. House and
rarity frames are enabled using normalized transparent-content insets, panels
use the 64-pixel nine-slice corners, and draft backdrop plus divine gauge are
wired. Missing class sprites keep shape-specific primitive fallbacks.

## 2026-07-28 — Phase 3J rough balance restore

### Diagnosis precedes tuning

The untuned 200-seed `abc` run cleared waves one and two 100% of the time and
won 90.5% of runs. Median living-agent counts were 76→59, 93→59, and
103.5→31.5 across the three wave boundaries. Median kills/spawns were 36/36,
60/60, and 112/112; median clear times were 536.5, 674.5, and 1412 ticks.
Mage-only time was zero ticks. Hall damage occurred in 1%, 29.5%, and 83.5%
of the waves, with median damage 0, 0, and 900. Median divine power spent was
zero. Regular-unit deaths were 50.3% Warriors, 25.2% Spearmen, 5.0% Archers,
and 19.6% Skirmishers.

The clearest causes were the 103.5-agent median army entering wave three and
enemy durability that still allowed a median 112/112 kills. The player never
needed divine power, while the first two waves removed too little strength to
make the final wave uncertain.

### One enemy-side constant restores a measurable game

Only wave three `creatureHpMultiplier` changed. It moved from 5.0 to 7.5,
which reduced victory from 90.5% to 55.5%, then from 7.5 to 8.5, which
reduced victory to 44.5%. Counts, damage, attack timing, hall damage, units,
heroes, cards, rarity, shops, investments, and growth all remain unchanged.

At 8.5, wave three clears in 44.5% of runs, median kills fall to 92/112,
hall damage occurs in 98.5% of runs, and median hall damage is 1800. Waves
one and two still clear 100%; changing their curve would require another
balance lever and then compensating wave-three work. This pass therefore
stops at the requested playability target instead of expanding into the full
balance pass.

### Parallel measurement is deterministic

The harness defaults to the host CPU count, accepts `--workers=N`, gives each
worker a contiguous seed block, and sorts returned samples by seed. A real
worker-thread regression test asserts both the complete sample array and the
formatted report are exactly equal to a one-worker run. This infrastructure is
measurement-only and does not affect the simulation.

On DGX Spark, the untuned 200-seed serial run took 2608.10 seconds and the
20-worker run took 215.07 seconds, a 12.13× wall-clock speedup.

The 2,000-seed random-trio sweep gave every one of the 20 trios exactly 100
runs. `abe` was below the review floor at 9%. Thirteen trios exceeded 75%:
`abd`, `acd`, `acf`, `ade`, `adf`, `bcd`, `bcf`, `bde`, `bdf`, `cde`,
`cdf`, `cef`, and `def`. These are observations for the full balance pass,
not reasons to add trio-specific tuning here.

## 2026-07-28 — Phase 4A game framing

### Day and night remain a render concern

`dayNightFactor` is computed by `render/dayNight.ts` from the simulation phase,
the previous render target, and a render-owned tick tracker. A target change
interpolates over 30 simulation ticks, approximately 1.5 seconds at the normal
20 Hz rate. The factor tints the background and agent outlines but never enters
`GameState`, so presentation cannot alter reducer purity or replay identity.
A flagged daylight raid supplies a render option that keeps combat daylit
without changing this boundary.

### Locale dictionaries are the player-facing string contract

Korean and English dictionaries export the same typed key set. React receives
the active translator through `LocaleContext`; display helpers translate
data-owned houses, heroes, cards, classes, achievements, investments, and
effects without replacing their stable simulation identifiers. Missing keys
fall back to the key and warn once per language/key pair so a partial
translation remains usable and diagnosable.

Language is stored with the other versioned settings under
`hyunlord.settings.v1`, separate from both meta progress and `GameState`.
Corrupt or version-mismatched settings fail closed to Korean, 1× speed, and
screen shake enabled.

### The run is a fixed game viewport

Only the run screen is fixed to `100dvw × 100dvh`. A contained 8:5 stage
letterboxes the 960×600 world, with all status, ability, economy, draft, and
shop surfaces positioned over the battlefield. Menu screens keep document
layout and scrolling. Run-specific root overflow locking prevents fractional
device-pixel rounding from creating a page scrollbar, while mobile shop rules
keep the battlefield and the next-wave action reachable at 375 pixels.

### Daylight raids use the specified content constants

The engine-owned RNG rolls once when a non-final intermission begins. Values
below 0.15 flag the next assault; the first assault is ineligible. Flagged
waves use floor-normalized 70% creature counts, 1.4× rounded agent and hall
damage, day lighting, and 1.5× rounded tribute. Run summaries retain the
one-based wave numbers.

The final 200-seed `abc` observation rose from the Phase 3J baseline of 44.5%
to 52.5% victory. This exceeds the requested 35–45% review band. The specified
daylight-raid event is the only balance-affecting addition in this slice, so no
compensating tuning was made; the result is recorded for the next balance pass.

## 2026-07-28 — Phase 4B visible stronghold command-gate record

### Single stronghold is now the simulation layout under test

The three default houses now deploy around `STRONGHOLD_CENTER = { x: 480, y: 300 }` with north, southeast, and southwest hall slots. The intent tests prove a threat at one hall draws defenders from all three houses, while placement tests keep multiple valid tower positions around the center. This pass deliberately did not retune rosters, card effects, shop prices, wave counts, unit stats, or investment values.

### Player choices expose typed numbers before flavour

Draft, shop, investment, and house-selection copy now route through typed presentation helpers. Card effects are formatted from the actual `CardEffect` fields, including reciprocal attack-speed math, and applicability warnings are projected from live regular-agent, hero, and hall state. The command gate includes an exhaustive formatter test and a missing-locale negative control: removing `selection.slot.southwest` from English made `tests/locale.test.ts` fail, and the file was restored byte-for-byte from a temporary backup.

### Combat feedback remains render-local

Hit flashes, death puffs, volley visibility, hall pulses, shake, and wave banners are derived from renderer snapshots and transient trackers. Boundary checks confirm `src/engine` and `src/state` do not import render/transient modules, and store tests verify no Phase 4B presentation-only keys were added to `GameState`.

### Command lane passed; browser lane is still blocking

DGX command verification passed: `npm run typecheck`, `npm run build`, `npm test` (340/340), `npm run check:determinism`, `npm run assets:check`, `npm run balance`, and `git diff --check` all exited 0. Additional changed-source LOC, structural no-excuse, boundary grep, and missing-locale negative-control evidence is under `/tmp/phase4b-evidence/`.

The 200-seed `abc` balance observation is now 87.5% victory, compared with the prior Phase 4A observation of 52.5%. This is recorded as an observation only; no compensating tuning was made because Phase 4B forbids balance edits outside the specified layout/presentation work.

Todo12 initially failed browser QA for 375px clipping and double-plus numeric copy; the post-fix verification record below supersedes that blocker with Chrome PASS evidence.

## 2026-07-28 — Phase 4B Todo12 post-fix verification complete

The initial real Chrome review correctly failed Todo12 for two defects: 375px choice surfaces clipped/overlapped visually, and Korean flat max-HP card effects rendered with a double plus such as `최대 체력 ++25`. The red tests in `.omo/evidence/task-12-fix-phase4b-visible-stronghold.md` reproduced both issues.

The fix kept numeric signs owned by the formatter (`src/content/locale/ko.ts` no longer hardcodes a plus for `card.effect.maxHpBonus`) and moved phone-width draft/shop overlays out of the compressed 8:5 stage with fixed viewport overlays and internal scrolling. No simulation, state, balance, dependency, roster, wave, shop-price, investment, or card-effect values were changed.

Post-fix Chrome QA is PASS in `.omo/evidence/task-12-browser-phase4b-visible-stronghold.md` with artifacts under `.omo/evidence/phase4b-visible-stronghold/browser-postfix/`: 375/768/1280 shop/daylight captures, 375 selected-house captures, 375 HP draft capture, DOM snapshots, layout metrics, and console logs. The post-fix evidence records `console []`, no `++`, no horizontal scroll, no overlap/clipping arrays for the 375 shop layout audit, and minimum active targets at or above 44px.

Final DGX command gates are green after the browser fix: `npm run typecheck` 0, `npm run build` 0, `npm test` 342/342, `npm run check:determinism` 0, `npm run assets:check` 0 with the known 17 sprite fallbacks, `git diff --check` 0, render/state boundary grep 0, changed-source LOC 0, and structural no-excuse 0. The prior 87.5% `abc` balance observation is reused because post-balance changes were locale, CSS, test, and static-comment only; no balance-affecting source changed after that measurement.

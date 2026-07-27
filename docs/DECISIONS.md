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

# Decisions

## Shared `HouseId` ownership

The goal's sample `threatTypes.ts` imports `HouseId` from `agents`, while the
hard dependency rule and completion grep prohibit imports between `narrative`
and `agents`. The boundary rule wins: `HouseId` is declared in
`content/houseConfig.ts`, re-exported by `agents/agentTypes.ts`, and imported
directly by `narrative/threatTypes.ts`. No specified data field changed.

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

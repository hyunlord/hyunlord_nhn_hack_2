# Phase 5A One Keep, One Battle Line Design

## Goal

Replace three isolated house skirmishes with one shared defensive structure and
one visibly layered battle line. House cooperation, weak composition, and the
moment a house fractures must read directly from colour and motion without
requiring HUD text.

## Approved approach

Use an atomic, boundary-first migration:

- replace `GameState.halls` with exactly one `keep` and three `banners`;
- derive production eligibility and fracture state from banner HP;
- drive rank, lateral bias, formation, engagement style, and hero posture from
  deterministic simulation inputs;
- keep trails, pulses, and other presentation history render-local;
- retain existing economy values while renaming the hall repair item and making
  it repair the most damaged defensive structure by HP ratio.

No compatibility `halls` array or `HALL_*` constant remains after migration.
This prevents two defensive models from silently diverging.

## Defensive structures

`GameState` owns:

```typescript
export interface Keep {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
}

export interface Banner {
  readonly houseId: HouseId;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
}
```

The supplied constants are copied exactly: keep `(480, 300)`, 2400 HP,
26 radius; banners 420 HP, 11 radius, and 52 orbit. Banner positions use chosen
house order at -90, 30, and 150 degrees.

Keep destruction is the only structural defeat condition. A banner at zero HP
blocks that house's wave-start production, makes its agents fractured, and does
not itself end the run. Enemies resolve agents first when within aggro range;
otherwise they target the nearest living banner, keep, or tower with stable id
tie-breaking. Banners naturally take the first structural contact because they
orbit outside the keep.

The former `reinforce_hall` item becomes `reinforce_keep`. It preserves its
existing price curve and 300 HP repair value, and repairs the living keep or
banner with the lowest HP ratio, then stable id. This avoids inventing an
unspecified banner-item price while still allowing both structure types to be
recovered.

## Shared battle line

`UnitClassDefinition` gains the exact `lineRank` values:

- spear 96;
- melee 78;
- skirmisher 78;
- archer 52.

When threats exist, the line faces the centroid of hostiles inside
`KEEP_DEFENSE_RADIUS * 1.6`; if none are inside, it faces the nearest hostile.
With no threats, units muster on their rank ring around the keep. Rank-seeking
is directed movement and consumes no RNG.

Within each class rank, chosen-house order maps to angular biases -28, 0, and
+28 degrees. The bias becomes a tangent displacement scaled by the exact
`LATERAL_SPREAD` value 55. Role layers therefore remain shared while house
colours occupy adjacent, overlapping sections instead of separate camps.

## Formation and engagement

`HouseConfigEntry` gains the supplied immutable formation record. The six
spacing, cohesion, jitter, and style rows are copied without compression.

A pure formation module builds one 40-unit uniform grid per tick. Each living
regular agent queries the 3x3 surrounding cells, filters same-house neighbours,
sorts by ascending agent id, and takes at most eight. Separation and cohesion
produce a combined position nudge clamped to the agent's effective move speed.
Idle jitter remains inside the existing idle wander RNG branch; all directed
movement stays zero-RNG.

Engagement modifies the desired rank:

- `hold` stays at `lineRank`;
- `charge` pushes approximately 20 percent beyond the rank toward hostiles;
- `harass` advances, then uses `lastAttackTick` to retreat toward the keep for
  25 ticks before re-engaging.

The existing attack cadence remains the source of truth; no new harass timer is
stored.

## Fracture

Banner loss is evaluated directly from `banners`. A fractured house uses
cohesion 0.1 and jitter 0.6 for the remainder of the run and seeks
`lineRank * 0.7` toward the keep instead of holding its shared rank. Rendering
reduces those agents' opacity but never below 0.15 and omits their outline.

A render-local transition tracker emits one brief localized HUD announcement
when a banner crosses from living to destroyed. The persistent simulation state
contains no announcement timer.

## Heroes

Hero intent overrides run after generic house/rank intent:

- Sera always seeks the outermost forward rank and ignores house style;
- Bren holds the spear rank and never retreats;
- Ivy holds the archer rank and stays approximately 40 units behind the nearest
  hostile.

The hero render tracker retains six recent Sera positions. Rendering adds her
thin trail, Bren's threat-facing shield arc, and Ivy's tick-driven outward aura
pulse. Allies inside Ivy's effective aura render brighter. Living name/level
plates are removed; hero outline, HP bar, level flourish, death marker, and
respawn countdown remain.

## Palette, rendering, and HUD

The six supplied house colours replace the old palette. A circular hue-distance
test keeps every house away from creature purple `#6b3f8f` and mage magenta
`#c04ad8`.

Canvas rendering draws the keep, then three house-colour banners, shared line,
heroes, and threats. The HUD replaces three hall HP displays with one keep HP
bar and three compact banner pips. Composition bars remain accessible but
become thin strips and lose the role word tag. New tokens and changed structure
contracts are documented in `DESIGN.md`.

## Verification

TDD covers all fifteen explicit requirements, including structural defeat,
banner production gating and target priority, rank/lateral geometry, formation
extremes and clamp, zero directed RNG, grid equivalence, engagement rhythms,
fracture spread, hero distances, and full-run determinism.

All heavy verification runs on DGX:

- targeted tests after each slice;
- `npm run typecheck`, `npm run build`, and the full test suite;
- `npm run check:determinism` with recorded replacement baselines;
- `npm run balance`, reported without tuning;
- `npm run performance`, compared with the pre-change 3.830 ms average,
  14.289 ms worst, and 288 peak-entity baseline;
- real Chrome QA at 375, 768, and 1280 CSS pixels with StrictMode console
  capture;
- screenshots at rest, engaged, and after banner fracture;
- final boundary grep proving no `halls`, `Hall`, or `HALL_*` product contract
  remains.

The pre-change balance observation at
`be5458f699cec7cb99e4926c72844b72ff00b5b5` is 175 victories in 200 runs
(87.5 percent), and all 335 tests passed.

## Rejected approaches

- Keeping `halls` as a compatibility projection: rejected because two mutable
  structure models would diverge.
- Adding a separately priced banner-repair item: rejected because the goal
  prohibits inventing unspecified balance numbers.
- Persisting fracture announcements, trails, or pulses in `GameState`: rejected
  because presentation history must not enter replayable state.
- Naive all-pairs neighbour scans: rejected because cost grows quadratically
  and the spatial-grid requirement is explicit.

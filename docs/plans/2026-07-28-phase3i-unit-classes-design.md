# Phase 3I: Unit Classes, House Rosters, and Dynamic Population

## Status

Approved by the user's Phase 3I specification on 2026-07-28.

## Design

The simulation gains four explicit regular-unit classes. A unit's class owns
its base combat statistics and fallback shape. House identity then changes the
class base through existing house traits, starting investments, drafted cards,
and finally conditional combat bonuses. Heroes remain a separate progression
surface and use the melee class only as their regular combat baseline.

House rosters are data, not random choices. Each house defines class weights,
starting population, per-level recruitment, and per-level cap growth. A pure
largest-remainder allocator converts weights into exact integer counts in
stable class order. Initial creation and every recruitment event use that same
allocator so equal inputs always produce equal populations.

At the start of each wave, every living hall recruits its level-scaled amount
up to its level-scaled population cap. Recruits spawn at full health around the
hall with deterministic RNG placement. Existing wounded units are untouched;
destroyed halls recruit nobody. The Recruit Squad shop item uses the same
capacity rule and can stack without exceeding the cap.

Ranged classes engage at a preferred distance. They advance outside 110% of
that distance, retreat directly at 90% movement speed inside 70%, and hold in
between. Melee and skirmisher preferred range equals attack range, preserving
their close-combat band. Directed advance, retreat, and hold consume no RNG.
Successful ranged attacks emit a four-tick line effect in the attacker's house
color.

The UI activates the shipped frame assets. Card content uses the transparent
interior rectangle as normalized insets, panels use the documented 64 px
nine-slice, the draft backdrop sits behind the overlay, and the divine-power
bar uses the gauge frame. Sprite rendering remains sprite-first with
class-specific primitive fallbacks when class sprites are absent.

## Verification contract

- Pure tests cover apportionment, class stat resolution, modifier order,
  recruitment/caps, destroyed halls, wounded units, standoff bands, zero-RNG
  retreat, class-scoped cards, population history, frame mapping, determinism,
  and reducer purity.
- Static gates: typecheck, build, tests, determinism, asset checks.
- Runtime gates: 200-run balance observation, measured tick cost and peak
  population, and real-browser checks for frames, class silhouettes, growth,
  ranged volley lines, and a clean console.
- Only wave creature counts change for structural balance; all prices, traits,
  rarity weights, and multipliers remain unchanged.

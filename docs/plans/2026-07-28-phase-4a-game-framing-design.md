# Phase 4A Game Framing Design

## Outcome

영광의 밤 opens on a Korean title screen and presents each run as a fixed
960 by 600 game viewport. Menus may scroll; the run may not.

## Architecture

The app starts at title. Locale dictionaries own all display copy while stable
domain IDs remain in content and engine modules. Korean is the default.
Settings use a separate versioned localStorage key; resetting progress clears
only meta state. Simulation speed changes tick dispatch frequency and never
enters GameState.

The run root fills 100dvw by 100dvh with hidden overflow. Its centered 8:5
world is letterboxed, and phase, power, houses, abilities, tribute, shop, and
draft are absolute layers. Touch targets remain at least 44px at 375, 768, and
1280 widths.

GameCanvas owns a render-only dayNightFactor. Phase changes tween between night
and day over 30 simulation ticks. Preparation/wave target night, intermission
targets day, and a daylight raid remains day.

At intermission start, the engine RNG rolls once for the next assault. The
first assault is ineligible. A raid uses floor(normal count * 0.7), multiplies
the existing damage multiplier by 1.4 before rounding, and multiplies clear
reward by 1.5. Summary records its wave number.

Escape cancels tower placement first; otherwise it toggles settings. Settings,
draft, and shop block canvas targeting while active.

## Verification

DGX runs typecheck, tests, build, determinism, balance, asset checks, and real
browser QA. Protected normal-wave, roster, card, shop, hero, rarity, and
investment values may not change.

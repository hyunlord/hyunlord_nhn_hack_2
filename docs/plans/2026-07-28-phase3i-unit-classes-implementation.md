# Phase 3I Implementation Plan

1. Lock the new contracts with failing tests for class configuration,
   deterministic roster allocation, population transitions, ranged movement,
   frame mapping, scoped cards, wave counts, and manifest entries.
2. Add the class and roster content modules, assign a class to every agent,
   and replace regular-agent global combat constants at their use sites.
3. Add wave-start and shop recruitment through one pure capacity-aware
   population function; record per-house population at every wave start.
4. Add preferred-range movement and four-tick ranged attack line events,
   preserving directed zero-RNG behavior and current target tie-breaking.
5. Activate the shipped UI frames, move the world background to its manifest
   path, add class sprite contracts, and draw class-specific fallbacks.
6. Extend summary/HUD reporting and add performance measurement without
   changing unrelated balance values.
7. Update decisions and development log, then run all static, deterministic,
   asset, balance, performance, and browser gates.
8. Review the complete diff, perform the mandatory remote/branch safety check,
   commit with Lore trailers, fast-forward `main`, push, and prove the remote
   SHA and key paths.

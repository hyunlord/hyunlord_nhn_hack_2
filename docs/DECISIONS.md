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

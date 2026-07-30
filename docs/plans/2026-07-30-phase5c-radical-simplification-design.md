# Phase 5C Radical Simplification Design

## Problem

Phase 5B established the dark-fantasy palette and frame assets, but its choice
surfaces still read as documents. House cards expose trait rows, four numeric
composition bars, identity prose, and selection metadata at once. Draft and
shop cards repeat the same mistake with rarity labels, descriptions, stacks,
purchase counts, reasons, and button chrome.

Phase 5C removes information from the default surface. It does not remove the
underlying typed facts or localization. Details remain available only after a
player focuses, hovers, or taps a choice.

## Approved Direction

Use one shared three-card deck grammar across every choice surface.

- House selection shows three large cards per page. Page one contains the
  default houses; page two contains the unlockable houses.
- Draft offers already contain up to three cards and do not paginate.
- The shop shows three large cards per page in stable category order.
- Desktop and tablet show all three cards in the active page.
- Phone layouts expose one card at a time in a horizontal snap track, without
  adding a document scrollbar to the run viewport.

This deliberately resolves the source specification's conflict between
"exactly three large cards" and "the grid of six cards" in favour of the
owner-approved three-at-a-time reference structure.

## Shared Visual Vocabulary

Create a small inline-SVG icon component rather than add a dependency. Icons
are semantic, reusable, and never emoji:

- crossed swords: attack damage and offensive upgrades
- shield: max HP, structure repair, defense radius, and tower construction
- heart: healing and revival
- coin: tribute and economy
- bolt: divine power, miracles, skills, and cooldown/cadence
- boot: movement, formation speed, and skirmishing
- people: population and recruitment
- warning slash: an unavailable or low-applicability choice

Every `CardEffect` field maps to one of these symbols. The draft chooses the
first meaningful effect by a documented stable priority. Shop items reuse the
same vocabulary, so the same mechanical idea always has the same shape.

## House Selection

### Default card

Each portrait card contains four information groups:

1. one large house name
2. one functional identity sentence including starting population
3. one deterministic population cluster
4. one row of one or two dominant trait icons

The dot cluster renders exactly `startingPopulation` dots. Dot gap derives from
`formation.spacing`, so Stonewake's 18 dots are compact while Duskmere's 34
dots occupy a looser field. It replaces the four class-composition bars rather
than decorating them.

Selection order appears as a corner numeral and locked state as a quiet lock
mark. These are interaction states, not additional descriptive rows.

### Progressive detail

Hover, keyboard focus, or tap sets the focused house. A single attached detail
panel exposes:

- the existing localized numeric trait labels
- the existing localized class counts
- formation spacing and style

The detail panel is absent until a card is focused. The data and locale helpers
remain available even though the default card no longer renders them.

### Screen composition

- Deployment slots become one compact strip.
- The standalone roster heading is removed.
- Synergy information becomes a thin strip attached to the deck.
- Page controls are two restrained dots/arrows, not a new boxed section.
- The field backdrop remains visible around and through the card deck.

## Draft

Each card contains:

1. one large effect symbol
2. one-line name
3. one plain-language effect line from the existing typed formatter
4. one corner keyboard shortcut

Multiple formatter lines join into one compact sentence separated by a middle
dot. Rarity text and kind text disappear; rarity remains encoded by the
existing frame and glow. Description and stack count leave the default card.
They remain available in an accessible card label/detail affordance.

Applicability warnings render as a small warning symbol in the corner. Its
localized sentence is available through a tooltip and accessible description.
The overlay veil becomes less opaque so the paused battlefield remains
recognizable.

## Shop

Shop availability remains unchanged. Items are ordered by the existing category
order and divided into two stable pages of three.

Each item contains:

1. one large shared effect symbol
2. one-line name
3. one plain-language typed effect line
4. one corner tribute cost

The whole card is the purchase action. Disabled cards remain focusable through
`aria-disabled` so the warning symbol can reveal the localized reason.
Description, purchase count, and reason move to the shared focused-detail
strip. Category grouping is communicated by stable position and a small
category symbol; repeated category text headers are removed.

The shop veil becomes translucent enough to retain the battlefield. Tower
placement, next-wave behavior, tribute accounting, and purchase reducers remain
untouched.

## Interaction and Accessibility

- Cards lift and glow with `transform`, `opacity`, and `filter` only.
- `prefers-reduced-motion` removes lift without removing focus feedback.
- Pointer hover, keyboard focus, and touch selection all drive the same detail
  state.
- Draft number shortcuts remain `1`, `2`, and `3`.
- Page controls expose localized labels and current-page state.
- Warning symbols have `aria-describedby` text; information never depends only
  on color.
- Korean text keeps semantic phrases together and never forces single-syllable
  orphan lines.

## Responsive Contract

- 1280px: three portrait cards occupy the focal row.
- 768px: three cards remain visible with a reduced but readable scale.
- 375px: one snap-aligned portrait card is visible at a time; the deck scrolls
  horizontally inside the overlay while the run page remains viewport-locked.
- House selection may scroll vertically as a menu, but no card is clipped or
  partially exposed without a snap affordance.
- Draft and shop must not introduce body or document scroll at any required
  run viewport.

## Boundaries

Presentation only. Do not modify gameplay, balance, simulation, RNG, shop
effects, card eligibility, selection rules, or persistent state. The protected
directories remain unchanged:

- `src/agents/`
- `src/divine/`
- `src/threat/`
- `src/progression/`
- `src/build/`
- `src/meta/`
- `src/engine/`

Pure presentation helpers may read their public types but do not write state.

## Verification

- Test-first contracts prove three-at-a-time pagination, four information
  groups, absence of on-card percentage bars/rarity labels/descriptions, icon
  coverage for every `CardEffect` field, and retention of localized details.
- `ko` and `en` locale key sets remain identical.
- Browser evidence covers house, draft, and shop at 375/768/1280, hover, focus,
  touch-equivalent click, warning, locked, and disabled states.
- StrictMode console capture must contain zero warnings and errors.
- Run pages must have no page scrollbar at 375/768/1280.
- Before/after screenshots use the same viewport and are presented side by
  side.
- `npm run typecheck`, `npm run build`, and the full test suite pass.
- `npm run check:determinism` output is byte-identical to `4fbb805`.

# Phase 5B Dark Interface Design

## Goal

Make the fantasy god-sim read as a game rather than a document while preserving
the exact Phase 5A simulation, balance, and deterministic output. This pass is
presentation-only: screens, typography, frame composition, responsive layout,
and visual hierarchy.

## Approved Direction

Direction A is approved: a restrained dark-fantasy command interface. The world
remains the visual anchor, while menus use the existing field artwork under a
strong vertical scrim. Serif display type carries mythic identity; sans-serif
body type keeps Korean and English copy readable. Saturated color is reserved
for houses, divine actions, gold rewards, danger, and threats.

## System

### Color

The canonical interface tokens are:

| Token | Value |
| --- | --- |
| `--bg` | `#0f0d14` |
| `--surface` | `#16131f` |
| `--panel` | `#1e1a2b` |
| `--panel-raised` | `#262034` |
| `--border` | `#3a3350` |
| `--border-strong` | `#4d4468` |
| `--text` | `#e8e4f0` |
| `--muted` | `#9b93ad` |
| `--dim` | `#6d6580` |
| `--divine` | `#63c9c2` |
| `--gold` | `#d9b544` |
| `--danger` | `#d4693f` |
| `--threat` | `#8c5ec0` |
| `--world` | `#1a1613` |

Panels use layered surfaces and soft shadow before borders. Light parchment
fills and hardcoded near-white backgrounds are removed. Text-like whites remain
tokenized through `--text`.

### Typography

- Display: `"Noto Serif KR"`, `"Nanum Myeongjo"`, Georgia, serif at weights
  600 and 800.
- Body: `"Noto Sans KR"`, system sans-serif at weights 400 and 600.
- Numeric telemetry only: the existing mono stack.
- Approximate scale: 2.4rem display, 1.5rem screen title, 1.05rem section
  title, 0.9rem body, and 0.78rem metadata.

Google Fonts are loaded with `display=swap`; the local fallbacks keep the game
usable when DGX or the client cannot reach the font CDN.

### Menu Backdrop

Title, house selection, legacy, settings, and run summary use
`background_field.png`, centered and covered. A vertical dark scrim transitions
from `rgba(15, 13, 20, 0.82)` to `rgba(15, 13, 20, 0.94)`. Panels sit at
approximately 92% opacity so the art supplies atmosphere without harming
legibility.

## Screen Composition

### Title

The Korean title is the dominant serif element and the English subtitle is a
quiet secondary line. The primary start action is unmistakable; legacy and
settings are secondary. Run statistics render only after a recorded run. The
field backdrop may drift subtly through transform-only animation, disabled by
`prefers-reduced-motion`.

### House Selection

The existing failure is geometric, not a text collision: the configured frame
content rectangle occupies only 208 of 512 source pixels, while the markup puts
the header, four composition rows, and footer into that fixed absolute region.
`overflow: hidden` clips the lower rows at every measured viewport.

Phase 5B treats the full framed shield as the card and uses a proportional safe
inset. The frame image is decorative and transparent; no opaque fallback is
painted behind its interior. Header and traits sit above the composition
section. Every composition row orders label/value before its track. House color
is the strongest color on the card. Cards remain fully readable at 375, 768,
and 1280 pixels.

### Draft

Draft cards use the documented 40/56/432/656 interior of the 512x768 source
frames. Rarity art frames a dark translucent surface. Name, effect, status, and
shortcut remain within the safe region. Narrow layouts stack without creating a
page-level run scrollbar.

### Panels and Actions

`panel_frame.png` is rendered as a 9-slice with 64-pixel edges for bounded menu
panels. Primary actions use divine color and stronger elevation; secondary
actions stay neutral. Each screen has at most one kicker. Dense ledger content
uses grouping, spacing, and surface depth rather than repeated boxes.

## Responsive and Runtime Rules

- Menu screens are centered and width-bounded.
- Run layout owns the viewport and avoids page scroll at 375, 768, and 1280
  pixels.
- Overlays scroll internally only when their content genuinely exceeds the
  viewport.
- Interactive targets remain at least 44 pixels high.
- Motion is transform/opacity-only and has a reduced-motion path.
- No presentation state is added to `GameState`.

## Scope Boundary

Allowed work is presentation code, locale copy, CSS, and presentation tests.
Do not modify gameplay, balance, simulation, or the owned directories
`src/agents/`, `src/divine/`, `src/threat/`, `src/progression/`, `src/build/`,
`src/meta/`, or `src/engine/`.

## Verification

Completion requires typecheck, production build, all 398 tests, byte-identical
determinism output relative to `35f602c`, locale-key parity, hardcoded-light
color scans, computed layout checks at 375/768/1280, and a StrictMode browser
run with no console errors or warnings. Final visual evidence covers title,
selection, run night, run day/shop, draft, settings, and summary.


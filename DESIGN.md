# Fantasy God-Sim Design System

## 1. Atmosphere & Identity

A quiet technical frame around a living fantasy simulation. The signature is a
restrained blueprint-like interface surrounding a dark, vignetted world map.

## 2. Color

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Surface | `--surface` | `#f4f1e8` | Page background |
| Panel | `--panel` | `#fffdf6` | Placeholder surfaces |
| Text | `--text` | `#25241f` | Primary text |
| Muted | `--muted` | `#68655b` | Supporting text |
| Border | `--border` | `#b8b2a3` | Surface outlines |
| Accent | `--accent` | `#1f6650` | Canvas label and focus |
| World | `--world` | `#1a1613` | Canvas ground |
| World grid | `--world-grid` | `rgba(255, 245, 220, 0.055)` | Map grid |
| World outline | `--world-outline` | `rgba(0, 0, 0, 0.72)` | Agent outlines |
| Ashvale | content config | `#d4693f` | House agents and HUD swatch |
| Thornhold | content config | `#4f8fbf` | House agents and HUD swatch |
| Greymoor | content config | `#7bb06a` | House agents and HUD swatch |
| Duskmere | content config | `#8c68ba` | House agents and roster swatch |
| Stonewake | content config | `#77818d` | House agents and roster swatch |
| Highreach | content config | `#d3a942` | House agents and roster swatch |
| Lightning | divine config | `#ffd76a` | Lightning button and effect |
| Blessing | divine config | `#8fe3b0` | Blessing button and effect |
| Curse | divine config | `#b06ad4` | Curse button and effect |
| Damage flash | canvas token | `rgba(255, 243, 196, 0.95)` | Recent-hit outline |
| Fallen | canvas token | `rgba(175, 164, 151, 0.65)` | Dead-agent marker |
| Creature | threat token | `#6b3f8f` | Creature body |
| Creature rim | threat token | `#b58ad0` | Creature outline |
| Dark mage | threat token | `#c04ad8` | Dark-mage body and HP |
| Mage pulse | threat token | `rgba(226, 165, 239, 0.65)` | Tick-driven mage locator ring |
| Mage HP track | threat token | `rgba(26, 22, 19, 0.85)` | Mage health background |
| Helping rim | canvas token | `rgba(255, 250, 230, 0.90)` | Cross-house aid |
| Hero rim | canvas token | `rgba(255, 248, 214, 0.96)` | Hero locator outline |
| Hero aura | canvas token | `rgba(123, 176, 106, 0.15)` | Greymoor aura fill |
| Hero aura rim | canvas token | `rgba(160, 214, 139, 0.40)` | Greymoor aura outline |
| Draft veil | `--draft-veil` | `rgba(26, 22, 19, 0.86)` | Paused-world overlay |
| Draft panel | `--draft-panel` | `#fff8df` | Draft card surface |
| Draft ink | `--draft-ink` | `#252016` | Draft card text |
| Draft accent | `--draft-accent` | `#d8c879` | Draft borders and labels |
| Common rarity | rarity config | `#9aa0a6` border / `#50545a` text | Common draft identity |
| Rare rarity | rarity config | `#5aa9e6` border / `#1f638f` text | Rare draft identity |
| Legendary rarity | rarity config | `#e8b73a` border / `#73520a` text | Legendary draft identity |
| Meteor Fall | skill config | `#f06b3e` | Skill border and selected state |
| Sanctuary | skill config | `#7ed6a5` | Skill border and selected state |
| Chains of Dusk | skill config | `#8e73d1` | Skill border and selected state |
| Resurgence | skill config | `#f3d37a` | Skill border and selected state |
| Hero progress | HUD token | `#e8b73a` bar / `#9d7217` text | Hero XP and level emphasis |
| Shop veil | `--shop-veil` | `rgba(26, 22, 19, 0.96)` | Intermission shop surface |
| Stronghold ground core | `--stronghold-ground-core` | `rgba(149, 116, 72, 0.18)` | Worn-earth center below the shared keep and three banners |
| Stronghold ground rim | `--stronghold-ground-rim` | `rgba(94, 72, 48, 0.08)` | Outer falloff for the radius-170 stronghold patch |
| Keep stone | canvas token | `#8f8a7d` | Shared keep body |
| Keep HP | canvas token | `#d8c879` | Shared keep health fill |
| Banner fallen | canvas token | `#3d3732` | Destroyed banner marker |
| Fractured agent | canvas alpha | `0.35` minimum `0.15` | Reduced-opacity house agents after banner loss; no outline |
| Composition empty | `--composition-empty` | `color-mix(in srgb, var(--border) 18%, transparent)` | Zero-agent class-composition track |
| Composition divider | `--composition-divider` | `rgba(0, 0, 0, 0.42)` | Hairline separation between class-composition segments |
| Choice effect text | `--choice-effect-text` | `color-mix(in srgb, var(--text) 78%, var(--accent))` | Numeric effect lines on choice cards |
| Choice warning text | `--choice-warning-text` | `color-mix(in srgb, #d4693f 72%, var(--draft-ink))` | Applicability and raid warning copy |
| Combat hit flash | `--combat-hit-flash` | `rgba(255, 243, 196, 0.95)` | Recent-hit outline and ranged volley emphasis |
| Combat death puff | `--combat-death-puff` | `rgba(214, 196, 161, 0.45)` | Render-local death-puff fade |
| Defense pulse | `--defense-pulse` | `rgba(255, 214, 138, 0.32)` | Keep and banner damage pulse and low-HP attention |
| Wave banner ink | `--wave-banner-ink` | `#fff8df` | Wave-start banner text |
| Motion quick | `--motion-quick` | `140ms` | Targeted hover/active feedback |
| Motion combat | `--motion-combat` | `300ms` | Render-local combat transient fade |
| Motion easing | `--motion-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | GPU-composited UI and combat motion |
| Valid placement | canvas token | `rgba(108, 190, 132, 0.22)` | Valid tower preview |
| Invalid placement | canvas token | `rgba(214, 91, 76, 0.22)` | Invalid tower preview |
| Tower stone | canvas token | `#8f8a7d` | Tower body |

The simulation colors are owned by content configuration so canvas and HUD use
the same house identity.

## 3. Typography

The primary stack is `ui-monospace, SFMono-Regular, Menlo, monospace`.
Page titles use `1.5rem`, section titles use `1rem`, and body text uses
`0.875rem`, all with readable line height.

## 4. Spacing & Layout

Spacing uses a 4px base. The scaffold uses 8px, 16px, 24px, and 32px tokens.
The content width is capped at 1200px and arranged with CSS Grid.

## 5. Components

### Placeholder panel

- Structure: a semantic section with a heading and phase-2 note
- Spacing: 16px internal padding
- States: static only during scaffolding
- Accessibility: labeled semantic regions and visible text

### Living-world canvas

- Logical size: 960 by 600, scaled for device pixel ratio
- Surface: dark ground, 40px grid, and inexpensive radial vignette
- World bodies: sprite-backed first, with the existing primitive silhouettes as
  the exact fallback while assets are absent or disabled
- Accessibility: descriptive canvas label; live counts remain readable in HUD

### Sprite-backed world contract

- The living-world contract is one canvas surface, one attempted sprite draw
  per drawable, and the exact primitive fallback whenever `drawSprite` returns
  `false`
- Pixel-art draws disable image smoothing only around the draw call and snap
  destination coordinates to the current device pixel ratio so sprites stay
  crisp on HiDPI screens
- The dev-only sprite overlay uses the dedicated `sprite-debug-overlay`,
  `sprite-debug-overlay__header`, `sprite-debug-overlay__status`, and
  `sprite-debug-overlay__missing` classes; `Shift+D` toggles it and shows
  ready, missing, and total counts plus the missing IDs
- `framePresentation.ts` keeps `frameSpriteEnabled: false` for the rarity and
  house-selection frames, so the current border-and-label UI remains the
  visual default until art exists
- The borders-only treatment stays in force: this slice adds no shadows,
  glows, or new surface tokens

### World HUD

- Tick count and current/max divine-power meter
- One native progress element reports shared keep HP and three compact,
  house-labelled pips report banner integrity
- One row per house with configured swatch, living-agent count, and power
- Legacy rites appear as a compact bordered run summary only when permanent
  investments are active for global or selected-house tracks
- Run-visible rites name the track, rank, scope, and per-rank effect without
  storing MetaState in GameState or implying unselected-house effects apply
- Existing scaffold spacing and border treatment remain unchanged
- Phase 4B composition bars use one accessible thin stacked strip per house.
  Segment widths derive from living regular-agent class percentages, with an
  empty track for zero-agent states and fixed class-order tie-breaking. The
  redundant dominant-role word tag is omitted.

### Unified ability controls

- One semantic button per configured miracle or acquired divine skill with
  label, cost, and cooldown
- Miracles retain `Q`/`W`/`E`; skills take `R`/`T`/`Y`/`U` in acquisition
  order
- The configured ability color drives the enabled border, key, selected state,
  and canvas effect
- Selected state uses a low-alpha tonal fill; disabled state remains legible
- Disabled controls use explicit neutral surface, border, and text colors
  instead of reducing whole-button opacity
- Keyboard focus uses a two-pixel outline and selected buttons expose
  `aria-pressed`

### Invasion status

- HUD phase is always visible; creature count and mage HP appear only after
  the invasion exists
- The traitor is never named in presentation; betrayal is communicated through
  fleeing movement and lower-opacity agent marks
- Creature and mage status remains readable at zero HP/count without changing
  layout

### House progression

- Every house row exposes its current level and cumulative XP
- A native progress element shows XP earned within the current level; max-level
  houses display a full bar
- House color remains the identity cue while all progression text keeps the
  existing compact monospace hierarchy

### Heroes

- Heroes use an 8px body, a three-pixel pale outline, HP bar above, and a
  high-contrast name plate below so labels never collide with health tracks
- Greymoor's support radius is shown with a restrained green fill and outline
- Heroes render after regular agents so their silhouette remains readable
- The HUD gives each hero a named level row and native XP progress element;
  canvas labels include level, and a short gold ring marks a level-up

### Intermission shop

- A six-card grid keeps cost, purchase count, and disabled reason visible
- Tribute is the dominant number; the previous-wave loss summary supplies
  purchase context
- Tower selection enters a map placement mode and defers payment until a valid
  canvas click
- The next-wave action is isolated in a footer to prevent accidental starts
- Numeric effect lines lead flavour copy and use the shared choice-effect text
  token; disabled reasons stay visible as structured text, not opacity-only
  state.

### Level-up draft

- The overlay fills the canvas panel so the paused world remains visible beneath
  a dark veil
- The house color, house name, and newly reached level form the header
- Up to three bordered cards appear side by side at desktop and tablet widths;
  each includes rarity, kind, name, one-sentence description, current stacks,
  and its `1`/`2`/`3` shortcut
- Bright centralized rarity colors identify the three-pixel card border while
  darker companion colors keep the rarity text readable on the light card
- At 520px and below the cards stack vertically to preserve readable text and
  44px minimum targets
- The overlay is a labeled modal region, announces the queued-draft count, and
  accepts both pointer selection and number keys
- Applicability warnings sit after numeric effects and before flavour. Long
  Korean and English lines wrap inside cards rather than widening the canvas
  panel.

### Legacy overview

- A compact ledger leads with Legacy balance, runs, victories, and best wave
- Six house records share one roster grid; locked records expose both price and
  prerequisite without hiding their permanent traits
- Achievement and discovered-synergy ledgers use the same one-pixel dividers
- The primary action is isolated at the bottom of the overview

### Investment ledger

- Global tracks and per-house tracks are separate semantic ledger groups
- Track records show title, description, per-rank effect, rank pips, next cost,
  and a purchase action
- Disabled purchases keep the button visible and pair it with a text reason for
  insufficient Legacy, max rank, or locked house access
- The running bonus summary lists accumulated active effects in readable labels
  so permanent progress is visible without requiring player arithmetic
- The ledger uses the existing panel, border, monospace, and 4px spacing tokens;
  no shadows or ad hoc color roles are introduced

### House selection

- Three numbered deployment slots preserve selection order
- Every house remains visible; locked houses are disabled and marked with a
  restrained diagonal hatch
- A live intelligence panel reveals public synergies and only previously
  discovered hidden synergies
- Confirmation stays disabled until exactly three unlocked houses are selected
- Selection cards reuse the same class-composition projection as the HUD and
  keep numeric trait/roster lines before identity prose.

### Keep, banners, and combat transients

- The shared stronghold is marked by one radius-170 worn-earth patch centered at
  `STRONGHOLD_CENTER`; it renders below the keep, three banners, towers, the
  shared battle line, heroes, and threats. The simulation's
  `KEEP_DEFENSE_RADIUS` is 230 world units and is distinct from this visual
  ground-patch radius.
- Canvas structure order is exactly one neutral keep followed by three
  house-colour banners. Destroyed banners retain a compact fallen marker.
- `drawDefenses` owns that keep-then-banner order. Banner HP controls each
  house's wave-start recruitment and fractured presentation; only keep loss
  ends the run.
- Keep and banner damage pulses, death puffs, ranged volleys, wave-start
  banners, and one-shot localized banner-destruction announcements are
  render-local effects.
  They consume simulation facts read-only and never add presentation keys to
  `GameState`.
- Agents whose banner has fallen render at `0.35` alpha, clamped to the
  documented `0.15` floor, and omit every outline.
- Combat motion uses transform and opacity only. Shake is setting-gated and
  applied to the canvas wrapper, not layout dimensions.

### Run summary

- The outcome headline is paired with a factual run ledger, not a celebratory
  illustration
- Legacy earnings are itemized by base, waves, victory, surviving agents,
  surviving banners, and newly earned achievements
- Retry preserves the ordered trio with a fresh seed; return exits to the
  persistent Legacy overview

### Betrayal notice

- A bordered notice appears above the world while betrayal is active
- The traitor remains unnamed during the run
- The notice uses text and border contrast so meaning does not depend on color

## 6. Motion & Interaction

The world advances at a fixed 20 ticks per second while canvas painting follows
the browser animation frame. Both loops cancel on unmount. Agents wander
continuously. Miracle effects use expanding rings and opacity only; no blur,
shadow, or per-pixel animation is added. The canvas cursor becomes a crosshair
only while a miracle is selected. Threat motion follows simulation ticks; the
mage locator pulse derives from the current tick rather than wall-clock time.
Screen transitions use no entrance animation. Hover and focus feedback is
limited to color, border, and background changes.
Phase 4B interaction motion uses the documented quick/combat durations and the
shared easing token; layout properties such as width, height, margin, padding,
top, and left are not animated.

## 7. Depth & Surface

The strategy is borders-only. Placeholder surfaces use a one-pixel border and
no shadows. Draft cards and the draft veil preserve the same rule.

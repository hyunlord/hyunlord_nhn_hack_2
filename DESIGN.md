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
| Draft veil | `--draft-veil` | `rgba(26, 22, 19, 0.86)` | Paused-world overlay |
| Draft panel | `--draft-panel` | `#fff8df` | Draft card surface |
| Draft ink | `--draft-ink` | `#252016` | Draft card text |
| Draft accent | `--draft-accent` | `#d8c879` | Draft borders and labels |

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
- Agents: 4px house-colored circles with a dark one-pixel outline
- Accessibility: descriptive canvas label; live counts remain readable in HUD

### World HUD

- Tick count and current/max divine-power meter
- One row per house with configured swatch, living-agent count, and power
- Existing scaffold spacing and border treatment remain unchanged

### Miracle controls

- One semantic button per configured miracle with label, cost, and cooldown
- The configured miracle color drives the border/accent and canvas effect
- Selected state uses a low-alpha tonal fill; disabled state remains legible
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

### Level-up draft

- The overlay fills the canvas panel so the paused world remains visible beneath
  a dark veil
- The house color, house name, and newly reached level form the header
- Up to three bordered cards appear side by side at desktop and tablet widths;
  each includes kind, name, one-sentence description, current stacks, and its
  `1`/`2`/`3` shortcut
- At 520px and below the cards stack vertically to preserve readable text and
  44px minimum targets
- The overlay is a labeled modal region, announces the queued-draft count, and
  accepts both pointer selection and number keys

## 6. Motion & Interaction

The world advances at a fixed 20 ticks per second while canvas painting follows
the browser animation frame. Both loops cancel on unmount. Agents wander
continuously. Miracle effects use expanding rings and opacity only; no blur,
shadow, or per-pixel animation is added. The canvas cursor becomes a crosshair
only while a miracle is selected. Threat motion follows simulation ticks; the
mage locator pulse derives from the current tick rather than wall-clock time.

## 7. Depth & Surface

The strategy is borders-only. Placeholder surfaces use a one-pixel border and
no shadows. Draft cards and the draft veil preserve the same rule.

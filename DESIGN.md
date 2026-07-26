# Fantasy God-Sim Scaffold Design System

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

- Tick count at the top right
- One row per house with configured swatch and living-agent count
- Existing scaffold spacing and border treatment remain unchanged

## 6. Motion & Interaction

The world advances at a fixed 20 ticks per second while canvas painting follows
the browser animation frame. Both loops cancel on unmount. Agents wander
continuously; no decorative UI animation is added.

## 7. Depth & Surface

The strategy is borders-only. Placeholder surfaces use a one-pixel border and
no shadows.

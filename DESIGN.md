# Fantasy God-Sim Scaffold Design System

## 1. Atmosphere & Identity

A quiet technical staging area for a future fantasy simulation. The signature
is a restrained blueprint-like grid of clearly labeled placeholder surfaces.

## 2. Color

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Surface | `--surface` | `#f4f1e8` | Page background |
| Panel | `--panel` | `#fffdf6` | Placeholder surfaces |
| Text | `--text` | `#25241f` | Primary text |
| Muted | `--muted` | `#68655b` | Supporting text |
| Border | `--border` | `#b8b2a3` | Surface outlines |
| Accent | `--accent` | `#1f6650` | Canvas label and focus |

Only these tokens are used during the scaffolding phase.

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

## 6. Motion & Interaction

No UI motion or interaction is implemented in this phase. The canvas animation
frame exists only to clear the canvas and is cancelled on unmount.

## 7. Depth & Surface

The strategy is borders-only. Placeholder surfaces use a one-pixel border and
no shadows.

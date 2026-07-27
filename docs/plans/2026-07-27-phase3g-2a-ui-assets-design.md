# Phase 3G-2a UI Asset Design

## Goal

Establish one dark-fantasy pixel-art UI family without changing renderer or
gameplay code. Purple remains the threat colour, teal the divine colour, and
warm materials the human colour.

## Asset family

The three tarot frames share a fixed 512 by 768 silhouette and an identical
transparent inner rectangle inset 40 pixels horizontally and 56 pixels
vertically. Common uses restrained dark wood, rare adds tarnished metal and
teal inlay, and legendary adds gilding, arcana motifs, and a controlled inward
glow. Ornament stays outside the content rectangle.

House selection uses a heraldic hanging-banner silhouette at 384 by 512 so it
cannot be mistaken for a draft card. The 512-square panel uses self-contained
64-pixel corners and uniform edge strips for 9-slice scaling. The 256 by 64
divine gauge uses a narrow teal-accented frame with a transparent fill area.

The battlefield is a flat, low-contrast top-down ground texture at 1920 by
1200, with no painted structures, roads, or focal geometry. The 1920 by 1080
draft backdrop is an alpha-only dimming layer with a faint arcana pattern and
approximately 0.75 edge opacity fading to 0.5 in the centre.

## Generation and alpha

All generative inference runs on the configured DGX Spark ComfyUI instance
using SDXL 1.0 and Pixel Art XL. Card variants use one base seed; rare and
legendary use the common result as an IPAdapter style reference. Multiple
candidates remain on DGX and only selected finals enter the repository.

Frames are generated around an exact flat chroma interior. Post-processing on
DGX snaps output to a pixel grid, keys the interior to alpha, enforces the
shared rectangle numerically, and removes chroma fringe before palette
quantisation. Downscaling uses nearest-neighbour only.

## Verification

The UI-specific repository checker parses PNGs without adding dependencies and reports
dimensions, alpha coverage, file size, and card interior bounds. A contact
sheet provides family-level visual review. Completion also requires unchanged
`src/`, clean diffs, and the existing typecheck, build, and test suites.

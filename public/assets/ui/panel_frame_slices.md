# Panel frame 9-slice

`panel_frame.png` is 512 by 512 pixels. Use the same inset on every side:

| Edge | Inset |
|---|---:|
| top | 64 px |
| right | 64 px |
| bottom | 64 px |
| left | 64 px |

The source regions are:

- corners: four fixed 64 by 64 pixel squares
- horizontal edges: 384 by 64 pixels
- vertical edges: 64 by 384 pixels
- centre: 384 by 384 pixels, fully transparent

Keep the corners unscaled. Stretch or tile each edge only along its long axis.
The final asset repeats a uniform middle edge segment, so tiled edges meet
without a visible seam.

# Design Critic Scores (`docs/DESIGN_SCORES.md`)

Tracks independent screenshot-only Design Critic scores (`02-prompts/28-design-critic-loop.md`) across UI phases. Target: `>= 9/10` (hard cap: 3 rounds per screen per phase).

| Phase | Screen | Round | Critic Role | Score (/10) | Key Fixes Applied |
|---|---|---|---|---|---|
| `P1` | Tour, Landing & Office Picker (4 screens) | 1 | Independent Screenshot Critic | `4.5` | Fixed canvas CSS filter washing out custom `#FF4FA0` corridor polyline by moving `CorridorLayer` onto a DOM `google.maps.OverlayView` SVG pane above `<canvas>`, desaturated noisy consumer map POIs, and fixed condensed `Anton` synthetic faux-bolding (`font-weight: 400`). |
| `P1` | Tour, Landing & Office Picker (4 screens) | 2 | Independent Screenshot Critic | `6.8` | Replaced redundant persistent picker + selected card state with a compact Selected Destination Card (`Switch` action + primary `Build my first week` CTA), added asymmetric desktop/mobile camera offset framing, ground-anchored map pins, 4-dot tour progress indicator, multi-pin Bellandur tour spotlight, and mobile dot-collapse for unselected offices. |
| `P1` | Tour, Landing & Office Picker (4 screens) | 3 (Cap) | Independent Screenshot Critic | `8.7` | Ranked ahead of `levels.fyi/atlas/bengaluru` (`8.5/10`). Carry-forward polish queued for `P2`/`P6`: swap sparkle icon on `Build my first week` CTA to a right-arrow/play glyph, soften `Live` status chip border relative to interactive `Tune` button, and link a Cloud Map Style ID to hide native `poi.business` markers. |
| Pending `P2` | Director Progress & Week One Ready | - | Independent Screenshot Critic | - | Scheduled at `T2.5` |

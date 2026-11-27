# 16 · Phase 6: harden, polish and rehearse

**Goal:** nothing can embarrass you in front of a judge. Every state is designed, every failure has a graceful path, and the 3-minute run is rehearsed.
**Where:** Antigravity. Run `03-adversarial-review.md` on the BUILT product first (Carbon, fresh conversation). Then this prompt on Neon.
**Time:** 90 minutes. **Tag:** `p6-demo-ready`.

## Paste this into the lead conversation

```text
Phase 6. One goal: make the live core loop reliable and delightful under judging conditions. No new features.

Branch: create phase/p6-demo-ready from main. Parallel workers use their own worktrees (see .agents/rules/engineering.md, Git).

Read first: @docs/DEMO.md @docs/RISKS.md @docs/TESTING.md @Design.md and the latest adversarial review notes.

Plan first, then wait for "go".

T6.1 Failure paths: for every external call (Places data load, Director, Live, Decisions, Routes, Lyria), define and implement what the player sees on timeout, 429, 503 and offline. Plain one-sentence messages with a retry. Director falls back to Hydrogen, then to the last real cached week for that office, labelled "Replayed from an earlier run".
T6.2 Every screen state from Design.md exists: empty, loading, success, error, offline. Skeletons match final layout so nothing jumps.
T6.3 Performance: LCP under 2.5 s on a throttled "Fast 3G" profile, JS under 250 KB gzipped for first load (lazy-load the live and kit modules), no layout shift on the map.
T6.4 Accessibility: keyboard-only run of the whole loop, visible focus, captions on every voice line, contrast checked, reduced motion respected.
T6.5 Polish pass, in this order:
  a) Subtraction pass on every screen: list each element, ask what breaks without it, remove what adds nothing (purposeless glows and gradients, random highlight colours, labels the image already explains, extra containers, custom controls worse than native ones). Show a removed-elements list.
  b) Jakub's better-interface audit and Emil's review-animations. Apply fixes as a Before / After / Why table, then implement.
  c) One final design critic round (02-prompts/28) per screen of the demo path. Every screen at 9/10 or better, or the gap accepted in DECISIONS.md.
T6.6 Ops: min instances 1, rate limiter tuned, a /api/health check on all upstreams (without spending tokens), structured logs reviewed in Cloud Logging for errors.
T6.7 Demo kit: a "Demo" query param that preselects nothing but shows a subtle presenter timer; a printed checklist in docs/DEMO.md; run the full 3-minute script 3 times on the live URL and record times.
T6.8 Ship with the ship-phase skill.

Done when: three consecutive rehearsals finish under 3 minutes with zero errors, and the adversarial review's top findings are fixed or consciously accepted in DECISIONS.md.
```

## Raise the bar (only if all green with 45 minutes spare)
- A living landing hero: a 5 to 8 second looping clip from Gemini Omni 1.2 Flash (for example an auto-rickshaw idling under the dusk sky) rendered on a solid background, keyed out and layered behind the office question. Generate once, compress, lazy-load, respect reduced motion, and check it frame by frame in the browser. Skip it if it costs more than one attempt or hurts load time.

## Next
`30-ship-cloud-run.md` (if anything about deploy is shaky), then `31-submission-pack.md` and `32-demo-video.md`.

# Mobile presentation review — v0.25.3

Base: v0.25.2, main `10492b4bcd0c1a41ce369789a973d83d4281b6cb`.
Branch: `v0253-ui-ux`.
Accepted implementation: `18a3cff769731b41475c9c06b337d4dacccd7cf0`.

The user requested an independent UX review, a minimum score of 8/10 and at
most three design iterations. Two iterations were evaluated against the same
rubric. These are expert judgments, not player-study measurements.

| Criterion | Weight | Iteration 1 | Iteration 2 |
| --- | --- | --- | --- |
| Mobile readability and touch controls | 25% | 7.5 | 8 |
| Board and hand priority | 25% | 8 | 8 |
| Restrained visual identity | 20% | 8.5 | 8.5 |
| Score and cascade clarity | 20% | 7.5 | 8.5 |
| Context and accessibility | 10% | 7 | 8 |
| Weighted total, rounded | 100% | 7.8 | 8.2 |

Iteration 1 established the borderless Target-left/Score-right hierarchy,
larger text, vertical hand, bottom action row and contextual run menu. The
review requested 44px header controls at short heights, consistent Score copy,
correct Echo/Zero Memory label anchors, honest rounded-value comparisons and
visible cascade evidence.

Iteration 2 resolved those issues. Score and Target abbreviate K/M/B/T using
the English short scale (B = 10^9, T = 10^12), then scientific notation beyond
the suffix range. Tapping either opens its full value. Near-target captions
show the remaining difference; formatted numbers never affect game decisions.
Score remains the last Move result, not an accumulated round total.

Addition labels are white with a dark outline; multiplication labels are dark
with a white outline. Symbols remain explicit. Animation starts at 300ms per
activation and decreases toward a 100ms minimum. Labels are bounded to three;
the result is shown separately. Echo and Zero Memory inherit their physical
half from the corresponding Main operation when their event omits it.

## Evidence

- Iteration 1 CI: run `34371555617`, implementation `2b82b1a945d321d1b7071b3b4e2dd44400f7c02e`.
- Iteration 2 accepted CI: run `34400046399`, implementation above.
- 34 JavaScript files syntax-checked; all 24 Node regression files executed.
- 14 Chromium browser tests passed, including 375x667 and 390x844 opening,
  exact values, dense Endless board, real placement animation, Circuit choice,
  Undo, Inspector, Rulebook and existing modifier/Endless coverage.
- CI `browser-review` artifacts contain actual screenshots and browser video.
- One intermediate CI failure concerned Playwright's video option scope. A
  normal follow-up commit moved it to the test-file level. No gameplay code
  was changed to repair the test configuration.
- CI checks that the committed tree remains unchanged after verification.

The independent reviewer inspected opening, dense Endless and Circuit choice
screenshots plus frames from the actual cascade recording. Video was recorded
at reduced resolution; it supports continuity review, not a physical-device
touch assessment. Acceleration is also covered by deterministic unit checks.
No physical iPhone Safari testing was performed. Long cascades and very dense
machines remain useful playtest cases.

## Gameplay boundary

`engine.js`, `game.js`, `circuits.js` and `gesture.js` remain unchanged from the
base. `data.js` changes only the release version. `help.js` and `mods.js` change
display wording only. Placement, routing and comparator, scoring, zero/rebound,
doubles, parity, activation order, DD/ZM/DE, Long Run, physical IDs, persistence,
shops, economy, targets, board dimensions, Stage Reroll and the current
Circuit rewards (+2/+3/+4) are preserved.

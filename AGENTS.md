# MONOID — Repository Agent Instructions

## Purpose

MONOID is a mobile-first domino roguelike / score-builder in late-stage development.

The core game is already substantially implemented. Work in this repository should now prioritise:
1. finishing remaining gameplay/system work,
2. final UI/UX,
3. tutorial/onboarding,
4. balance and playtesting,
5. release hardening.

Do not turn late-stage development into an architectural rewrite.

MONOID's identity comes from physical domino placement, connectivity, routing, persistent machine construction, network topology, doubles, zeros, parity, tile identity, modifiers on physical tiles, Circuits, POWER, Markets and long-term spatial architecture.

The user's explicit task instructions take precedence over this file.

---

## Source of truth

For current implementation details, use this order:

1. current GitHub `main`,
2. current debug/run data,
3. approved project documentation,
4. conversational memory.

Never guess current behaviour from an older conversation when the repository can answer it.

For visual design, approved Figma work may define the intended presentation. The repository remains authoritative for gameplay behaviour.

---

## Late-stage development rule

The game is no longer a throwaway prototype.

Do not perform broad cleanup, framework migrations, folder reorganisations or speculative abstractions unless they directly unblock a concrete current task or prevent a demonstrated regression.

A cleaner architecture is not, by itself, sufficient reason to rewrite stable code.

Prefer:
- small coherent patches,
- explicit boundaries,
- deterministic behaviour,
- targeted regression tests,
- incremental UI replacement,
- backwards-compatible state/debug data where practical.

Avoid:
- broad rewrites,
- opportunistic refactors during feature work,
- replacing stable engine behaviour for elegance,
- migrating to Unity/another engine during unrelated tasks,
- changing several gameplay systems in one patch.

---

## Real implementation rule

A requested implementation is not complete merely because:
- tests were changed,
- documentation was changed,
- build metadata was bumped,
- version numbers changed,
- a branch/PR was created.

If the task asks for a gameplay, system, UI or UX change, the relevant runtime source must actually implement that change.

Tests must verify the implementation; they must not substitute for it.

Do not bump a version or build to imply progress before the implementation exists.

Docs-only changes should not change the game version or deploy build unless there is a concrete runtime reason.

---

## Current architecture

The repository is a framework-free browser/PWA implementation.

### Core gameplay

- `data.js` — configuration, version, balance values and gameplay constants.
- `engine.js` — deterministic board geometry, placement legality, connections, routing and scoring traversal.
- `game.js` — authoritative run state, seeded RNG, rounds, persistence, hand/reserve, economy, shops, Undo and snapshots.
- `circuits.js` — Circuit detection/reward helpers.
- `mods.js` — modifier definitions and registry.
- `prototype-scoring.js` — experimental Prototype-mode scoring behaviour.

### Presentation / interaction

- `presentation.js` — display-only helpers and the minimal presentation/view-model boundary.
- `ui.js` — main DOM rendering and interaction controller.
- `tutorial-controller.js` — tutorial-only gameplay orchestration/wrappers.
- `ux-pass.js` — tutorial/coach presentation and UX presentation behaviour.
- `ui-runtime-fixes.js` — consolidated runtime gameplay UI composition.
- `ui-late-polish.js` — late presentation/commerce polish.
- `ui-extras.js` — additional tutorial/menu presentation.
- `ui-theme.css` — primary stylesheet.

### Shell / support

- `gesture.js` — pointer/gesture bootstrap and runtime loaders.
- `pwa.js` — PWA shell, install flow and service-worker registration.
- `sw.js` — service worker.
- `update-check.js` — update/build detection.
- `qa-presets.js` — isolated QA fixtures.
- `help.js` — rulebook/inspection support.
- `mode-carousel.js` — mode selection presentation.

Keep these responsibilities separated.

In particular:
- gameplay rules must not move into presentation code,
- UI fixes must not alter routing/scoring,
- `presentation.js` must remain display-only,
- tutorial exceptions belong in `tutorial-controller.js`, not generic UX/UI files,
- QA fixtures must not become runtime game rules.

---

## Core gameplay invariants

Do not change these during unrelated work.

### Physical tile identity

A domino is one physical tile instance with one unique tile ID.

Two dominoes may have identical printed values if legitimately acquired, but one physical tile instance must never exist twice simultaneously.

The two halves of a domino are not independent gameplay pieces.

### Placement

- Matching values connect.
- Rotation is in 90-degree increments.
- The first tile of a run must be a double.
- The game remains ground-plane only.
- Do not reintroduce 3D/vertical building.

### Persistent machine

The machine persists across rounds unless an explicit gameplay change says otherwise.

Do not clear/reconstruct it as a UI or round-transition shortcut.

### Mobile-first

Gameplay must fit on one phone screen without page scrolling.

The board remains the visual focus.

The hand remains vertical on the right.

---

## Scoring and routing are protected behaviour

Treat current engine behaviour as canonical unless the task explicitly changes gameplay.

Do not silently modify:
- placement legality,
- route selection,
- route comparator,
- activation order,
- zero/rebound behaviour,
- doubles,
- odd/even operations,
- Double Double,
- Double Echo,
- Zero Memory,
- T-split,
- POWER arithmetic,
- Circuit detection,
- Circuit rewards/resonance,
- Long Chain,
- target progression.

Always distinguish:
1. placement legality,
2. route selection,
3. scoring operations,
4. balance.

A change in any of the above is a gameplay change, not an implementation detail.

Before changing scoring/routing, reconstruct current behaviour from engine code and supplied debug telemetry.

---

## Economy / progression protection

Do not silently change:
- Shop/Market cadence,
- prices,
- Inflation,
- System Strain,
- coins,
- purchases,
- tile acquisition,
- rerolls/tools,
- Endless progression,
- mode unlocks,
- board dimensions,
- persistence,
- Undo semantics.

Purchases of tiles must create new physical tile instances with unique IDs.

Economy changes require explicit design intent and targeted tests.

---

## Presentation boundary

Use the existing minimal presentation boundary rather than creating a large application-layer rewrite.

`presentation.js` may expose display/view models such as:
- `tileViewModel()`,
- `hudViewModel()`,
- `longChainViewModel()`.

These functions may format or interpret state for display, but must not mutate gameplay state or influence engine decisions.

Do not attempt to migrate every `GAME.state()` access out of `ui.js` merely for architectural purity.

Add presentation helpers only when they directly support current UI implementation.

---

## UI / UX rules

MONOID should feel restrained, adult, graphic and product-design influenced.

Use colour only when it communicates gameplay meaning.

Maintain:
- one-screen mobile gameplay,
- board as primary visual focus,
- vertical hand on the right,
- highly legible Score and Target,
- quiet secondary information,
- accessible debug tools without visual dominance.

Do not solve layout problems by:
- adding page scrolling,
- shrinking the board to irrelevance,
- hiding essential game state,
- changing gameplay geometry.

Approved Figma layouts should be implemented incrementally against the current engine/game state.

Do not rewrite gameplay to make a visual mockup easier to reproduce.

---

## Tutorial rules

Tutorial behaviour may intentionally constrain or stage game state.

Those exceptions belong in `tutorial-controller.js`.

Do not patch `IterionGame`, `IterionEngine`, `game.finishPlacement`, `game.openShop` or placement candidate behaviour from generic presentation files.

Tutorial-specific behaviour must:
- be isolated from normal runs,
- restore wrapped methods when the tutorial ends,
- remain deterministic,
- have regression coverage.

---

## Determinism and state

`game.js` owns authoritative gameplay state.

Preserve seeded reproducibility.

Do not introduce gameplay `Math.random()` calls when seeded RNG should be used.

UI may keep transient interaction/animation state only.

Do not duplicate authoritative game state in presentation code.

Persistent unique tile IDs must survive:
- purchases,
- Undo,
- save/restore,
- round transitions,
- Endless,
- debug export.

---

## Debug telemetry

Debug exports are development evidence.

Do not weaken them during unrelated work.

For gameplay/system changes, keep enough structured information to reconstruct:
- tile ID and values,
- placement coordinates/rotation,
- route/activation information,
- output,
- round/stage,
- economy changes,
- failure reason,
- relevant modifier/Circuit/POWER state.

When debugging scoring, reconstruct what happened before proposing a fix.

---

## Repository editing contract

For every code task:

1. Inspect current `main` and the relevant files before editing.
2. Classify the task: gameplay, state, presentation, UX, economy, progression, persistence or infrastructure.
3. Identify protected behaviour that must remain unchanged.
4. Create the smallest coherent patch.
5. Do not combine unrelated cleanup with the task.
6. Add/update targeted regression coverage when practical.
7. Run automated validation before merge.
8. Merge only a green exact SHA.
9. Verify post-merge `main` CI.
10. Verify deployment when the change is deployable.
11. Report exactly what was tested.
12. Never claim physical-device/browser validation that did not happen.

If a test fails, fix the implementation or the genuinely stale expectation. Never weaken a meaningful regression merely to make CI green.

---

## Branch / PR discipline

Do not edit `main` directly for implementation work.

Use a focused branch and PR.

Before creating a branch, re-read current `main` SHA. If `main` advanced, reassess the patch instead of applying an old diff blindly.

Prefer atomic commits.

Do not let CI mutate source code.

GitHub Actions must test the committed tree, not patch it.

Merge only when:
- syntax passes,
- Node regressions pass,
- Playwright passes where relevant,
- committed tree remains unchanged by CI.

After merge, verify the same checks on `main`.

---

## Version / build rules

Versioning represents implemented software, not intent.

- small fixes: patch version when a release/version bump is actually warranted,
- gameplay/system additions: minor version,
- documentation-only changes: no version bump,
- internal deploy/cache changes may bump build metadata without changing semantic version.

Do not change version numbers before the described build exists.

Do not use a version bump as the implementation.

When a runtime build changes, update all required cache/update references consistently and add/regress tests that catch stale references.

---

## Validation

Use the locked project dependencies.

Minimum automated validation for code changes:

```sh
npm ci
for file in *.js tests/*.js; do node --check "$file" || exit 1; done
for test in tests/*.test.js; do node "$test" || exit 1; done
npm run test:browser
```

The Playwright suite is browser automation, not a physical mobile-device test.

For UI changes, validate the supported mobile fixture sizes and relevant flows.

For changes affecting scoring, routing, persistence, economy, shops, board dimensions or tile identity, add targeted regression coverage whenever practical.

For docs-only changes, full browser validation is not normally necessary unless CI requires it; still verify repository CI before merge.

---

## PWA / caching

PWA caching has caused real user confusion before.

When runtime assets change:
- keep cache/build references coherent,
- preserve update detection,
- verify service-worker/update tests,
- provide a cache-busted test URL after deployment.

Do not tell a user they are on a new build merely because `main` changed; confirm the deployed build.

---

## Completion report

For implementation work, report:
- what changed,
- what intentionally did not change,
- files changed,
- exact tests run,
- PR/merge SHA,
- deployed build/version when applicable,
- cache-busted test URL,
- any validation not performed.

Do not report success before CI/deployment actually confirms it.

---

## Current development posture

Core MONOID gameplay is substantially built.

From this point forward:
- finish the game,
- preserve proven emergent behaviour,
- make remaining systems understandable,
- implement the final UI,
- improve onboarding,
- playtest and balance,
- harden for release.

Do not start another broad cleanup phase unless a concrete production problem proves it is necessary.

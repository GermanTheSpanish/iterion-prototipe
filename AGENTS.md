# MONOID — Repository Agent Instructions

## Mission and authority

MONOID is a late-stage, mobile-first domino roguelike built around physical tile placement, persistent machine construction, connectivity, routing, topology and spatial strategy. Prioritise completing gameplay, UI/UX, onboarding, balance, adaptive audio and release hardening. Avoid broad architectural rewrites.

Current explicit user instructions take precedence. For implemented behaviour, trust current GitHub `main` first, then current debug telemetry and approved documentation; use older conversation history only as secondary context. Approved Figma governs intended visual design, not gameplay rules. Read this file before modifying code.

Do not confuse **implemented**, **verified**, **approved but pending**, **experimental**, or **removed** behaviour.

## Protected invariants

- A physical domino has one persistent unique ID; its halves are not independent pieces. Identical printed dominoes may coexist only as distinct tile instances.
- Matching pips connect; rotation is in 90-degree increments; the first tile is a double; gameplay is ground-plane only.
- The machine persists between rounds unless a specifically approved rule changes that.
- `game.js` owns authoritative state; gameplay RNG is seeded/reproducible. UI may own only transient interaction and animation state.
- Unique tile identity and authoritative rules survive purchase, Undo, save/restore, round transitions, Endless and telemetry.
- Mobile gameplay remains one-screen without page scrolling, with board prominence. The current portrait gameplay-v2 layout uses a horizontal Hand in the bottom rail. Any future landscape layout is a separately scoped, tested responsive-design change.

Do not silently change placement legality, route selection/comparators, activation order, zero/rebound operations, doubles/parity, Double Double, Double Echo, T-split, POWER, Circuits, resonance, Long Chain, or target progression.

Do not silently change Markets, prices, Inflation, System Strain, coins, tiles/tools, rerolls, mode unlocks, board growth, Undo, persistence or progression.

**Zero Memory is removed. Do not reintroduce it.** Old save-migration fields (e.g. `zeroMemoryTileId`) are not active feature definitions; inspect consumers and compatibility requirements before deleting legacy data.

Treat legality, routing, scoring and balance as separate gameplay concerns. Use engine source and telemetry to reconstruct behaviour before making changes.

## Module boundaries

- `engine.js`: deterministic geometry, connections, placement, routing and scoring.
- `game.js`: run state, seeded RNG, inventory, economy, progression, Undo and persistence.
- `data.js`, `mods.js`, `circuits.js`: configuration and gameplay definitions/helpers.
- `presentation.js`, `ui.js` and other UI modules: rendering and interaction only. Presentation helpers must not mutate gameplay state or choose engine outcomes.
- `tutorial-controller.js`: isolated tutorial-specific rules/wrappers; restore wrappers on exit.
- `qa-presets.js`: QA fixtures, never production gameplay rules.
- `pwa.js`, `sw.js`: browser shell and update behaviour, not authoritative gameplay.

Respect existing boundaries. Never move game rules into UI code or patch core engine methods from generic presentation modules.

## Code-health and UI work

The project is no longer a disposable prototype. Prefer small, isolated changes over wide refactors, codebase migrations, wholesale file reorganisation, or cosmetic code churn.

For cleanup work, identify measured costs or concrete defects first. Prioritise unnecessary runtime work, duplicated implementations, CSS specificity/override debt, lifecycle leaks and divergent UI states. Reduce complexity only with equivalent behaviour, focused diffs and regression tests. A smaller file alone is not evidence of a better game.

Keep MONOID restrained, physical and readable. Colour must communicate meaning. Preserve legible Score/Target, clear routes and feedback, unobtrusive secondary information and accessible debugging.

Do not fix layouts by scrolling the page, obscuring important state or changing board/scoring geometry. A future horizontal/landscape UI must explicitly cover orientation, touch controls, board sizing, overlays, inspectors, mode-specific contrast and accessibility. Do not globally rotate the portrait layout.

## Audio and platforms

Adaptive audio should observe machine topology and player decision time, with drums as the musical foundation. Use smooth stem gain changes; validate while playing. Audio must not mutate scoring, routing, seeded RNG, Undo, economy or saved state, and must respect mobile performance.

Preserve the existing PWA. A future Steam build should be a standalone, offline-capable application; Electron + existing JavaScript is a direction for evaluation, **not approval for immediate migration**. Keep platform-specific dependencies away from deterministic gameplay.

## Implementation workflow

For each code task:

1. Inspect current `main` SHA, relevant code, open PRs and branches; **recover existing work instead of rebuilding it**.
2. Classify the change and identify protected behaviour; keep the patch focused on one coherent task.
3. Implement actual runtime behaviour. Tests, version bumps, documentation and PR creation never substitute for implementation.
4. Add targeted regressions, especially for routing/scoring, economy, purchases, persistence, IDs, UI mode states and Undo.
5. Use a separate branch/PR, never edit `main` directly. If `main` advances, reassess against the new SHA.
6. Test the exact committed tree. Do not let CI edit source files or weaken meaningful tests to obtain a pass.
7. Merge only a green exact SHA; verify post-merge `main` CI and the served build/deployment where applicable.
8. If blocked, report the precise verified checkpoint and remaining work; never claim unverified success.

When asked to continue and finish, complete every feasible stage without unnecessary confirmation pauses.

## Validation and release

Use locked dependencies. For runtime changes the normal minimum is:

```sh
npm ci
for file in *.js tests/*.js; do node --check "$file" || exit 1; done
for test in tests/*.test.js; do node "$test" || exit 1; done
npm run test:browser
```

Playwright checks are not equivalent to physical iPhone/Android testing. Validate relevant mobile fixtures and flows for UI changes. Documentation-only edits need no semantic-version bump and do not normally require full browser tests unless CI requires them.

Keep version/build, service-worker behaviour, update detection and cache references coherent whenever runtime assets change. Verify actual deployment and provide a cache-busted test URL; merging `main` alone does not prove the user is on the new build.

Maintain structured debug exports sufficient to reconstruct tile IDs, placement/rotation, route, activations, score, rounds, economy changes, mod/Circuit/POWER effects and failures.

## Completion report

Briefly state: actual behaviour changed and preserved, files touched, tests run and results, PR/merge SHA, deployment/build verification and any limitations. Distinguish facts, proposals and verified implementation. Never claim physical-device testing without it.

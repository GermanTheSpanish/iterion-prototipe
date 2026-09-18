# MONOID

Mobile-first domino roguelike / score-builder built around a persistent physical machine.

MONOID's identity comes from domino connectivity, routing, topology, doubles, zeros, parity, Circuits, POWER, modifiers on physical tile instances and long-term spatial construction.

The project was previously called ITERION and NOMON. Some repository names, storage keys and backwards-compatible debug/state identifiers intentionally retain legacy terminology.

## Current development stage

The core game is substantially implemented.

Current priorities are:
- finishing remaining gameplay/system work,
- final UI/UX,
- tutorial/onboarding,
- balance and playtesting,
- release hardening.

The repository should not undergo another broad architectural cleanup unless a concrete current task requires it.

## Architecture

### Gameplay

- `data.js` — configuration, version and balance values.
- `engine.js` — placement legality, geometry, routing and scoring.
- `game.js` — authoritative run state, seeded RNG, economy, progression, persistence and Undo.
- `circuits.js` — Circuit helpers.
- `mods.js` — modifier definitions.
- `prototype-scoring.js` — Prototype-mode scoring experiment.

### Presentation

- `presentation.js` — display helpers and minimal presentation view models.
- `ui.js` — main DOM renderer and interaction controller.
- `tutorial-controller.js` — isolated tutorial gameplay orchestration.
- `ux-pass.js` — tutorial/coach presentation.
- `ui-runtime-fixes.js` — consolidated runtime gameplay composition.
- `ui-late-polish.js` / `ui-extras.js` — focused late presentation layers.
- `ui-theme.css` — primary stylesheet.

### Shell / support

- `gesture.js` — pointer/gesture bootstrap.
- `pwa.js` — PWA shell/install flow.
- `sw.js` — service worker.
- `update-check.js` — build/update detection.
- `qa-presets.js` — isolated QA states.
- `help.js` — Rulebook/Inspector support.
- `mode-carousel.js` — mode selection presentation.

See `AGENTS.md` for repository editing rules and protected gameplay behaviour.

## Gameplay invariants

- The first tile of a run is a double.
- A domino is one physical tile instance with one persistent unique ID.
- The machine persists across rounds.
- Matching values define legal contacts.
- Gameplay remains ground-plane only.
- The game is mobile-first and the main gameplay view must fit on one phone screen.
- The hand is vertical on the right.
- Routing/scoring behaviour is treated as canonical unless explicitly changed.

See `SIGNALS.md` for signal/routing-specific documentation.

## Validation

Use the locked dependencies:

```sh
npm ci
for file in *.js tests/*.js; do node --check "$file" || exit 1; done
for test in tests/*.test.js; do node "$test" || exit 1; done
npx playwright install chromium
python3 -m http.server 4173 --bind 127.0.0.1
```

Then run, in another terminal:

```sh
npm run test:browser
```

The browser suite covers mobile-sized automated flows. It is not a physical iPhone/Android test.

CI must test the committed tree without generating or patching source files.

## Development rule

For runtime tasks, changing tests, docs, build metadata or version numbers alone does not count as implementing the requested feature/fix.

The runtime source must contain the requested behaviour, and tests must verify it.

Do not change semantic version for documentation-only work.

## Endless

Standard progression remains R1–R15.

Clearing the standard run can continue into Endless. The persistent machine, physical tile IDs, purchases, modifiers, coins and relevant run state continue under canonical rules.

Targets grow after the standard run and the existing Market/Shop economy continues.

Undo, persistence and debug telemetry remain regression-sensitive systems and should not be altered as side effects of unrelated work.

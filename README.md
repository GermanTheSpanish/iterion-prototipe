# NOMON

Mobile-first domino machine score-builder. `data.js` owns configuration;
`engine.js` owns placement and scoring; `game.js` owns run state; `ui.js` renders it.

Formerly ITERION. Storage keys and repository URL retain their existing names.
See [SIGNALS.md](SIGNALS.md) for physical T splitting, L contacts and scoring order.

## Validation

Use Node 22 and install dependencies with `npm ci`.

```sh
for file in *.js tests/*.js; do node --check "$file" || exit 1; done
for test in tests/*.test.js; do node "$test" || exit 1; done
npx playwright install chromium
python3 -m http.server 4173 --bind 127.0.0.1
```

In another terminal, run `npm run test:browser`. The browser suite covers the
general smoke and the R15 victory → optional Endless → existing Market → R16
transition at 390×844 and 375×667. Late-run fixtures supply Output to isolate
progression; these are not full-run balance playtests or physical-device tests.

CI must test the committed tree without generating source, tests or releases.
Implementation and version changes are separate normal commits, each verified
before merging. See `AGENTS.md` for development rules.

## Endless

R1–R15 and their targets remain unchanged. Clearing R15 earns the standard
victory. Opting into Endless opens the stage Market before R16; buying nothing
is allowed. The existing three-round Market cadence continues thereafter.
The board stays at 30×40 without moving existing tiles. Machine IDs, purchased
tiles, modifiers, coins, Inflation and stored tools persist under normal rules.
Targets grow algorithmically by ×5 from the final standard target.

Undo restores a move but never revokes the standard completion achievement.
Entering Endless seals the previous move's Undo frame, as a round transition
does. Starting a new run resets the achievement. Losing in Endless does not.

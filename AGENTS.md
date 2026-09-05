# ITERION — Codex / Agent Instructions

## Purpose

ITERION is a mobile-first domino roguelike / score-builder prototype.

The game is inspired structurally by score-building roguelikes, but its identity must come from domino placement, connection topology, spatial construction, persistent board state, routing and tile-specific interactions.

When working in this repository, preserve the game design unless the user explicitly asks for a design or balance change. A bug-fix task is not permission to redesign rules, scoring, economy or UX.

The user's explicit task instructions take precedence over this file.

---

## Repository architecture

This is currently a lightweight browser prototype with no framework and no formal build system.

- `index.html` — application shell, layout and CSS.
- `data.js` — game constants, version numbers and tunable balance/config values.
- `engine.js` — deterministic board geometry, domino placement validation, contacts/connections and signal/scoring traversal.
- `game.js` — run state, seeded RNG, rounds, hand/reserve, placements, persistence, shops, upgrades, coins and run events/snapshots.
- `mods.js` — modifier registry and modifier definitions.
- `ui.js` — DOM rendering, board/hand display, pointer interaction, drag/rotation behaviour, overlays, shops and run-summary/report UI.

Keep these responsibilities separated. In particular:

- Do not move game rules into `ui.js` merely to make a visual interaction work.
- Do not put rendering concerns into `engine.js` or `game.js`.
- Prefer changing constants in `data.js` rather than scattering magic numbers through the code.
- New modifiers should be registered through `mods.js` unless there is a strong architectural reason not to.

---

## Core gameplay invariants

Treat the following as rules that must not change during unrelated work.

### Domino identity

A domino is one logical tile composed of two permanently connected halves.

Never represent a placed domino as two independent game pieces. The UI may render two visual halves, but selection, placement, rotation, ownership, upgrades and state must remain attached to the single domino.

### Connection rule

Domino contacts follow matching-value rules.

Adjacent contacting halves are legal only when their values match. For example, `2` may connect to `2`; `2` may not connect to `4`.

Do not relax this rule because two pieces geometrically touch.

### Rotation

Dominoes rotate in 90-degree increments. Rotation must preserve the two-half relationship and must work consistently for candidate previews and committed placements.

### Doubles

Doubles are special dominoes and the engine contains dedicated long-side / centred-port behaviour for them. Do not simplify double handling into ordinary rectangular adjacency without explicitly checking the existing engine rules.

### Board support

The current playable prototype is ground-plane only (`z = 0`). Do not introduce floating/unsupported placement as a side effect of another task.

### First tile

The current prototype requires the opening tile to be a double. The source of truth is `FIRST_TILE_MUST_BE_DOUBLE` in `data.js`.

### Persistent machine

The placed structure currently persists between rounds. The source of truth is `PERSIST_MACHINE_BETWEEN_ROUNDS` in `data.js`.

Do not clear or reconstruct the machine between rounds unless a task explicitly requires it.

---

## Scoring and routing

Scoring/routing behaviour is implemented in `engine.js` and orchestrated from `game.js`.

Do not modify scoring semantics as part of a placement, rendering, input or layout bug fix.

Important current concepts include:

- A newly placed tile produces a trigger value.
- The engine traverses connected pieces to compute an output.
- Even/odd/zero behaviour and double behaviour are encoded in the engine.
- Zero values can affect routing/rebound behaviour.
- Search/routing decisions must remain deterministic for the same game state and seed.

Before changing scoring or routing, inspect `applyOp`, connection traversal and `bestSignal` in `engine.js`, plus placement finalisation in `game.js`.

If a scoring change is explicitly requested, update run-event reporting so the resulting run can still be diagnosed from exported data.

---

## State and determinism

`game.js` owns gameplay state.

The run uses a seeded RNG. Preserve reproducibility: the same seed and the same player actions should produce the same gameplay results unless a task explicitly changes RNG semantics.

Do not use ad-hoc `Math.random()` calls for gameplay decisions when the seeded game RNG should be used.

Do not duplicate authoritative state in the UI. UI state may track transient interaction/animation state, but gameplay truth must come from the game/engine layers.

---

## Run telemetry and diagnostics

Run data is an important development tool, not decorative UI.

The prototype already records gameplay events and exposes run/snapshot information. Preserve this functionality.

When adding or changing a gameplay mechanic:

1. Ensure meaningful player/gameplay actions remain observable in run events or snapshots.
2. Prefer structured values over prose-only logs.
3. Include enough information to reconstruct why a placement scored, failed or changed state.
4. Do not silently remove fields used by the run-summary / copy-run-data UI.

For placement-related bugs, diagnostics should make it possible to identify at least:

- tile values / tile id,
- placement coordinates and rotation,
- legal/illegal result and failure reason,
- resulting score/output when applicable,
- round and placement number.

---

## UI / UX requirements

ITERION is mobile-first.

### Viewport

Normal gameplay should not require page scrolling to reach the board, HUD, hand or primary controls.

Prefer responsive sizing and composition over making the page larger than the viewport.

### Hand

The hand must remain compact and readable on mobile. Dominoes in the hand should be presented vertically unless a specific task changes that design.

All hand tiles should remain accessible without horizontal page scrolling.

### Board

The board should remain readable and usable within the gameplay viewport. Do not fix a hand/layout problem by making the board impractically small or by introducing page-level scrolling.

### Visual/game-state separation

A domino can have two rendered halves, but visual DOM structure must never imply two independent gameplay tiles.

Candidate/drag previews must use the same orientation and geometry semantics as committed pieces.

### Touch / pointer input

Changes must preserve mobile pointer interaction. Do not implement a mouse-only solution for drag, placement or rotation.

---

## Balance values

Values such as targets, hand size, maximum placements, shop probability/costs and board sizes are design/balance parameters.

`data.js` is the source of truth for current defaults.

Do not hard-code copies of these values elsewhere. Do not change them during unrelated engineering work.

Current values are prototype values, not permanent design invariants.

---

## Working method

For every task:

1. Read the relevant implementation before editing it.
2. Identify whether the task is gameplay logic, game state, UI/input, balance, or a combination.
3. Keep the patch as small as reasonably possible.
4. Preserve unrelated behaviour.
5. Check call sites when changing shared engine/game APIs.
6. Verify both the immediate fix and likely regression paths.
7. Report what changed, which files changed and how the change was validated.

Do not perform opportunistic refactors during a focused bug fix unless they are necessary to make the fix safe.

If the existing implementation conflicts with an explicit user requirement, follow the user requirement and explain the conflict in the final summary.

---

## Validation

There is currently no formal package/build/test configuration in the repository. Do not pretend that tests or commands exist when they do not.

For changes that can be checked without a browser, use Node-based smoke checks when practical because the core modules expose CommonJS exports.

For gameplay logic changes, verify representative edge cases directly against the engine/game layer where possible.

For UI/input/layout changes, inspect the actual browser behaviour at mobile dimensions and verify at minimum:

- tile selection,
- dragging,
- 90-degree rotation,
- legal placement,
- rejection of mismatched values,
- doubles,
- hand layout,
- board fit,
- round transition,
- run-data/report access.

If browser interaction cannot be executed in the current environment, state that clearly rather than claiming visual validation.

---

## Regression-sensitive areas

Be especially careful around these boundaries:

- `engine.js` placement geometry vs `ui.js` piece rendering.
- Drag candidate rotation vs final committed rotation.
- Double contact geometry.
- Matching-value validation when several pieces touch the candidate simultaneously.
- Persistent board state across round/stage transitions.
- Board resizing/recentering between stages.
- Tile IDs and physical-copy semantics when buying additional dominoes.
- Run event/snapshot compatibility after state changes.

A visual fix must not weaken placement validation. A placement-rule fix must not split the visual domino into independent halves.

---

## Product direction

ITERION should remain easy to read and interact with, but it should not be infantilised. Prefer clean, legible, restrained game UI over excessive decoration.

The prototype is used to discover the game. Avoid premature abstraction and infrastructure unless it solves a concrete problem or prevents a demonstrated class of regressions.

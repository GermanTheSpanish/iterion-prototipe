# ITERION regression test policy

The regression suite protects gameplay contracts, not release numbers.

## Invariants

These behaviours should continue to pass across unrelated refactors unless an approved design change explicitly replaces the rule:

- physical tile identity and uniqueness
- placement legality and opening protection
- canonical routing / scoring behaviour
- zero / rebound behaviour unless that rule is the explicit subject of the change
- persistent machine state and board expansion
- permanent Shop access, rescue flow and shared Inflation
- emergency Shop purchases surviving Undo
- mobile full-screen layout, right-side hand and board focus
- Rulebook / Inspector read-only behaviour and debug telemetry

Tests for these contracts must not be weakened merely to make CI pass.

## Change-sensitive contracts

Some retained tests describe behaviour that is intentionally scheduled to change in v0.23. When the implementation changes, update the old assertion in the same commit and add a focused replacement regression for the new contract.

Current change-sensitive areas:

- `tests/v020-gameplay.test.js` — `testDoubleDoubleIsRandomAndTransfers()` currently describes the v0.22.1 Double Double pool. The approved v0.23 design will replace this with board-only targeting of eligible placed doubles.
- `tests/v020-ui.test.js` — the Double Double Market presentation is the current v0.22.1 UI contract and will be replaced when the new three-offer / one-purchase Market is implemented.

Do not pre-emptively change these expectations before the corresponding gameplay implementation exists.

## Version assertions

Regression tests must not pin an exact build version such as `0.22.1`. They may verify that a semantic version is declared. Version bumps are release metadata, not gameplay regressions.

## CI rule

Feature branches run the same syntax and regression suite as `main`. The workflow executes every test even if an earlier test fails so one CI run exposes the full failure set.

A gameplay/system change is ready to merge only when:

1. existing invariant regressions pass;
2. intentionally replaced contracts have updated tests;
3. new gameplay behaviour has focused regression coverage;
4. syntax checks pass;
5. the full suite is green.

Browser/mobile smoke testing is a separate later layer and must never be claimed unless actually run.

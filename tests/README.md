# ITERION regression test policy

The regression suite protects gameplay contracts, not release numbers.

## Invariants

These behaviours should continue to pass across unrelated refactors unless an approved design change explicitly replaces the rule:

- physical tile identity and uniqueness
- placement legality and opening protection
- canonical route selection order
- zero / rebound behaviour unless that rule is the explicit subject of the change
- persistent machine state and board expansion
- permanent Shop access, rescue flow and shared Inflation
- emergency Shop purchases surviving Undo
- mobile full-screen layout, right-side hand and board focus
- Rulebook / Inspector read-only behaviour and debug telemetry

Tests for these contracts must not be weakened merely to make CI pass.

## v0.23 approved gameplay contracts

The current v0.23 work deliberately replaces the old Market contract:

- Market presents up to 3 eligible build-changing modifier offers.
- The player may buy at most 1 Market offer per Market.
- Double Double targets only eligible non-zero doubles already placed in the machine; [0|0], hand and reserve doubles are excluded.
- Long Run pays every activated star tier once when the chosen route crosses at least 10 unique physical dominoes; repeated traversals do not repay the same star.
- Zero Memory may trigger once per Move on its modified zero.
- Double Echo may start once per Move and cannot recursively create another Echo.

The retained v0.20 tests now protect board-only Double Double targeting rather than the superseded whole-set targeting rule.

## Version assertions

Regression tests must not pin an exact historic build version merely to prove unrelated gameplay. Version-specific tests may verify the version currently under development when they are explicitly release-contract tests. Older retained regressions should prefer checking that a semantic version exists.

## CI rule

Feature branches run the same syntax and regression suite as `main`. The workflow executes every Node regression even if an earlier test fails so one CI run exposes the full failure set.

A gameplay/system change is ready to merge only when:

1. existing invariant regressions pass;
2. intentionally replaced contracts have updated tests;
3. new gameplay behaviour has focused regression coverage;
4. syntax checks pass;
5. the full Node suite is green;
6. the browser smoke layer is green.

A real iPhone/mobile interaction test remains separate and must never be claimed unless actually performed.

# NOMON — physical double splitting

This system extends the former ITERION single-route engine. Existing browser
globals, storage keys and the `iterion.run.v9` snapshot schema retain their
names for compatibility. Visible branding and the debug heading use NOMON.

## Placement

A matching, complete half-edge may meet the long side of a double off-centre.
This enables L placements in either construction order. The existing centred
T port remains valid. Value mismatches, partial edges, overlap and bounds are
still rejected. This intentionally changes placement legality and may make
additional physical Circuits possible; Circuit detection and rewards do not
change.

## Routing and arithmetic

The game enables `BIFURCATION_ENABLED`; the low-level `bestSignal` API accepts
`bifurcate: true`. Omitting that option retains the legacy single-route mode
for compatibility and differential tests.

On a forward, centred long-side entry to a non-zero double with both short
ends connected and usable, the double's operation resolves once. Each arm
then receives that full resulting Score, not half. Both selected downstream
results are added. The split does not run the double operation a second time.

Branch traversal is depth-first: physical half 0, then half 1. Connections
within each arm use the existing deterministic ordering and comparator:
traversals, Output, rebounds, path length. At a split, those metrics describe
the combined tree, with the shared prefix counted once. Circuit Resonance,
Zero Memory and Double Echo are not added to the route comparator.

Each selected physical double can split once per Move across the entire
tree. Candidate searches clone that registry, so discarded candidates cannot
consume a split. The second arm inherits the selected first arm's consumed
split and Double Double flags. With N splitting physical doubles, a selected
tree has at most N+1 terminal signals, before the one possible Echo.

Each arm copies its incoming route history, visited edges and zero charges;
its later rebounds do not consume the sibling's independent history. Shared
tiles can operate on both signals, but do not become new physical instances.
Rebound/retrace paths do not create extra splits. `[0|0]` never splits and
retains its existing zero behaviour, as explicitly approved by the user.

Double Double strengthens its first physical activation once per Move. Zero
Memory replays after route selection, using the current branch's previous
operation, at most once across the whole Move. Fork markers restore the
copied arithmetic state before the sibling begins.

Double Echo creates exactly one Echo and follows the already-selected
downstream tree. It copies the full Score into both arms of each recorded T,
then adds their terminal results. An Echo created inside an arm only follows
that arm's downstream subtree, not its ancestor's sibling. Echo does not
create Echoes, consume extra star rewards or change the chosen routes.

## POWER resolution and supply

Every round, including R1 and Endless, refreshes one free Reroll. It is spent
before stored Rerolls, never accumulates, and costs no Coins or Inflation.
There is no separate Stage Reroll resource.

Exhausting the physical supply into the machine introduces exactly 28 new
double-six instances. Generation IDs are disjoint from original and purchased
IDs. Set II is POWER x2, III x3, and IV and every later set x4. Purchases inherit
the current generation, retain it permanently, and delay its exhaustion.
Undo restores generation, supply, RNG and the unlock event. Canonical paid
Shop purchase preservation also applies when Undo crosses an unlock.

Search always applies POWER x1, including its Output comparator input. Only
after selection does `replaySelectedScoring` resolve the recorded operations
with actual physical POWER. No connection search runs in that pass. Selected
starts, paths, segments, DD occurrences, T topology and rebound events remain
identical. DD magnitude scales linearly; Zero Memory repeats the actual scaled
preceding operation. Printed values and the initial a+b trigger never scale.
`selectionOutput` exposes the unpowered result when a scoring replay occurs.

Final scoring order: selected signal tree with POWER, DD and ZM → add the one Echo
if activated → apply the additive Circuit multiplier once → floor. Stars,
Long Run and Circuit Resonance use the union of exact physical activations.
No duplicate star payment is introduced by a split.

The existing search budget remains bounded and reports truncation. A fork
reserves enough budget to enter both arms rather than awarding an unvisited
copy. Truncated searches remain diagnostic approximations, not claims of an
exhaustive optimum.

## State and diagnostics

Fork state is local to one scoring calculation. The machine is never rebuilt.
`signal-fork`, `signal-start`, `signal-end`, and `signal-join` bracket the
ordered event tree. On a splitting Move, `signal-resolution` stores that tree,
physical tile IDs, split count and the pre-Resonance total in the run snapshot
and debug text. The existing Undo frame restores placement, scores, rewards,
Circuit state and the signal-resolution event together.

## Presentation

NOMON restores rounded domino surfaces with subtle down-right shadows. Shop
and Market have separate product cards, readable prices and a fixed reachable
close/continue action while their contents may scroll internally. Purchases,
Inflation, eligible targets and the one-purchase Market limit are unchanged.

The cascade starts at 600ms, accelerates toward the existing 100ms minimum,
and presents one live number per active signal. Main and Echo have independent
concurrent timelines and branch identities. Labels avoid occupied rectangles;
solid/double/dashed treatments and explicit names distinguish signals without
extra colour. Each JOIN waits for both branches. Main + Echo precedes Circuit
Resonance and the final display. Compact JOIN and final numbers are measured
against the board width. Numeric formatting never feeds back into scoring.

POWER bodies are dark blue / purple / mustard for x2 / x3 / x4, with explicit
multiplier marks. Circuit black overrides those bodies; bright rank pips,
Roman rank and the POWER mark coexist. Opening shake uses the pre-9afb380
lastRotate cooldown with threshold 10; desktop logic tests do not establish
physical phone sensitivity.

## Numeric scope

Scoring still uses JavaScript Number. The unchanged Endless curve first
exceeds Number.MAX_SAFE_INTEGER at R23 (19,531,250,000,000,000); amplified
outputs can exceed it earlier. Existing Circuit `safeInteger` telemetry
reports that limitation. This change does not claim exact integer arithmetic
above that range and does not silently migrate scoring or saves to BigInt.

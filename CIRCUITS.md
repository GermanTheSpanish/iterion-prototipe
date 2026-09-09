# Circuits v1

## Model and ordering

`circuits.js` is pure. `game.js` owns `circuitRanks` keyed by persistent physical
tile ID, `circuitSignatures` (including unavailable discoveries), and
`pendingCircuit`. Existing full-state Undo frames include all three fields.
Snapshots retain schema v9 and add a `circuits` object. No tile values or engine
piece indices are used as persistent Circuit identity.

The graph uses `engine.contactBetweenPieces`: each pair with `touch && ok` adds
one undirected edge, even when several halves contact. For every pair of the
new tile's neighbours, sorted BFS finds one shortest path excluding the new
tile. Candidate priority is reward tier, size, then lexicographically smallest
signature. Equal shortest paths use sorted physical IDs. Complexity is
O(degree(new)^2 * (V + E)), plus O(V^2) physical-contact graph construction.
Longer detours are deliberately not searched. Signatures are sorted sets of
undirected physical-ID edges, invariant under rotation or traversal reversal.

A placement scores using existing ranks after complete canonical Main/Echo
resolution. Resonance unions physical IDs in `op` and `echo-op` events; the
trigger alone is not an activation. Bonuses are summed before one multiplication
and `Math.floor`. Engine routing and its comparator never see Circuit ranks.
Then the Primary Circuit is discovered and, if eligible, choice blocks gameplay
and progression. The chosen rank starts on the next Move. Undo before or after
choice restores the pre-placement Circuit state using the existing consumable
and purchase-preservation rules. The existing permanent R15 achievement rule
also remains unchanged.

Config in `data.js`: size 4–6/+1, 7–9/+2, 10+/+3; maximum three ranked placed
tiles; rank cap V; bonuses 0.5, 1, 2, 4, 8. Excess ranks do not spill. Different
overlapping cycles may reward again; an identical physical edge cycle cannot.

## Presentation

Black body; white, green, blue, purple or gold pips for ranks I–V. A separate
Roman numeral and Inspector text provide non-colour identification. Stars and
DD/DE/ZM marks retain their separate positions and meanings. Choice is spatial,
with eligible tiles outlined and unrelated tiles dimmed. Holds and drags during
choice cannot place or select a tile. Undo remains available.

## Number precision boundary

The existing engine uses JavaScript Number. MAX_SAFE_INTEGER is
9,007,199,254,740,991. The first Endless target above it is R23:
19,531,250,000,000,000. R22 is 3,906,250,000,000,000.
With three golds (x25), a base Output equal to the R21 target already produces
19,531,250,000,000,000; R20 at x25 remains below the boundary.
Overkill can cross it earlier, so there is no universally safe round boundary.
Crossing this threshold loses the guarantee of exact integer arithmetic; it
does not mean every larger number is unrepresentable. Flooring cannot recover
lost precision, and sufficiently large numbers eventually overflow to Infinity.
Resonance telemetry reports `safeInteger` for base and final Output.

This release does not migrate the engine to BigInt or weaken Circuit bonuses.
Recommended separate work: establish an exact numeric scoring/target model and
compatible serialization, UI formatting, comparator and modifier tests before
treating deep-Endless integer differences as reliable balance evidence.

## Verification

Run syntax checks on all root/test JavaScript, all `tests/*.test.js`, and
`npm run test:browser` against port 4173. Circuit tests combine pure graph cases,
a real legal four-tile closing placement, canonical rebound/DD/ZM/Echo fixtures,
and persistence/Undo tests. Echo-only activation is a synthetic event-union
case because current Echo follows the selected Main downstream path.
Browser cases seed legal machine fixtures before UI initialization, with no
production test hooks or source transformation. They cover touch selection,
hold/drag suppression, inverted rank rendering, Stars, Inspector, Rulebook,
Undo and mobile viewport bounds. These are not natural full-run playtests or
physical iPhone Safari validation. Existing regression CI tests the committed
tree and rejects source mutations; no workflow changes are required.

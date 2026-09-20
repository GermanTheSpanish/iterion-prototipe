# MONOID — 28 Mod Catalogue

Status: design working set. Only rows marked **Implemented** exist in gameplay today. Proposed rows are not Market offers, do not change scoring/routing, and must be implemented in focused batches with targeted regressions.

## Design constraints

- One physical tile can hold at most one Tile Mod.
- Mods should change placement or machine-building decisions, not merely add invisible arithmetic.
- Physical topology is preferred over route-history conditions.
- Conditions must be inspectable from the board state.
- Existing Tile Mods are protected behaviour and are not rebalanced by this catalogue.
- POWER, Circuits, tile upgrades and persistent tile identity may be used as explicit synergies, but new Mods must not silently alter those systems.
- Economy-producing Mods should pay coins, not secretly modify Score.
- Proposed multipliers below are initial tuning targets, not balance commitments.

## Canonical 28-domino mapping

| Domino | Mod | Status | Decision hook |
| --- | --- | --- | --- |
| `0|0` | ZERO PORT | Implemented | Pair two zero tiles into a teleport link. |
| `0|1` | TERMINAL | Implemented | Keep the tile at exactly one physical connection. |
| `0|2` | FOUNDATION | Proposed | Reward a tile that survives across Markets; strength grows with machine age. |
| `0|3` | PAIR | Proposed | Form an exact 2×2 cell block with one parallel neighbouring domino. |
| `0|4` | BRIDGE | Proposed | Reward an articulation tile whose removal would split the physical machine. |
| `0|5` | GATE | Proposed | Exactly one connection on each physical end, with no side branches. |
| `0|6` | LONG LINE | Implemented | Build a continuous straight physical line through the tile. |
| `1|1` | DOUBLE ECHO | Implemented | First activation sends one non-recursive Echo down the chosen route. |
| `1|2` | PARITY EXCHANGE | Implemented | Swap odd/even scoring behaviour on one tile. |
| `1|3` | FAN | Proposed | Build three connections around one half while the opposite half remains open. |
| `1|4` | FRAME | Proposed | Place the tile on any closed physical cycle. |
| `1|5` | KNOT | Proposed | Place the tile where two or more distinct physical cycles overlap. |
| `1|6` | TWIN | Proposed | Place an identical printed domino directly beside it in the same orientation. |
| `2|2` | DOUBLE DOUBLE | Implemented | First activation applies both halves of the double. |
| `2|3` | CORNER | Implemented | Exactly two perpendicular physical neighbours. |
| `2|4` | SEQUENCE | Proposed | Eligible only for consecutive printed values; simple high-readability value identity. |
| `2|5` | COMPLEMENT | Proposed | Eligible only when the printed values sum to six. |
| `2|6` | MIRROR | Proposed | The outward connected value at each physical end is the same. |
| `3|3` | TRIPLE DOUBLE | Implemented | Complete double cross clones through the other three exits once per Move. |
| `3|4` | CROWN | Proposed | Exactly three physical connections on three distinct sides; specialised junction shape. |
| `3|5` | FRONTIER | Proposed | Reward keeping one long side exposed to open building space while still connected. |
| `3|6` | RELAY | Proposed | The tile physically connects two POWER-bearing neighbours. |
| `4|4` | OVERLOAD | Implemented | Multiplier equals physical connection count. |
| `4|5` | COUPLER | Proposed | The tile is adjacent to at least one POWER tile; rewards local POWER architecture. |
| `4|6` | RESONATOR | Proposed | The tile is a ranked Circuit Tile; operation strength scales conservatively with Circuit rank. |
| `5|5` | FORGE | Proposed | A starred/upgraded tile converts part of its upgrade investment into operation strength. |
| `5|6` | MINT | Proposed | First qualifying activation each round pays a coin instead of extra Score. |
| `6|6` | LONG CHAIN | Implemented | Long routes pay every activated star once under the existing rule. |

## Proposed rule shapes

These are initial implementation targets. Exact constants must be tuned from playtests.

### FOUNDATION
- Target: any physical tile.
- Track the Market count when assigned.
- After surviving one Market: ×2 operation magnitude.
- After surviving three Markets: ×3.
- No route-history dependency.
- Undo/save/restore must preserve assignment age.

### PAIR
- Target: any tile.
- Active when the domino and one parallel neighbour occupy an exact 2×2 cell rectangle.
- Printed values do not need to match beyond normal placement legality.
- Initial target: ×3.

### BRIDGE
- Target: any tile.
- Active when removing that physical tile from the connectivity graph would split the machine into two or more components.
- Initial target: ×3.
- Compute from physical connectivity, never from the selected route.

### GATE
- Target: any non-double tile.
- Active with exactly two physical neighbours: one attached through each end region of the domino, with no side branch.
- Initial target: ×2.
- Distinct from LONG LINE because the two connections need not be opposite/collinear.

### FAN
- Target: any tile.
- Active when three neighbours attach around one half of the domino and the opposite half has no external neighbour.
- Initial target: ×4 because the geometry is restrictive.
- Must be derived from physical contacts.

### FRAME
- Target: any tile.
- Active while the tile belongs to at least one closed physical cycle.
- Initial target: ×2.
- Cycle membership is broader than being selected as a rewarded Circuit Tile.

### KNOT
- Target: any tile.
- Active while the tile belongs to at least two distinct cycle signatures.
- Initial target: ×4.
- Must reuse deterministic cycle identities rather than route history.

### TWIN
- Target: any tile for which a second legitimate identical printed tile exists.
- Active when an identical [a|b] domino is directly parallel and adjacent, forming a two-domino band.
- Initial target: ×3.
- Persistent tile IDs remain distinct.

### SEQUENCE
- Eligibility: |a-b| = 1.
- Always active once installed.
- Initial target: ×2.
- Purpose: make specific printed identities valuable without topology overhead.

### COMPLEMENT
- Eligibility: a+b = 6.
- Always active once installed.
- Initial target: ×2.
- Purpose: create a readable family of desirable printed identities.

### MIRROR
- Target: non-double.
- Active when the connected outward neighbour value at each end of the domino is equal.
- Initial target: ×3.
- Encourages symmetric local architecture.

### CROWN
- Target: any tile.
- Active at exactly three physical connections on three distinct exterior sides.
- Initial target: ×4.
- More demanding than OVERLOAD, so it trades flexibility for a stronger fixed reward.

### FRONTIER
- Target: any tile.
- Active while at least one entire long side of the domino remains free of neighbouring tiles and the tile has at least two physical connections elsewhere.
- Initial target: ×2.
- Encourages deliberate expansion lanes instead of packing every tile densely.

### RELAY
- Target: non-POWER tile.
- Active when two distinct physical neighbours touching it both carry POWER.
- Initial target: ×3.
- Does not change POWER values or routing.

### COUPLER
- Target: non-POWER tile.
- Active while physically connected to at least one POWER tile.
- Initial target: ×2.
- Simpler POWER synergy than RELAY and useful earlier in a run.

### RESONATOR
- Target: a tile that can become a Circuit Tile.
- Active only while the assigned physical tile has Circuit rank.
- Initial tuning: rank I–II ×2, rank III–V ×3.
- Does not alter Circuit detection, rank gain or resonance arithmetic.

### FORGE
- Target: an upgraded/starred tile.
- Initial tuning: star I ×2, star II ×2, star III ×3.
- Uses existing persistent upgrade rank; does not add or consume stars.

### MINT
- Target: any tile.
- First qualifying activation each round pays +1 coin.
- Qualification should require the Move to produce a positive final output.
- It does not multiply Score.
- Must be once per physical tile per round and deterministic across Echo/split/rebound.

## Implementation batches

### Batch A — low-risk readable identity
1. SEQUENCE
2. COMPLEMENT
3. TWIN
4. PAIR

Purpose: validate that new Mods can broaden assignment decisions without touching routing, economy or persistent progression.

### Batch B — topology
1. BRIDGE
2. GATE
3. FAN
4. FRAME
5. CROWN
6. FRONTIER

Purpose: deepen machine-shape decisions using physical state only.

### Batch C — system synergies
1. RELAY
2. COUPLER
3. RESONATOR
4. FORGE

Purpose: connect Mods to POWER, Circuits and upgrades without changing those canonical systems.

### Batch D — advanced/persistent
1. FOUNDATION
2. KNOT
3. MIRROR
4. MINT

Purpose: add persistent architecture, overlapping-cycle play and one controlled economy Mod after the simpler families are proven.

## Implementation contract

For each batch:

1. Re-read current `main` and protected behaviour before editing.
2. Add only the batch's gameplay helpers/state.
3. Market purchase must close and require explicit eligible-tile assignment.
4. One physical tile remains limited to one Tile Mod.
5. IDs/assignments must survive Undo, save/restore, rounds, Endless and debug export.
6. Add targeted gameplay regressions plus browser coverage for assignment/Inspector/Market where relevant.
7. Do not change existing Mod arithmetic as part of adding new Mods.
8. Balance constants remain isolated in `data.js`.
9. Only mark a catalogue Mod discoverable/unlocked when its runtime behaviour exists.

# Read-only Percussion Pressure Director

## Behaviour implemented (2026-10-25)

The in-game private Space Drift stems continue to play at their **unaltered, aligned source tempo of 80 BPM**. In addition to the F Drum stem, the game can now schedule subtle generated physical percussion against the same Web Audio clock. It is not an independent oscillator timer, gameplay decision, or new RNG consumer.

- **Steady:** minimal additional physical rhythm; the original F Drum stays the heartbeat.
- **Market progression:** accumulated marketCount raises the *density* of subdivisions and target BPM metadata in steps of 80, 84, 88, 92, 96. **Important: the song DOES NOT actually change tempo yet.** The listener perceives greater activity due to the rhythmic subdivision and optional accents. Real whole-song tempo steps require pitch-preserving, sample-aligned private packs or a validated time-stretch transport.
- **Pressure:** two remaining available placements (and target unmet) triggers critical percussion intensity; three remaining raises pressure moderately.
- **Uncertainty:** if every visible hand tile contains a zero and only zero or one hand slot has legal placements, use syncopated rests rather than a generic suspense loop.
- **Release:** after a critically constrained round is cleared, create a short reduced-pulse release. The original music and physical sound effects remain present.
- **Cascade / shop / menu:** percussion ducks or stops, retaining physical domino sound priority. No loss of progress or new game-state fields.
- All conditions are derived exclusively from `game.state()`, `game.maxPlacements()`, `game.targetExact()`, and carefully cached `game.legalHandMask()` (queried only when an all-zero hand changes and the game is interactive).

The readonly `window.__monoidMusic.snapshot()` now includes `pressure` and `percussion`. Diagnostic events use `music-pressure` and include *both* `targetTempoBpm` and `actualStemTempoBpm` so debug tools never confuse the proposed market tempo with actual audio.

## What is deliberately not implemented

- Actual pitch-preserving speed-up of the six source stems after each Market.
- Repackaging the user's licensed stems into new private tempo variants.
- Cross-scene harmonic permutations without manual listening approval.
- Inferring the player's intended Circuit from hidden tiles/deck or unverified impossible placement heuristics.

## Listening / release checklist

1. Restore the private pack on-device and place the first tile; drums must play from the first placement.
2. Start with a normal hand, then reach two placements remaining without clearing the round. Ensure the percussive subdivisions increase without clipping.
3. Test a constrained zero-only hand: irregular short gaps rather than the whole sound vanishing.
4. Clear the critical round and assess the release at the end of the cascade.
5. Cross an actual Market and listen for denser percussion; verify `targetBpm` changes but `sourceBpm` stays 80.
6. Background/resume on physical iOS and Android. Verify the pulse stays aligned with F Drum across pauses, long cascades and >12-second segment boundaries.
7. Build a separate and explicitly approved *private tempo pack v2* before claiming real 84/88/92/96 BPM playback.

## Phrase Arranger crossfade study

The standalone Audio Lab Phrase Arranger now overlaps local PCM phrase windows at the transition boundary (rather than serial fades-to-zero): roughly 35 ms for F Drum, 160 ms for A/B/C/E and 320 ms for D Pads. It operates on a single original 80 BPM time grid, and the audio preview uses constant master gain. This is **not** yet the production compressed private pack runtime; it requires a listening test to confirm boundary clicks and rhythmic cleanliness across actual sections.

No copyright-protected WAVs or private `.monoidpack` files are committed in the repository.

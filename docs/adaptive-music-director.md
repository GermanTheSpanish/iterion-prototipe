# Adaptive music director (2026-10-24)

## Runtime contract

- The private `.monoidpack` is restored automatically from same-device IndexedDB. It is never downloaded from or committed to the public game repository.
- First playable pack fragment is decoded ahead of the first tile when possible, without auto-playing. On iOS playback still requires a user gesture; placing the first tile unlocks the shared Web Audio context and triggers the soundtrack.
- For a continued run, the next in-game pointer gesture with already-placed tiles resumes the music. A fresh run starts a new music timeline on its first placement. An interrupted session cannot reconstruct the previous audio time from game persistence.
- All A–F stems are scheduled from one AudioContext origin. A late decoder does **not** shift the global start origin; it resumes the late fragment at the appropriate offset and records an underrun.
- A–F are independent aligned stems, **not** rearrangeable musical phrases. The current 12-second AAC fragments are transport chunks. Do not reorder them as if they were bars.
- No BPM/beat grid is asserted without verifying the source recording's tempo. Stem gains crossfade smoothly rather than pretending a 12-second transport boundary is a downbeat.

## Adaptive behaviour

- F (drums) begins on the first tile.
- A leads straight/linear machines, E winding machines, B branching machines, and C machines containing circuits. D is an atmospheric pad.
- Physical topology is the primary signal. Active decision time is secondary: longer pauses shift the blend toward pads without penalising gameplay.
- Small secondary layers can remain audible where the physical topology has overlapping traits. Broad spectral/volume changes should be verified by listening; mixing the same master recording cannot create new notes or song sections.

## Verification and constraints

- Inspect `window.__monoidMusic.snapshot()` for scene, leadingStem, topology, dB, thinkingSeconds, decisionPace, playbackSeconds, and transport underruns.
- Compare equal-sized linear, winding, branch, and circuit boards. Validate transitions by listening on physical mobile browsers, including pause/resume, Audio Lab return, menus, backgrounding, long cascades, and first-tile start.
- The sound event bus remains UI-only. No changes to scoring, routing, tile identities, seeded gameplay RNG, or game persistence.
- A future, more radical musical composition layer needs additional licensed motifs/loop points or verified phrase boundaries; do not chop the existing AAC transport segments as phrases.

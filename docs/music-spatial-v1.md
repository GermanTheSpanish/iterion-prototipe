# Spatial Music v1 and percussion click mitigation

## Scope

This feature adds **topology-aware stereo placement** to the existing Space Drift playback. No scoring, placement, routing, board growth, Market, save, RNG or UI gameplay rules were changed. It works with the old v1 private pack, the five-tempo v2 private pack, and local WAV stems.

The six music stems remain phase-locked on the same transport:

| Stem | Physical source | Stereo behaviour |
|---|---|---|
| F — Drum | Heartbeat | Always centred |
| D — Pads | Machine centroid | Subtle placement (35% of lead width) |
| A — Calm Poly | Straight segments and endpoints | Source follows physical left/right position |
| E — Synth Melodies | Turning nodes | Source follows physical turns |
| B — Creepy Poly | Junctions (3+ physical connections) | Source follows physical branches |
| C — Corrupted Poly | Components containing circuits | Source follows circuit-bearing regions |

Positions derive from real tile halves, matching pip contacts and physical coordinates; absent features are centred. Values are limited to ±0.62 and smoothly interpolate (Web Audio StereoPannerNode with ~0.65-second smoothing). Pinch zoom and camera movement never change the perceived position, only physical changes to the machine. The music's F Drum and the separately generated percussion remain central.

This is **deliberately not the Hangar reverb/deck acoustic profile**; that is a subsequent sound-design iteration. This pass changes only lateral stereo positions, not wet/dry mix, phase transition themes or number of voices.

## Chasquido changes

Two plausible discontinuity sources were corrected:

- The procedurally generated percussive hiss previously began at a random sample with nonzero gain. It now has a 4 ms attack, an exponential decay and a zero-gain finish. Bass/tonal transients begin and end at zero gain. Noise samples are edge-windowed; overlay stops fade over 20 ms rather than hard cutting.
- If AAC decoding was late, a v2 fragment could begin at full gate gain, exposing a non-zero AAC boundary sample. It now starts at zero gain even when late, with a brief entry ramp. The original sample-clock schedule and five-tempo variants are retained.

Neither code review nor browser CI can prove this removes *every* audible click on a real iPhone. Encoder delay/cuts and another instrument can still be responsible.

## Practical A/B diagnosis

MONOID → **System → Music** now includes two session-local controls:

- **EXTRA DRUMS:** disable to silence only the newly synthesized percussion, leaving the original **F Drum** intact. If clicks persist with EXTRA DRUMS off, inspect the private-pack fragment boundaries / original stems.
- **SPATIAL:** disable to return all stems to centre without stopping or resyncing playback. This also provides a mono-friendly option.

`window.__monoidMusic.snapshot()` reports `percussion.muted`, `percussion.hits`, and `spatial.enabled/pans/features`. No audio is captured/uploaded. On iPhone verify at 80 BPM, after multiple Markets (84–96 BPM), during cascades, when crossing segment boundaries, on headphones and on the phone speaker. Monitor underrun count before ascribing a click to oscillator code.

## Known limits

- StereoPannerNode creates a light stereo stage; no HRTF, binaural rendering or convolution reverb.
- Circuit source position is the centroid of a **connected component containing a cycle**, not the exact activated route or the player's intended circuit.
- We do not claim the user's listening test succeeded.
- Private licensed WAV/AAC audio never enters GitHub source or the public build.

# Phrase Arranger — experimental Space Drift study

This is a working listening tool at `experiments/audio-lab/phrase-arranger.html`, separate from live game music and private compressed pack playback.

## Audition workflow

1. Open MONOID → Audio Lab → Phrase Arranger.
2. Choose the six original, aligned **PCM16 WAV** Space Drift stems A–F, or their folder. No files are uploaded or stored.
3. Review the estimated BPM and downbeat offset. The estimate is a first-48-second drum-onset autocorrelation **hypothesis**, not confirmed beat, bar alignment or musicology. Verify it by listening.
4. Eight-bar source scenes are generated; F Drum uses 2-bar phrases, D Pads 8, and A/B/C/E 4. Every destination shares one audio sample clock.
5. Harmony group labels default to unique per source scene; the tool only chooses melodic phrases across scenes after manual assignment of the same group label.
6. Compare ORIGINAL, REARRANGED and ADAPTIVE (editorial simulated machine events), and export a JSON phrase map containing only tempo, labels and arrange selections.

## Limits and safeguards

- There is no automatic chroma or chord/key classifier. Matching group labels are **editorial approval**, not a certified guarantee of harmonic compatibility.
- The preview renders an intentional **F / D / one selected lead** mix, not the exact original fully mixed song. A/B uses identical gain staging for fairness.
- Local short PCM windows are decoded as needed; no full 7:12 track decode. A late window rejoins its sample-clock position and reports an underrun.
- This experiment does not change the in-game `.monoidpack` playback, sample-locked 12-second AAC transport, games, saved state or licensed asset packaging.
- AAC transport fragments are not musical phrases. New private-pack schema and runtime integration should only follow human audition, source BPM verification and approved phrase/harmony mapping.
- Automated tests use **synthetic** recordings. Physical iPhone and real Space Drift listening are outstanding until the actual WAV bytes are available in the browser. 

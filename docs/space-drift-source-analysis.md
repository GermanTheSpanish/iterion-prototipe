# Space Drift — source audio analysis (2026-10-25)

## Sources verified
Nine user-provided WAV recordings were inspected directly in the analysis environment. Six stems A–F, Full and No Drums are aligned **44.1 kHz stereo PCM16**, nominal duration **432.0 s** (one or two sample differences). The separate **Creepy** mix is **438.0 s** and must not be treated as a sample-aligned A–F stem.

Do not copy these licensed WAVs, alternate mixes, exports or `.monoidpack` payloads into the repository, build or public deployment.

## Grid inferred from the actual F Drum waveform

- **Strong working tempo: 80 BPM** (quarter note 0.75 seconds; assuming four beats per bar).
- **One inferred bar: 3 seconds**.
- **2 bars: 6 seconds**; **4 bars: 12 seconds**; **8 bars: 24 seconds**; **16 bars: 48 seconds**.
- The 432-second source spans **144 inferred bars / 18 eight-bar scenes**.
- Comparisons of F Drum's first four seconds with the same interval 24 and 48 seconds later give sample-waveform correlations of approximately **0.968** and **0.992**, respectively. Drum RMS envelopes across the corresponding first ten seconds are correlated approximately **0.996**.
- The rhythmic energy repeats at 3, 12, 24 and 48 seconds; there is a strong source-zero onset. **First downbeat at exactly zero and 4/4 remain editorial working assumptions**, to confirm by listening.
- A naive onset-only estimator preferred ~115 BPM because of syncopation. The Phrase Arranger now uses weighted beat, 1-bar, 4-bar and 8-bar energy periodicity; it must still disclose that estimates are provisional.
- Crucially: the previous **12-second compressed transport chunks already span four inferred bars**. Twelve seconds is not itself the source of the repetitiveness. Repeating F Drum material is nearly identical through the track, so merely shuffling its four-bar chunks cannot make distinct grooves.

## Tonal observations (spectral, not certified chord identification)

A–F were analysed from their actual waveforms. Average chroma/energy of D Pads and E Synth Melodies suggests three **candidate** colours, which are *not approved harmonic-interchange groups*:

| Scenes (8 bars each) | Source seconds | Candidate colour |
|---|---|---|
| 1, 3, 5, 7, 8, 10, 12, 14, 16, 18 | 0–24, 48–72, 96–120, 144–192, 216–240, 264–288, 312–336, 360–384, 408–432 | C / G / E emphasis |
| 2, 4, 9, 11, 15 | 24–48, 72–96, 192–216, 240–264, 336–360 | C → B-flat / F movement |
| 6, 13, 17 | 120–144, 288–312, 384–408 | F / B-flat / E-flat emphasis |

These are *coarse spectral similarities* over 24-second spans. Some eight-bar scenes have within-scene harmonic movement, and A/B/C polyphonic stems differ more strongly than D/E. Neither equal chroma nor naming a candidate family proves that two phrases are harmonically interchangeable; evaluate phrase boundaries and transitions by ear.

## Arranging recommendations

1. Keep **one common 80 BPM, source-zero reference clock**.
2. Source musical subphrases from **6-second (F), 12-second (A/B/C/E), and 24-second (D)** units. Apply short, tunable fades; verify drum downbeat transients and pad tails.
3. Preserve each scene's internal pad/melody relationship until compatibility is confirmed. Start with only *within-scene* rearrangements or continuous blocks from entirely different locations of the track; cross-scene edits are editorial decisions.
4. Consider new rhythmic variation by **intentional rests, sparse alternate hit patterns, physically synchronized cascade percussion and dynamic frequency/textural transformation**, not only permutations of a mostly repeated F Drum pattern.
5. Keep the source `.monoidpack` v1 live transport untouched. A future private pack v2 should index bars/phrases, offset positions and approved harmonic group links, not assume fixed 12-second transport fragments are independently compatible.
6. Reject the 438-second Creepy mix as a synced stem; it can be auditioned only as an independent reference.

## Deliverables outside the repository

- `MONOID_SpaceDrift_80BPM_unreviewed.json`: importable draft for the Audio Lab Phrase Arranger with **18 distinct, unreviewed harmonic groups**.
- `MONOID_SpaceDrift_scenes.csv`: editable review sheet with candidate spectral families.
- Three private, 72-second AAC A/B excerpts: supplied original Full mix, rearranged three-stem study, and event-style stem-transition study. These are **offline demonstrations**, not in-game music and not guaranteed click-free/approved production edits.

Further work requires auditioning edited phrases, signing off cross-scene harmonic groups, listening on actual mobile speakers/headphones, and only then building a private phrase pack and hooking live machine events.

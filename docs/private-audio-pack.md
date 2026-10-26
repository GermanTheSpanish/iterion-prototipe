# Private compressed music packs

The game can load a **private** local `.monoidpack` into IndexedDB once per
browser/device. The pack is not uploaded and is never requested from a public
URL. A normal browser reload restores the pack and automatically arms the
first-tile music trigger (F Drum). The original WAV picker remains available.

## Preparing the pack (developer workflow)

Prepare six aligned AAC-LC M4A source files:
`SpaceDrift_A.m4a` through `SpaceDrift_F.m4a` (44.1 kHz, stereo, 432 s).
The originals and the output pack must not be committed to GitHub or a public
deployment without explicit distribution clearance.

With Python 3.11+ and FFmpeg/ffprobe installed:

```bash
python scripts/build-private-audio-pack.py --input-dir "./PrivateStems" --output "./SpaceDrift_PRIVATE.monoidpack"
```

The script remuxes each independent **12-second** M4A fragment without re-encoding
and concatenates all fragments into one indexed file. Each track shares a common
nominal 44.1 kHz sample-clock timeline: 36 segments x 529,200 samples = 432 s.
The browser decodes only upcoming complete fragments into Web Audio buffers,
trimmed/padded to the common segment clock to account for AAC padding.
These 12-second units are **transport fragments**, not musical phrases; musical
phrase rearrangement is not implemented.

## Playing

1. On each device, open **MONOID > System > Music > PRIVATE PACK**.
2. Select the `.monoidpack` file. Wait for **PRIVATE PACK STORED**.
3. Close the menu and place the first domino. Music starts then.
4. Reload the PWA: the private pack should show **PRIVATE PACK READY** without
   another file selection. **FORGET PACK** deletes it from IndexedDB.

This does not make the PWA shell or game offline-capable. Browser site-data
deletion, iOS storage eviction and insufficient quota can remove the pack;
in that case, reimport the file. No private audio is packaged in the repository,
the service worker or the GitHub Pages build.

## QA and caveats

- The decoder runs on a single `AudioContext`, with shared scheduled start
  timestamps for all active stems and a separate sound-effects bus.
- The metadata and pack offsets are strictly validated before storing.
- Do not replace the compressed fragments with arbitrary byte ranges of a full
  M4A: they are not independently decodable.
- Chrome/Playwright integration is an automated regression, **not** physical
  Safari/iPhone gapless-loop or long-session audio verification.
- Prior to any public game-asset bundling, confirm explicit authorization to
  redistribute the stems over HTTP. Private repo visibility alone is not
  sufficient to hide audio served to browsers.


## Music Pack v2 — actual 80/84/88/92/96 BPM (optional, private)

The v1 pack still works exactly as before. To test **real, pitch-preserving**
tempo increases after Markets, create v2 from the **six original, aligned WAVs**.
The output is user-owned and must never enter source control, public builds or
a public download endpoint.

Requirements: Python 3.11+, FFmpeg with the \`rubberband\` filter and ffprobe.
Accepts either \`SpaceDrift_A.wav\` … \`SpaceDrift_F.wav\` or the original
\`Space Drift - A - Calm Poly.wav\` style names (one file per stem).

\`\`\`bash
python scripts/build-private-tempo-pack-v2.py \
  --input-dir "PATH_TO_ORIGINAL_SIX_WAVS" \
  --output "PATH_TO_PRIVATE_OUTPUT/SpaceDrift_Tempo_PRIVATE.monoidpack"
\`\`\`

The pack is indexed by **musical position** (36 four-bar positions x five tempos
x six stems). All six stems receive the same offline Rubber Band pitch-preserving
stretch. Segments use nominal 44.1 kHz sample durations with an additional
160 ms encoded overlap for click-reducing transitions (30 ms for drums, 90 ms for
poly/melody and 150 ms for pads in the player). The current implementation
does not automatically rearrange phrases or claim verified cross-scene harmonic
compatibility.

The game requests 80, 84, 88, 92 or 96 BPM according to the number of completed
Markets. It changes **all** active stems together on the next four-bar boundary,
without restarting the musical position, while auxiliary percussion follows that
same tempo. A pack loaded mid-run starts at the tempo appropriate for that run.

**Expected caveats:** this is a relatively large pack (~120–150 MB depending
on bitrate) and mobile browsers may refuse storage, evict IndexedDB data,
or show glitches on slower phones. Keep your original v1 pack available to
re-import if needed. Avoid repeatedly writing large packs unnecessarily.
AAC encoder delay/packet rounding may introduce slight boundary phase jitter;
crossfades reduce clicks but physical Safari/iPhone audition is mandatory
before production approval. No music is hosted or remotely fetched.

Read diagnostics in \`window.__monoidMusic.snapshot().transport\`:
\`mode\`, \`bpm\` (currently audible), \`requestedBpm\` (next boundary),
\`tempoAvailable\`, and \`underruns\`.

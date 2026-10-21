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

#!/usr/bin/env python3
"""Build MONOID private v2 tempo pack. Input WAVs and output are licensed/private.

Needs Python 3.11+, ffmpeg built with rubberband, and ffprobe.
No copyrighted audio belongs in git or the public PWA distribution.
"""
import argparse
import hashlib
import json
import pathlib
import struct
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor

MAGIC = b'MONOIDP1'
SCHEMA = 'monoid-audio-pack-v2'
RATE = 44100
COUNT = 36
STEMS = 'ABCDEF'
TEMPOS = (80, 84, 88, 92, 96)
OVERLAP = 7056  # 160 ms outgoing tails, shorter for drums at the mixer

def run(arguments):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error',
           '-nostdin', '-threads', '1', '-filter_threads', '1', '-y',
           *map(str, arguments)]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf8', 'replace')[-2000:])

def duration(file):
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
           '-of', 'default=noprint_wrappers=1:nokey=1', str(file)]
    return float(subprocess.check_output(cmd, text=True).strip())

def source_for(folder, stem):
    preferred = folder / f'SpaceDrift_{stem}.wav'
    matches = [preferred] if preferred.exists() else sorted(folder.glob(f'Space Drift - {stem} - *.wav'))
    if len(matches) != 1:
        raise ValueError('Exactly one original WAV for stem ' + stem + ' required')
    return matches[0]

def build(folder, output, bitrate='80k', workers=6):
    import wave
    inputs = {stem: source_for(folder, stem) for stem in STEMS}
    for stem, file in inputs.items():
        with wave.open(str(file), 'rb') as source:
            spec = (source.getnchannels(), source.getsampwidth(), source.getframerate())
            if spec != (2, 2, RATE) or abs(source.getnframes() - 432 * RATE) > 2:
                raise ValueError('Incompatible 432s stereo PCM16 WAV ' + stem)
    variants = {}
    order = []
    byte_offset = 0
    with tempfile.TemporaryDirectory(prefix='monoid-private-tempo-') as work:
        work = pathlib.Path(work)
        for bpm in TEMPOS:
            frames = round(4 * 240 * RATE / bpm)  # four 4/4 bars
            seconds = frames / RATE
            variant = {'bpm': bpm, 'segmentSamples': frames,
                       'overlapSamples': OVERLAP, 'stems': {}}
            print(f'Encoding {bpm} BPM · four-bar chunk {seconds:.6f} s', flush=True)
            for stem in STEMS:
                full = work / f'full_{bpm}_{stem}.m4a'
                stretch = ('apad' if bpm == 80 else
                           f'rubberband=tempo={bpm / 80:.12f}:transients=crisp:detector=compound,apad')
                filt = stretch + f',atrim=end_sample={COUNT * frames + OVERLAP}'
                # The extra source time provides a real tail on the last chunk.
                run(['-stream_loop', '1', '-i', inputs[stem], '-t', '432.5',
                     '-af', filt, '-ar', RATE, '-ac', '2', '-c:a', 'aac',
                     '-b:a', bitrate, full])
                expected = (COUNT * frames + OVERLAP) / RATE
                if abs(duration(full) - expected) > 0.10:
                    raise ValueError(f'Tempo output truncated: {bpm}/{stem}')
                def segment(i):
                    path = work / f'{bpm}_{stem}_{i:03d}.m4a'
                    run(['-ss', f'{i * seconds:.9f}', '-i', full, '-t',
                         f'{seconds + OVERLAP / RATE:.9f}', '-map', '0:a:0',
                         '-c:a', 'copy', '-movflags', '+faststart', path])
                    if abs(duration(path) - (seconds + OVERLAP / RATE)) > .10:
                        raise ValueError(f'Misaligned AAC fragment {bpm}/{stem}/{i}')
                    return i, path
                with ThreadPoolExecutor(max_workers=workers) as pool:
                    fragments = dict(pool.map(segment, range(COUNT)))
                full.unlink()
                indexed = []
                for i in range(COUNT):
                    path = fragments[i]
                    size = path.stat().st_size
                    if size <= 128:
                        raise ValueError('Missing AAC fragment')
                    indexed.append({'offset': byte_offset, 'bytes': size})
                    byte_offset += size
                    order.append(path)
                variant['stems'][stem] = {'segments': indexed}
                print('  '+stem+' complete', flush=True)
            variants[str(bpm)] = variant
        manifest = {
            'schema': SCHEMA, 'name': 'Space Drift - Private Tempo',
            'codec': 'aac-lc', 'private': True, 'sampleRateHz': RATE,
            'channels': 2, 'sourceBpm': 80, 'barsPerSegment': 4,
            'segmentCount': COUNT, 'variants': variants}
        header = json.dumps(manifest, separators=(',', ':')).encode('utf8')
        if len(header) > 1_048_576:
            raise ValueError('Manifest too large')
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open('wb') as dest:
            dest.write(MAGIC + struct.pack('<I', len(header)) + header)
            for part in order:
                with part.open('rb') as source:
                    while data := source.read(1024 * 1024):
                        dest.write(data)
        with output.open('rb') as result:
            checksum = hashlib.file_digest(result, 'sha256').hexdigest()
    print(f'Private tempo pack: {output} ({output.stat().st_size} bytes) SHA256 {checksum}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', required=True, type=pathlib.Path)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    parser.add_argument('--bitrate', default='80k')
    parser.add_argument('--workers', type=int, default=6)
    options = parser.parse_args()
    build(options.input_dir, options.output, options.bitrate, options.workers)

#!/usr/bin/env python3
"""Produce MONOID private audio packs from six aligned M4A/AAC-LC stereo stems.

This tool distributes no assets itself. Do not commit .monoidpack files or licensed music.
The pack uses a 12-byte signature/header, JSON manifest and concatenated independent M4A
fragments. Each fragment is remuxed (stream-copy), not transcoded.
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
IDS = 'ABCDEF'


def execute(command):
    return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def probe(path):
    payload = execute(['ffprobe', '-v', 'error', '-show_entries',
                       'stream=sample_rate,channels,codec_name', '-show_entries',
                       'format=duration', '-of', 'json', str(path)])
    return json.loads(payload)


def create_pack(folder, output, seconds=12, workers=6):
    inputs = {stem: pathlib.Path(folder) / f'SpaceDrift_{stem}.m4a' for stem in IDS}
    for stem, path in inputs.items():
        if not path.is_file():
            raise ValueError(f'Missing {stem} stem: {path}')
        metadata = probe(path)
        stream = metadata['streams'][0]
        if (stream['codec_name'] != 'aac' or int(stream['sample_rate']) != 44100
                or stream['channels'] != 2 or abs(float(metadata['format']['duration']) - 432) > 0.1):
            raise ValueError(f'Incompatible or unaligned {stem} stem: {path}')
    if seconds < 2 or 432 % seconds:
        raise ValueError('Segment length must divide 432 seconds')
    count = 432 // seconds

    with tempfile.TemporaryDirectory(prefix='monoid_stems_') as directory:
        def segment(job):
            stem, index = job
            path = pathlib.Path(directory) / f'{stem}_{index:03d}.m4a'
            execute(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                     '-ss', str(index * seconds), '-i', str(inputs[stem]), '-t', str(seconds),
                     '-map', '0:a:0', '-c:a', 'copy', '-movflags', '+faststart', str(path)])
            duration = float(probe(path)['format']['duration'])
            if abs(duration - seconds) > 0.05:
                raise ValueError(f'Misaligned fragment {stem} #{index}: {duration:.4f}s')
            return (stem, index), path

        jobs = [(stem, i) for stem in IDS for i in range(count)]
        with ThreadPoolExecutor(max_workers=workers) as executor:
            segments = dict(executor.map(segment, jobs))
        manifest = {
            'schema': 'monoid-audio-pack-v1', 'name': 'Space Drift', 'codec': 'aac-lc',
            'private': True, 'sampleRateHz': 44100, 'channels': 2,
            'segmentSamples': seconds * 44100, 'segmentCount': count,
            'totalSamples': 432 * 44100, 'stems': {}
        }
        offset = 0
        for stem in IDS:
            parts = []
            for index in range(count):
                size = segments[(stem, index)].stat().st_size
                parts.append({'offset': offset, 'bytes': size})
                offset += size
            manifest['stems'][stem] = {'segments': parts}
        header = json.dumps(manifest, separators=(',', ':'), ensure_ascii=True).encode('utf-8')
        if len(header) > 1_048_576:
            raise ValueError('Manifest is too large')
        output = pathlib.Path(output)
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open('wb') as out:
            out.write(MAGIC + struct.pack('<I', len(header)) + header)
            for stem in IDS:
                for index in range(count):
                    with segments[(stem, index)].open('rb') as source:
                        while data := source.read(1024 * 1024):
                            out.write(data)
        with output.open('rb') as source:
            sha256 = hashlib.file_digest(source, 'sha256').hexdigest()
        print(f'Pack: {output} ({output.stat().st_size} bytes)\nSHA256: {sha256}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build a non-public MONOID compressed stem pack')
    parser.add_argument('--input-dir', required=True, help='Directory containing SpaceDrift_A.m4a through SpaceDrift_F.m4a')
    parser.add_argument('--output', required=True, help='Destination private .monoidpack file')
    parser.add_argument('--seconds', type=int, default=12)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    create_pack(args.input_dir, args.output, args.seconds, args.workers)

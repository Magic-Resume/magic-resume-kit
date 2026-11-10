#!/usr/bin/env python3
"""Check a controlled SVG motion in real Chrome contact screenshots.

Input is the public 735x55 CSS clip at (350,150), DPR 2, CDP scale 1,
therefore 1470x110 output pixels. It tests movement, not whether the old
position was visually wrong or whether a user has accepted a candidate.
No PDF/Node-render evidence substitutes for these browser screenshots.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

ICON_ROIS = {
    'mail': (32, 52, 80, 104),
    'globe': (752, 2, 800, 60),
    # The initial wider proposal x=808 included the G at x=805..807.
    'github': (752, 52, 800, 106),
}
TEXT_ROIS = {
    'mail': (80, 52, 740, 110),
    'globe': (800, 2, 1470, 56),
    'github': (800, 56, 1470, 110),
}
THRESHOLDS = (96, 128, 160, 192, 224)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('before', type=Path)
parser.add_argument('after', type=Path)
parser.add_argument('--report', required=True, type=Path)
parser.add_argument('--expected-dy', type=int, default=-2, help='Expected output-pixel displacement; negative is upward.')
parser.add_argument('--minimum-mask-f1', type=float, default=0.90, help='Allow minor SVG antialias variation, while requiring the same shape.')
args = parser.parse_args()
if args.report.exists():
    raise SystemExit('Refusing to overwrite an existing report.')


def read(path):
    image = Image.open(path).convert('RGB')
    if image.size != (1470, 110):
        raise ValueError('Expected the agreed public Chrome clip dimensions 1470x110.')
    return np.asarray(image), np.asarray(image.convert('L'))


def crop(array, box):
    x0, y0, x1, y1 = box
    return array[y0:y1, x0:x1]


def translate(mask, dx, dy):
    result = np.zeros_like(mask)
    h, w = mask.shape
    source_x0, source_x1 = max(0, -dx), min(w, w - dx)
    source_y0, source_y1 = max(0, -dy), min(h, h - dy)
    result[source_y0 + dy:source_y1 + dy, source_x0 + dx:source_x1 + dx] = mask[source_y0:source_y1, source_x0:source_x1]
    return result


before_rgb, before_gray = read(args.before)
after_rgb, after_gray = read(args.after)
failures = []
report = {
    'scope': 'Controlled movement regression on actual Chrome PNGs; not a claim of original misalignment, root cause, or visual acceptance.',
    'capture': {'cssClip': [350, 150, 735, 55], 'dpr': 2, 'cdpScale': 1, 'outputDimensions': [1470, 110], 'outputPixelsPerCssPixel': 2},
    'beforeSha256': hashlib.sha256(args.before.read_bytes()).hexdigest(),
    'afterSha256': hashlib.sha256(args.after.read_bytes()).hexdigest(),
    'expectedDisplacementOutputPx': [0, args.expected_dy],
    'expectedDisplacementCssPx': [0, args.expected_dy / 2],
    'method': {'grayscaleInkThresholds': THRESHOLDS, 'searchDxOutputPx': [-1, 0, 1], 'searchDyOutputPx': list(range(-6, 7)), 'score': 'Mean foreground-mask F1 across five thresholds; exact displacement plus per-threshold shape quality required.', 'minimumMaskF1': args.minimum_mask_f1},
    'icons': {},
    'text': {},
}

for name, box in ICON_ROIS.items():
    left_gray = crop(before_gray, box)
    right_gray = crop(after_gray, box)
    pairs = [(left_gray < threshold, right_gray < threshold) for threshold in THRESHOLDS]
    if any(not a.any() or not b.any() for a, b in pairs):
        failures.append(f'{name}: missing ink in an icon ROI')
        continue
    candidates = []
    for dx in (-1, 0, 1):
        for dy in range(-6, 7):
            scores = []
            for a, b in pairs:
                moved = translate(a, dx, dy)
                score = 2 * np.count_nonzero(moved & b) / (np.count_nonzero(moved) + np.count_nonzero(b))
                scores.append(float(score))
            candidates.append({'dx': dx, 'dy': dy, 'meanF1': float(np.mean(scores)), 'f1ByThreshold': dict(zip(map(str, THRESHOLDS), scores))})
    candidates.sort(key=lambda item: (-item['meanF1'], abs(item['dx']) + abs(item['dy']), abs(item['dx']), item['dy']))
    best = candidates[0]
    report['icons'][name] = {'roiOutputPx': box, 'bestMatch': best, 'runnerUp': candidates[1], 'bestDisplacementCssPx': [best['dx'] / 2, best['dy'] / 2]}
    if (best['dx'], best['dy']) != (0, args.expected_dy):
        failures.append(f"{name}: best displacement ({best['dx']}, {best['dy']}) output px != expected (0, {args.expected_dy}) output px")
    if min(best['f1ByThreshold'].values()) < args.minimum_mask_f1:
        failures.append(f'{name}: mask shape F1 below {args.minimum_mask_f1}; possible shape/content mismatch')

changed = np.any(before_rgb != after_rgb, axis=2)
for name, box in TEXT_ROIS.items():
    count = int(np.count_nonzero(crop(changed, box)))
    report['text'][name] = {'roiOutputPx': box, 'changedPixels': count, 'identical': count == 0}
    if count:
        failures.append(f'{name}: text ROI changed at {count} output pixels')

outside = np.ones(changed.shape, dtype=bool)
for box in ICON_ROIS.values():
    x0, y0, x1, y1 = box
    outside[y0:y1, x0:x1] = False
outside_count = int(np.count_nonzero(changed & outside))
report['outsideIconRois'] = {'changedPixels': outside_count, 'identical': outside_count == 0}
if outside_count:
    failures.append(f'Outside SVG ROIs: {outside_count} changed output pixels')
report['totalChangedPixels'] = int(np.count_nonzero(changed))
report['passed'] = not failures
report['failures'] = failures
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2) + '\n')
for name, result in report['icons'].items():
    best = result['bestMatch']
    print(f"{name}: best movement=({best['dx']}, {best['dy']}) output px = ({best['dx']/2:g}, {best['dy']/2:g}) CSS px, mean-mask-F1={best['meanF1']:.6f}")
print(f'Text unchanged: {all(item["identical"] for item in report["text"].values())}; outside SVG unchanged: {outside_count == 0}; total changed pixels: {report["totalChangedPixels"]}')
for failure in failures:
    print('FAIL: ' + failure)
print(('PASS' if report['passed'] else 'FAIL') + ': controlled screenshot motion; report=' + str(args.report.resolve()))
sys.exit(0 if report['passed'] else 1)

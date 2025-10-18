#!/usr/bin/env python3
"""
Crop multi-state exercise illustrations down to a single representative pose.

For each `large.webp` inside `exercises copy/<exercise-name>/`, we identify
distinct pose panels separated by transparent gutters and keep the pose whose
center of mass sits lowest in the frame (usually the active/contracted phase).
The crop keeps a small margin so equipment remains visible but removes the
other panels and excess empty space.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np
from PIL import Image, ImageFile


REPO_ROOT = Path(__file__).resolve().parents[1]
EXERCISES_ROOT = REPO_ROOT / "exercises copy"

Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True


@dataclass
class Segment:
    start: int
    end: int

    @property
    def width(self) -> int:
        return self.end - self.start


@dataclass
class PoseCandidate:
    left: int
    top: int
    right: int
    bottom: int
    area: int
    com_y: float


def _find_segments(sum_values: np.ndarray, blank_threshold: int, min_segment: int) -> List[Segment]:
    """Find contiguous non-blank regions along one axis."""
    segments: List[Segment] = []
    in_segment = False
    start = 0
    for idx, value in enumerate(sum_values):
        is_content = value > blank_threshold
        if is_content and not in_segment:
            in_segment = True
            start = idx
        elif not is_content and in_segment:
            if idx - start >= min_segment:
                segments.append(Segment(start, idx))
            in_segment = False
    if in_segment:
        end = len(sum_values)
        if end - start >= min_segment:
            segments.append(Segment(start, end))
    if not segments:
        segments.append(Segment(0, len(sum_values)))
    return segments


def _iter_pose_candidates(mask: np.ndarray) -> Iterable[PoseCandidate]:
    """Yield candidate pose bounding boxes from the alpha mask."""
    height, width = mask.shape
    blank_threshold_cols = max(1, int(height * 0.005))
    blank_threshold_rows = max(1, int(width * 0.005))
    min_segment_cols = max(40, int(width * 0.04))
    min_segment_rows = max(40, int(height * 0.04))

    col_sum = mask.sum(axis=0)
    row_sum = mask.sum(axis=1)
    h_segments = _find_segments(col_sum, blank_threshold_cols, min_segment_cols)
    v_segments = _find_segments(row_sum, blank_threshold_rows, min_segment_rows)

    area_threshold = max(500, int(mask.size * 0.0005))

    row_indices = np.arange(mask.shape[0], dtype=np.float64)
    for h_seg in h_segments:
        for v_seg in v_segments:
            submask = mask[v_seg.start:v_seg.end, h_seg.start:h_seg.end]
            if submask.size == 0 or not submask.any():
                continue

            col_presence = submask.any(axis=0)
            if not col_presence.any():
                continue
            left_offset = int(np.argmax(col_presence))
            right_offset = int(len(col_presence) - np.argmax(col_presence[::-1]))

            rows_presence = submask.any(axis=1)
            if not rows_presence.any():
                continue
            top_offset = int(np.argmax(rows_presence))
            bottom_offset = int(len(rows_presence) - np.argmax(rows_presence[::-1]))

            local = submask[top_offset:bottom_offset, left_offset:right_offset]
            if local.size == 0 or not local.any():
                continue

            area = int(local.sum())
            if area < area_threshold:
                continue

            row_weights = local.sum(axis=1).astype(np.float64)
            local_row_indices = row_indices[top_offset + v_seg.start : top_offset + v_seg.start + len(row_weights)]
            com_y = float((row_weights * local_row_indices).sum() / row_weights.sum())

            left = h_seg.start + left_offset
            right = h_seg.start + right_offset
            top = v_seg.start + top_offset
            bottom = v_seg.start + bottom_offset

            yield PoseCandidate(left, top, right, bottom, area, com_y)


def select_repr_pose(mask: np.ndarray) -> PoseCandidate:
    """Select the pose candidate that best represents the exercise."""
    candidates = list(_iter_pose_candidates(mask))
    if not candidates:
        height, width = mask.shape
        ys, xs = np.where(mask)
        if ys.size == 0:
            raise ValueError("Mask contains no opaque pixels.")
        return PoseCandidate(
            left=int(xs.min()),
            right=int(xs.max()) + 1,
            top=int(ys.min()),
            bottom=int(ys.max()) + 1,
            area=int(ys.size),
            com_y=float(ys.mean()),
        )
    candidates.sort(key=lambda c: (c.com_y, c.area), reverse=True)
    return candidates[0]


def expand_with_margin(candidate: PoseCandidate, width: int, height: int, ratio: float = 0.035) -> Tuple[int, int, int, int]:
    """Add a proportional margin while staying within image bounds."""
    crop_width = candidate.right - candidate.left
    crop_height = candidate.bottom - candidate.top
    margin_x = max(4, int(crop_width * ratio))
    margin_y = max(4, int(crop_height * ratio))
    left = max(0, candidate.left - margin_x)
    top = max(0, candidate.top - margin_y)
    right = min(width, candidate.right + margin_x)
    bottom = min(height, candidate.bottom + margin_y)
    return left, top, right, bottom


def process_image(path: Path) -> bool:
    """Crop the image in-place to the chosen pose. Returns True on success."""
    with Image.open(path) as img:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        bbox = img.getbbox()
        if not bbox:
            return False
        x0, y0, x1, y1 = bbox
        alpha = np.array(img.split()[-1], dtype=np.uint8)
        mask = alpha[y0:y1, x0:x1] > 0
        candidate = select_repr_pose(mask)
        # Translate candidate back to full-image coordinates.
        candidate = PoseCandidate(
            left=candidate.left + x0,
            right=candidate.right + x0,
            top=candidate.top + y0,
            bottom=candidate.bottom + y0,
            area=candidate.area,
            com_y=candidate.com_y + y0,
        )
        left, top, right, bottom = expand_with_margin(candidate, img.width, img.height)
        # Ensure coordinates are integral and valid.
        left, top, right, bottom = map(int, (left, top, right, bottom))
        if right - left <= 0 or bottom - top <= 0:
            raise ValueError(f"Invalid crop for {path}: {(left, top, right, bottom)}")
        cropped = img.crop((left, top, right, bottom))
        cropped.save(path, format="WEBP", method=6, quality=95)
    return True


def main() -> None:
    if not EXERCISES_ROOT.exists():
        raise SystemExit(f"Missing directory: {EXERCISES_ROOT}")

    processed = 0
    skipped = 0
    for exercise_dir, _subdirs, files in os.walk(EXERCISES_ROOT):
        if "large.webp" not in files:
            continue
        path = Path(exercise_dir) / "large.webp"
        try:
            if process_image(path):
                processed += 1
            else:
                skipped += 1
        except Exception as exc:  # noqa: BLE001 - report failures with context
            skipped += 1
            print(f"[WARN] Failed to crop {path}: {exc}")
    print(f"Cropped {processed} images; skipped {skipped}.")


if __name__ == "__main__":
    main()

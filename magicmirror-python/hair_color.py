"""
Hair recoloring utilities with MediaPipe driven masking.

This module builds a soft hair mask by combining selfie segmentation
with the face oval landmarks so that skin, eyes, and background stay
untouched. Colors are blended while preserving highlights to keep
results natural even on vivid shades.
"""

from __future__ import annotations

import base64
import logging
import threading
from dataclasses import dataclass
from typing import Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

LOGGER = logging.getLogger(__name__)

# Pre-compute MediaPipe helpers once so the processors are reused across calls.
_mp_selfie = mp.solutions.selfie_segmentation
_mp_face_mesh = mp.solutions.face_mesh

# Face oval sequence borrowed from MediaPipe reference indices (clockwise).
_FACE_OVAL_SEQUENCE = [
    10, 338, 297, 332, 284, 251, 389, 356,
    454, 323, 361, 288, 397, 365, 379, 378,
    400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21,
    54, 103, 67, 109
]

_PROCESS_LOCK = threading.Lock()
_SEGMENTER = _mp_selfie.SelfieSegmentation(model_selection=1)
_FACE_MESH = _mp_face_mesh.FaceMesh(
    static_image_mode=True,
    refine_landmarks=True,
    max_num_faces=1,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.4,
)


class HairColorError(Exception):
    """Domain specific error for recoloring failures."""


@dataclass
class HairColorResult:
    image_b64: str
    coverage: float
    mask_ratio: float


def _decode_base64_image(data: str) -> np.ndarray:
    if not data or not isinstance(data, str):
        raise HairColorError("imageBase64 kosong")
    payload = data.split(',', 1)[-1]
    try:
        img_bytes = base64.b64decode(payload, validate=True)
    except Exception as exc:  # pragma: no cover - defensive
        raise HairColorError(f"Gagal decode base64: {exc}") from exc
    array = np.frombuffer(img_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise HairColorError("Gagal membaca gambar dari base64")
    return image


def _hex_to_bgr(hex_color: str) -> np.ndarray:
    if not hex_color:
        raise HairColorError("Warna target kosong")
    value = hex_color.strip().lstrip('#')
    if len(value) != 6:
        raise HairColorError("Format warna harus #RRGGBB")
    try:
        r = int(value[0:2], 16)
        g = int(value[2:4], 16)
        b = int(value[4:6], 16)
    except ValueError as exc:  # pragma: no cover - defensive
        raise HairColorError("Format warna tidak valid") from exc
    return np.array([b, g, r], dtype=np.float32)


def _landmark_points(landmarks, width: int, height: int) -> Optional[np.ndarray]:
    if not landmarks:
        return None
    pts = []
    for idx in _FACE_OVAL_SEQUENCE:
        if idx >= len(landmarks.landmark):
            continue
        lm = landmarks.landmark[idx]
        pts.append([int(lm.x * width), int(lm.y * height)])
    if len(pts) < 3:
        return None
    return np.array(pts, dtype=np.int32)


def _compute_face_masks(image_bgr: np.ndarray, rgb_image: np.ndarray):
    height, width = image_bgr.shape[:2]
    person_prob = None
    face_polygon = None

    with _PROCESS_LOCK:
        seg_result = _SEGMENTER.process(rgb_image)
        mesh_result = _FACE_MESH.process(rgb_image)

    if seg_result.segmentation_mask is None:
        raise HairColorError("Segmentation mask kosong")

    # Keep the segmentation output as a soft probability map (0-1) so
    # blending remains smooth around wispy strands.
    person_prob = np.clip(seg_result.segmentation_mask, 0.0, 1.0).astype(np.float32)
    person_prob = cv2.GaussianBlur(person_prob, (7, 7), 0)

    if mesh_result.multi_face_landmarks:
        face_polygon = _landmark_points(mesh_result.multi_face_landmarks[0], width, height)

    return person_prob, face_polygon


def _build_hair_mask(person_prob: np.ndarray, face_polygon: Optional[np.ndarray], shape: Tuple[int, int]) -> np.ndarray:
    height, width = shape
    mask = np.zeros((height, width), dtype=np.float32)

    if person_prob is None or person_prob.max() <= 0.02:
        return mask

    working = np.copy(person_prob)

    if face_polygon is not None:
        face_mask = np.zeros((height, width), dtype=np.float32)
        cv2.fillPoly(face_mask, [face_polygon], 1.0)
        # Expand the face slightly so the skin stays untouched while
        # retaining the crown/side strands.
        face_soft = cv2.GaussianBlur(face_mask, (51, 51), 0)
        working = np.clip(working - (face_soft * 0.85), 0.0, 1.0)

        # Keep mostly the upper portion around the head.
        x_min = max(int(face_polygon[:, 0].min() - (np.ptp(face_polygon[:, 0]) * 0.65)), 0)
        x_max = min(int(face_polygon[:, 0].max() + (np.ptp(face_polygon[:, 0]) * 0.65)), width)
        y_min = max(int(face_polygon[:, 1].min() - (np.ptp(face_polygon[:, 1]) * 1.1)), 0)
        y_max = min(int(face_polygon[:, 1].max() + (np.ptp(face_polygon[:, 1]) * 0.4)), height)

        region = np.zeros_like(working)
        region[y_min:y_max, x_min:x_max] = working[y_min:y_max, x_min:x_max]
        working = region
    else:
        # Fall back to the upper central area of the subject mask.
        margin_x = int(width * 0.28)
        top = int(height * 0.05)
        bottom = int(height * 0.75)
        cropped = np.zeros_like(working)
        cropped[top:bottom, margin_x:width - margin_x] = working[top:bottom, margin_x:width - margin_x]
        working = cropped

    if working.max() <= 0.01:
        return mask

    # Emphasize the crown area by weighting towards the top of the frame.
    vertical_weight = np.linspace(1.35, 0.7, height, dtype=np.float32).reshape(height, 1)
    working *= vertical_weight
    working = np.clip(working, 0.0, 1.0)

    mask = working
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    mask = cv2.normalize(mask, None, 0.0, 1.0, cv2.NORM_MINMAX)

    # Keep a soft interior while sharpening boundaries slightly.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    refined = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    return np.clip(refined, 0.0, 1.0)


def _apply_color(
    image_bgr: np.ndarray,
    hair_mask: np.ndarray,
    target_bgr: np.ndarray,
    strength: float,
) -> Tuple[np.ndarray, float, float]:
    normalized_strength = float(np.clip(strength, 0.0, 1.0))
    if normalized_strength <= 0.01:
        return image_bgr.copy(), 0.0, 0.0

    mask = hair_mask.astype(np.float32)
    if mask.max() <= 0.01:
        raise HairColorError("Mask rambut tidak ditemukan")

    mask = np.clip(mask * normalized_strength, 0.0, 1.0)

    hsv_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    target_hsv = cv2.cvtColor(target_bgr.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)[0, 0]

    hue = hsv_image[:, :, 0]
    sat = hsv_image[:, :, 1]
    val = hsv_image[:, :, 2]

    target_hue = target_hsv[0]
    target_sat = max(target_hsv[1], 45.0)
    target_val = target_hsv[2]

    mask_hue = mask * (0.75 + 0.25 * normalized_strength)
    hue_delta = ((target_hue - hue + 90.0) % 180.0) - 90.0
    hue = (hue + hue_delta * mask_hue) % 180.0

    sat = np.clip(
        sat + (target_sat - sat) * mask * (0.65 + 0.35 * normalized_strength),
        0.0,
        255.0,
    )

    # Preserve highlights by keeping most of the original value channel while
    # gently steering toward the target luminosity.
    val = np.clip(
        val + (target_val - val) * mask * 0.22,
        0.0,
        255.0,
    )

    hsv_image[:, :, 0] = hue
    hsv_image[:, :, 1] = sat
    hsv_image[:, :, 2] = val

    recolored = cv2.cvtColor(hsv_image.astype(np.uint8), cv2.COLOR_HSV2BGR)

    mask_3 = mask[..., None]
    blended = (recolored.astype(np.float32) * mask_3) + (image_bgr.astype(np.float32) * (1.0 - mask_3))
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    coverage = float(np.mean(mask))
    mask_ratio = float((mask > 0.1).sum() / float(mask.size))
    return blended, coverage, mask_ratio


def recolor(image_base64: str, hex_color: str, strength: float) -> HairColorResult:
    image_bgr = _decode_base64_image(image_base64)
    target_bgr = _hex_to_bgr(hex_color)
    rgb_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    person_mask, face_polygon = _compute_face_masks(image_bgr, rgb_image)
    hair_mask = _build_hair_mask(person_mask, face_polygon, image_bgr.shape[:2])

    recolored_bgr, coverage, mask_ratio = _apply_color(image_bgr, hair_mask, target_bgr, strength)

    success, buffer = cv2.imencode('.jpg', recolored_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not success:
        raise HairColorError("Gagal menyimpan hasil hair color")
    image_b64 = base64.b64encode(buffer).decode('ascii')

    LOGGER.info(
        "hair_color.recolor completed",
        extra={
            'coverage': round(coverage, 4),
            'mask_ratio': round(mask_ratio, 4),
            'strength': float(strength),
        },
    )

    return HairColorResult(image_b64=image_b64, coverage=coverage, mask_ratio=mask_ratio)


__all__ = ['HairColorError', 'HairColorResult', 'recolor']

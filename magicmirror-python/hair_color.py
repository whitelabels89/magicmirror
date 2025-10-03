"""Hair recoloring utilities with MediaPipe driven masking.

This module builds a soft hair mask by combining selfie segmentation
with the face oval landmarks so that skin, eyes, and background stay
untouched. Colors are blended in CIELAB space which preserves existing
lighting and texture for natural looking highlights and shadows.
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
    person_mask = None
    face_polygon = None

    with _PROCESS_LOCK:
        seg_result = _SEGMENTER.process(rgb_image)
        mesh_result = _FACE_MESH.process(rgb_image)

    if seg_result.segmentation_mask is None:
        raise HairColorError("Segmentation mask kosong")

    # Convert segmentation probability map into a soft mask for the subject.
    person_mask = np.clip(seg_result.segmentation_mask, 0.0, 1.0)
    person_mask = cv2.GaussianBlur(person_mask, (9, 9), 0)
    person_mask = (person_mask > 0.25).astype(np.uint8) * 255

    if mesh_result.multi_face_landmarks:
        face_polygon = _landmark_points(mesh_result.multi_face_landmarks[0], width, height)

    return person_mask, face_polygon


def _build_hair_mask(person_mask: np.ndarray, face_polygon: Optional[np.ndarray], shape: Tuple[int, int]) -> np.ndarray:
    height, width = shape
    mask = np.zeros((height, width), dtype=np.uint8)

    if person_mask is None or not np.any(person_mask):
        return mask

    if face_polygon is None:
        # Fall back to a centered crop of the person mask.
        margin_x = int(width * 0.35)
        margin_y = int(height * 0.25)
        x0, x1 = margin_x, width - margin_x
        y0, y1 = max(0, margin_y // 2), min(height, height - margin_y // 3)
        mask[y0:y1, x0:x1] = person_mask[y0:y1, x0:x1]
    else:
        face_mask = np.zeros_like(mask)
        cv2.fillPoly(face_mask, [face_polygon], 255)
        dilated_face = cv2.dilate(face_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)), iterations=1)
        dilated_face = cv2.GaussianBlur(dilated_face, (31, 31), 0)

        x_min = np.clip(int(np.min(face_polygon[:, 0]) - (np.ptp(face_polygon[:, 0]) * 0.6)), 0, width)
        x_max = np.clip(int(np.max(face_polygon[:, 0]) + (np.ptp(face_polygon[:, 0]) * 0.6)), 0, width)
        y_min = np.clip(int(np.min(face_polygon[:, 1]) - (np.ptp(face_polygon[:, 1]) * 0.9)), 0, height)
        y_max = np.clip(int(np.max(face_polygon[:, 1]) + (np.ptp(face_polygon[:, 1]) * 1.3)), 0, height)

        cropped = np.zeros_like(mask)
        cropped[y_min:y_max, x_min:x_max] = person_mask[y_min:y_max, x_min:x_max]
        mask = cv2.bitwise_and(cropped, cv2.bitwise_not(dilated_face))

    if not np.any(mask):
        return mask

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.GaussianBlur(mask, (25, 25), 0)
    return mask


def _apply_color(image_bgr: np.ndarray, hair_mask: np.ndarray, target_bgr: np.ndarray, strength: float) -> Tuple[np.ndarray, float, float]:
    normalized_strength = float(np.clip(strength, 0.0, 1.0))
    if normalized_strength <= 0.01:
        return image_bgr.copy(), 0.0, 0.0

    mask = hair_mask.astype(np.float32) / 255.0
    if mask.max() <= 0.01:
        raise HairColorError("Mask rambut tidak ditemukan")

    mask *= normalized_strength
    mask = np.clip(mask, 0.0, 1.0)

    lab_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    target_lab = cv2.cvtColor(target_bgr.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]

    mask_3 = mask[..., None]
    a_channel = lab_image[:, :, 1]
    b_channel = lab_image[:, :, 2]
    lab_image[:, :, 1] = a_channel + (target_lab[1] - a_channel) * mask_3
    lab_image[:, :, 2] = b_channel + (target_lab[2] - b_channel) * mask_3

    # Preserve natural lighting by slightly nudging luminance toward the target.
    lab_image[:, :, 0] = lab_image[:, :, 0] + (target_lab[0] - lab_image[:, :, 0]) * (mask_3 * 0.12)

    recolored = cv2.cvtColor(np.clip(lab_image, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    blended = (recolored.astype(np.float32) * mask_3) + (image_bgr.astype(np.float32) * (1.0 - mask_3))
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    coverage = float(np.mean(mask))
    mask_ratio = float((hair_mask > 16).sum() / float(hair_mask.size))
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

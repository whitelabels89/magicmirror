#!/usr/bin/env python3
"""CLI bridge for invoking the hair recolor module from Node.

Reads a JSON payload from stdin containing ``imageBase64`` and returns a
JSON response with ``imageOutBase64`` so the Node server can reuse the same
local algorithm even when the Flask service is unavailable.
"""

from __future__ import annotations

import argparse
import json
import sys

from hair_color import HairColorError, recolor


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MagicMirror hair recolor CLI")
    parser.add_argument("--hex", required=True, help="Target hair color in #RRGGBB")
    parser.add_argument("--strength", type=float, default=0.7, help="Blend intensity (0-1)")
    parser.add_argument("--label", default="", help="Optional label for logging context")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        sys.stderr.write(f"Invalid JSON payload: {exc}\n")
        return 2

    image_b64 = None
    if isinstance(payload, dict):
        image_b64 = payload.get("imageBase64") or payload.get("image") or payload.get("image_base64")

    try:
        result = recolor(image_b64, args.hex, args.strength)
    except HairColorError as err:
        json.dump({"ok": False, "error": str(err)}, sys.stdout)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:  # pragma: no cover - defensive
        sys.stderr.write(f"Unexpected error: {exc}\n")
        return 3

    json.dump({
        "ok": True,
        "imageOutBase64": result.image_b64,
        "coverage": result.coverage,
        "maskRatio": result.mask_ratio,
        "label": args.label,
    }, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

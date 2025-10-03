from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import face_consultant_freshstart
from hair_color import HairColorError, recolor as recolor_hair
import logging
import os

app = Flask(__name__, static_folder='public')
CORS(app)

@app.route('/')
def index():
    return "QC Magic Mirror API is running."

@app.route('/run', methods=['POST'])
def run_face_consultant():
    try:
        data = request.get_json()
        photo = data.get('photo')  # base64 image
        session_id = data.get('session_id')  # get session_id from frontend
        result = face_consultant_freshstart.run(photo, session_id=session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/hair-color', methods=['POST'])
def api_hair_color():
    payload = request.get_json(silent=True) or {}
    image_b64 = payload.get('imageBase64') or payload.get('image_base64') or payload.get('image')
    hex_color = payload.get('hex') or payload.get('color')
    strength = payload.get('strength', 0.7)
    label = payload.get('label') or ''

    try:
        strength_val = float(strength)
    except (TypeError, ValueError):
        strength_val = 0.7

    try:
        result = recolor_hair(image_b64, hex_color, strength_val)
    except HairColorError as err:
        logging.warning(
            'hair-color rejected request',
            extra={'reason': str(err), 'label': label, 'hex': hex_color, 'strength': strength_val},
        )
        return jsonify({'ok': False, 'error': str(err)}), 400
    except Exception as exc:  # pragma: no cover - defensive
        logging.exception('hair-color failed', extra={'label': label, 'hex': hex_color})
        return jsonify({'ok': False, 'error': 'Hair color service error'}), 500

    logging.info(
        'hair-color success',
        extra={
            'label': label,
            'hex': hex_color,
            'strength': round(strength_val, 3),
            'coverage': round(result.coverage, 4),
            'mask_ratio': round(result.mask_ratio, 4),
        },
    )

    return jsonify({
        'ok': True,
        'imageOutBase64': result.image_b64,
        'coverage': result.coverage,
        'maskRatio': result.mask_ratio,
    })

# ✅ Serve generated faces statically from backend folder
@app.route('/generated_faces/<path:filename>')
def serve_generated_face(filename):
    return send_from_directory(os.path.join(app.static_folder, 'generated_faces'), filename)



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)

from flask import Flask, request, jsonify
from flask_cors import CORS
import face_consultant_freshstart

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "QC Magic Mirror API is running."

@app.route('/run', methods=['POST'])
def run_face_consultant():
    try:
        data = request.get_json()
        photo = data.get('photo')  # base64 image
        result = face_consultant_freshstart.run(photo)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)


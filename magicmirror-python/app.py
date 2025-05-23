from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import face_consultant_freshstart
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

# ✅ Serve generated faces statically from backend folder
@app.route('/generated_faces/<path:filename>')
def serve_generated_face(filename):
    return send_from_directory(os.path.join(app.static_folder, 'generated_faces'), filename)



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)

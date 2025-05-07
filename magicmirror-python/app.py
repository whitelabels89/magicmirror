from flask import Flask, request, jsonify
import face_consultant_freshstart

app = Flask(__name__)

@app.route('/')
def index():
    return "QC Magic Mirror API is running."

@app.route('/run', methods=['POST'])
def run_face_consultant():
    try:
        data = request.get_json()
        photo = data.get('photo')  # base64 image
        if not photo:
            return jsonify({"error": "photo is missing"}), 400

        result = face_consultant_freshstart.run(photo)
        return jsonify(result)
    except Exception as e:
        print(f"❌ ERROR saat proses /run: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)

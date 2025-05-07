from flask import Flask, request, jsonify
import face_consultant_freshstart

app = Flask(__name__)

@app.route('/')
def index():
    return "QC Magic Mirror API is running."

@app.route('/run', methods=['POST'])
def run_face_consultant():
    data = request.get_json()
    photo = data.get('photo')  # base64 image or URL
    result = face_consultant_freshstart.run(photo)  # kamu perlu sesuaikan nama fungsinya

    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)

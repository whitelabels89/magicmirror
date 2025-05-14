# Face Consultant Magic Mirror
# Final Clean Version
# --------------------------------------------

# -------------------------- IMPORTS --------------------------
from dotenv import load_dotenv
import os

load_dotenv()
USE_ELEVENLABS = os.getenv('USE_ELEVENLABS', 'false').lower() == 'true'
ENV_MODE = os.getenv('ENV_MODE', 'dev')  # default ke dev

# ✅ Buat folder lokal saat startup (jika belum ada)
os.makedirs("captured_faces", exist_ok=True)
os.makedirs("generated_faces", exist_ok=True)
os.makedirs(os.path.join("public", "generated_faces"), exist_ok=True)

import sys
import cv2
import math
import time
import json
import uuid
import requests
import threading
import platform
import numpy as np
import pygame
import openai
import mediapipe as mp

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

# --- Magic Mirror UI Overlay ---
from magic_mirror_v2.generate_virtual_face import render_full_magic_mirror, handle_mouse_click
# Import lengkap untuk virtual face gallery & klik (Replicate)
from magic_mirror_v2.generate_virtual_face_replicate import generate_virtual_face_replicate, render_generated_faces, handle_face_click

# -------------------------- SOCKET.IO CLIENT --------------------------
import socketio
import base64

sio = socketio.Client()

try:
    if os.getenv('ENV_MODE') == 'dev':
        sio.connect('http://localhost:3000')
    else:
        sio.connect('https://queensacademy.id')
    print("✅ Connected to WebSocket server")
    # Mulai background session cleaner setelah koneksi sukses
    def start_session_cleaner():
        def cleaner_loop():
            while True:
                now = time.time()
                to_delete = []
                for sid, state in list(session_states.items()):
                    created_at = state.get("created_at")
                    if created_at and now - created_at > 3600:  # lebih dari 1 jam
                        to_delete.append(sid)
                for sid in to_delete:
                    del session_states[sid]
                    print(f"🧹 Session {sid} dihapus otomatis karena timeout 1 jam.")
                time.sleep(300)  # cek tiap 5 menit
        threading.Thread(target=cleaner_loop, daemon=True).start()
    start_session_cleaner()
except Exception as e:
    print(f"⚠️ WebSocket conection failed: {e}")

session_states = {}
# -------------------------- SOCKET.IO LISTENER --------------------------
# Accept photo upload from browser and trigger analysis, now per session
@sio.on('user_photo')
def handle_user_photo(data):
    session_id = data.get("session_id")
    if not session_id or session_id not in session_states:
        print("❌ session_id tidak ditemukan di session_states.")
        return

    print(f"📸 Foto diterima dari browser untuk analisa (session: {session_id}).")

    try:
        photo_data = data.get('photo')
        if not photo_data:
            print("❌ Data foto kosong.")
            return
        img_bytes = base64.b64decode(photo_data)
        ensure_folder("captured_faces")
        capture_filename = os.path.join("captured_faces", f"{session_id}_face_{int(time.time())}.jpg")
        with open(capture_filename, "wb") as f:
            f.write(img_bytes)
        print(f"✅ Foto disimpan: {capture_filename}")

        img = cv2.imread(capture_filename)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_img)

        if results.multi_face_landmarks:
            for landmarks in results.multi_face_landmarks:
                def get_point(lms, idx, shape):
                    h, w, _ = shape
                    lm = lms[idx]
                    return int(lm.x * w), int(lm.y * h)
                def euclidean(p1, p2):
                    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                def get_skin_tone_color(img, pt):
                    x, y = pt
                    h, w = img.shape[:2]
                    x = min(max(0, x), w-1)
                    y = min(max(0, y), h-1)
                    b, g, r = img[y, x]
                    if r > g and r > b:
                        return "Warm"
                    elif b > r and b > g:
                        return "Cool"
                    else:
                        return "Neutral"
                def get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio):
                    if ratio_w_h < 0.85:
                        return "Oblong"
                    elif 0.85 <= ratio_w_h <= 0.95:
                        if jaw_ratio < 0.8:
                            return "Heart"
                        else:
                            return "Oval"
                    elif 0.95 < ratio_w_h <= 1.05:
                        if jaw_ratio > 0.95:
                            return "Square"
                        else:
                            return "Round"
                    else:
                        return "Wide"

                shape = img.shape
                chin = get_point(landmarks.landmark, 152, shape)
                forehead = get_point(landmarks.landmark, 10, shape)
                left_cheek = get_point(landmarks.landmark, 234, shape)
                right_cheek = get_point(landmarks.landmark, 454, shape)
                jaw_width = euclidean(left_cheek, right_cheek)
                height = euclidean(forehead, chin)
                forehead_width = euclidean(get_point(landmarks.landmark, 127, shape), get_point(landmarks.landmark, 356, shape))
                ratio_w_h = jaw_width / height
                jaw_ratio = jaw_width / jaw_width
                forehead_ratio = forehead_width / jaw_width
                face_shape = get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio)
                skin_tone = get_skin_tone_color(img, left_cheek)

                session_states[session_id]["face_shape"] = face_shape
                session_states[session_id]["skin_tone"] = skin_tone
                session_states[session_id]["latest_captured_face_path"] = capture_filename
                session_states[session_id]["analysis_started"] = False

                print(f"🔎 Landmark recovery berhasil: Face Shape = {face_shape}, Skin Tone = {skin_tone}")
                break
        else:
            print("⚠️ Tidak ada wajah terdeteksi di foto capture.")
            return

    except Exception as e:
        print(f"❌ Error proses foto dari browser: {e}")
        return

    # Validasi: hanya lanjut jika face_shape dan skin_tone sudah tersedia
    if not session_states[session_id]["face_shape"] or not session_states[session_id]["skin_tone"]:
        print("❌ Landmark wajah belum terbaca.")
        return

    # 🚫 Cegah klik ulang Analyze jika sudah running
    if session_states[session_id].get("analysis_started"):
        print(f"⚠️ Session {session_id} sedang berjalan, abaikan klik ulang.")
        return

    session_states[session_id]["analysis_started"] = True
    threading.Thread(target=analyze_face, args=(session_id,)).start()

# -------------------------- SETUP --------------------------
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
VOICE_ID = os.getenv('VOICE_ID')
GOOGLE_CREDENTIALS_FILE = "credentials.json"
GDRIVE_FOLDER_ID = os.getenv('GDRIVE_FOLDER_ID')
PROMO_VOICE_FOLDER_NAME = "PROMO_VOICE_FILES"

try:
    pygame.mixer.init()
except Exception as e:
    print(f"⚠️ Audio device tidak tersedia (server mode): {e}")

# -------------------------- GLOBALS --------------------------
_cached_credentials = None
drive_service = None
qr_canvas = None
qr_start_time = None
qr_anim_start = None
face_shape, skin_tone = None, None
recommendation = ""
analyze_triggered = False
analyze_done = False
analysis_started = False
status_msg = "👀 Arahkan wajah ke kamera."
typing_text = ""
text_queue = []
latest_captured_face_path = None
generated_faces = []
visitor_info = {}
# -------------------------- SOCKET.IO LISTENER --------------------------
# Accept user info from browser and store in session_states
@sio.on("user_info")
def handle_user_info(data):
    # Limiter jumlah session aktif
    if len(session_states) >= 80:
        print("❌ Terlalu banyak sesi aktif. Tolak session baru.")
        if sio.connected:
            sio.emit('session_limit_reached', {
                "message": "Mohon maaf, Magic Mirror sedang penuh karena tingginya pengunjung. Silakan coba kembali beberapa menit lagi."
            })
        return
    session_id = data.get("session_id")
    if not session_id:
        print("❌ session_id tidak tersedia.")
        return

    session_states[session_id] = {
        "visitor_info": {
            "name": data.get("name"),
            "wa": data.get("wa"),
            "session_id": session_id
        },
        "face_shape": None,
        "skin_tone": None,
        "latest_captured_face_path": None,
        "recommendation": None,
        "generated_faces": [],
        "created_at": time.time()
    }
    globals()["session_id"] = session_id
    print(f"📩 Visitor Info untuk session {session_id} disimpan.", flush=True)


def save_visitor_info_to_sheet(name, wa, face_shape, skin_tone, recommendation):
    try:
        import gspread
        creds = get_credentials()
        gc = gspread.authorize(creds)
        sheet = gc.open("QC CORE SYSTEM").worksheet("VISITOR_LOG")
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        sheet.append_row([
            now, name, wa, face_shape, skin_tone, recommendation
        ])
        print("📄 Data visitor berhasil disimpan ke sheet.")
    except Exception as e:
        print(f"⚠️ Gagal simpan visitor ke sheet: {e}")

# -------------------------- UTILITIES --------------------------
def send_result_to_web(photo_path, ai_text):
    if not sio.connected:
        print("❌ WebSocket tidak terhubung.")
        return
    try:
        with open(photo_path, "rb") as img_file:
            img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        sio.emit('user_photo', {'photo': img_base64})
        sio.emit('send_ai_result', {'recommendation': ai_text})
        print("📤 Foto & rekomendasi AI berhasil dikirim ke WebSocket server.")
    except Exception as e:
        print(f"⚠️ Error kirim data ke web: {e}")

import subprocess
# -------------------------- CAMERA AUTO-DETECT --------------------------
def auto_detect_camera(prefer_width=1920, prefer_height=1080):
    # Try to find "Iriun" camera by device name
    found_iriun_id = None
    fallback_id = None
    for cam_id in range(5):  # Scan ID 0–4
        cap = cv2.VideoCapture(cam_id)
        if cap is not None and cap.isOpened():
            # Try to get device name if possible (platform dependent)
            device_name = ""
            if sys.platform == "darwin":
                # On macOS, use system_profiler or ffmpeg to list devices
                try:
                    proc = subprocess.Popen(
                        ["ffmpeg", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
                        stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True
                    )
                    out, err = proc.communicate(timeout=3)
                    for line in (err or "").splitlines():
                        if f"[{cam_id}]" in line:
                            device_name = line
                            break
                except Exception:
                    pass
            # For Linux/Windows, not reliable, just fallback
            # Set preferred resolution
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, prefer_width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, prefer_height)
            actual_width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            actual_height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            if "Iriun" in device_name:
                found_iriun_id = cam_id
                print(f"✅ Kamera Iriun ditemukan di device {cam_id} ({int(actual_width)}x{int(actual_height)})")
                cap.release()
                return cam_id
            elif fallback_id is None:
                fallback_id = cam_id
                print(f"✅ Kamera ditemukan di device {cam_id} ({int(actual_width)}x{int(actual_height)})")
            cap.release()
        else:
            cap.release()
    if found_iriun_id is not None:
        return found_iriun_id
    if fallback_id is not None:
        return fallback_id
    print("❌ Tidak ada kamera eksternal aktif. Fallback ke webcam internal.")
    return 0  # Fallback ke webcam default ID 0

mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh()
camera_id = auto_detect_camera()
cap = cv2.VideoCapture(camera_id)

# -------------------------- UTILITIES --------------------------
def load_config():
    try:
        with open("config.json", "r") as f:
            return json.load(f)
    except:
        return {"slot": "UNKNOWN", "cabang": "UNKNOWN"}

def get_credentials():
    global _cached_credentials
    if _cached_credentials is None:
        import json
        creds_dict = json.loads(os.getenv("GOOGLE_CREDS_JSON"))
        # ✅ FIX: ubah \n yang salah escape di private_key
        if "private_key" in creds_dict:
            creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")
        _cached_credentials = service_account.Credentials.from_service_account_info(
            creds_dict, scopes=["https://www.googleapis.com/auth/drive"]
        )
    return _cached_credentials

def ensure_folder(folder_name):
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

def upload_file(file_path, mime_type, drive_service, folder_id=None):
    metadata = {'name': os.path.basename(file_path), 'parents': [folder_id or GDRIVE_FOLDER_ID]}
    media = MediaFileUpload(file_path, mimetype=mime_type)
    file = drive_service.files().create(body=metadata, media_body=media, fields='id').execute()
    file_id = file.get("id")
    # Make file publicly accessible
    drive_service.permissions().create(
        fileId=file_id,
        body={'role': 'reader', 'type': 'anyone'},
    ).execute()
    return f"https://drive.google.com/uc?id={file_id}"

def split_text_phrases(text):
    import re
    return [phrase.strip() for phrase in re.split(r'[.,;\n\-]+', text) if phrase.strip()]

def play_audio_and_type(filename, full_text):
    global typing_text, text_queue
    phrases = split_text_phrases(full_text)
    typing_text, text_queue = "", []
    try:
        pygame.mixer.music.load(filename)
        pygame.mixer.music.play()
    except:
        return
    def show_text():
        global typing_text, text_queue
        for phrase in phrases:
            typing_text = phrase
            text_queue.append(typing_text)
            time.sleep(max(0.8, len(phrase) * 0.045))
        typing_text = ""
    threading.Thread(target=show_text).start()
    while pygame.mixer.music.get_busy():
        time.sleep(0.1)

# -------------------------- QR & PROMO --------------------------
def show_qr_and_offer(qr_url, offer_text, audio_path):
    global qr_canvas, qr_start_time, qr_anim_start
    import qrcode
    qr = qrcode.make(qr_url).resize((180, 180))
    qr_img = np.array(qr.convert("RGB"))
    canvas = np.ones((220, 240, 3), dtype=np.uint8) * 255
    canvas[20:200, 30:210] = qr_img
    qr_canvas = canvas
    qr_start_time = time.time()
    qr_anim_start = time.time()
    try:
        pygame.mixer.music.load(audio_path)
        pygame.mixer.music.play()
    except Exception as e:
        print("❌ Gagal play audio promo:", e)

def render_qr_with_timer(display_frame):
    global qr_canvas, qr_start_time, qr_anim_start
    if qr_canvas is None or qr_start_time is None:
        return display_frame
    elapsed = int(time.time() - qr_start_time)
    remaining = max(0, 60 - elapsed)
    if remaining == 0:
        qr_canvas = None
        qr_start_time = None
        qr_anim_start = None
        return display_frame
    qr_h, qr_w = qr_canvas.shape[:2]
    frame_h, frame_w = display_frame.shape[:2]
    overlay = display_frame.copy()
    anim_elapsed = time.time() - qr_anim_start if qr_anim_start else 1.0
    scale_factor = min(1.0, anim_elapsed / 0.5)
    scaled_qr = cv2.resize(qr_canvas, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
    sq_h, sq_w = scaled_qr.shape[:2]
    center_x = frame_w - int((qr_w + 20) / 2)
    center_y = 30 + int(qr_h / 2)
    top_left_x = center_x - sq_w // 2
    top_left_y = center_y - sq_h // 2
    # Draw rounded semi-transparent black rectangle background
    rect_w, rect_h = sq_w + 36, sq_h + 60
    rect_x = top_left_x - 18
    rect_y = top_left_y - 18
    rect_x = max(0, rect_x)
    rect_y = max(0, rect_y)
    # Make mask for rounded rectangle
    rect_overlay = np.zeros_like(overlay, dtype=np.uint8)
    radius = 28
    cv2.rectangle(rect_overlay, (rect_x + radius, rect_y), (rect_x + rect_w - radius, rect_y + rect_h), (20, 20, 20), -1)
    cv2.rectangle(rect_overlay, (rect_x, rect_y + radius), (rect_x + rect_w, rect_y + rect_h - radius), (20, 20, 20), -1)
    cv2.circle(rect_overlay, (rect_x + radius, rect_y + radius), radius, (20, 20, 20), -1)
    cv2.circle(rect_overlay, (rect_x + rect_w - radius, rect_y + radius), radius, (20, 20, 20), -1)
    cv2.circle(rect_overlay, (rect_x + radius, rect_y + rect_h - radius), radius, (20, 20, 20), -1)
    cv2.circle(rect_overlay, (rect_x + rect_w - radius, rect_y + rect_h - radius), radius, (20, 20, 20), -1)
    # Blend with alpha
    alpha = 0.66
    mask = rect_overlay.astype(bool)
    overlay = cv2.addWeighted(overlay, 1.0, rect_overlay, alpha, 0)
    # Place QR
    qr_y = rect_y + 18
    qr_x = rect_x + (rect_w - sq_w) // 2
    overlay[qr_y:qr_y+sq_h, qr_x:qr_x+sq_w] = scaled_qr
    # Add timer text, soft white
    timer_txt = f"{remaining}s tersisa"
    timer_font = cv2.FONT_HERSHEY_SIMPLEX
    timer_scale = 0.72
    timer_color = (245, 230, 220)
    (tw, th), _ = cv2.getTextSize(timer_txt, timer_font, timer_scale, 2)
    timer_x = rect_x + (rect_w - tw) // 2
    timer_y = qr_y + sq_h + 34
    # Soft shadow
    cv2.putText(overlay, timer_txt, (timer_x+2, timer_y+2), timer_font, timer_scale, (0,0,0), 4, cv2.LINE_AA)
    cv2.putText(overlay, timer_txt, (timer_x, timer_y), timer_font, timer_scale, timer_color, 2, cv2.LINE_AA)
    # Blend overlay with display_frame for shadow/smooth effect
    return cv2.addWeighted(overlay, 0.90, display_frame, 0.10, 0)

# -------------------------- DATA PROMO --------------------------
def get_latest_customer_by_slot(slot, cabang, creds):
    import gspread
    client = gspread.authorize(creds)
    sheet = client.open("QC CORE SYSTEM").worksheet("CUSTOMER_ACTIVE")
    data = sheet.get_all_records()
    filtered = [row for row in data if str(row.get("SLOT")).strip() == slot and str(row.get("CABANG")).strip() == cabang]
    if filtered:
        latest = filtered[-1]
        return {
            "cid": latest.get("CID", ""),
            "kode": latest.get("KODE", ""),
            "promo": latest.get("PROMO", ""),
            "link": latest.get("LINK_FORM_PROMO", ""),
            "nama": latest.get("NAMA CUSTOMER", "")
        }
    return None

def get_promo_description_by_kode(kode, creds):
    import gspread
    client = gspread.authorize(creds)
    sheet = client.open("QC CORE SYSTEM").worksheet("PROMO_MASTER")
    data = sheet.get_all_records()
    for row in data:
        if str(row.get("KODE", "")).strip().upper() == str(kode).strip().upper():
            return row.get("DESKRIPSI_PROMO", "")
    return ""

# -------------------------- TTS ElevenLabs --------------------------
def generate_voice_elevenlabs(text, output_filename):
    tts_endpoint = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 1.0,
            "style": 0.8,
            "use_speaker_boost": True
        }
    }
    try:
        res = requests.post(tts_endpoint, json=payload, headers=headers, timeout=60)
        with open(output_filename, "wb") as f:
            f.write(res.content)
    except Exception as e:
        print(f"⚠️ Gagal generate ElevenLabs: {e}")
        if os.path.exists(output_filename):
            os.remove(output_filename)
        return

# -------------------------- ANALYSIS MAIN FUNCTION --------------------------
def analyze_face(session_id):
    ensure_session_exists(session_id)
# -------------------------- UTILITIES --------------------------

# Utility function to ensure session exists
def ensure_session_exists(session_id, visitor_name="-", visitor_wa="-"):
    if session_id not in session_states:
        print(f"🛠️ PATCH: Session baru dibuat untuk session_id: {session_id}")
        session_states[session_id] = {
            "visitor_info": {
                "name": visitor_name,
                "wa": visitor_wa,
                "session_id": session_id
            },
            "face_shape": None,
            "skin_tone": None,
            "latest_captured_face_path": None,
            "recommendation": None,
            "generated_faces": [],
            "created_at": time.time()
        }
    else:
        print(f"✅ Session {session_id} sudah tersedia. Tidak perlu patch ulang.")


    visitor = session_states[session_id].get("visitor_info", {})
    if not visitor.get("name") or not visitor.get("wa"):
        print("❌ Tidak bisa lanjut analyze: Data pengunjung tidak lengkap.")
        return

    global drive_service, analyze_done, analysis_started, status_msg
    openai.api_key = OPENAI_API_KEY
    # Access per-session variables
    face_shape = session_states[session_id].get("face_shape")
    skin_tone = session_states[session_id].get("skin_tone")
    latest_captured_face_path = session_states[session_id].get("latest_captured_face_path")
    file_prefix = f"{face_shape}_{skin_tone}_{uuid.uuid4().hex[:8]}"
    ensure_folder("VOICE_AI_FILES")
    config = load_config()
    slot = config.get("slot", "UNKNOWN")
    cabang = config.get("cabang", "UNKNOWN")
    print(f"📟 Mirror aktif untuk SLOT: {slot} | CABANG: {cabang}", flush=True)

    credentials = get_credentials()
    if drive_service is None:
        globals()["drive_service"] = build('drive', 'v3', credentials=credentials)
    else:
        drive_service = globals()["drive_service"]

    # Step 1: GPT prompt to get hair style + color
    status_msg = "⌛ Menganalisa dari AI Stylist..."
    print("🧠 AI Stylist sedang memproses rekomendasi... Harap tunggu hasil virtual face muncul setelah ini.", flush=True)
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a fashionable Indonesian AI stylist."},
            {"role": "user", "content": f"Kamu adalah Stylist Professional. Jelaskan rekomendasi warna rambut dan potongan rambut untuk orang dengan wajah {face_shape} dan skin tone {skin_tone}."}
        ]
    )
    recommendation = response.choices[0].message['content']
    session_states[session_id]["recommendation"] = recommendation
    if sio.connected:
        sio.emit('ai_result', {'recommendation': recommendation, 'session_id': session_id})

    # Extract style + color
    import re
    def extract_style_color(text):
        style = "recommended hairstyle"
        color = "recommended hair color"
        match_style = re.search(r"(potongan rambut|hairstyle)\s*(yang )?([a-zA-Z\s]+)", text, re.IGNORECASE)
        match_color = re.search(r"(warna rambut|hair color)\s*(yang )?([a-zA-Z\s]+)", text, re.IGNORECASE)
        if match_style:
            style = match_style.group(3).strip()
        if match_color:
            color = match_color.group(3).strip()
        return style, color
    hairstyle, haircolor = extract_style_color(recommendation)
    prompt = f"ultrarealistic portrait of a human with {haircolor} hair styled in a {hairstyle}, studio lighting, elegant look, high resolution"

    # Step 2: Emit photo and GPT result to Web
    if latest_captured_face_path and recommendation:
        send_result_to_web(latest_captured_face_path, recommendation)

    # Step 3: Generate replicate faces with GPT prompt
    audio_filename = os.path.join("VOICE_AI_FILES", f"{file_prefix}.mp3")
    try:
        if USE_ELEVENLABS:
            generate_voice_elevenlabs(recommendation, audio_filename)
        else:
            print("🔇 ElevenLabs dimatikan (USE_ELEVENLABS=false), lewati pembuatan suara stylist.")
        if USE_ELEVENLABS and audio_filename and os.path.exists(audio_filename) and os.path.getsize(audio_filename) >= 10 * 1024:
            faster_audio = os.path.join("VOICE_AI_FILES", f"fast_{file_prefix}.mp3")
            try:
                os.system(f"ffmpeg -y -i \"{audio_filename}\" -filter:a 'atempo=1.15' -vn \"{faster_audio}\"")
                if os.path.exists(audio_filename):
                    os.remove(audio_filename)
                if os.path.exists(faster_audio):
                    os.rename(faster_audio, audio_filename)
                print("✅ Audio stylist berhasil diproses dengan ffmpeg.", flush=True)
            except Exception as ffmpeg_error:
                print(f"⚠️ Gagal proses ffmpeg: {ffmpeg_error}", flush=True)

            play_audio_and_type(audio_filename, recommendation)
            upload_file(audio_filename, 'audio/mpeg', drive_service)
        elif USE_ELEVENLABS:
            print(f"⚠️ Audio stylist corrupt, skip suara stylist. ({audio_filename})", flush=True)
            audio_filename = None
    except Exception as e:
        print(f"⚠️ Gagal generate suara stylist: {e}", flush=True)
        audio_filename = None
    # PATCH 3: Handle Audio Stylist Error
    if not audio_filename or not os.path.exists(audio_filename) or os.path.getsize(audio_filename) < 10 * 1024:
        status_msg = "⚠️ Voice Stylist unavailable."

    # Save teks rekomendasi
    text_filename = f"{file_prefix}.txt"
    with open(text_filename, "w") as f:
        f.write(recommendation)
    upload_file(text_filename, 'text/plain', drive_service)

    # ✅ Simpan visitor info ke sheet dan kirim WA
    visitor = session_states[session_id].get("visitor_info", {})
    generated_faces = []
    # Save generated_faces in session_states at the end
    if visitor:
        save_visitor_info_to_sheet(visitor.get("name"), visitor.get("wa"), face_shape, skin_tone, recommendation)
        # WA only if generated_faces available (after generation below)

    # 🔵 Generate Virtual Face setelah analisa selesai
    try:
        print("✨ Menyiapkan generate virtual face... Harap tunggu beberapa detik.", flush=True)
        if latest_captured_face_path and os.path.exists(latest_captured_face_path):
            print("🚀 Generate Virtual Face with Replicate API...", flush=True)

            # ✅ Upload captured face
            try:
                photo_url = upload_file(latest_captured_face_path, 'image/jpeg', drive_service)
                os.environ["LAST_CAPTURED_PHOTO_URL"] = photo_url
                print(f"☁️ Uploaded captured face: {photo_url}", flush=True)
            except Exception as e:
                print(f"⚠️ Gagal upload captured face: {e}", flush=True)

            try:
                generated_faces = generate_virtual_face_replicate(
                    face_shape,
                    skin_tone,
                    latest_captured_face_path,
                    prompt=prompt,
                    photo_url=photo_url
                )
            except Exception as e:
                print(f"⚠️ Error call Replicate: {e}", flush=True)
                generated_faces = []
                status_msg = "❌ Gagal generate wajah."

            session_states[session_id]["generated_faces"] = generated_faces

            if generated_faces:
                try:
                    if sio.connected:
                        sio.emit('generated_faces', {'faces': generated_faces})
                        print(f"📸 {len(generated_faces)} virtual faces dikirim ke web.", flush=True)
                        print("✅ Hasil virtual face telah dikirim ke web.", flush=True)
                    else:
                        raise Exception("WebSocket not connected")
                except Exception as e:
                    print(f"⚠️ Gagal kirim generated faces ke web: {e}", flush=True)
                    print("☁️ Fallback: Upload semua wajah ke Google Drive.", flush=True)

                # ✅ Upload semua hasil generated_faces ke Google Drive
                drive_links = []
                for face_path in generated_faces:
                    for i in range(5):
                        if os.path.exists(face_path):
                            break
                        time.sleep(1)
                    if os.path.exists(face_path):
                        try:
                            link = upload_file(face_path, 'image/jpeg', drive_service)
                            drive_links.append(link)
                            print(f"☁️ Uploaded generated face: {link}", flush=True)
                        except Exception as ex:
                            print(f"⚠️ Gagal upload generated face: {ex}", flush=True)
                    else:
                        print(f"⚠️ File tidak ditemukan untuk upload: {face_path}", flush=True)

                if drive_links:
                    json_path = f"generated_faces_links_{int(time.time())}.json"
                    with open(json_path, "w") as jf:
                        json.dump({"faces": drive_links}, jf)
                    try:
                        upload_file(json_path, 'application/json', drive_service)
                        print(f"📂 Link JSON uploaded: {json_path}", flush=True)
                        os.remove(json_path)
                    except Exception as jerr:
                        print(f"⚠️ Gagal upload file JSON ke Drive: {jerr}", flush=True)

                try:
                    if sio.connected and drive_links:
                        sio.emit('generated_faces', {'faces': drive_links, 'session_id': session_id})
                        session_states[session_id]["generated_faces"] = drive_links
                        print("🔁 Re-emitted generated_faces to frontend from Drive links.", flush=True)
                except Exception as e:
                    print(f"⚠️ Gagal emit ulang generated_faces dari Drive: {e}", flush=True)
            else:
                session_states[session_id]["generated_faces"] = []
    except Exception as e:
        print(f"⚠️ Gagal generate virtual face Replicate: {e}", flush=True)

    # Kirim WA setelah generated_faces selesai
    if visitor:
        gen_faces = session_states[session_id].get("generated_faces", [])
        if gen_faces:
            photo_link = gen_faces[0]
            send_whatsapp(visitor.get("name"), visitor.get("wa"), recommendation, photo_link)

    # Load Data Promo
    try:
        promo_data = get_latest_customer_by_slot(slot, cabang, credentials)
        if promo_data:
            kode_promo = promo_data["kode"]
            qr_link = promo_data["link"]
            promo = promo_data.get("promo", "Promo Eksklusif")
        else:
            kode_promo, qr_link, promo = "PROMO", "https://example.com", "Promo Eksklusif"
    except Exception as e:
        print(f"⚠️ Gagal ambil data promo customer: {e}", flush=True)
        kode_promo, qr_link, promo = "PROMO", "https://example.com", "Promo Eksklusif"

    deskripsi_promo = get_promo_description_by_kode(kode_promo, credentials)
    promo_text = f"Kak, ini kesempatan langka buat kamu. Promo spesial *{promo}* dengan kode *{kode_promo}*: {deskripsi_promo} berlaku hanya 60 detik. Scan QR sebelum terlambat!"

    # Voice Promo
    ensure_folder("promo_voice_files")
    promo_audio = os.path.join("promo_voice_files", f"{kode_promo}.mp3")
    if not os.path.exists(promo_audio):
        try:
            generate_voice_elevenlabs(promo_text, promo_audio)
        except Exception as e:
            print(f"⚠️ Gagal generate suara promo: {e}", flush=True)
            promo_audio = None
    show_qr_and_offer(qr_link, promo_text, promo_audio)

    # Cleanup Local Files
    if audio_filename and os.path.exists(audio_filename):
        os.remove(audio_filename)
    if os.path.exists(text_filename):
        os.remove(text_filename)

    # 🚨 PATCH: Emit dummy faces if none generated to trigger frontend gallery
    if not session_states[session_id].get("generated_faces") and sio.connected:
        try:
            sio.emit('generated_faces', {
                'faces': [],
                'status': 'pending',
                'message': 'Sedang menunggu hasil generate dari AI stylist...',
                'start_timestamp': int(time.time()),
                'session_id': session_id
            })
            print("🧪 No faces generated, emit pending status.", flush=True)
        except Exception as e:
            print(f"⚠️ Gagal emit pending status: {e}", flush=True)
    analyze_done = False
    analysis_started = False
    status_msg = "✅ Selesai! Tekan [q] untuk keluar."

# -------------------------- MAIN LOOOOP --------------------------
# -------------------------- MAIN LOOP --------------------------

if __name__ == "__main__":
    if ENV_MODE == 'dev':
        print("🧪 Mode dev aktif: Menyalakan kamera dan GUI realtime.")

        cv2.namedWindow("QC Magic Mirror")
        # Mouse callback: gunakan handler yang support klik virtual face (Replicate)
        cv2.setMouseCallback("QC Magic Mirror", handle_face_click)

        while True:
            success, frame = cap.read()
            if not success:
                break
            frame = frame  # Keep default orientation (no flip)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)
            shape = frame.shape
            h, w, _ = frame.shape
            display = frame.copy()
            # --- Clean UI overlays ---
            # Face landmarks & info
            face_shape_val, skin_tone_val = None, None
            if results.multi_face_landmarks:
                for landmarks in results.multi_face_landmarks:
                    def get_point(landmarks, index, shape):
                        h, w, _ = shape
                        lm = landmarks[index]
                        return int(lm.x * w), int(lm.y * h)
                    def euclidean(p1, p2):
                        return math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                    def get_skin_tone_color(frame, point):
                        x, y = point
                        h, w = frame.shape[:2]
                        x = min(max(0, x), w-1)
                        y = min(max(0, y), h-1)
                        b, g, r = frame[y, x]
                        if r > g and r > b:
                            return "Warm"
                        elif b > r and b > g:
                            return "Cool"
                        else:
                            return "Neutral"
                    def get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio):
                        if ratio_w_h < 0.85:
                            return "Oblong"
                        elif 0.85 <= ratio_w_h <= 0.95:
                            if jaw_ratio < 0.8:
                                return "Heart"
                            else:
                                return "Oval"
                        elif 0.95 < ratio_w_h <= 1.05:
                            if jaw_ratio > 0.95:
                                return "Square"
                            else:
                                return "Round"
                        else:
                            return "Wide"
                    chin = get_point(landmarks.landmark, 152, shape)
                    forehead = get_point(landmarks.landmark, 10, shape)
                    left_cheek = get_point(landmarks.landmark, 234, shape)
                    right_cheek = get_point(landmarks.landmark, 454, shape)
                    jaw_width = euclidean(left_cheek, right_cheek)
                    height = euclidean(forehead, chin)
                    forehead_width = euclidean(get_point(landmarks.landmark, 127, shape), get_point(landmarks.landmark, 356, shape))
                    ratio_w_h = jaw_width / height
                    jaw_ratio = jaw_width / jaw_width
                    forehead_ratio = forehead_width / jaw_width
                    face_shape_val = get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio)
                    skin_tone_val = get_skin_tone_color(frame, left_cheek)
                    face_shape = face_shape_val
                    skin_tone = skin_tone_val
            # --- Modernized top-right panel for face shape & skin tone ---
            panel_margin = 34
            panel_w = 290
            panel_h = 88
            panel_x = w - panel_w - panel_margin
            panel_y = panel_margin
            # Draw semi-transparent black panel with rounded corners
            panel_overlay = display.copy()
            pradius = 26
            # Rectangle + circles for rounded effect
            cv2.rectangle(panel_overlay, (panel_x+pradius, panel_y), (panel_x+panel_w-pradius, panel_y+panel_h), (18,18,18), -1)
            cv2.rectangle(panel_overlay, (panel_x, panel_y+pradius), (panel_x+panel_w, panel_y+panel_h-pradius), (18,18,18), -1)
            cv2.circle(panel_overlay, (panel_x+pradius, panel_y+pradius), pradius, (18,18,18), -1)
            cv2.circle(panel_overlay, (panel_x+panel_w-pradius, panel_y+pradius), pradius, (18,18,18), -1)
            cv2.circle(panel_overlay, (panel_x+pradius, panel_y+panel_h-pradius), pradius, (18,18,18), -1)
            cv2.circle(panel_overlay, (panel_x+panel_w-pradius, panel_y+panel_h-pradius), pradius, (18,18,18), -1)
            # Blend for shadow/smooth
            display = cv2.addWeighted(panel_overlay, 0.7, display, 0.3, 0)
            # --- Face shape & skin tone text, modern font, warm white, clean spacing
            font = cv2.FONT_HERSHEY_SIMPLEX
            shape_text = f"Face Shape: {face_shape if face_shape else '-'}"
            skin_text = f"Skin Tone: {skin_tone if skin_tone else '-'}"
            font_scale = 0.93
            font_color = (252, 240, 230)
            font_color2 = (245, 220, 210)
            font_thick = 2
            shape_org = (panel_x+30, panel_y+36)
            skin_org = (panel_x+30, panel_y+70)
            # Shadow
            cv2.putText(display, shape_text, (shape_org[0]+2, shape_org[1]+2), font, font_scale, (0,0,0), 4, cv2.LINE_AA)
            cv2.putText(display, skin_text, (skin_org[0]+2, skin_org[1]+2), font, font_scale, (0,0,0), 4, cv2.LINE_AA)
            cv2.putText(display, shape_text, shape_org, font, font_scale, font_color, font_thick, cv2.LINE_AA)
            cv2.putText(display, skin_text, skin_org, font, font_scale, font_color2, font_thick, cv2.LINE_AA)
            # --- Status message & text queue ---
            # Reserve margin above gallery for status/text
            gallery_y_start = int(h * 0.60)
            status_y = gallery_y_start - 60
            # Draw semi-transparent margin background for status/text
            margin_overlay = display.copy()
            margin_h = 62
            margin_y = status_y - 34
            margin_y = max(0, margin_y)
            cv2.rectangle(margin_overlay, (0, margin_y), (w, margin_y+margin_h), (18,18,18), -1)
            display = cv2.addWeighted(margin_overlay, 0.38, display, 0.62, 0)
            # Status message
            status_font = cv2.FONT_HERSHEY_SIMPLEX
            status_scale = 0.68
            status_color = (120, 255, 120)
            status_shadow = (0,0,0)
            status_x = 36
            status_y2 = margin_y + 40
            cv2.putText(display, status_msg, (status_x+2, status_y2+2), status_font, status_scale, status_shadow, 3, cv2.LINE_AA)
            cv2.putText(display, status_msg, (status_x, status_y2), status_font, status_scale, status_color, 2, cv2.LINE_AA)
            # Text queue (current phrase), centered above status
            if text_queue:
                current_text = text_queue[-1]
                text_size = cv2.getTextSize(current_text[:100], status_font, 0.60, 1)[0]
                text_x = (w - text_size[0]) // 2
                text_y = margin_y + 20
                cv2.putText(display, current_text[:100], (text_x+2, text_y+2), status_font, 0.60, (0,0,0), 2, cv2.LINE_AA)
                cv2.putText(display, current_text[:100], (text_x, text_y), status_font, 0.60, (252,240,230), 1, cv2.LINE_AA)
                key = cv2.waitKey(1)
            # Inject Magic Mirror full render
            # Geser tombol pilihan style/color ke bawah agar tidak menutupi info shape/skin tone dan text
            # Face shape: y=30, skin tone: y=60, so place buttons at y=90 (orig), tapi shift ke y=110 for more space
            display = render_full_magic_mirror(
                display,
                qr_overlay=True,
                style_button_y_offset=110
            )
            # --- Virtual Face Gallery (modernized gallery layout, improved margin) ---
            if generated_faces:
                try:
                    gallery_margin = 140  # sedikit lebih besar jarak dari bawah
                    # Render with enhanced modern layout
                    display = render_generated_faces(display, generated_faces, bottom_margin=gallery_margin)
                except Exception as e:
                    print(f"⚠️ Error render generated faces: {e}")
            # --- QR code promo overlay ---
            display = render_qr_with_timer(display)
            cv2.imshow("QC Magic Mirror", display)

        cap.release()
        cv2.destroyAllWindows()
    else:
        print("🚫 Mode server: kamera real-time dan GUI dinonaktifkan. Gunakan API /run.")

# ------------------ Cleanup ------------------
# ------------------ API run function ------------------
def run(photo_base64, session_id=None, visitor_name=None, visitor_wa=None):
    global latest_captured_face_path, analysis_started, face_shape, skin_tone, recommendation, generated_faces

    # ✅ Validasi base64 input sebelum decode
    try:
        decoded = base64.b64decode(photo_base64)
    except Exception as e:
        print(f"❌ Foto yang dikirim bukan base64 valid: {e}")
        return {
            "status": "error",
            "error": "Invalid base64 image."
        }

    ensure_folder("captured_faces")
    capture_filename = os.path.join("captured_faces", f"from_api_{int(time.time())}.jpg")
    with open(capture_filename, "wb") as f:
        f.write(decoded)
    latest_captured_face_path = capture_filename

    print(f"✅ Foto dari API disimpan di: {latest_captured_face_path}", flush=True)
    print(f"📏 Ukuran file: {os.path.getsize(latest_captured_face_path)} bytes", flush=True)

    # 🔍 Tambahan analisis landmark langsung dari file foto
    try:
        img = cv2.imread(capture_filename)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_img)

        if results.multi_face_landmarks:
            for landmarks in results.multi_face_landmarks:
                def get_point(lms, idx, shape):
                    h, w, _ = shape
                    lm = lms[idx]
                    return int(lm.x * w), int(lm.y * h)
                def euclidean(p1, p2):
                    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                def get_skin_tone_color(img, pt):
                    x, y = pt
                    h, w = img.shape[:2]
                    x = min(max(0, x), w-1)
                    y = min(max(0, y), h-1)
                    b, g, r = img[y, x]
                    if r > g and r > b:
                        return "Warm"
                    elif b > r and b > g:
                        return "Cool"
                    else:
                        return "Neutral"
                def get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio):
                    if ratio_w_h < 0.85:
                        return "Oblong"
                    elif 0.85 <= ratio_w_h <= 0.95:
                        if jaw_ratio < 0.8:
                            return "Heart"
                        else:
                            return "Oval"
                    elif 0.95 < ratio_w_h <= 1.05:
                        if jaw_ratio > 0.95:
                            return "Square"
                        else:
                            return "Round"
                    else:
                        return "Wide"

                shape = img.shape
                chin = get_point(landmarks.landmark, 152, shape)
                forehead = get_point(landmarks.landmark, 10, shape)
                left_cheek = get_point(landmarks.landmark, 234, shape)
                right_cheek = get_point(landmarks.landmark, 454, shape)
                jaw_width = euclidean(left_cheek, right_cheek)
                height = euclidean(forehead, chin)
                forehead_width = euclidean(get_point(landmarks.landmark, 127, shape), get_point(landmarks.landmark, 356, shape))
                ratio_w_h = jaw_width / height
                jaw_ratio = jaw_width / jaw_width
                forehead_ratio = forehead_width / jaw_width

                face_shape = get_face_shape(ratio_w_h, jaw_ratio, forehead_ratio)
                skin_tone = get_skin_tone_color(img, left_cheek)
                globals()["face_shape"] = face_shape
                globals()["skin_tone"] = skin_tone
                print(f"📸 Deteksi dari run berhasil: {face_shape=} {skin_tone=}", flush=True)
                break
        else:
            print("❌ Tidak ada wajah terdeteksi di gambar dari run().", flush=True)
    except Exception as e:
        print(f"⚠️ Gagal baca landmark dari file foto di run(): {e}", flush=True)

    print(f"📂 latest_captured_face_path = {latest_captured_face_path}", flush=True)
    print(f"📂 exists = {os.path.exists(latest_captured_face_path)}", flush=True)

    # ✅ PATCH: Simpan session_id ke global
    if session_id:
        globals()["session_id"] = session_id

    # ✅ PATCH: Buat session jika belum ada (fix utama)
    if session_id and session_id not in session_states:
        session_states[session_id] = {
            "visitor_info": {
                "name": visitor_name or "-",
                "wa": visitor_wa or "-",
                "session_id": session_id
            },
            "face_shape": None,
            "skin_tone": None,
            "latest_captured_face_path": None,
            "recommendation": None,
            "generated_faces": [],
            "created_at": time.time()
        }
        print(f"🛠️ PATCH: Session baru dibuat di run() untuk session_id: {session_id}", flush=True)

    # ✅ PATCH: Simpan info pengunjung dari API ke session_states
    if session_id and visitor_name and visitor_wa and visitor_name.strip() and visitor_wa.strip():
        session_states[session_id] = {
            "visitor_info": {
                "name": visitor_name,
                "wa": visitor_wa,
                "session_id": session_id
            },
            "face_shape": None,
            "skin_tone": None,
            "latest_captured_face_path": None,
            "recommendation": None,
            "generated_faces": [],
            "created_at": time.time()
        }
        print(f"📲 Visitor Info from API: {visitor_name}, {visitor_wa}", flush=True)
    else:
        print("⚠️ Tidak ada visitor_name / visitor_wa dikirim dari API.", flush=True)

    # PATCH fallback jika session_id tidak dikirim (misal API langsung)
    if not session_id:
        try:
            if "session_id" not in globals() or not globals()["session_id"]:
                session_id = list(session_states.keys())[-1]  # Ambil session terakhir aktif
                globals()["session_id"] = session_id
                print(f"⚠️ session_id tidak dikirim, fallback ke terakhir aktif: {session_id}")
        except:
            print("❌ Tidak ada session_id aktif untuk fallback.")
            return {
                "status": "error",
                "error": "No session ID provided and no fallback available."
            }


    analysis_started = True
    analyze_face(session_id)

    print(f"🖼️ generated_faces: {generated_faces if generated_faces else 'None generated.'}", flush=True)

    result = {
        "status": "done",
        "face_shape": face_shape if face_shape else "-",
        "skin_tone": skin_tone if skin_tone else "-",
        "recommendation": recommendation
    }

    # Always use global generated_faces (which may be updated with Drive links)
    faces_to_return = globals().get("generated_faces", [])
    if faces_to_return:
        result["faces"] = faces_to_return
    else:
        result["error"] = "No faces generated."

    return result


# -------------------------- SEND WHATSAPP --------------------------
def send_whatsapp(name, wa, text, photo_url=None):
    try:
        token = os.getenv("WHACENTER_DEVICE")
        if not token:
            print("❌ Token Whacenter tidak ditemukan di ENV.")
            return
        payload = {
            "device_id": token,
            "api_key": token,
            "number": wa,
            "message": f"Halo {name}, ini hasil rekomendasi dari QC Mirror:\n\n{text}"
        }
        if photo_url:
            payload["message"] += f"\n\nFoto virtual: {photo_url}"
        res = requests.post("https://app.whacenter.com/api/send", json=payload, timeout=30)
        print(f"📲 WA sent: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"⚠️ Gagal kirim WA: {e}")
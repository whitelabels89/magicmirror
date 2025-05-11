import replicate
replicate = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
import os
from dotenv import load_dotenv
load_dotenv()
import time
import requests
import shutil

# 🛠️ Testing mode aktif: pakai sample.jpg dummy faces
TEST_MODE = False

# ------------------ Generate Virtual Face with Minimax ------------------
def generate_virtual_face_replicate(face_shape, skin_tone, latest_photo_path, prompt=None):
    if TEST_MODE:
        print("🛠️ [TEST MODE] Skip generate Replicate, pakai sample.jpg dummy faces.")
        sample_url = "/generated_faces/sample.jpg"
        return [sample_url, sample_url, sample_url]

    replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
    if not replicate_api_token:
        raise EnvironmentError("❌ Export token dulu: export REPLICATE_API_TOKEN='token_lo'")

    print("🚀 Mengirim foto & prompt ke Replicate (Minimax Image 01)...")

    prompts = [
        f"{prompt}, front view, ultra-realistic, soft lighting, same person" if prompt else f"Ultra-realistic portrait, {face_shape} face shape, {skin_tone} skin tone, recommended hairstyle and color, full head visible, no cropping, sharp details, studio lighting, Canon EOS 5D, high-resolution, natural expression, SAME FACE as subject reference",
        f"{prompt}, side profile view, ultra-realistic, cinematic lighting, same person" if prompt else f"Side profile photo, {face_shape} face shape, {skin_tone} skin tone, full hairstyle visible, ultra-realistic, cinematic lighting, 8k, natural human appearance, identical face",
        f"{prompt}, three-quarter angle, high-definition, soft background, same person" if prompt else f"Three-quarter angle, {face_shape} face shape, {skin_tone} skin tone, full head visible, detailed hair texture, ultra high-definition, cinematic soft light, SAME FACE as reference"
    ]

    saved_files = []
    output_folder = "generated_faces"
    os.makedirs(output_folder, exist_ok=True)

    import base64

    try:
        for idx, prompt in enumerate(prompts):
            with open(latest_photo_path, "rb") as image_file:
                retry_count = 0
                max_retries = 3
                while retry_count < max_retries:
                    try:
                        print(f"⏳ Sending request to Replicate... attempt {retry_count + 1}")
                        print(f"📝 Prompt {idx}: {prompt}")
                        output = replicate.run(
                            "minimax/image-01",
                            input={
                                "prompt": prompt,
                                "aspect_ratio": "3:4",
                                "subject_reference": image_file,
                                "subject_prompt": "same person, identical facial features, ultra realistic, full head visible, high resolution",
                                "negative_prompt": "bad anatomy, deformed, cartoon, anime, blurry, cropped head, watermark, text, extra fingers, bad quality",
                                "width": 1024,
                                "height": 1024,
                                "guidance_scale": 9.0,
                                "num_inference_steps": 40
                            }
                        )
                        print(f"🎯 Output dari Replicate (prompt {idx}): {output}")
                        print("✅ Replicate respond OK!")
                        break
                    except Exception as e:
                        retry_count += 1
                        print(f"⚠️ Error Replicate attempt {retry_count}: {str(e)}")
                        time.sleep(2)
                else:
                    print("❌ Replicate failed after retries. Skipping...")
                    continue

                timestamp = int(time.time())
                for i, img_url in enumerate(output):
                    filename = f"{output_folder}/face_{timestamp}_{idx}_{i}.jpg"
                    try:
                        response = requests.get(img_url)
                        if response.status_code == 200:
                            with open(filename, "wb") as f:
                                f.write(response.content)
                            public_folder = os.path.join("public", "generated_faces")
                            os.makedirs(public_folder, exist_ok=True)
                            public_path = os.path.join(public_folder, os.path.basename(filename))
                            shutil.copy(filename, public_path)
                            saved_files.append(f"/generated_faces/{os.path.basename(filename)}")
                        else:
                            print(f"⚠️ Gagal download gambar dari {img_url}")
                    except Exception as e:
                        print(f"⚠️ Error downloading face image: {str(e)}")
    except Exception as e:
        print(f"🔥 Critical error saat generate virtual face: {e}")
        return []

    return saved_files

# ------------------ Render Generated Faces ------------------
import cv2

def render_generated_faces(display_frame, generated_faces, bottom_margin=140):
    if not generated_faces:
        return display_frame

    overlay = display_frame.copy()
    frame_h, frame_w = display_frame.shape[:2]

    # Konfigurasi tampilan
    preview_h = 260  # Tinggi total area preview
    preview_y_start = frame_h - preview_h - bottom_margin  # Posisi Y mulai
    preview_width = 180  # Lebar setiap wajah
    spacing = 30  # Jarak antar wajah
    background_opacity = 0.8

    # Hitung posisi horizontal
    num_faces = len(generated_faces)
    total_width = num_faces * preview_width + (num_faces - 1) * spacing
    x_start = (frame_w - total_width) // 2  # Posisi X mulai

    # Background semi-transparan dan glossy
    cv2.rectangle(overlay, (0, preview_y_start), (frame_w, frame_h), (15, 30, 30), -1)
    display_frame = cv2.addWeighted(overlay, background_opacity, display_frame, 1 - background_opacity, 0)

    for idx, face_info in enumerate(generated_faces):
        if isinstance(face_info, str):
            # Dummy/testing mode: skip rendering in OpenCV
            continue
        if not isinstance(face_info, dict) or "filename" not in face_info:
            print(f"⚠️ Invalid face_info at index {idx}, skipping...")
            continue

        filename = face_info.get("filename")
        if not filename or not os.path.exists(filename):
            print(f"⚠️ File tidak ditemukan: {filename}")
            continue

        face_img = cv2.imread(filename)
        if face_img is None:
            print(f"⚠️ Gagal membaca file gambar {filename}, skip.")
            continue

        try:
            # Hitung posisi
            x = x_start + idx * (preview_width + spacing)
            y = preview_y_start + 10  # Margin atas 10px

            # Hitung ukuran slot
            slot_height = preview_h - 20
            slot_width = preview_width

            # Resize face image supaya match slot
            face_img_resized = cv2.resize(face_img, (slot_width, slot_height))

            # --- Patch: Glow effect ---
            glow_color = (230, 255, 245)  # soft glow color
            thickness = 4  # thinner and softer glow
            center_x = x + slot_width // 2
            center_y = y + slot_height // 2
            radius = max(slot_width, slot_height) // 2 + 10  # slightly larger radius

            # Draw glow circle on overlay (soft glow)
            cv2.circle(display_frame, (center_x, center_y), radius, glow_color, thickness)
            # --- End Patch ---

            # Validasi area sebelum assign
            if (y + slot_height <= frame_h) and (x + slot_width <= frame_w):
                display_frame[y:y+slot_height, x:x+slot_width] = face_img_resized
            else:
                print(f"⚠️ Ukuran slot gambar melebihi batas frame, skip render.")

        except Exception as e:
            print(f"⚠️ Gagal render wajah {idx}: {str(e)}")
            continue

    return display_frame

# ------------------ Dummy Handle Face Click ------------------
def handle_face_click(event, x, y, flags, param):
    pass
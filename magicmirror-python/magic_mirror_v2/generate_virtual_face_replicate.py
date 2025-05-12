TEST_MODE = False

import replicate
import os
from dotenv import load_dotenv
load_dotenv()
import time
import requests
import shutil
import cv2
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2 import service_account

drive_service = None
GDRIVE_FOLDER_ID = os.getenv('GDRIVE_FOLDER_ID')

def get_credentials():
    return service_account.Credentials.from_service_account_file(
        "credentials.json",
        scopes=["https://www.googleapis.com/auth/drive"]
    )

def upload_file(file_path, mime_type, drive_service, folder_id=None):
    metadata = {'name': os.path.basename(file_path), 'parents': [folder_id or GDRIVE_FOLDER_ID]}
    media = MediaFileUpload(file_path, mimetype=mime_type)
    file = drive_service.files().create(body=metadata, media_body=media, fields='id').execute()
    file_id = file.get("id")
    drive_service.permissions().create(
        fileId=file_id,
        body={'role': 'reader', 'type': 'anyone'},
    ).execute()
    print(f"📤 Uploaded to Google Drive with ID: {file_id}")
    return f"https://drive.google.com/uc?id={file_id}"

# ------------------ Generate Virtual Face with Minimax ------------------
def generate_virtual_face_replicate(face_shape, skin_tone, latest_photo_path, prompt=None, photo_url=None):
    if not photo_url:
        raise ValueError("❌ photo_url is not provided to function. Pastikan parameter `photo_url` dikirim.")
    """
    Generate virtual face using Replicate API (Minimax Image 01 model)
    Returns list of generated image URLs
    """
    if TEST_MODE:
        print("🛠️ [TEST MODE] Skip generate Replicate, pakai sample.jpg dummy faces.")
        sample_url = "/generated_faces/sample.jpg"
        return [sample_url, sample_url, sample_url]

    replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
    if not replicate_api_token:
        raise EnvironmentError("❌ REPLICATE_API_TOKEN not found in environment variables")
    else:
        print("✅ REPLICATE_API_TOKEN ditemukan di env.", flush=True)

    print("🚀 Mengirim foto & prompt ke Replicate (Minimax Image 01)...")

    # Prepare prompts
    prompts = [
        f"{prompt}, front view, ultra-realistic, soft lighting, same person" if prompt else f"Ultra-realistic portrait, {face_shape} face shape, {skin_tone} skin tone, recommended hairstyle and color, full head visible, no cropping, sharp details, studio lighting, Canon EOS 5D, high-resolution, natural expression, SAME FACE as subject reference",
        f"{prompt}, side profile view, ultra-realistic, cinematic lighting, same person" if prompt else f"Side profile photo, {face_shape} face shape, {skin_tone} skin tone, full hairstyle visible, ultra-realistic, cinematic lighting, 8k, natural human appearance, identical face",
        f"{prompt}, three-quarter angle, high-definition, soft background, same person" if prompt else f"Three-quarter angle, {face_shape} face shape, {skin_tone} skin tone, full head visible, detailed hair texture, ultra high-definition, cinematic soft light, SAME FACE as reference"
    ]

    saved_files = []
    output_folder = "generated_faces"
    os.makedirs(output_folder, exist_ok=True)

    # Removed fallback to environment variable for photo_url.

    try:
        with open(latest_photo_path, "rb") as image_file:
            for idx, current_prompt in enumerate(prompts):
                retry_count = 0
                max_retries = 3
                success = False
                
                while retry_count < max_retries and not success:
                    try:
                        print(f"⏳ Sending request to Replicate... attempt {retry_count + 1}")
                        print(f"📝 Prompt {idx}: {current_prompt[:100]}...")  # Print first 100 chars
                        
                        # Reset file pointer to beginning
                        image_file.seek(0)

                        print(f"📦 replicate_api_token: {replicate_api_token[:6]}...")  # Masked for debug
                        
                        output = replicate.run(
                            "minimax/image-01",
                            input={
                                "prompt": current_prompt,
                                "aspect_ratio": "3:4",
                                "subject_reference": photo_url,
                                "subject_prompt": "same person, identical facial features, ultra realistic, full head visible, high resolution",
                                "negative_prompt": "bad anatomy, deformed, cartoon, anime, blurry, cropped head, watermark, text, extra fingers, bad quality",
                                "width": 1024,
                                "height": 1024,
                                "guidance_scale": 9.0,
                                "num_inference_steps": 40
                            },
                            api_token=replicate_api_token  # Explicitly passing token
                        )
                        
                        print(f"🎯 Output dari Replicate (prompt {idx}): {output}")
                        success = True
                        
                        # Process output images
                        timestamp = int(time.time())
                        for i, img_url in enumerate(output):
                            filename = f"{output_folder}/face_{timestamp}_{idx}_{i}.jpg"
                            try:
                                response = requests.get(img_url, timeout=10)
                                if response.status_code == 200:
                                    with open(filename, "wb") as f:
                                        f.write(response.content)
                                        time.sleep(0.5)
                                        while not os.path.exists(filename):
                                            time.sleep(0.1)

                                    # Copy to public folder
                                    output_folder = "generated_faces"
                                    os.makedirs(output_folder, exist_ok=True)
                                    public_path = os.path.join(output_folder, os.path.basename(filename))
                                    shutil.copy(filename, public_path)
                                    print(f"📂 Copy to accessible folder: {public_path}")


                                    # Ensure drive_service is initialized
                                    global drive_service
                                    if drive_service is None:
                                        credentials = get_credentials()
                                        drive_service = build('drive', 'v3', credentials=credentials)

                                    mime_type = "image/jpeg"
                                    try:
                                        link = upload_file(public_path, mime_type, drive_service)
                                        print(f"☁️ Uploaded generated face: {link}", flush=True)
                                    except Exception as ex:
                                        print(f"⚠️ Gagal upload generated face: {ex}", flush=True)

                                    saved_files.append(os.path.join("generated_faces", os.path.basename(filename)))
                                    print(f"✅ Saved generated face: {filename}")
                                else:
                                    print(f"⚠️ Gagal download gambar (HTTP {response.status_code}) dari {img_url}")
                            except Exception as download_error:
                                print(f"⚠️ Error downloading face image: {str(download_error)}")
                                
                    except replicate.exceptions.ModelError as e:
                        retry_count += 1
                        print(f"⚠️ Model Error: {str(e)}")
                        print(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
                        time.sleep(2)
                    except requests.exceptions.RequestException as e:
                        retry_count += 1
                        print(f"⚠️ Network Error: {str(e)}")
                        time.sleep(2)
                    except Exception as e:
                        retry_count += 1
                        print(f"⚠️ Unexpected Error: {str(e)}")
                        print(f"Error Type: {type(e).__name__}")
                        time.sleep(2)
                
                if not success:
                    print(f"❌ Gagal setelah {max_retries} percobaan untuk prompt {idx}")
                    
    except Exception as e:
        print(f"🔥 Critical error saat generate virtual face: {type(e).__name__} - {str(e)}")
        return []

    # --- Generate preview_combined.jpg for display ---
    try:
        import numpy as np
        display_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        preview_frame = render_generated_faces(display_frame, saved_files)
        combined_path = "generated_faces/preview_combined.jpg"
        cv2.imwrite(combined_path, preview_frame)
        print(f"✅ Preview frame disimpan: {combined_path}", flush=True)

        # Optional upload to Drive
        if drive_service:
            try:
                link = upload_file(combined_path, "image/jpeg", drive_service)
                print(f"☁️ Uploaded combined preview: {link}", flush=True)
            except Exception as ex:
                print(f"⚠️ Gagal upload preview_combined.jpg: {ex}", flush=True)

    except Exception as render_ex:
        print(f"⚠️ Gagal membuat preview combined: {render_ex}", flush=True)

    web_friendly_files = [f"/generated_faces/{os.path.basename(f)}" for f in saved_files]
    return web_friendly_files

import numpy as np
# ------------------ Render Generated Faces ------------------
def render_generated_faces(display_frame, generated_faces, bottom_margin=140):
    """
    Render generated faces on the display frame
    """
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

    # Background semi-transparan
    cv2.rectangle(overlay, (0, preview_y_start), (frame_w, frame_h), (15, 30, 30), -1)
    display_frame = cv2.addWeighted(overlay, background_opacity, display_frame, 1 - background_opacity, 0)

    for idx, face_url in enumerate(generated_faces):
        if not isinstance(face_url, str):
            continue
            
        try:
            # Extract filename from URL
            filename = os.path.basename(face_url)
            full_path = os.path.join("generated_faces", os.path.basename(face_url))
            
            if not os.path.exists(full_path):
                print(f"⚠️ File tidak ditemukan: {full_path}")
                continue

            face_img = cv2.imread(full_path)
            if face_img is None:
                print(f"⚠️ Gagal membaca file gambar {full_path}")
                continue

            # Hitung posisi
            x = x_start + idx * (preview_width + spacing)
            y = preview_y_start + 10  # Margin atas 10px

            # Hitung ukuran slot
            slot_height = preview_h - 20
            slot_width = preview_width

            # Resize face image
            face_img_resized = cv2.resize(face_img, (slot_width, slot_height))

            # Glow effect
            glow_color = (230, 255, 245)
            thickness = 4
            center_x = x + slot_width // 2
            center_y = y + slot_height // 2
            radius = max(slot_width, slot_height) // 2 + 10
            cv2.circle(display_frame, (center_x, center_y), radius, glow_color, thickness)

            # Pastikan tidak melebihi frame
            if (y + slot_height <= frame_h) and (x + slot_width <= frame_w):
                display_frame[y:y+slot_height, x:x+slot_width] = face_img_resized

        except Exception as e:
            print(f"⚠️ Gagal render wajah {idx}: {str(e)}")
            continue

    return display_frame

# ------------------ Dummy Handle Face Click -------------------
def handle_face_click(event, x, y, flags, param):
    """Handle face click events"""
    pass
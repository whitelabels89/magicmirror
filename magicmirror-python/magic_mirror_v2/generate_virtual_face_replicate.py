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
import numpy as np

# Konstanta
FRONTEND_PUBLIC_FOLDER = os.path.abspath("../magicmirror-node/public/generated_faces")
os.makedirs(FRONTEND_PUBLIC_FOLDER, exist_ok=True)

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

    prompts = [
        f"{prompt}, front view, ultra-realistic, soft lighting, same person" if prompt else f"Ultra-realistic portrait, {face_shape} face shape, {skin_tone} skin tone, recommended hairstyle and color, full head visible, no cropping, sharp details, studio lighting, Canon EOS 5D, high-resolution, natural expression, SAME FACE as subject reference",
        f"{prompt}, side profile view, ultra-realistic, cinematic lighting, same person" if prompt else f"Side profile photo, {face_shape} face shape, {skin_tone} skin tone, full hairstyle visible, ultra-realistic, cinematic lighting, 8k, natural human appearance, identical face",
        f"{prompt}, three-quarter angle, high-definition, soft background, same person" if prompt else f"Three-quarter angle, {face_shape} face shape, {skin_tone} skin tone, full head visible, detailed hair texture, ultra high-definition, cinematic soft light, SAME FACE as reference"
    ]

    saved_files = []
    output_folder = "generated_faces"
    os.makedirs(output_folder, exist_ok=True)

    try:
        with open(latest_photo_path, "rb") as image_file:
            for idx, current_prompt in enumerate(prompts):
                retry_count = 0
                max_retries = 3
                success = False
                while retry_count < max_retries and not success:
                    try:
                        print(f"⏳ Sending request to Replicate... attempt {retry_count + 1}")
                        print(f"📝 Prompt {idx}: {current_prompt[:100]}...")
                        image_file.seek(0)
                        print(f"📦 replicate_api_token: {replicate_api_token[:6]}...")

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
                            api_token=replicate_api_token
                        )

                        print(f"🎯 Output dari Replicate (prompt {idx}): {output}")
                        success = True

                        timestamp = int(time.time())
                        for i, img_url in enumerate(output):
                            filename = f"{output_folder}/face_{timestamp}_{idx}_{i}.jpg"
                            try:
                                response = requests.get(img_url, timeout=10)
                                if response.status_code == 200:
                                    with open(filename, "wb") as f:
                                        f.write(response.content)

                                    # Copy ke magicmirror-node/public/generated_faces
                                    frontend_target_path = os.path.join(FRONTEND_PUBLIC_FOLDER, os.path.basename(filename))
                                    shutil.copy(filename, frontend_target_path)
                                    print(f"📂 Copied to frontend public folder: {frontend_target_path}")

                                    global drive_service
                                    if drive_service is None:
                                        credentials = get_credentials()
                                        drive_service = build('drive', 'v3', credentials=credentials)

                                    mime_type = "image/jpeg"
                                    try:
                                        link = upload_file(frontend_target_path, mime_type, drive_service)
                                        print(f"☁️ Uploaded generated face: {link}", flush=True)
                                    except Exception as ex:
                                        print(f"⚠️ Gagal upload generated face: {ex}", flush=True)

                                    saved_files.append(f"/generated_faces/{os.path.basename(filename)}")
                                    print(f"✅ Saved generated face: {filename}")
                                else:
                                    print(f"⚠️ Gagal download gambar (HTTP {response.status_code}) dari {img_url}")
                            except Exception as download_error:
                                print(f"⚠️ Error downloading face image: {str(download_error)}")

                    except Exception as e:
                        retry_count += 1
                        print(f"⚠️ Unexpected Error: {str(e)}")
                        time.sleep(2)
                if not success:
                    print(f"❌ Gagal setelah {max_retries} percobaan untuk prompt {idx}")
    except Exception as e:
        print(f"🔥 Critical error saat generate virtual face: {type(e).__name__} - {str(e)}")
        return []

    return saved_files

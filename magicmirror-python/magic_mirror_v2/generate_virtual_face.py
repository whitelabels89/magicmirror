import cv2
import time
import numpy as np

TESTING_MODE = False  # Tambahkan ini di atas semua fungsi

# ------------------ GLOBAL VARIABLES ------------------

hair_styles = ["Straight", "Wavy", "Curly", "Bob", "Pixie", "Layered"]
hair_colors = ["Black", "Brown", "Blonde", "Red", "Silver", "Blue"]

selected_hair_style = None
selected_hair_color = None

# Variabel untuk QR Overlay
qr_canvas = None
qr_start_time = None
qr_anim_start = None

# ------------------ UI SELECTOR ------------------

def render_ui_selector(display_frame, style_button_y_offset=0):
    button_width = 150
    button_height = 40
    margin = 10
    x_start = 10
    y_start = 10

    # Draw Hair Style buttons
    for idx, style in enumerate(hair_styles):
        top_left = (x_start, y_start + idx * (button_height + margin) + style_button_y_offset)
        bottom_right = (top_left[0] + button_width, top_left[1] + button_height)
        color = (200, 200, 250) if style == selected_hair_style else (180, 180, 180)
        cv2.rectangle(display_frame, top_left, bottom_right, color, -1)
        cv2.putText(display_frame, style, (top_left[0] + 5, top_left[1] + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 2)

    # Draw Hair Color buttons
    x_start = 200
    for idx, color in enumerate(hair_colors):
        top_left = (x_start, y_start + idx * (button_height + margin) + style_button_y_offset)
        bottom_right = (top_left[0] + button_width, top_left[1] + button_height)
        button_color = (250, 200, 200) if color == selected_hair_color else (180, 180, 180)
        cv2.rectangle(display_frame, top_left, bottom_right, button_color, -1)
        cv2.putText(display_frame, color, (top_left[0] + 5, top_left[1] + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 2)

    return display_frame

# ------------------ HANDLE MOUSE CLICK ------------------

def handle_mouse_click(event, x, y, flags, param):
    global selected_hair_style, selected_hair_color

    if event == cv2.EVENT_LBUTTONDOWN:
        button_width = 150
        button_height = 40
        margin = 10
        x_start = 10
        y_start = 10

        # Hair Style klik detection
        for idx, style in enumerate(hair_styles):
            if x_start <= x <= x_start + button_width and \
               y_start + idx * (button_height + margin) <= y <= y_start + idx * (button_height + margin) + button_height:
                selected_hair_style = style
                print(f"✂️ Hair Style selected: {style}")

        # Hair Color klik detection
        x_start_color = 200
        for idx, color in enumerate(hair_colors):
            if x_start_color <= x <= x_start_color + button_width and \
               y_start + idx * (button_height + margin) <= y <= y_start + idx * (button_height + margin) + button_height:
                selected_hair_color = color
                print(f"🎨 Hair Color selected: {color}")

# ------------------ RENDER VIRTUAL PREVIEW ------------------

def render_virtual_preview(display_frame):
    face_center_x = int(display_frame.shape[1] * 0.75)  # Geser ke kanan atas
    face_center_y = int(display_frame.shape[0] * 0.15)

    # Draw black background rectangle
    rect_width = 200
    rect_height = 250
    top_left = (face_center_x - rect_width//2, face_center_y - rect_height//2)
    bottom_right = (face_center_x + rect_width//2, face_center_y + rect_height//2)
    cv2.rectangle(display_frame, top_left, bottom_right, (0, 0, 0), -1)

    # Draw light blue face placeholder
    face_center = (face_center_x, face_center_y)
    if TESTING_MODE:
        cv2.circle(display_frame, face_center, 80, (200, 220, 255), -1)
    # cv2.circle(display_frame, face_center, 80, (200, 220, 255), -1)

    # Hair Style & Color Text below the face
    hair_text = selected_hair_style if selected_hair_style else "HairStyle?"
    color_text = selected_hair_color if selected_hair_color else "Color?"

    cv2.putText(display_frame, f"{hair_text}", 
                (top_left[0] + 10, bottom_right[1] + 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 255), 2)

    cv2.putText(display_frame, f"{color_text}", 
                (top_left[0] + 10, bottom_right[1] + 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 255), 2)

    return display_frame

# ------------------ RENDER FULL MAGIC MIRROR ------------------

def render_full_magic_mirror(display_frame, qr_overlay=True, style_button_y_offset=0):
    global qr_canvas, qr_start_time, qr_anim_start

    # 1. Tampilkan Avatar Eve + Virtual Face
    display_frame = render_virtual_preview(display_frame)

    # 2. Tampilkan Hair Style & Hair Color Selector
    display_frame = render_ui_selector(display_frame, style_button_y_offset)

    # 3. Opsional: QR Code Promo
    if qr_overlay and qr_canvas is not None and qr_start_time is not None:
        elapsed = int(time.time() - qr_start_time)
        remaining = max(0, 60 - elapsed)

        if remaining > 0:
            qr_h, qr_w = qr_canvas.shape[:2]
            frame_h, frame_w = display_frame.shape[:2]
            overlay = display_frame.copy()

            x_offset = frame_w - qr_w - 20
            y_offset = 20

            anim_elapsed = time.time() - qr_anim_start if qr_anim_start else 1.0
            scale_factor = min(1.0, anim_elapsed / 0.5)
            scaled_qr = cv2.resize(qr_canvas, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
            sq_h, sq_w = scaled_qr.shape[:2]

            center_x = frame_w - int((qr_w + 20) / 2)
            center_y = 20 + int(qr_h / 2)
            top_left_x = center_x - sq_w // 2
            top_left_y = center_y - sq_h // 2

            overlay[top_left_y:top_left_y+sq_h, top_left_x:top_left_x+sq_w] = scaled_qr

            cv2.putText(overlay, f"{remaining}s tersisa",
                        (top_left_x, top_left_y + sq_h + 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

            display_frame = cv2.addWeighted(overlay, 0.85, display_frame, 0.15, 0)

    return display_frame
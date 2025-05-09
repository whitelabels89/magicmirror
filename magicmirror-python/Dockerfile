FROM python:3.10-slim

LABEL maintainer="you@queensacademy.id"
LABEL description="Docker image for Face Consultant Magic Mirror"

WORKDIR /app

COPY . .

# ✅ Tambahkan dependency penting untuk OpenCV dan audio processing
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 ffmpeg

RUN pip install --no-cache-dir -r requirements.txt

RUN chmod +x start.sh
CMD ["bash", "start.sh"]

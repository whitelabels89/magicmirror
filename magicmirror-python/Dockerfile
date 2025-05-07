# Gunakan image Python
FROM python:3.10-slim

LABEL maintainer="you@queensacademy.id"
LABEL description="Docker image for Face Consultant Magic Mirror"

# Set working directory
WORKDIR /app

# Copy semua file ke dalam container
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

CMD ["gunicorn", "app:app"]

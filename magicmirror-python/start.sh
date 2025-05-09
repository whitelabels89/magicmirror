#!/bin/bash

echo "🧠 Menjalankan QC Magic Mirror API..."
exec gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300

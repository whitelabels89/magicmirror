# Magic Mirror

This repository hosts the backend for the **Queen's Academy** platform. It includes the Magic Mirror module and the e-learning API used by the teacher and student dashboards. The Magic Mirror component analyses faces and generates personalized style recommendations and images. The project is split into two main parts:

Both services rely on environment variables stored in `.env` files within their respective directories.

## Contents

### `magicmirror-node`

- `server.js` – Express server with REST endpoints and WebSocket events.
- `public/` – static HTML, CSS, and JS assets for the browser UI.
- `package.json` – lists the Node dependencies and the `npm start` script.

### `magicmirror-python`

- `app.py` – Flask entrypoint used in development and by `start.sh`.
- `face_consultant_freshstart.py` – main face analysis script.
- `requirements.txt` – Python dependencies.
- `start.sh` – script used in Docker or production to start the Flask app via Gunicorn.


### `elearning-api.gs`

Google Apps Script ini adalah endpoint utama untuk sistem e-learning **Queen's Academy**, mengambil data murid, progress, karya, dan reward dari Google Sheets. Script ini menyediakan REST API yang digunakan dashboard guru dan murid.

🔗 Web App URL:
https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec

Contoh fetch data:
```js
fetch(`${WEB_APP_URL}?tab=EL_PROGRESS_MURID&uid=xxxxx`)
```

## Setup

Clone the repository and create the following `.env` files:

### For `magicmirror-node`
```
SPREADSHEET_ID=your_google_sheet_id
OPENAI_API_KEY=your_openai_api_key
WHACENTER_DEVICE=your_whacenter_device_id
WEB_APP_URL=apps_script_web_url
PORT=3000 # optional, defaults to 3000
```

### For `magicmirror-python`
```
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
VOICE_ID=elevenlabs_voice_id
GDRIVE_FOLDER_ID=google_drive_folder_id
USE_ELEVENLABS=true|false
ENV_MODE=dev|prod
PORT=10000 # optional when running app.py
```

## Install dependencies

1. **Node server**
   ```bash
   cd magicmirror-node
   npm install
   ```
2. **Python server**
   ```bash
   cd magicmirror-python
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Running the servers

### Start the Node backend
```
cd magicmirror-node
npm start
```
This will serve the web UI on `http://localhost:3000`.

### Start the Python service
```
cd magicmirror-python
python app.py  # or ./start.sh in production
```
The Flask API will run on port `10000` (or the value of `PORT`).

Both services communicate via WebSockets. When running locally, ensure the ports in the `.env` files match the expected defaults.


## Notes

- Proyek ini merupakan bagian dari pengembangan platform Queen's Academy dengan integrasi AI, e-learning, dan pelacakan progress murid berbasis Google Sheets dan Firebase.
- Magic Mirror hanyalah salah satu modul visual; sistem e-learning adalah fokus utama.

# Air Draw ✳
A local air-drawing studio: Python machine learning, HTML/CSS, and a JavaScript canvas.

## Start on macOS / Linux
Use Python 3.11 or 3.12. Extract the ZIP, then open Terminal in `air-draw`:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python download_model.py
python app.py
```
Open **http://localhost:5000** in Chrome or Edge. Click **Start camera** and allow camera access. Stop the server with Ctrl+C.

Windows: create the environment with `py -3.12 -m venv .venv`, activate with `.venv\Scripts\activate`, then run the same `python` commands above.

## Draw
- Keep one hand visible, facing the camera, in good light.
- Bring your thumb and index fingertip together to draw with the index fingertip.
- Separate them to lift the brush and move without drawing.
- Choose a color and brush width, undo strokes, clear, or export a PNG.
- Stop the camera to draw with a mouse or touch instead.
- Export contains the drawing on a dark background, never the camera image.
- Changing tabs stops the camera; click Start camera to resume.

## Architecture
The browser obtains a mirrored webcam preview, sends 640×360 JPEG frames to the local Flask server, and renders strokes using returned landmarks. Python runs the pretrained MediaPipe Hand Landmarker model. Pinch detection uses thumb/index distance divided by palm length, with separate engage/release thresholds to reduce flicker. Cursor smoothing reduces jitter. Requests run serially to avoid inference backlog.

This is hand tracking, not object recognition or a newly trained model. Frames are processed in RAM, not saved. The server binds only to 127.0.0.1. No account or API key is required. Initial package/model installation requires internet; optional Google Fonts fall back to system fonts if unavailable.

## Troubleshooting
- Model missing: run `python download_model.py` again and check internet access.
- Camera blocked: grant browser camera permission and OS permission to Chrome/Edge. Close other apps using the webcam. Open localhost, not the HTML file directly.
- Port 5000 occupied (including macOS AirPlay): change the port at the bottom of app.py to 5050 and open http://localhost:5050.
- Linux missing libGLESv2.so.2: install the OS packages `libgles2` and `libegl1` (Debian/Ubuntu).
- MediaPipe installation fails: use Python 3.11/3.12 in a fresh virtual environment. Platform/wheel support depends on your system.
- Tracking error: inspect the Python terminal. Mouse drawing remains available.
- Drawing is jumpy: improve lighting, move slowly, keep the full hand visible.

## Validation and limitations
Python syntax, JavaScript syntax, HTTP endpoints, and real model inference on a blank frame were checked during creation if recorded in VALIDATION.md. Actual webcam/gesture performance must be checked on your device. No cloud deployment is included: this project requires a Python server, which the available Sites hosting runtime does not support.

## Sources
MediaPipe Python guide: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/python
Official model: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
The model is downloaded separately from Google; it is not included in this archive. Check upstream terms before redistributing it.

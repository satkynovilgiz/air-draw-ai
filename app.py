"""Local Air Draw server. Frames are processed in memory, never saved."""
from pathlib import Path
from io import BytesIO
import threading
import atexit
import numpy as np
from PIL import Image, UnidentifiedImageError
from flask import Flask, request, jsonify
import mediapipe as mp
from werkzeug.exceptions import HTTPException

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config['MAX_CONTENT_LENGTH'] = 1_000_000
lock = threading.Lock()
detector = None

def get_detector():
    global detector
    if detector is None:
        model = ROOT / 'models/hand_landmarker.task'
        if not model.exists():
            raise FileNotFoundError('Model missing. Run: python download_model.py')
        options = mp.tasks.vision.HandLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_hands=1, min_hand_detection_confidence=0.6,
            min_hand_presence_confidence=0.6)
        detector = mp.tasks.vision.HandLandmarker.create_from_options(options)
    return detector

@app.get('/')
def home():
    return app.send_static_file('index.html')

@app.get('/api/health')
def health():
    return jsonify(model_ready=(ROOT / 'models/hand_landmarker.task').exists())

@app.post('/api/track')
def track():
    if request.mimetype != 'image/jpeg':
        return jsonify(error='Expected a JPEG frame.'), 415
    try:
        with Image.open(BytesIO(request.get_data())) as source:
            if source.width > 1280 or source.height > 1280:
                return jsonify(error='Frame too large.'), 400
            pixels = np.asarray(source.convert('RGB'))
        with lock:
            result = get_detector().detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=pixels))
        if not result.hand_landmarks:
            return jsonify(hand=None)
        hand = result.hand_landmarks[0]
        return jsonify(hand=[{'x': p.x, 'y': p.y} for p in hand])
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        return jsonify(error=str(exc)), 400
    except HTTPException:
        raise
    except Exception:
        app.logger.exception('Tracking unavailable')
        return jsonify(error='Tracking unavailable. Check server terminal and run python download_model.py.'), 503

@atexit.register
def close_detector():
    if detector is not None:
        detector.close()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)

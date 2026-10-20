from pathlib import Path
import urllib.request

URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
target = Path(__file__).resolve().parent / 'models/hand_landmarker.task'
if target.exists() and target.stat().st_size > 1_000_000:
    print('Model already downloaded.')
else:
    target.parent.mkdir(exist_ok=True)
    temporary = target.with_suffix('.download')
    try:
        print('Downloading Google MediaPipe hand model...')
        urllib.request.urlretrieve(URL, temporary)
        if temporary.stat().st_size < 1_000_000:
            raise RuntimeError('Incomplete model download')
        temporary.replace(target)
        print('Model ready.')
    finally:
        temporary.unlink(missing_ok=True)

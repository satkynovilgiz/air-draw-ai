"use strict";

// Canvas and camera
const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");

const video = document.getElementById("video");
const startButton = document.getElementById("start");
const errorText = document.getElementById("error");
const emptyMessage = document.getElementById("empty");

const frame = document.createElement("canvas");
frame.width = 640;
frame.height = 360;

const frameCtx = frame.getContext("2d");

// Drawing settings
let brushColor = "#b6f36c";
let brushSize = 7;
let strokes = [];
let currentStroke = null;

let mouseDown = false;
let cameraOn = false;
let cameraStream = null;
let cameraSession = 0;

let isPinching = false;
let lastPosition = null;

function setStatus(message, handFound = false) {
  document.getElementById("status").textContent = message;
  document.getElementById("dot").style.background =
    handFound ? "#b6f36c" : "#757b70";
}

function endStroke() {
  currentStroke = null;
  isPinching = false;
}

function drawDot(point, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawLine(from, to, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function addPoint(x, y) {
  if (currentStroke === null) {
    currentStroke = {
      color: brushColor,
      size: brushSize,
      points: []
    };

    strokes.push(currentStroke);
  }

  const point = { x, y };
  const points = currentStroke.points;

  if (points.length === 0) {
    drawDot(point, currentStroke.color, currentStroke.size);
  } else {
    const previousPoint = points[points.length - 1];
    drawLine(
      previousPoint,
      point,
      currentStroke.color,
      currentStroke.size
    );
  }

  points.push(point);
  emptyMessage.style.display = "none";
}

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    drawDot(stroke.points[0], stroke.color, stroke.size);

    for (let i = 1; i < stroke.points.length; i++) {
      drawLine(
        stroke.points[i - 1],
        stroke.points[i],
        stroke.color,
        stroke.size
      );
    }
  }

  emptyMessage.style.display = strokes.length === 0 ? "flex" : "none";
}

// Brush controls
const colorButtons = document.querySelectorAll(".swatch");

function selectColor(color) {
  endStroke();
  brushColor = color;

  for (const button of colorButtons) {
    const selected = button.dataset.color === color;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }

  document.getElementById("custom").value = color;
}

for (const button of colorButtons) {
  button.addEventListener("click", function () {
    selectColor(button.dataset.color);
  });
}

document.getElementById("custom").addEventListener("input", function (event) {
  selectColor(event.target.value);
});

document.getElementById("size").addEventListener("input", function (event) {
  endStroke();
  brushSize = Number(event.target.value);
  document.getElementById("sizeLabel").textContent = brushSize;
});

document.getElementById("undo").addEventListener("click", function () {
  endStroke();
  strokes.pop();
  redrawCanvas();
});

document.getElementById("clear").addEventListener("click", function () {
  endStroke();
  strokes = [];
  redrawCanvas();
});

document.getElementById("save").addEventListener("click", function () {
  const image = document.createElement("canvas");
  image.width = canvas.width;
  image.height = canvas.height;

  const imageCtx = image.getContext("2d");
  imageCtx.fillStyle = "#10140f";
  imageCtx.fillRect(0, 0, image.width, image.height);
  imageCtx.drawImage(canvas, 0, 0);

  image.toBlob(function (blob) {
    if (!blob) {
      errorText.textContent = "Could not save the drawing.";
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "air-draw.png";
    link.click();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  });
});

// Mouse and touch drawing
function drawAtPointer(event) {
  const bounds = canvas.getBoundingClientRect();

  const x = (event.clientX - bounds.left) / bounds.width * canvas.width;
  const y = (event.clientY - bounds.top) / bounds.height * canvas.height;

  addPoint(x, y);
}

canvas.addEventListener("pointerdown", function (event) {
  if (cameraOn) return;

  endStroke();
  mouseDown = true;
  canvas.setPointerCapture(event.pointerId);
  drawAtPointer(event);
});

canvas.addEventListener("pointermove", function (event) {
  if (mouseDown) {
    drawAtPointer(event);
  }
});

function stopPointerDrawing() {
  mouseDown = false;
  endStroke();
}

canvas.addEventListener("pointerup", stopPointerDrawing);
canvas.addEventListener("pointercancel", stopPointerDrawing);
canvas.addEventListener("lostpointercapture", stopPointerDrawing);

// Hand tracking
function distance(a, b) {
  const dx = (a.x - b.x) * frame.width;
  const dy = (a.y - b.y) * frame.height;

  return Math.hypot(dx, dy);
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function updateHand(hand) {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  if (!hand) {
    endStroke();
    lastPosition = null;
    setStatus("Show one hand to the camera");
    return;
  }

  const thumb = hand[4];
  const indexFinger = hand[8];
  const wrist = hand[0];
  const middleKnuckle = hand[9];

  const palmSize = Math.max(distance(wrist, middleKnuckle), 1);
  const pinchRatio = distance(thumb, indexFinger) / palmSize;

  // Different thresholds prevent rapid drawing / stopping.
  const threshold = isPinching ? 0.42 : 0.30;
  const drawing = pinchRatio < threshold;

  let x = clamp(1 - indexFinger.x) * canvas.width;
  let y = clamp(indexFinger.y) * canvas.height;

  // Smooth the cursor movement.
  if (lastPosition !== null) {
    x = lastPosition.x * 0.45 + x * 0.55;
    y = lastPosition.y * 0.45 + y * 0.55;
  }

  lastPosition = { x, y };

  if (drawing) {
    isPinching = true;
    addPoint(x, y);
    setStatus("Drawing · release to move", true);
  } else {
    endStroke();
    setStatus("Hand found · pinch to draw", true);
  }

  overlayCtx.strokeStyle = drawing ? brushColor : "#ffffffaa";
  overlayCtx.lineWidth = 2;

  const cursorSize = drawing ? brushSize / 2 + 7 : 13;

  overlayCtx.beginPath();
  overlayCtx.arc(x, y, cursorSize, 0, Math.PI * 2);
  overlayCtx.stroke();
}

function captureFrame() {
  frameCtx.drawImage(video, 0, 0, frame.width, frame.height);

  return new Promise(function (resolve) {
    frame.toBlob(resolve, "image/jpeg", 0.75);
  });
}

async function trackHand(session) {
  if (!cameraOn || session !== cameraSession) return;

  const startedAt = performance.now();

  try {
    const image = await captureFrame();

    if (!image) {
      throw new Error("Could not capture a camera frame.");
    }

    const response = await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg"
      },
      body: image,
      signal: AbortSignal.timeout(10000)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Hand tracking failed.");
    }

    if (!cameraOn || session !== cameraSession) return;

    updateHand(result.hand);
  } catch (error) {
    if (session === cameraSession) {
      stopCamera();
      errorText.textContent = error.message;
    }

    return;
  }

  const elapsed = performance.now() - startedAt;
  const delay = Math.max(0, 65 - elapsed);

  setTimeout(function () {
    trackHand(session);
  }, delay);
}

function stopCamera() {
  cameraSession++;
  cameraOn = false;

  if (cameraStream !== null) {
    for (const track of cameraStream.getTracks()) {
      track.stop();
    }
  }

  cameraStream = null;
  video.srcObject = null;
  lastPosition = null;

  stopPointerDrawing();
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  startButton.textContent = "↗ Start camera";
  startButton.disabled = false;
  document.getElementById("mode").textContent = "MOUSE MODE";

  setStatus("Camera off · draw with your mouse");
}

async function startCamera() {
  errorText.textContent = "";
  startButton.disabled = true;
  setStatus("Preparing camera…");

  // Ignore old requests if the user leaves the page while starting.
  const session = ++cameraSession;

  try {
    const response = await fetch("/api/health", {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error("Python server is unavailable.");
    }

    const health = await response.json();

    if (!health.model_ready) {
      throw new Error("Run python download_model.py first.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Open this app at http://localhost:5000.");
    }

    if (session !== cameraSession) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 },
        facingMode: "user"
      },
      audio: false
    });

    if (session !== cameraSession) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return;
    }

    cameraStream = stream;
    video.srcObject = stream;

    stream.getVideoTracks()[0].addEventListener("ended", function () {
      if (session === cameraSession) {
        stopCamera();
      }
    });

    await video.play();

    if (session !== cameraSession) return;

    stopPointerDrawing();
    lastPosition = null;
    cameraOn = true;

    startButton.textContent = "■ Stop camera";
    startButton.disabled = false;
    document.getElementById("mode").textContent = "HAND TRACKING";

    trackHand(session);
  } catch (error) {
    if (session !== cameraSession) return;

    stopCamera();

    if (error.name === "NotAllowedError") {
      errorText.textContent = "Allow camera access in your browser and try again.";
    } else if (error.name === "NotFoundError") {
      errorText.textContent = "No camera found. You can still draw with your mouse.";
    } else {
      errorText.textContent = error.message;
    }
  }
}

startButton.addEventListener("click", function () {
  if (cameraOn) {
    stopCamera();
  } else {
    startCamera();
  }
});

window.addEventListener("pagehide", stopCamera);

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    stopCamera();
  }
});
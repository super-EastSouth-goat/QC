import json
import time
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse
from ultralytics import YOLO
from PIL import Image
import io

from app.camera import camera_service

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "config"

def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing config file: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))

infer_cfg = load_json(CONFIG_DIR / "infer.json")

MODEL_PATH = str((ROOT / infer_cfg.get("model_path", "models/best.pt")).resolve())
DEFAULT_IMGSZ = int(infer_cfg.get("default_imgsz", 640))
CONF_THRES = float(infer_cfg.get("conf_thres", 0.25))
IOU_THRES = float(infer_cfg.get("iou_thres", 0.45))
NG_CLASSES = set(infer_cfg.get("ng_classes", []))

app = FastAPI(title="QC Edge Inference", version="0.1.0")

ALLOWED_ORIGINS = [
    "http://69.230.223.12:3110",   # 生产环境 AWS 前端
    "http://localhost:3000",        # 本地开发环境
    "http://localhost:3110",        # 本地开发环境 (备用端口)
    "http://127.0.0.1:3000",        # 本地开发环境
    "http://127.0.0.1:3110",        # 本地开发环境 (备用端口)
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


model: Optional[YOLO] = None

@app.on_event("startup")
def _startup() -> None:
    global model
    model = YOLO(MODEL_PATH)
    camera_service.start()

@app.on_event("shutdown")
def _shutdown() -> None:
    camera_service.stop()

@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_version": MODEL_PATH,
        "device": "cpu"
    }


def _gen_frames():
    while True:
        frame_bytes = camera_service.get_frame()
        if frame_bytes:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
        else:
            time.sleep(0.1)


@app.get("/video_feed", response_class=StreamingResponse)
async def video_feed():
    return StreamingResponse(
        _gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/api/camera/video_feed", response_class=StreamingResponse)
async def api_camera_video_feed():
    return StreamingResponse(
        _gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/api/status")
def api_status() -> Dict[str, Any]:
    return {
        "io_triggered": camera_service.check_io_status(),
        "camera_running": camera_service.is_running,
        "digital_gain": getattr(camera_service, "digital_gain", 1.0),
    }


@app.get("/api/camera/devices")
def api_camera_devices() -> List[Dict[str, Any]]:
    """返回可用摄像头列表，供前端选择；MVS 仅一台。"""
    if camera_service.is_running:
        return [
            {
                "id": "mvs",
                "label": "MVS 相机",
                "url": "/api/camera/video_feed",
            }
        ]
    return []


VIEW_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>摄像头画面</title>
  <style>
    body { margin: 0; background: #111; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <img src="/api/camera/video_feed" alt="摄像头画面" />
</body>
</html>
"""


@app.get("/view", response_class=HTMLResponse)
async def view():
    return HTMLResponse(VIEW_HTML)


@app.post("/infer")
async def infer(
    file: UploadFile = File(...),
    barcode: Optional[str] = Form(None),
    request_id: Optional[str] = Form(None),
    imgsz: Optional[int] = Form(None),
) -> Dict[str, Any]:
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    w, h = img.size
    run_imgsz = int(imgsz) if imgsz else DEFAULT_IMGSZ

    t0 = time.time()
    results = model.predict(
        source=img,
        imgsz=run_imgsz,
        conf=CONF_THRES,
        iou=IOU_THRES,
        verbose=False,
    )
    dt_ms = int((time.time() - t0) * 1000)

    r0 = results[0]
    names = r0.names
    detections: List[Dict[str, Any]] = []

    if r0.boxes is not None and len(r0.boxes) > 0:
        xyxy = r0.boxes.xyxy.tolist()
        confs = r0.boxes.conf.tolist()
        clss = r0.boxes.cls.tolist()

        for i, (bb, cf, ci) in enumerate(zip(xyxy, confs, clss)):
            cls_id = int(ci)
            cls_name = names.get(cls_id, str(cls_id))
            detections.append({
                "id": f"d{i}",
                "cls": cls_name,
                "conf": float(cf),
                "xyxy": [float(x) for x in bb]
            })

    suggested = "NG" if any(d["cls"] in NG_CLASSES for d in detections) else "OK"

    return {
        "request_id": request_id,
        "barcode": barcode,
        "model_version": MODEL_PATH,
        "img_shape": [h, w],
        "time_ms": dt_ms,
        "detections": detections,
        "suggested_decision": suggested
    }

from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil
import os
import uuid

from extractor import EnhancedBodyMeasurementExtractor

app = FastAPI()
extractor = EnhancedBodyMeasurementExtractor()

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)


def save_temp_image(upload: UploadFile) -> str:
    filename = f"{uuid.uuid4()}_{upload.filename}"
    path = os.path.join(TEMP_DIR, filename)

    with open(path, "wb") as f:
        shutil.copyfileobj(upload.file, f)

    return path


@app.post("/measure")
async def measure(
    front: UploadFile = File(...),
    back : UplaodFile = File(...),
    left: UploadFile = File(None),
    right: UploadFile = File(None)
):
    image_paths = {}

    try:
        image_paths["front"] = save_temp_image(front)

        if left:
            image_paths["left"] = save_temp_image(left)

        if right:
            image_paths["right"] = save_temp_image(right)

        measurements = extractor.process(image_paths)

        return {
            "success": True,
            "measurements": measurements
        }

    except ValueError as e:
        # ❗ Logical failure, not server crash
        return {
            "success": False,
            "error": str(e),
            "hint": "Use plain background, good lighting, fitted clothes"
        }

    finally:
        for path in image_paths.values():
            if os.path.exists(path):
                os.remove(path)

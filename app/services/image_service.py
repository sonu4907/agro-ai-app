from pathlib import Path
from uuid import uuid4
import base64

from fastapi import UploadFile

# Upload directory
UPLOAD_DIR = (Path(__file__).resolve().parents[1] / "uploads").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed MIME types
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg"
}

# Maximum upload size (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


async def validate_image(file: UploadFile):
    """
    Validate uploaded image.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            "Only JPG, JPEG, PNG and WEBP images are supported."
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise ValueError(
            "Image size must be less than 10 MB."
        )

    # Reset pointer so the file can be read again
    await file.seek(0)


async def save_image(file: UploadFile) -> Path:
    """
    Save uploaded image locally.
    """
    extension = Path(file.filename).suffix.lower()
    filename = f"{uuid4()}{extension}"
    filepath = UPLOAD_DIR / filename

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    await file.seek(0)
    return filepath.resolve()


def image_to_base64(filepath: Path) -> str:
    """
    Convert image to Base64 string.
    """
    with open(filepath, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return encoded


def delete_image(filepath: Path):
    """
    Delete temporary uploaded image.
    """
    if filepath.exists():
        filepath.unlink()
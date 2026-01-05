"""
Safe image reading and writing utilities
"""
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageOps
from typing import Optional, Tuple, Union
import warnings

from .errors import FileSystemError
from ..config import config

def safe_imread(image_path: Path) -> np.ndarray:
    """
    Safely read an image with comprehensive error handling
    """
    if not image_path.exists():
        raise FileSystemError(f"Image not found: {image_path}")
    
    if image_path.suffix.lower() not in config.ACCEPTED_FORMATS:
        raise FileSystemError(f"Unsupported format: {image_path.suffix}")
    
    # Check file size
    file_size_mb = image_path.stat().st_size / (1024 * 1024)
    if file_size_mb > config.MAX_FILE_SIZE_MB:
        raise FileSystemError(f"File too large: {file_size_mb:.1f}MB > {config.MAX_FILE_SIZE_MB}MB")
    
    try:
        # Try OpenCV first
        image = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
        if image is not None:
            # Convert BGR to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            elif len(image.shape) == 3 and image.shape[2] == 4:
                image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)
            return image
        
        # Fallback to PIL
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)  # Handle EXIF orientation
            return np.array(img)
            
    except Exception as e:
        raise FileSystemError(f"Failed to read image {image_path}: {str(e)}")

def safe_imwrite(image: np.ndarray, output_path: Path, 
                quality: int = 95, **kwargs) -> bool:
    """
    Safely write an image with error handling
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Handle different image formats
        if output_path.suffix.lower() in ['.png', '.webp']:
            # For lossless formats
            if len(image.shape) == 3 and image.shape[2] == 4:
                # RGBA image
                cv2.imwrite(str(output_path), cv2.cvtColor(image, cv2.COLOR_RGBA2BGRA))
            else:
                # RGB image
                cv2.imwrite(str(output_path), cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        else:
            # For JPEG
            if len(image.shape) == 3 and image.shape[2] == 4:
                # Convert RGBA to RGB for JPEG
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
            
            params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            cv2.imwrite(str(output_path), cv2.cvtColor(image, cv2.COLOR_RGB2BGR), params)
        
        return True
        
    except Exception as e:
        raise FileSystemError(f"Failed to write image to {output_path}: {str(e)}")

def resize_image(image: np.ndarray, target_size: Tuple[int, int], 
                keep_aspect: bool = True) -> np.ndarray:
    """
    Resize image with aspect ratio preservation
    """
    if image is None:
        return None
    
    h, w = image.shape[:2]
    target_h, target_w = target_size
    
    if keep_aspect:
        # Calculate scaling factor
        scale = min(target_h / h, target_w / w)
        new_h, new_w = int(h * scale), int(w * scale)
        
        # Resize
        if len(image.shape) == 3:
            resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        else:
            resized = cv2.resize(image, (new_w, new_w), interpolation=cv2.INTER_AREA)
        
        # Pad if needed
        if new_h < target_h or new_w < target_w:
            pad_top = (target_h - new_h) // 2
            pad_bottom = target_h - new_h - pad_top
            pad_left = (target_w - new_w) // 2
            pad_right = target_w - new_w - pad_left
            
            if len(image.shape) == 3:
                resized = cv2.copyMakeBorder(resized, pad_top, pad_bottom, 
                                           pad_left, pad_right, 
                                           cv2.BORDER_CONSTANT, value=0)
            else:
                resized = cv2.copyMakeBorder(resized, pad_top, pad_bottom,
                                           pad_left, pad_right,
                                           cv2.BORDER_CONSTANT, value=0)
    else:
        # Simple resize without aspect ratio preservation
        resized = cv2.resize(image, (target_w, target_h), interpolation=cv2.INTER_AREA)
    
    return resized

def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert image to grayscale"""
    if len(image.shape) == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    return image

def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize image to 0-1 range"""
    if image.dtype == np.uint8:
        return image.astype(np.float32) / 255.0
    return image
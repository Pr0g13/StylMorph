"""
Scale normalization step
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json

from ..utils.image_io import safe_imread, safe_imwrite
from ..utils.errors import ValidationError
from ..utils.logger import logger
from ..config import config

class ImageNormalizer:
    """Normalize images to consistent scale and format"""
    
    def __init__(self):
        self.logger = logger.get_logger()
    
    def normalize_views(self, user_id: str, views_data: Dict, output_dir: Path) -> Dict:
        """Normalize all views to consistent scale"""
        self.logger.info(f"Normalizing views for user {user_id}")
        
        try:
            # Calculate normalization parameters
            norm_params = self._calculate_normalization_params(views_data)
            
            # Apply normalization to each view
            normalized_images = {}
            normalization_metrics = {}
            
            for view, view_data in views_data.items():
                if "image_path" not in view_data:
                    continue
                
                image_path = Path(view_data["image_path"])
                if not image_path.exists():
                    self.logger.warning(f"Image not found for {view}, skipping")
                    continue
                
                # Normalize image
                normalized, metrics = self._normalize_image(
                    image_path, view, norm_params
                )
                
                # Save normalized image
                norm_dir = output_dir / user_id / "normalized"
                norm_dir.mkdir(parents=True, exist_ok=True)
                
                norm_path = norm_dir / f"{view}_normalized.png"
                safe_imwrite(normalized, norm_path)
                
                normalized_images[view] = str(norm_path)
                normalization_metrics[view] = metrics
                
                self.logger.info(f"Normalized {view} view to {normalized.shape[1]}x{normalized.shape[0]}")
            
            # Save normalization metadata
            metadata = self._save_normalization_metadata(
                norm_params, normalization_metrics, user_id, output_dir
            )
            
            return {
                "normalized_images": normalized_images,
                "normalization_params": norm_params,
                "normalization_metrics": normalization_metrics,
                "metadata_path": metadata
            }
            
        except Exception as e:
            raise ValidationError(f"Normalization failed: {str(e)}")
    
    def _calculate_normalization_params(self, views_data: Dict) -> Dict:
        """Calculate normalization parameters from all views"""
        if config.NORMALIZATION_METHOD == "bounding_box":
            return self._calculate_bbox_normalization(views_data)
        else:  # height-based normalization
            return self._calculate_height_normalization(views_data)
    
    def _calculate_bbox_normalization(self, views_data: Dict) -> Dict:
        """Calculate normalization based on bounding boxes"""
        all_bboxes = []
        
        for view, view_data in views_data.items():
            if "bbox" in view_data:
                bbox = view_data["bbox"]
                all_bboxes.append({
                    "x_min": bbox["x_min"],
                    "x_max": bbox["x_max"],
                    "y_min": bbox["y_min"],
                    "y_max": bbox["y_max"],
                    "width": bbox["width"],
                    "height": bbox["height"]
                })
        
        if not all_bboxes:
            # Fallback to image dimensions
            return self._calculate_fallback_normalization(views_data)
        
        # Find max dimensions across all views
        max_height = max(bbox["height"] for bbox in all_bboxes)
        max_width = max(bbox["width"] for bbox in all_bboxes)
        
        # Add padding
        target_height = int(max_height * (1 + config.PADDING_RATIO * 2))
        target_width = int(max_width * (1 + config.PADDING_RATIO * 2))
        
        # Ensure target dimensions are at least config.TARGET_HEIGHT
        scale = max(config.TARGET_HEIGHT / target_height, 1.0)
        target_height = int(target_height * scale)
        target_width = int(target_width * scale)
        
        # Round to nearest multiple of 32 for compatibility
        target_height = ((target_height + 31) // 32) * 32
        target_width = ((target_width + 31) // 32) * 32
        
        return {
            "method": "bounding_box",
            "target_height": target_height,
            "target_width": target_width,
            "scale_factor": scale,
            "padding_ratio": config.PADDING_RATIO,
            "max_person_height": max_height,
            "max_person_width": max_width
        }
    
    def _calculate_height_normalization(self, views_data: Dict) -> Dict:
        """Normalize based on person height"""
        heights = []
        
        for view, view_data in views_data.items():
            if "bbox" in view_data:
                heights.append(view_data["bbox"]["height"])
            elif "image_dimensions" in view_data:
                heights.append(view_data["image_dimensions"]["height"])
        
        if not heights:
            return self._calculate_fallback_normalization(views_data)
        
        avg_height = np.mean(heights)
        
        # Calculate scale to reach target height
        scale = config.TARGET_HEIGHT / avg_height
        
        # Get reference image dimensions
        ref_view = config.REFERENCE_VIEW
        if ref_view in views_data and "image_dimensions" in views_data[ref_view]:
            ref_dims = views_data[ref_view]["image_dimensions"]
            target_height = int(ref_dims["height"] * scale)
            target_width = int(ref_dims["width"] * scale)
        else:
            target_height = config.TARGET_HEIGHT
            target_width = int(config.TARGET_HEIGHT * 0.75)  # Assume 4:3 aspect
        
        return {
            "method": "height",
            "target_height": target_height,
            "target_width": target_width,
            "scale_factor": scale,
            "avg_person_height": avg_height,
            "reference_view": ref_view
        }
    
    def _calculate_fallback_normalization(self, views_data: Dict) -> Dict:
        """Fallback normalization when no bbox data available"""
        # Use first available image dimensions
        for view, view_data in views_data.items():
            if "image_dimensions" in view_data:
                dims = view_data["image_dimensions"]
                return {
                    "method": "fallback",
                    "target_height": dims["height"],
                    "target_width": dims["width"],
                    "scale_factor": 1.0,
                    "note": "Using original dimensions (no bbox data)"
                }
        
        # Ultimate fallback
        return {
            "method": "default",
            "target_height": config.TARGET_HEIGHT,
            "target_width": int(config.TARGET_HEIGHT * 0.75),
            "scale_factor": 1.0,
            "note": "Using default dimensions"
        }
    
    def _normalize_image(self, image_path: Path, view: str, 
                        norm_params: Dict) -> Tuple[np.ndarray, Dict]:
        """Normalize a single image"""
        # Read image
        image = safe_imread(image_path)
        
        # Get target dimensions
        target_h = norm_params["target_height"]
        target_w = norm_params["target_width"]
        
        # Calculate scaling
        h, w = image.shape[:2]
        scale_h = target_h / h
        scale_w = target_w / w
        
        if config.MAINTAIN_ASPECT_RATIO:
            # Maintain aspect ratio
            scale = min(scale_h, scale_w)
            new_h, new_w = int(h * scale), int(w * scale)
            
            # Resize
            if len(image.shape) == 3:
                resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            else:
                resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Pad to target size
            pad_top = (target_h - new_h) // 2
            pad_bottom = target_h - new_h - pad_top
            pad_left = (target_w - new_w) // 2
            pad_right = target_w - new_w - pad_left
            
            if len(image.shape) == 3:
                normalized = cv2.copyMakeBorder(
                    resized, pad_top, pad_bottom, pad_left, pad_right,
                    cv2.BORDER_CONSTANT, value=[0, 0, 0]
                )
            else:
                normalized = cv2.copyMakeBorder(
                    resized, pad_top, pad_bottom, pad_left, pad_right,
                    cv2.BORDER_CONSTANT, value=0
                )
            
            metrics = {
                "original_size": [w, h],
                "resized_size": [new_w, new_h],
                "final_size": [target_w, target_h],
                "scale_factor": scale,
                "padding": {
                    "top": pad_top,
                    "bottom": pad_bottom,
                    "left": pad_left,
                    "right": pad_right
                },
                "aspect_ratio_preserved": True
            }
        else:
            # Simple resize (distorts aspect ratio)
            normalized = cv2.resize(image, (target_w, target_h), interpolation=cv2.INTER_AREA)
            
            metrics = {
                "original_size": [w, h],
                "final_size": [target_w, target_h],
                "scale_h": scale_h,
                "scale_w": scale_w,
                "aspect_ratio_preserved": False
            }
        
        return normalized, metrics
    
    def _save_normalization_metadata(self, norm_params: Dict, 
                                    metrics: Dict, user_id: str, 
                                    output_dir: Path) -> Path:
        """Save normalization metadata to JSON"""
        metadata_dir = output_dir / user_id / "metadata"
        metadata_dir.mkdir(parents=True, exist_ok=True)
        
        metadata = {
            "normalization_parameters": norm_params,
            "view_metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
        
        metadata_path = metadata_dir / "normalization.json"
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.logger.info("Saved normalization metadata")
        
        return metadata_path
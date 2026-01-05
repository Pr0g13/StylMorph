"""
Image validation step
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from ..utils.image_io import safe_imread
from ..utils.errors import ValidationError
from ..utils.logger import logger
from ..config import config

class ImageValidator:
    """Validate uploaded images for processing"""
    
    def __init__(self):
        self.logger = logger.get_logger()
    
    def validate_user(self, user_id: str) -> Dict:
        """Validate all images for a user"""
        self.logger.info(f"Validating images for user: {user_id}")
        
        upload_dir = config.UPLOADS_DIR / user_id
        if not upload_dir.exists():
            raise ValidationError(f"User directory not found: {upload_dir}")
        
        validation_results = {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "overall_valid": True,
            "views": {},
            "issues": [],
            "warnings": []
        }
        
        # Validate each view
        for view in config.ALL_VIEWS:
            image_path = self._find_image(upload_dir, view)
            
            if view in config.REQUIRED_VIEWS and not image_path:
                validation_results["overall_valid"] = False
                validation_results["issues"].append(f"Missing required view: {view}")
                validation_results["views"][view] = {"valid": False, "error": "File not found"}
                continue
            
            if image_path:
                view_result = self.validate_image(image_path, view)
                validation_results["views"][view] = view_result
                
                if not view_result["valid"] and view in config.REQUIRED_VIEWS:
                    validation_results["overall_valid"] = False
                    validation_results["issues"].append(f"{view}: {view_result.get('error')}")
                elif view_result.get("warnings"):
                    validation_results["warnings"].extend(
                        [f"{view}: {w}" for w in view_result["warnings"]]
                    )
            elif view not in config.REQUIRED_VIEWS:
                # Optional view not provided
                validation_results["views"][view] = {"valid": True, "status": "optional_missing"}
        
        return validation_results
    
    def _find_image(self, directory: Path, view: str) -> Optional[Path]:
        """Find image file for a specific view"""
        patterns = [f"{view}.*", f"{view}_*.*", f"*{view}*.*"]
        
        for pattern in patterns:
            for ext in config.ACCEPTED_FORMATS:
                files = list(directory.glob(pattern.replace('.*', ext)))
                if files:
                    return sorted(files)[0]  # Take first matching file
        
        return None
    
    def validate_image(self, image_path: Path, view: str) -> Dict:
        """Validate a single image"""
        result = {
            "valid": True,
            "view": view,
            "path": str(image_path),
            "dimensions": None,
            "format": image_path.suffix.lower(),
            "error": None,
            "warnings": []
        }
        
        try:
            # Check basic file properties
            if not image_path.exists():
                result["valid"] = False
                result["error"] = "File not found"
                return result
            
            # Read and validate image
            image = safe_imread(image_path)
            h, w = image.shape[:2]
            result["dimensions"] = {"width": w, "height": h}
            
            # Check dimensions
            min_h, min_w = config.MIN_IMAGE_SIZE
            max_h, max_w = config.MAX_IMAGE_SIZE
            
            if h < min_h or w < min_w:
                result["valid"] = False
                result["error"] = f"Image too small: {w}x{h} < {min_w}x{min_h}"
                return result
            
            if h > max_h or w > max_w:
                result["warnings"].append(f"Image larger than recommended: {w}x{h} > {max_w}x{max_h}")
            
            # Check aspect ratio (person should be mostly vertical)
            aspect_ratio = h / w
            if aspect_ratio < 1.2:
                result["warnings"].append(f"Low aspect ratio ({aspect_ratio:.2f}). Person might be cropped.")
            elif aspect_ratio > 3.0:
                result["warnings"].append(f"High aspect ratio ({aspect_ratio:.2f}). Check image composition.")
            
            # Check if image is mostly one color (potential issue)
            if len(image.shape) == 3:
                std_dev = np.std(image, axis=(0, 1))
                if np.any(std_dev < 10):
                    result["warnings"].append("Low color variation detected")
            
            # Quick quality checks
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Check brightness
            brightness = np.mean(gray)
            if brightness < config.MIN_BRIGHTNESS:
                result["warnings"].append(f"Low brightness: {brightness:.1f}")
            elif brightness > config.MAX_BRIGHTNESS:
                result["warnings"].append(f"High brightness: {brightness:.1f}")
            
            # Check blur (quick laplacian)
            blur = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur < 50:
                result["warnings"].append(f"Image may be blurry: {blur:.1f}")
            
        except Exception as e:
            result["valid"] = False
            result["error"] = str(e)
        
        return result
    
    def create_validation_report(self, results: Dict) -> str:
        """Generate a human-readable validation report"""
        report_lines = [
            f"Validation Report for User: {results['user_id']}",
            f"Timestamp: {results['timestamp']}",
            "=" * 60,
            f"Overall Status: {'✅ PASS' if results['overall_valid'] else '❌ FAIL'}",
            ""
        ]
        
        # View details
        report_lines.append("View Details:")
        for view, view_data in results['views'].items():
            if view_data.get('valid'):
                status = "✅"
                details = f"{view_data['dimensions']['width']}x{view_data['dimensions']['height']}"
                if 'status' in view_data:
                    details += f" ({view_data['status']})"
            else:
                status = "❌"
                details = view_data.get('error', 'Unknown error')
            
            report_lines.append(f"  {status} {view:10} - {details}")
            
            # Add warnings
            for warning in view_data.get('warnings', []):
                report_lines.append(f"       ⚠️  {warning}")
        
        # Issues
        if results['issues']:
            report_lines.extend(["", "Critical Issues:"])
            for issue in results['issues']:
                report_lines.append(f"  ❌ {issue}")
        
        # Warnings
        if results['warnings']:
            report_lines.extend(["", "Warnings:"])
            for warning in results['warnings']:
                report_lines.append(f"  ⚠️  {warning}")
        
        return "\n".join(report_lines)
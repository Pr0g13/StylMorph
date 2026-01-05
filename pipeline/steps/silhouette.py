"""
Silhouette extraction step
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from scipy import ndimage

from ..utils.image_io import safe_imread, safe_imwrite
from ..utils.errors import ValidationError
from ..utils.logger import logger
from ..config import config

class SilhouetteExtractor:
    """Extract binary silhouette from segmented images"""
    
    def __init__(self):
        self.logger = logger.get_logger()
    
    def extract_silhouette(self, image_path: Path, mask_path: Optional[Path] = None,
                          user_id: str = None, view: str = None) -> np.ndarray:
        """Extract silhouette from image (with optional mask)"""
        self.logger.info(f"Extracting silhouette for {view} view")
        
        try:
            # Read image
            image = safe_imread(image_path)
            
            # If mask is provided, use it directly
            if mask_path and mask_path.exists():
                mask = safe_imread(mask_path)
                if len(mask.shape) == 3:
                    mask = cv2.cvtColor(mask, cv2.COLOR_RGB2GRAY)
                
                silhouette = self._process_mask_to_silhouette(mask)
            
            else:
                # Extract silhouette from image
                if len(image.shape) == 3:
                    if image.shape[2] == 4:  # RGBA
                        silhouette = image[:, :, 3]
                    else:  # RGB
                        silhouette = self._extract_from_rgb(image)
                else:  # Grayscale
                    silhouette = self._extract_from_grayscale(image)
            
            # Validate silhouette
            self._validate_silhouette(silhouette, view)
            
            # Clean silhouette
            silhouette = self._clean_silhouette(silhouette)
            
            return silhouette
            
        except Exception as e:
            raise ValidationError(f"Silhouette extraction failed for {view}: {str(e)}")
    
    def _extract_from_rgb(self, image: np.ndarray) -> np.ndarray:
        """Extract silhouette from RGB image"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Use adaptive thresholding
        silhouette = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        return silhouette
    
    def _extract_from_grayscale(self, image: np.ndarray) -> np.ndarray:
        """Extract silhouette from grayscale image"""
        # Use Otsu's thresholding
        _, silhouette = cv2.threshold(
            image, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )
        
        return silhouette
    
    def _process_mask_to_silhouette(self, mask: np.ndarray) -> np.ndarray:
        """Convert mask to clean silhouette"""
        # Threshold mask
        _, silhouette = cv2.threshold(mask, config.SILHOUETTE_THRESHOLD, 255, cv2.THRESH_BINARY)
        
        return silhouette
    
    def _clean_silhouette(self, silhouette: np.ndarray) -> np.ndarray:
        """Clean and refine silhouette"""
        # Convert to binary
        _, binary = cv2.threshold(silhouette, 127, 255, cv2.THRESH_BINARY)
        
        # Remove small noise
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        
        # Fill holes
        cleaned = ndimage.binary_fill_holes(cleaned).astype(np.uint8) * 255
        
        # Smooth edges
        cleaned = cv2.GaussianBlur(cleaned, (5, 5), 0)
        _, cleaned = cv2.threshold(cleaned, 127, 255, cv2.THRESH_BINARY)
        
        return cleaned
    
    def _validate_silhouette(self, silhouette: np.ndarray, view: str):
        """Validate silhouette quality"""
        # Calculate coverage
        total_pixels = silhouette.size
        person_pixels = np.sum(silhouette > 0)
        coverage = person_pixels / total_pixels
        
        self.logger.info(f"{view} silhouette coverage: {coverage:.2%}")
        
        if coverage < config.MIN_SILHOUETTE_COVERAGE:
            raise ValidationError(
                f"Silhouette coverage too low ({coverage:.2%} < {config.MIN_SILHOUETTE_COVERAGE:.0%})"
            )
        
        if coverage > config.MAX_SILHOUETTE_COVERAGE:
            raise ValidationError(
                f"Silhouette coverage too high ({coverage:.2%} > {config.MAX_SILHOUETTE_COVERAGE:.0%})"
            )
        
        # Check if silhouette is connected
        num_labels, labels = cv2.connectedComponents(silhouette)
        if num_labels - 1 > 1:  # Subtract 1 for background
            self.logger.warning(f"{view} silhouette has {num_labels - 1} disconnected components")
    
    def save_silhouette(self, silhouette: np.ndarray, user_id: str, 
                       view: str, output_dir: Path) -> Path:
        """Save silhouette to file"""
        user_output_dir = output_dir / user_id / "silhouettes"
        user_output_dir.mkdir(parents=True, exist_ok=True)
        
        silhouette_path = user_output_dir / f"{view}_silhouette.png"
        safe_imwrite(silhouette, silhouette_path)
        
        self.logger.info(f"Saved silhouette for {view} view")
        
        return silhouette_path
    
    def calculate_silhouette_metrics(self, silhouette: np.ndarray) -> Dict:
        """Calculate silhouette quality metrics"""
        metrics = {}
        
        # Basic statistics
        metrics["total_pixels"] = silhouette.size
        metrics["person_pixels"] = np.sum(silhouette > 0)
        metrics["coverage"] = metrics["person_pixels"] / metrics["total_pixels"]
        
        # Calculate centroid
        y_coords, x_coords = np.where(silhouette > 0)
        if len(x_coords) > 0 and len(y_coords) > 0:
            metrics["centroid_x"] = float(np.mean(x_coords))
            metrics["centroid_y"] = float(np.mean(y_coords))
        else:
            metrics["centroid_x"] = 0.0
            metrics["centroid_y"] = 0.0
        
        # Calculate bounding box
        if len(x_coords) > 0:
            metrics["bbox"] = {
                "x_min": float(np.min(x_coords)),
                "x_max": float(np.max(x_coords)),
                "y_min": float(np.min(y_coords)),
                "y_max": float(np.max(y_coords)),
                "width": float(np.max(x_coords) - np.min(x_coords)),
                "height": float(np.max(y_coords) - np.min(y_coords))
            }
        
        # Calculate compactness (area / perimeter^2)
        contours, _ = cv2.findContours(silhouette, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            area = cv2.contourArea(contours[0])
            perimeter = cv2.arcLength(contours[0], True)
            metrics["compactness"] = area / (perimeter ** 2) if perimeter > 0 else 0
        else:
            metrics["compactness"] = 0
        
        return metrics
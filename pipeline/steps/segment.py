"""
Background segmentation step
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
import warnings

from ..utils.image_io import safe_imread, safe_imwrite
from ..utils.errors import SegmentationError
from ..utils.logger import logger
from ..config import config

class BackgroundSegmenter:
    """Remove background from person images"""
    
    def __init__(self):
        self.logger = logger.get_logger()
        self._setup_segmentation_model()
    
    def _setup_segmentation_model(self):
        """Initialize segmentation model based on config"""
        self.model_type = config.SEGMENTATION_MODEL
        
        if self.model_type == "rembg":
            try:
                from rembg import remove
                self.segment_fn = self._segment_rembg
                self.logger.info("Using Rembg for segmentation")
            except ImportError:
                self.logger.warning("Rembg not available, falling back to GrabCut")
                self.model_type = "grabcut"
                self.segment_fn = self._segment_grabcut
        
        elif self.model_type == "u2net":
            try:
                # Placeholder for U^2-Net implementation
                # You would need to implement or import U^2-Net
                self.logger.warning("U^2-Net not implemented, using GrabCut")
                self.model_type = "grabcut"
                self.segment_fn = self._segment_grabcut
            except:
                self.model_type = "grabcut"
                self.segment_fn = self._segment_grabcut
        
        else:  # grabcut
            self.segment_fn = self._segment_grabcut
            self.logger.info("Using GrabCut for segmentation")
    
    def process_view(self, image_path: Path, user_id: str, view: str, 
                    output_dir: Path) -> Tuple[Path, Path]:
        """Process a single view and save results"""
        self.logger.info(f"Segmenting {view} view for user {user_id}")
        
        try:
            # Read image
            image = safe_imread(image_path)
            
            # Remove background
            foreground, mask = self.segment_fn(image)
            
            # Post-process mask
            mask = self._post_process_mask(mask)
            
            # Create RGBA image with transparency
            rgba = self._create_transparent_image(image, mask)
            
            # Save results
            output_paths = self._save_segmentation_results(
                rgba, mask, user_id, view, output_dir
            )
            
            return output_paths
            
        except Exception as e:
            raise SegmentationError(f"Failed to segment {view} view: {str(e)}")
    
    def _segment_rembg(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Use rembg for background removal"""
        from rembg import remove
        
        # rembg expects RGB
        if len(image.shape) == 3 and image.shape[2] == 4:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif len(image.shape) == 3:
            image_rgb = image
        else:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        # Remove background
        result = remove(image_rgb)
        
        # Extract mask from alpha channel
        if result.shape[2] == 4:
            mask = result[:, :, 3]
            foreground = result[:, :, :3]
        else:
            mask = np.ones(result.shape[:2], dtype=np.uint8) * 255
            foreground = result
        
        return foreground, mask
    
    def _segment_grabcut(self, image: np.ndarray, iterations: int = 5) -> Tuple[np.ndarray, np.ndarray]:
        """Use GrabCut algorithm for segmentation"""
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif len(image.shape) == 3 and image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        
        h, w = image.shape[:2]
        
        # Initialize mask
        mask = np.zeros((h, w), dtype=np.uint8)
        
        # Define rectangle (assume person is centered)
        margin_w, margin_h = int(w * 0.1), int(h * 0.1)
        rect = (margin_w, margin_h, w - 2 * margin_w, h - 2 * margin_h)
        
        # Initialize models
        bgd_model = np.zeros((1, 65), dtype=np.float64)
        fgd_model = np.zeros((1, 65), dtype=np.float64)
        
        # Apply GrabCut
        cv2.grabCut(image, mask, rect, bgd_model, fgd_model, iterations, cv2.GC_INIT_WITH_RECT)
        
        # Create binary mask
        binary_mask = np.where((mask == cv2.GC_PR_FGD) | (mask == cv2.GC_FGD), 255, 0).astype(np.uint8)
        
        # Get foreground
        foreground = cv2.bitwise_and(image, image, mask=binary_mask)
        
        return foreground, binary_mask
    
    def _post_process_mask(self, mask: np.ndarray) -> np.ndarray:
        """Clean and refine segmentation mask"""
        # Ensure binary
        if mask.dtype != np.uint8:
            mask = (mask * 255).astype(np.uint8)
        
        _, mask = cv2.threshold(mask, config.SEGMENTATION_THRESHOLD * 255, 255, cv2.THRESH_BINARY)
        
        # Morphological operations
        kernel_size = max(3, min(mask.shape[:2]) // 100)  # Adaptive kernel size
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        
        # Close small holes
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Remove small objects
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Fill holes
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            mask = np.zeros_like(mask)
            cv2.drawContours(mask, [largest_contour], -1, 255, -1)
        
        return mask
    
    def _create_transparent_image(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Create RGBA image with transparency"""
        if len(image.shape) == 2:  # Grayscale
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif len(image.shape) == 3 and image.shape[2] == 4:  # RGBA
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        
        # Create RGBA
        rgba = cv2.cvtColor(image, cv2.COLOR_RGB2RGBA)
        rgba[:, :, 3] = mask
        
        return rgba
    
    def _save_segmentation_results(self, rgba: np.ndarray, mask: np.ndarray,
                                 user_id: str, view: str, output_dir: Path) -> Tuple[Path, Path]:
        """Save segmentation results"""
        user_output_dir = output_dir / user_id
        user_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save directories
        segmented_dir = user_output_dir / "segmented"
        mask_dir = user_output_dir / "masks"
        segmented_dir.mkdir(exist_ok=True)
        mask_dir.mkdir(exist_ok=True)
        
        # Save segmented image (RGBA)
        segmented_path = segmented_dir / f"{view}_segmented.png"
        safe_imwrite(rgba, segmented_path)
        
        # Save mask
        mask_path = mask_dir / f"{view}_mask.png"
        safe_imwrite(mask, mask_path)
        
        self.logger.info(f"Saved segmentation results for {view} view")
        
        return segmented_path, mask_path
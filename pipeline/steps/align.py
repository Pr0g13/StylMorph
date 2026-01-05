"""
Multi-view alignment step
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json

from ..utils.image_io import safe_imread, safe_imwrite
from ..utils.errors import AlignmentError
from ..utils.logger import logger
from ..config import config

class ViewAligner:
    """Align multiple views of a person"""
    
    def __init__(self):
        self.logger = logger.get_logger()
    
    def align_views(self, user_id: str, views_data: Dict, output_dir: Path) -> Dict:
        """Align all views based on reference view"""
        self.logger.info(f"Aligning views for user {user_id}")
        
        try:
            # Load reference view data
            ref_view = config.REFERENCE_VIEW
            if ref_view not in views_data:
                raise AlignmentError(f"Reference view '{ref_view}' not found")
            
            ref_data = views_data[ref_view]
            
            # Calculate alignment parameters for each view
            alignment_params = {}
            
            for view, view_data in views_data.items():
                if view == ref_view:
                    # Reference view doesn't need transformation
                    alignment_params[view] = {
                        "transformation": "identity",
                        "scale": 1.0,
                        "translation": [0, 0],
                        "rotation": 0
                    }
                else:
                    # Align to reference
                    params = self._align_to_reference(view_data, ref_data, view, ref_view)
                    alignment_params[view] = params
            
            # Apply alignments and save results
            aligned_images = self._apply_alignments(views_data, alignment_params, user_id, output_dir)
            
            # Save alignment metadata
            metadata = self._save_alignment_metadata(alignment_params, user_id, output_dir)
            
            return {
                "alignment_params": alignment_params,
                "aligned_images": aligned_images,
                "metadata_path": metadata
            }
            
        except Exception as e:
            raise AlignmentError(f"View alignment failed: {str(e)}")
    
    def _align_to_reference(self, view_data: Dict, ref_data: Dict, 
                           view: str, ref_view: str) -> Dict:
        """Calculate alignment parameters to match reference view"""
        
        if config.ALIGNMENT_METHOD == "keypoints" and "keypoints" in view_data and "keypoints" in ref_data:
            # Use keypoints for alignment
            return self._align_by_keypoints(view_data, ref_data, view, ref_view)
        else:
            # Use centroids for alignment
            return self._align_by_centroids(view_data, ref_data, view, ref_view)
    
    def _align_by_keypoints(self, view_data: Dict, ref_data: Dict, 
                           view: str, ref_view: str) -> Dict:
        """Align using pose keypoints"""
        view_kps = view_data.get("keypoints", {})
        ref_kps = ref_data.get("keypoints", {})
        
        # Find common keypoints with good visibility
        common_kps = []
        for kp_name in config.REQUIRED_KEYPOINTS:
            if (kp_name in view_kps and kp_name in ref_kps and
                view_kps[kp_name]["visibility"] > 0.5 and
                ref_kps[kp_name]["visibility"] > 0.5):
                common_kps.append((kp_name, view_kps[kp_name], ref_kps[kp_name]))
        
        if len(common_kps) < 3:
            self.logger.warning(f"Insufficient common keypoints for {view}, using centroid alignment")
            return self._align_by_centroids(view_data, ref_data, view, ref_view)
        
        # Prepare points for affine transformation
        src_points = []
        dst_points = []
        
        for kp_name, view_kp, ref_kp in common_kps:
            src_points.append([view_kp["x"], view_kp["y"]])
            dst_points.append([ref_kp["x"], ref_kp["y"]])
        
        src_points = np.array(src_points, dtype=np.float32)
        dst_points = np.array(dst_points, dtype=np.float32)
        
        # Calculate affine transformation
        try:
            # Use RANSAC for robust estimation
            M, inliers = cv2.estimateAffinePartial2D(
                src_points, dst_points, 
                method=cv2.RANSAC,
                ransacReprojThreshold=5.0
            )
            
            if M is None:
                raise AlignmentError("Affine transformation estimation failed")
            
            # Extract parameters
            scale = np.sqrt(M[0, 0]**2 + M[0, 1]**2)
            rotation = np.arctan2(M[1, 0], M[0, 0])
            translation = [M[0, 2], M[1, 2]]
            
            return {
                "transformation": "affine",
                "matrix": M.tolist(),
                "scale": float(scale),
                "rotation": float(np.degrees(rotation)),
                "translation": translation,
                "method": "keypoints",
                "num_matching_points": len(common_kps),
                "inlier_ratio": float(np.mean(inliers)) if inliers is not None else 1.0
            }
            
        except Exception as e:
            self.logger.warning(f"Keypoint alignment failed for {view}: {str(e)}")
            return self._align_by_centroids(view_data, ref_data, view, ref_view)
    
    def _align_by_centroids(self, view_data: Dict, ref_data: Dict, 
                           view: str, ref_view: str) -> Dict:
        """Align using silhouette centroids"""
        view_centroid = view_data.get("centroid", {"x": 0, "y": 0})
        ref_centroid = ref_data.get("centroid", {"x": 0, "y": 0})
        
        # Calculate translation to match centroids
        tx = ref_centroid["x"] - view_centroid["x"]
        ty = ref_centroid["y"] - view_centroid["y"]
        
        # Calculate scale based on bounding boxes if available
        scale = 1.0
        if "bbox" in view_data and "bbox" in ref_data:
            # Scale to match heights
            view_height = view_data["bbox"]["height"]
            ref_height = ref_data["bbox"]["height"]
            
            if view_height > 0:
                scale = ref_height / view_height
                scale = np.clip(scale, 0.5, 2.0)  # Limit scaling
        
        return {
            "transformation": "similarity",
            "scale": float(scale),
            "rotation": 0.0,
            "translation": [float(tx), float(ty)],
            "method": "centroid",
            "note": "Using centroid-based alignment"
        }
    
    def _apply_alignments(self, views_data: Dict, alignment_params: Dict,
                         user_id: str, output_dir: Path) -> Dict:
        """Apply alignment transformations to images"""
        aligned_images = {}
        
        for view, params in alignment_params.items():
            if view not in views_data:
                continue
            
            view_data = views_data[view]
            image_path = Path(view_data.get("image_path", ""))
            
            if not image_path.exists():
                self.logger.warning(f"Image not found for {view}, skipping alignment")
                continue
            
            # Read image
            image = safe_imread(image_path)
            h, w = image.shape[:2]
            
            # Apply transformation
            if params["transformation"] == "affine" and "matrix" in params:
                M = np.array(params["matrix"], dtype=np.float32)
                aligned = cv2.warpAffine(
                    image, M, (w, h),
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=0
                )
            else:
                # Apply similarity transformation (scale + translation)
                scale = params["scale"]
                tx, ty = params["translation"]
                
                # Create transformation matrix
                M = np.float32([[scale, 0, tx], [0, scale, ty]])
                aligned = cv2.warpAffine(
                    image, M, (w, h),
                    flags=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=0
                )
            
            # Save aligned image
            aligned_dir = output_dir / user_id / "aligned"
            aligned_dir.mkdir(parents=True, exist_ok=True)
            
            aligned_path = aligned_dir / f"{view}_aligned.png"
            safe_imwrite(aligned, aligned_path)
            
            aligned_images[view] = str(aligned_path)
            
            self.logger.info(f"Aligned {view} view")
        
        return aligned_images
    
    def _save_alignment_metadata(self, alignment_params: Dict, 
                                user_id: str, output_dir: Path) -> Path:
        """Save alignment parameters to JSON"""
        metadata_dir = output_dir / user_id / "metadata"
        metadata_dir.mkdir(parents=True, exist_ok=True)
        
        metadata_path = metadata_dir / "alignment.json"
        
        with open(metadata_path, 'w') as f:
            json.dump(alignment_params, f, indent=2)
        
        self.logger.info(f"Saved alignment metadata")
        
        return metadata_path
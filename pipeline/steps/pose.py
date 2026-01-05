"""
Pose detection step
"""



import cv2
import numpy as np
from pathlib import Path
import json
from typing import Dict, List, Tuple, Optional
import mediapipe as mp

from ..utils.image_io import safe_imread
from ..utils.errors import PoseDetectionError
from ..utils.logger import logger
from ..config import config

class PoseDetector:
    """Detect human pose keypoints"""
    
    # MediaPipe pose connections
    POSE_CONNECTIONS = mp.solutions.pose.POSE_CONNECTIONS
    
    # Keypoint mapping
    KEYPOINT_NAMES = [
        'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
        'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear',
        'right_ear', 'mouth_left', 'mouth_right', 'left_shoulder',
        'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist',
        'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
        'right_index', 'left_thumb', 'right_thumb', 'left_hip',
        'right_hip', 'left_knee', 'right_knee', 'left_ankle',
        'right_ankle', 'left_heel', 'right_heel', 'left_foot_index',
        'right_foot_index'
    ]
    
    def __init__(self):
        self.logger = logger.get_logger()
        self._setup_pose_model()
    
    def _setup_pose_model(self):
        """Initialize pose detection model"""
        if config.POSE_MODEL == "mediapipe":
            self.pose = mp.solutions.pose.Pose(
                static_image_mode=True,
                model_complexity=2,
                enable_segmentation=True,
                min_detection_confidence=config.MIN_POSE_CONFIDENCE
            )
            self.detect_fn = self._detect_with_mediapipe
            self.logger.info("Using MediaPipe for pose detection")
        else:
            raise PoseDetectionError(f"Unsupported pose model: {config.POSE_MODEL}")
    
    def detect_pose(self, image_path: Path, view: str) -> Dict:
        """Detect pose in a single image"""
        self.logger.info(f"Detecting pose for {view} view")
        
        try:
            # Read image
            image = safe_imread(image_path)
            h, w = image.shape[:2]
            
            # Detect pose
            keypoints, segmentation_mask = self.detect_fn(image)
            
            # Convert to normalized coordinates
            normalized_kps = self._normalize_keypoints(keypoints, w, h)
            
            # Check if required keypoints are detected
            missing_kps = self._check_required_keypoints(normalized_kps)
            if missing_kps:
                self.logger.warning(f"Missing keypoints for {view}: {missing_kps}")
            
            # Calculate pose metrics
            pose_metrics = self._calculate_pose_metrics(normalized_kps)
            
            # Prepare result
            result = {
                "view": view,
                "image_dimensions": {"width": w, "height": h},
                "keypoints": normalized_kps,
                "segmentation_mask": segmentation_mask.tolist() if segmentation_mask is not None else None,
                "pose_metrics": pose_metrics,
                "missing_keypoints": missing_kps,
                "confidence": pose_metrics.get("overall_confidence", 0.0)
            }
            
            return result
            
        except Exception as e:
            raise PoseDetectionError(f"Pose detection failed for {view}: {str(e)}")
    
    def _detect_with_mediapipe(self, image: np.ndarray) -> Tuple[Dict, Optional[np.ndarray]]:
        """Detect pose using MediaPipe"""
        # Convert to RGB
        if len(image.shape) == 2:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif len(image.shape) == 3 and image.shape[2] == 4:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        else:
            image_rgb = image
        
        # Detect pose
        results = self.pose.process(image_rgb)
        
        keypoints = {}
        segmentation_mask = None
        
        if results.pose_landmarks:
            # Extract keypoints
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                keypoints[self.KEYPOINT_NAMES[idx]] = {
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z,
                    "visibility": landmark.visibility,
                    "presence": landmark.presence if hasattr(landmark, 'presence') else 1.0
                }
            
            # Get segmentation mask if available
            if results.segmentation_mask is not None:
                segmentation_mask = (results.segmentation_mask * 255).astype(np.uint8)
        
        return keypoints, segmentation_mask
    
    def _normalize_keypoints(self, keypoints: Dict, image_width: int, image_height: int) -> Dict:
        """Convert normalized coordinates to pixel coordinates"""
        normalized = {}
        
        for name, kp in keypoints.items():
            normalized[name] = {
                "x": kp["x"] * image_width,
                "y": kp["y"] * image_height,
                "z": kp.get("z", 0),
                "visibility": kp.get("visibility", 0),
                "presence": kp.get("presence", 0)
            }
        
        return normalized
    
    def _check_required_keypoints(self, keypoints: Dict) -> List[str]:
        """Check if required keypoints are detected"""
        missing = []
        
        for kp_name in config.REQUIRED_KEYPOINTS:
            if kp_name not in keypoints:
                missing.append(kp_name)
            elif keypoints[kp_name]["visibility"] < config.MIN_POSE_CONFIDENCE:
                missing.append(f"{kp_name} (low confidence)")
        
        return missing
    
    def _calculate_pose_metrics(self, keypoints: Dict) -> Dict:
        """Calculate pose metrics and confidence scores"""
        metrics = {
            "overall_confidence": 0.0,
            "visible_keypoints": 0,
            "total_keypoints": len(keypoints),
            "symmetry_score": 0.0,
            "pose_quality": 0.0
        }
        
        if not keypoints:
            return metrics
        
        # Calculate overall confidence
        visibilities = [kp["visibility"] for kp in keypoints.values()]
        metrics["overall_confidence"] = np.mean(visibilities) if visibilities else 0.0
        metrics["visible_keypoints"] = sum(1 for v in visibilities if v > config.MIN_POSE_CONFIDENCE)
        
        # Calculate symmetry score (left-right consistency)
        symmetry_pairs = [
            ("left_shoulder", "right_shoulder"),
            ("left_hip", "right_hip"),
            ("left_knee", "right_knee"),
            ("left_ankle", "right_ankle")
        ]
        
        symmetry_scores = []
        for left, right in symmetry_pairs:
            if left in keypoints and right in keypoints:
                left_kp = keypoints[left]
                right_kp = keypoints[right]
                
                if left_kp["visibility"] > 0.5 and right_kp["visibility"] > 0.5:
                    # Check horizontal alignment
                    y_diff = abs(left_kp["y"] - right_kp["y"])
                    symmetry_scores.append(1.0 - min(y_diff / 100, 1.0))
        
        metrics["symmetry_score"] = np.mean(symmetry_scores) if symmetry_scores else 0.0
        
        # Calculate pose quality (combination of metrics)
        metrics["pose_quality"] = (
            metrics["overall_confidence"] * 0.4 +
            (metrics["visible_keypoints"] / metrics["total_keypoints"]) * 0.3 +
            metrics["symmetry_score"] * 0.3
        )
        
        return metrics
    
    def save_pose_results(self, pose_data: Dict, user_id: str, output_dir: Path) -> Path:
        """Save pose detection results"""
        user_output_dir = output_dir / user_id / "pose"
        user_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save JSON data
        pose_path = user_output_dir / f"{pose_data['view']}_pose.json"
        with open(pose_path, 'w') as f:
            json.dump(pose_data, f, indent=2)
        
        # Create visualization if needed
        if config.SAVE_INTERMEDIATE:
            self._create_pose_visualization(pose_data, user_output_dir)
        
        self.logger.info(f"Saved pose results for {pose_data['view']} view")
        
        return pose_path
    
    def _create_pose_visualization(self, pose_data: Dict, output_dir: Path):
        """Create visualization of pose keypoints"""
        view = pose_data["view"]
        w, h = pose_data["image_dimensions"]["width"], pose_data["image_dimensions"]["height"]
        
        # Create blank image
        vis_image = np.zeros((h, w, 3), dtype=np.uint8)
        
        # Draw keypoints
        for name, kp in pose_data["keypoints"].items():
            if kp["visibility"] > config.MIN_POSE_CONFIDENCE:
                x, y = int(kp["x"]), int(kp["y"])
                cv2.circle(vis_image, (x, y), 5, (0, 255, 0), -1)
                cv2.putText(vis_image, name.split('_')[0], (x+10, y-10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Draw connections
        for connection in self.POSE_CONNECTIONS:
            start_idx, end_idx = connection
            start_name = self.KEYPOINT_NAMES[start_idx]
            end_name = self.KEYPOINT_NAMES[end_idx]
            
            if start_name in pose_data["keypoints"] and end_name in pose_data["keypoints"]:
                start_kp = pose_data["keypoints"][start_name]
                end_kp = pose_data["keypoints"][end_name]
                
                if start_kp["visibility"] > 0.3 and end_kp["visibility"] > 0.3:
                    start_pt = (int(start_kp["x"]), int(start_kp["y"]))
                    end_pt = (int(end_kp["x"]), int(end_kp["y"]))
                    cv2.line(vis_image, start_pt, end_pt, (255, 0, 0), 2)
        
        # Save visualization
        vis_path = output_dir / f"{view}_pose_vis.png"
        cv2.imwrite(str(vis_path), cv2.cvtColor(vis_image, cv2.COLOR_RGB2BGR))
"""
Simplified configuration without dataclass
"""
from pathlib import Path
from typing import List, Tuple, Dict, Any
import yaml

class PipelineConfig:
    """Pipeline configuration settings"""
    
    def __init__(self):
        # Paths
        self.UPLOADS_DIR = Path("uploads")
        self.PROCESSED_DIR = Path("processed")
        self.AVATARS_DIR = Path("avatars")
        
        # Views
        self.REQUIRED_VIEWS = ["front", "left", "right"]
        self.ALL_VIEWS = ["front", "back", "left", "right"]
        
        # Image parameters
        self.MIN_IMAGE_SIZE = (512, 512)
        self.MAX_IMAGE_SIZE = (2048, 2048)
        self.ACCEPTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp"]
        self.MAX_FILE_SIZE_MB = 10
        
        # Segmentation
        self.SEGMENTATION_MODEL = "grabcut"  # Use grabcut as fallback (no rembg needed)
        self.SEGMENTATION_THRESHOLD = 0.5
        self.MASK_DILATION_KERNEL = 3
        self.MASK_EROSION_KERNEL = 3
        
        # Pose detection
        self.POSE_MODEL = "mediapipe"
        self.MIN_POSE_CONFIDENCE = 0.5
        self.REQUIRED_KEYPOINTS = [
            "nose", "left_shoulder", "right_shoulder", 
            "left_hip", "right_hip", "left_ankle", "right_ankle"
        ]
        
        # Silhouette
        self.SILHOUETTE_THRESHOLD = 128
        self.MIN_SILHOUETTE_COVERAGE = 0.3
        self.MAX_SILHOUETTE_COVERAGE = 0.9
        
        # Alignment
        self.REFERENCE_VIEW = "front"
        self.ALIGNMENT_TARGET_HEIGHT = 1024
        self.MAINTAIN_ASPECT_RATIO = True
        self.ALIGNMENT_METHOD = "centroid"  # Use centroid instead of keypoints
        
        # Normalization
        self.NORMALIZATION_METHOD = "bounding_box"
        self.TARGET_HEIGHT = 512  # Smaller for testing
        self.PADDING_RATIO = 0.1
        
        # Quality metrics
        self.MIN_BRIGHTNESS = 40
        self.MAX_BRIGHTNESS = 220
        self.MIN_CONTRAST = 20.0
        self.MAX_BLUR_THRESHOLD = 100.0
        self.MIN_SHARPNESS = 0.05
        self.MIN_UNIFORMITY_SCORE = 0.7
        
        # Processing flags
        self.SAVE_INTERMEDIATE = True
        self.OVERWRITE_EXISTING = False
        self.PARALLEL_PROCESSING = False  # Disable parallel for testing
        self.MAX_WORKERS = 1
    
    @classmethod
    def from_yaml(cls, yaml_path: Path) -> "PipelineConfig":
        """Load configuration from YAML file"""
        config = cls()
        if yaml_path.exists():
            with open(yaml_path, 'r') as f:
                config_dict = yaml.safe_load(f)
            
            for key, value in config_dict.items():
                if hasattr(config, key):
                    # Convert paths
                    if key.endswith('_DIR') and isinstance(value, str):
                        setattr(config, key, Path(value))
                    else:
                        setattr(config, key, value)
        
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            k: v for k, v in self.__dict__.items() 
            if not k.startswith('_')
        }

# Global configuration instance
config = PipelineConfig()
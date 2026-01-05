"""
Quality assessment step
"""
import cv2
import numpy as np
from pathlib import Path
import json
from datetime import datetime
from typing import Dict, List, Tuple
from scipy import stats

from ..utils.image_io import safe_imread
from ..utils.errors import QualityError
from ..utils.logger import logger
from ..config import config

class QualityAssessor:
    """Assess quality of processed images"""
    
    def __init__(self):
        self.logger = logger.get_logger()
    
    def assess_quality(self, user_id: str, views_data: Dict, output_dir: Path) -> Dict:
        """Assess quality of all processed views"""
        self.logger.info(f"Assessing quality for user {user_id}")
        
        try:
            quality_results = {}
            overall_scores = {}
            
            for view, view_data in views_data.items():
                if "image_path" not in view_data:
                    continue
                
                image_path = Path(view_data["image_path"])
                if not image_path.exists():
                    self.logger.warning(f"Image not found for {view}, skipping quality check")
                    continue
                
                # Assess quality for this view
                quality = self._assess_single_image(image_path, view, view_data)
                quality_results[view] = quality
                
                # Calculate overall score for this view
                overall_scores[view] = quality.get("overall_score", 0.0)
            
            # Calculate multi-view consistency
            consistency_metrics = self._assess_multi_view_consistency(quality_results, views_data)
            
            # Generate overall assessment
            overall_assessment = self._generate_overall_assessment(
                quality_results, overall_scores, consistency_metrics
            )
            
            # Save quality report
            report_path = self._save_quality_report(
                quality_results, overall_assessment, user_id, output_dir
            )
            
            return {
                "quality_results": quality_results,
                "overall_assessment": overall_assessment,
                "consistency_metrics": consistency_metrics,
                "report_path": report_path
            }
            
        except Exception as e:
            raise QualityError(f"Quality assessment failed: {str(e)}")
    
    def _assess_single_image(self, image_path: Path, view: str, 
                            view_data: Dict) -> Dict:
        """Assess quality of a single image"""
        image = safe_imread(image_path)
        
        quality_metrics = {
            "view": view,
            "image_path": str(image_path),
            "timestamp": datetime.now().isoformat(),
            "basic_metrics": {},
            "technical_metrics": {},
            "composition_metrics": {},
            "issues": [],
            "warnings": [],
            "overall_score": 0.0
        }
        
        # Basic metrics
        quality_metrics["basic_metrics"] = self._calculate_basic_metrics(image)
        
        # Technical metrics
        quality_metrics["technical_metrics"] = self._calculate_technical_metrics(image)
        
        # Composition metrics
        quality_metrics["composition_metrics"] = self._calculate_composition_metrics(
            image, view_data
        )
        
        # Check for issues
        quality_metrics["issues"] = self._check_issues(
            quality_metrics["basic_metrics"],
            quality_metrics["technical_metrics"],
            quality_metrics["composition_metrics"]
        )
        
        # Check for warnings
        quality_metrics["warnings"] = self._check_warnings(
            quality_metrics["basic_metrics"],
            quality_metrics["technical_metrics"],
            quality_metrics["composition_metrics"]
        )
        
        # Calculate overall score
        quality_metrics["overall_score"] = self._calculate_overall_score(quality_metrics)
        
        return quality_metrics
    
    def _calculate_basic_metrics(self, image: np.ndarray) -> Dict:
        """Calculate basic image metrics"""
        h, w = image.shape[:2]
        
        metrics = {
            "dimensions": {"width": w, "height": h},
            "aspect_ratio": h / w,
            "total_pixels": h * w
        }
        
        if len(image.shape) == 3:
            metrics["channels"] = image.shape[2]
        else:
            metrics["channels"] = 1
        
        return metrics
    
    def _calculate_technical_metrics(self, image: np.ndarray) -> Dict:
        """Calculate technical quality metrics"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Brightness
        brightness = np.mean(gray)
        
        # Contrast (standard deviation)
        contrast = np.std(gray)
        
        # Sharpness (Laplacian variance)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Noise estimation (using median absolute deviation)
        median = np.median(gray)
        mad = np.median(np.abs(gray - median))
        noise_level = mad / median if median > 0 else 0
        
        # Dynamic range
        min_val, max_val = np.min(gray), np.max(gray)
        dynamic_range = max_val - min_val
        
        # Histogram entropy (information content)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / hist.sum()
        entropy = -np.sum(hist * np.log2(hist + 1e-10))
        
        return {
            "brightness": float(brightness),
            "contrast": float(contrast),
            "sharpness": float(sharpness),
            "noise_level": float(noise_level),
            "dynamic_range": float(dynamic_range),
            "entropy": float(entropy),
            "min_intensity": float(min_val),
            "max_intensity": float(max_val)
        }
    
    def _calculate_composition_metrics(self, image: np.ndarray, view_data: Dict) -> Dict:
        """Calculate composition and content metrics"""
        metrics = {}
        
        # Silhouette metrics if available
        if "silhouette_metrics" in view_data:
            silhouette_metrics = view_data["silhouette_metrics"]
            metrics["silhouette_coverage"] = silhouette_metrics.get("coverage", 0)
            metrics["silhouette_compactness"] = silhouette_metrics.get("compactness", 0)
        
        # Pose metrics if available
        if "pose_metrics" in view_data:
            pose_metrics = view_data["pose_metrics"]
            metrics["pose_confidence"] = pose_metrics.get("overall_confidence", 0)
            metrics["pose_quality"] = pose_metrics.get("pose_quality", 0)
        
        # Center of mass
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        moments = cv2.moments(gray)
        if moments["m00"] > 0:
            cx = moments["m10"] / moments["m00"]
            cy = moments["m01"] / moments["m00"]
            metrics["center_of_mass"] = {"x": float(cx), "y": float(cy)}
            
            # Distance from image center (normalized)
            h, w = gray.shape
            dist_from_center = np.sqrt((cx - w/2)**2 + (cy - h/2)**2)
            max_dist = np.sqrt((w/2)**2 + (h/2)**2)
            metrics["centering_score"] = 1.0 - (dist_from_center / max_dist)
        else:
            metrics["center_of_mass"] = {"x": 0, "y": 0}
            metrics["centering_score"] = 0.0
        
        # Rule of thirds compliance
        h, w = gray.shape
        third_w, third_h = w / 3, h / 3
        
        # Check if center of mass is near intersection points
        intersections = [
            (third_w, third_h), (2*third_w, third_h),
            (third_w, 2*third_h), (2*third_w, 2*third_h)
        ]
        
        min_dist = min(
            np.sqrt((cx - ix)**2 + (cy - iy)**2)
            for ix, iy in intersections
        ) if 'cx' in locals() else float('inf')
        
        metrics["rule_of_thirds_score"] = 1.0 - min(min_dist / (w/3), 1.0)
        
        return metrics
    
    def _check_issues(self, basic_metrics: Dict, 
                     technical_metrics: Dict, 
                     composition_metrics: Dict) -> List[str]:
        """Check for critical issues"""
        issues = []
        
        # Check brightness
        brightness = technical_metrics["brightness"]
        if brightness < config.MIN_BRIGHTNESS:
            issues.append(f"Too dark ({brightness:.1f} < {config.MIN_BRIGHTNESS})")
        elif brightness > config.MAX_BRIGHTNESS:
            issues.append(f"Too bright ({brightness:.1f} > {config.MAX_BRIGHTNESS})")
        
        # Check contrast
        contrast = technical_metrics["contrast"]
        if contrast < config.MIN_CONTRAST:
            issues.append(f"Low contrast ({contrast:.1f} < {config.MIN_CONTRAST})")
        
        # Check sharpness
        sharpness = technical_metrics["sharpness"]
        if sharpness < config.MAX_BLUR_THRESHOLD:
            issues.append(f"Blurry image ({sharpness:.1f} < {config.MAX_BLUR_THRESHOLD})")
        
        # Check silhouette coverage if available
        if "silhouette_coverage" in composition_metrics:
            coverage = composition_metrics["silhouette_coverage"]
            if coverage < config.MIN_SILHOUETTE_COVERAGE:
                issues.append(f"Low silhouette coverage ({coverage:.2%} < {config.MIN_SILHOUETTE_COVERAGE:.0%})")
            elif coverage > config.MAX_SILHOUETTE_COVERAGE:
                issues.append(f"High silhouette coverage ({coverage:.2%} > {config.MAX_SILHOUETTE_COVERAGE:.0%})")
        
        return issues
    
    def _check_warnings(self, basic_metrics: Dict,
                       technical_metrics: Dict,
                       composition_metrics: Dict) -> List[str]:
        """Check for non-critical warnings"""
        warnings = []
        
        # Check aspect ratio
        aspect_ratio = basic_metrics["aspect_ratio"]
        if aspect_ratio < 1.2:
            warnings.append(f"Low aspect ratio ({aspect_ratio:.2f}) - person might be cropped")
        elif aspect_ratio > 3.0:
            warnings.append(f"High aspect ratio ({aspect_ratio:.2f}) - check composition")
        
        # Check noise level
        noise = technical_metrics["noise_level"]
        if noise > 0.1:
            warnings.append(f"High noise level ({noise:.3f})")
        
        # Check dynamic range
        dynamic_range = technical_metrics["dynamic_range"]
        if dynamic_range < 100:
            warnings.append(f"Low dynamic range ({dynamic_range:.1f})")
        
        # Check centering
        if "centering_score" in composition_metrics:
            centering = composition_metrics["centering_score"]
            if centering < 0.7:
                warnings.append(f"Poor centering (score: {centering:.2f})")
        
        return warnings
    
    def _calculate_overall_score(self, quality_metrics: Dict) -> float:
        """Calculate overall quality score (0-100)"""
        weights = {
            "technical": 0.4,
            "composition": 0.4,
            "basic": 0.2
        }
        
        # Technical score (0-1)
        tech_metrics = quality_metrics["technical_metrics"]
        tech_score = (
            (min(max(tech_metrics["brightness"], config.MIN_BRIGHTNESS), config.MAX_BRIGHTNESS) - config.MIN_BRIGHTNESS) / 
            (config.MAX_BRIGHTNESS - config.MIN_BRIGHTNESS) * 0.2 +
            min(tech_metrics["contrast"] / 100, 1.0) * 0.3 +
            min(tech_metrics["sharpness"] / 500, 1.0) * 0.3 +
            max(0, 1 - tech_metrics["noise_level"] * 2) * 0.2
        )
        
        # Composition score (0-1)
        comp_metrics = quality_metrics["composition_metrics"]
        comp_score = 0.0
        
        if "silhouette_coverage" in comp_metrics:
            coverage = comp_metrics["silhouette_coverage"]
            # Ideal coverage is around 0.6 (60%)
            coverage_score = 1 - abs(coverage - 0.6) / 0.3
            comp_score += max(0, coverage_score) * 0.3
        
        if "pose_confidence" in comp_metrics:
            comp_score += comp_metrics["pose_confidence"] * 0.3
        
        if "centering_score" in comp_metrics:
            comp_score += comp_metrics["centering_score"] * 0.2
        
        if "rule_of_thirts_score" in comp_metrics:
            comp_score += comp_metrics["rule_of_thirds_score"] * 0.2
        
        comp_score = min(comp_score, 1.0)
        
        # Basic score (0-1)
        basic_metrics = quality_metrics["basic_metrics"]
        aspect_ratio = basic_metrics["aspect_ratio"]
        # Ideal aspect ratio for person is around 2.0
        aspect_score = 1 - min(abs(aspect_ratio - 2.0) / 1.0, 1.0)
        basic_score = aspect_score
        
        # Penalize for issues
        issue_penalty = len(quality_metrics["issues"]) * 0.2
        warning_penalty = len(quality_metrics["warnings"]) * 0.05
        
        # Calculate final score
        final_score = (
            tech_score * weights["technical"] +
            comp_score * weights["composition"] +
            basic_score * weights["basic"]
        )
        
        final_score = max(0, final_score - issue_penalty - warning_penalty)
        
        return float(final_score * 100)  # Convert to 0-100 scale
    
    def _assess_multi_view_consistency(self, quality_results: Dict, 
                                      views_data: Dict) -> Dict:
        """Assess consistency across multiple views"""
        if len(quality_results) < 2:
            return {"note": "Insufficient views for consistency assessment"}
        
        consistency_metrics = {}
        
        # Compare image sizes
        sizes = []
        for view, quality in quality_results.items():
            if "basic_metrics" in quality:
                dims = quality["basic_metrics"]["dimensions"]
                sizes.append((dims["width"], dims["height"]))
        
        if sizes:
            widths, heights = zip(*sizes)
            consistency_metrics["size_variation"] = {
                "width_std": float(np.std(widths)),
                "height_std": float(np.std(heights)),
                "width_cv": float(np.std(widths) / np.mean(widths)) if np.mean(widths) > 0 else 0,
                "height_cv": float(np.std(heights) / np.mean(heights)) if np.mean(heights) > 0 else 0
            }
        
        # Compare brightness
        brightness_values = []
        for view, quality in quality_results.items():
            if "technical_metrics" in quality:
                brightness_values.append(quality["technical_metrics"]["brightness"])
        
        if brightness_values:
            consistency_metrics["brightness_consistency"] = {
                "mean": float(np.mean(brightness_values)),
                "std": float(np.std(brightness_values)),
                "range": float(np.max(brightness_values) - np.min(brightness_values))
            }
        
        # Compare overall scores
        scores = [q["overall_score"] for q in quality_results.values()]
        consistency_metrics["score_consistency"] = {
            "mean": float(np.mean(scores)),
            "std": float(np.std(scores)),
            "min": float(np.min(scores)),
            "max": float(np.max(scores))
        }
        
        # Calculate overall consistency score
        consistency_score = 1.0
        
        if "size_variation" in consistency_metrics:
            size_var = consistency_metrics["size_variation"]
            width_cv = size_var["width_cv"]
            height_cv = size_var["height_cv"]
            size_consistency = 1.0 - min((width_cv + height_cv) / 0.2, 1.0)
            consistency_score *= size_consistency
        
        if "brightness_consistency" in consistency_metrics:
            brightness_std = consistency_metrics["brightness_consistency"]["std"]
            brightness_consistency = 1.0 - min(brightness_std / 50, 1.0)
            consistency_score *= brightness_consistency
        
        consistency_metrics["overall_consistency_score"] = float(consistency_score)
        
        return consistency_metrics
    
    def _generate_overall_assessment(self, quality_results: Dict,
                                   overall_scores: Dict,
                                   consistency_metrics: Dict) -> Dict:
        """Generate overall quality assessment"""
        # Calculate average scores
        scores = list(overall_scores.values())
        
        assessment = {
            "timestamp": datetime.now().isoformat(),
            "num_views_assessed": len(quality_results),
            "average_score": float(np.mean(scores)) if scores else 0.0,
            "min_score": float(np.min(scores)) if scores else 0.0,
            "max_score": float(np.max(scores)) if scores else 0.0,
            "score_std": float(np.std(scores)) if len(scores) > 1 else 0.0,
            "consistency_score": consistency_metrics.get("overall_consistency_score", 0.0),
            "status": "UNKNOWN",
            "recommendations": []
        }
        
        # Determine overall status
        avg_score = assessment["average_score"]
        consistency = assessment["consistency_score"]
        
        if avg_score >= 80 and consistency >= 0.8:
            assessment["status"] = "EXCELLENT"
        elif avg_score >= 70:
            assessment["status"] = "GOOD"
        elif avg_score >= 60:
            assessment["status"] = "ACCEPTABLE"
        elif avg_score >= 50:
            assessment["status"] = "MARGINAL"
        else:
            assessment["status"] = "POOR"
        
        # Generate recommendations
        if avg_score < 70:
            assessment["recommendations"].append(
                "Consider retaking photos with better lighting and contrast"
            )
        
        if consistency < 0.7:
            assessment["recommendations"].append(
                "Views are inconsistent. Ensure consistent camera settings and distance."
            )
        
        # Check for specific issues
        all_issues = []
        for view, quality in quality_results.items():
            all_issues.extend(quality.get("issues", []))
        
        if any("Too dark" in issue for issue in all_issues):
            assessment["recommendations"].append("Increase lighting for dark images")
        
        if any("Blurry" in issue for issue in all_issues):
            assessment["recommendations"].append("Use a tripod or increase shutter speed to reduce blur")
        
        if any("Low contrast" in issue for issue in all_issues):
            assessment["recommendations"].append("Improve lighting to increase contrast")
        
        return assessment
    
    def _save_quality_report(self, quality_results: Dict,
                           overall_assessment: Dict,
                           user_id: str, output_dir: Path) -> Path:
        """Save comprehensive quality report"""
        report_dir = output_dir / user_id / "quality"
        report_dir.mkdir(parents=True, exist_ok=True)
        
        report = {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "overall_assessment": overall_assessment,
            "view_details": quality_results,
            "config_used": config.to_dict()
        }
        
        report_path = report_dir / "quality_report.json"
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Also create a summary text file
        summary_path = report_dir / "quality_summary.txt"
        with open(summary_path, 'w') as f:
            f.write(self._generate_summary_text(report))
        
        self.logger.info(f"Saved quality report for user {user_id}")
        
        return report_path
    
    def _generate_summary_text(self, report: Dict) -> str:
        """Generate human-readable summary"""
        lines = []
        lines.append("=" * 60)
        lines.append("QUALITY ASSESSMENT SUMMARY")
        lines.append("=" * 60)
        lines.append(f"User ID: {report['user_id']}")
        lines.append(f"Timestamp: {report['timestamp']}")
        lines.append("")
        
        overall = report["overall_assessment"]
        lines.append(f"Overall Status: {overall['status']}")
        lines.append(f"Average Quality Score: {overall['average_score']:.1f}/100")
        lines.append(f"Consistency Score: {overall['consistency_score']:.2f}")
        lines.append("")
        
        lines.append("View Scores:")
        for view, details in report["view_details"].items():
            score = details.get("overall_score", 0)
            issues = details.get("issues", [])
            status = "✅" if score >= 70 else "⚠️" if score >= 50 else "❌"
            lines.append(f"  {status} {view}: {score:.1f}/100")
            if issues:
                for issue in issues[:2]:  # Show only first 2 issues
                    lines.append(f"      - {issue}")
        
        lines.append("")
        lines.append("Recommendations:")
        for rec in overall.get("recommendations", []):
            lines.append(f"  • {rec}")
        
        if not overall.get("recommendations"):
            lines.append("  • All views meet quality standards!")
        
        lines.append("")
        lines.append("=" * 60)
        
        return "\n".join(lines)
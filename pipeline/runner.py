"""
Pipeline orchestrator - coordinates all processing steps
"""
import time
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from .utils.logger import PipelineLogger
from .utils.errors import PipelineError, ValidationError
try:
    from .config import config
except ImportError:
    # Fallback to simple config
    from .config_simple import config

# Import pipeline steps
from .steps.validate import ImageValidator
from .steps.segment import BackgroundSegmenter
from .steps.pose import PoseDetector
from .steps.silhouette import SilhouetteExtractor
from .steps.align import ViewAligner
from .steps.normalize import ImageNormalizer
from .steps.quality import QualityAssessor


class PipelineRunner:
    """Main pipeline orchestrator"""
    
    def __init__(self, log_dir: Optional[Path] = None):
        # Setup logging
        self.log_dir = log_dir or Path("logs")
        self.logger_setup = PipelineLogger(self.log_dir)
        self.logger = self.logger_setup.get_logger()
        
        # Initialize components
        self.validator = ImageValidator()
        self.segmenter = BackgroundSegmenter()
        self.pose_detector = PoseDetector()
        self.silhouette_extractor = SilhouetteExtractor()
        self.aligner = ViewAligner()
        self.normalizer = ImageNormalizer()
        self.quality_assessor = QualityAssessor()
        
        # State tracking
        self.processing_state = {}
        
    def process_user(self, user_id: str, cleanup: bool = False) -> Dict:
        """
        Process all images for a user through the complete pipeline
        
        Args:
            user_id: Unique identifier for the user
            cleanup: Whether to clean up intermediate files after processing
            
        Returns:
            Dictionary with processing results and metadata
        """
        start_time = time.time()
        self.logger.info(f"Starting pipeline for user: {user_id}")
        
        # Initialize results structure
        results = {
            "user_id": user_id,
            "start_time": datetime.now().isoformat(),
            "success": False,
            "steps": {},
            "errors": [],
            "outputs": {},
            "quality_report": None
        }
        
        try:
            # Step 1: Validation
            validation_results = self._run_step(
                "validation", user_id,
                lambda: self.validator.validate_user(user_id)
            )
            results["steps"]["validation"] = validation_results
            
            if not validation_results.get("result", {}).get("overall_valid", False):
                raise ValidationError(f"Validation failed for user {user_id}")
            
            # Step 2: Segmentation
            segmentation_results = self._run_step(
                "segmentation", user_id,
                lambda: self._segment_all_views(user_id, validation_results["result"])
            )
            results["steps"]["segmentation"] = segmentation_results
            
            # Step 3: Pose Detection
            pose_results = self._run_step(
                "pose_detection", user_id,
                lambda: self._detect_poses_all_views(user_id, segmentation_results["result"])
            )
            results["steps"]["pose_detection"] = pose_results
            
            # Step 4: Silhouette Extraction
            silhouette_results = self._run_step(
                "silhouette_extraction", user_id,
                lambda: self._extract_silhouettes_all_views(user_id, segmentation_results["result"])
            )
            results["steps"]["silhouette_extraction"] = silhouette_results
            
            # Step 5: View Alignment
            # Prepare data for alignment
            alignment_data = self._prepare_alignment_data(
                pose_results["result"] if pose_results["success"] else {},
                silhouette_results["result"] if silhouette_results["success"] else {}
            )
            
            alignment_results = self._run_step(
                "alignment", user_id,
                lambda: self.aligner.align_views(user_id, alignment_data, config.PROCESSED_DIR)
            )
            results["steps"]["alignment"] = alignment_results
            
            # Step 6: Normalization
            normalization_data = self._prepare_normalization_data(
                silhouette_results["result"] if silhouette_results["success"] else {},
                pose_results["result"] if pose_results["success"] else {}
            )
            
            normalization_results = self._run_step(
                "normalization", user_id,
                lambda: self.normalizer.normalize_views(user_id, normalization_data, config.PROCESSED_DIR)
            )
            results["steps"]["normalization"] = normalization_results
            
            # Step 7: Quality Assessment
            quality_data = self._prepare_quality_data(
                validation_results["result"],
                segmentation_results["result"] if segmentation_results["success"] else {},
                pose_results["result"] if pose_results["success"] else {},
                silhouette_results["result"] if silhouette_results["success"] else {},
                normalization_results["result"] if normalization_results["success"] else {}
            )
            
            quality_results = self._run_step(
                "quality_assessment", user_id,
                lambda: self.quality_assessor.assess_quality(user_id, quality_data, config.PROCESSED_DIR)
            )
            results["steps"]["quality_assessment"] = quality_results
            
            if quality_results["success"]:
                results["quality_report"] = quality_results["result"].get("report_path")
            
            # Update outputs
            results["outputs"] = {
                "segmented_images": segmentation_results.get("result", {}).get("output_paths", {}),
                "silhouettes": silhouette_results.get("result", {}).get("silhouette_paths", {}),
                "pose_data": pose_results.get("result", {}).get("pose_results", {}),
                "aligned_images": alignment_results.get("result", {}).get("aligned_images", {}),
                "normalized_images": normalization_results.get("result", {}).get("normalized_images", {}),
                "metadata": {
                    "validation": validation_results["result"],
                    "alignment": alignment_results.get("result", {}).get("metadata_path"),
                    "normalization": normalization_results.get("result", {}).get("metadata_path"),
                    "quality": quality_results.get("result", {}).get("report_path")
                }
            }
            
            # Generate final report
            final_report = self._generate_final_report(results, user_id)
            results["final_report"] = final_report
            
            # Cleanup if requested
            if cleanup:
                self._cleanup_intermediate_files(user_id)
            
            results["success"] = True
            results["end_time"] = datetime.now().isoformat()
            results["duration"] = time.time() - start_time
            
            self.logger.info(f"Pipeline completed successfully for user {user_id}")
            self.logger.info(f"Total processing time: {results['duration']:.2f} seconds")
            
        except Exception as e:
            results["success"] = False
            results["error"] = str(e)
            results["end_time"] = datetime.now().isoformat()
            results["duration"] = time.time() - start_time
            
            self.logger.error(f"Pipeline failed for user {user_id}: {str(e)}", exc_info=True)
            
            # Save error report
            self._save_error_report(results, user_id)
        
        finally:
            # Save processing results
            self._save_processing_results(results, user_id)
        
        return results
    
    def _run_step(self, step_name: str, user_id: str, step_func) -> Dict:
        """Execute a pipeline step with timing and error handling"""
        step_start = time.time()
        self.logger.info(f"[{user_id}] Starting step: {step_name}")
        
        try:
            result = step_func()
            duration = time.time() - step_start
            
            self.logger.info(f"[{user_id}] Completed step: {step_name} in {duration:.2f}s")
            
            return {
                "success": True,
                "duration": duration,
                "result": result
            }
            
        except Exception as e:
            duration = time.time() - step_start
            self.logger.error(f"[{user_id}] Step {step_name} failed: {str(e)}", exc_info=True)
            
            return {
                "success": False,
                "duration": duration,
                "error": str(e),
                "result": None
            }
    
    def _segment_all_views(self, user_id: str, validation_results: Dict) -> Dict:
        """Segment all valid views"""
        views = validation_results.get("views", {})
        output_paths = {}
        
        for view, view_data in views.items():
            if not view_data.get("valid", False) or "path" not in view_data:
                self.logger.warning(f"Skipping invalid view: {view}")
                continue
            
            image_path = Path(view_data["path"])
            try:
                # Process segmentation
                segmented, mask = self.segmenter.process_view(
                    image_path, user_id, view, config.PROCESSED_DIR
                )
                output_paths[view] = {
                    "segmented": str(segmented[0]) if isinstance(segmented, tuple) else str(segmented),
                    "mask": str(mask[0]) if isinstance(mask, tuple) else str(mask)
                }
                
                self.logger.info(f"Segmented {view} view successfully")
                
            except Exception as e:
                self.logger.error(f"Failed to segment {view} view: {str(e)}")
                # Continue with other views even if one fails
        
        return {"output_paths": output_paths}
    
    def _detect_poses_all_views(self, user_id: str, segmentation_results: Dict) -> Dict:
        """Detect poses in all segmented views"""
        output_paths = segmentation_results.get("output_paths", {})
        pose_results = {}
        
        for view, paths in output_paths.items():
            segmented_path_str = paths.get("segmented", "")
            if not segmented_path_str:
                continue
            
            segmented_path = Path(segmented_path_str)
            if not segmented_path.exists():
                self.logger.warning(f"Segmented image not found for {view}: {segmented_path}")
                continue
            
            try:
                pose_data = self.pose_detector.detect_pose(segmented_path, view)
                pose_path = self.pose_detector.save_pose_results(
                    pose_data, user_id, config.PROCESSED_DIR
                )
                
                pose_results[view] = {
                    "data": pose_data,
                    "path": str(pose_path)
                }
                
                self.logger.info(f"Detected pose for {view} view successfully")
                
            except Exception as e:
                self.logger.error(f"Failed to detect pose for {view} view: {str(e)}")
                # Continue with other views
        
        return {"pose_results": pose_results}
    
    def _extract_silhouettes_all_views(self, user_id: str, segmentation_results: Dict) -> Dict:
        """Extract silhouettes from all segmented views"""
        output_paths = segmentation_results.get("output_paths", {})
        silhouette_paths = {}
        silhouette_metrics = {}
        
        for view, paths in output_paths.items():
            segmented_path_str = paths.get("segmented", "")
            mask_path_str = paths.get("mask", "")
            
            if not segmented_path_str:
                continue
            
            segmented_path = Path(segmented_path_str)
            mask_path = Path(mask_path_str) if mask_path_str else None
            
            if not segmented_path.exists():
                continue
            
            try:
                # Extract silhouette
                silhouette = self.silhouette_extractor.extract_silhouette(
                    image_path=segmented_path,
                    mask_path=mask_path,
                    user_id=user_id,
                    view=view
                )
                
                # Save silhouette
                silhouette_path = self.silhouette_extractor.save_silhouette(
                    silhouette, user_id, view, config.PROCESSED_DIR
                )
                
                # Calculate metrics
                metrics = self.silhouette_extractor.calculate_silhouette_metrics(silhouette)
                
                silhouette_paths[view] = str(silhouette_path)
                silhouette_metrics[view] = metrics
                
                self.logger.info(f"Extracted silhouette for {view} view successfully")
                
            except Exception as e:
                self.logger.error(f"Failed to extract silhouette for {view} view: {str(e)}")
        
        return {
            "silhouette_paths": silhouette_paths,
            "silhouette_metrics": silhouette_metrics
        }
    
    def _prepare_alignment_data(self, pose_results: Dict, silhouette_results: Dict) -> Dict:
        """Prepare data for view alignment"""
        alignment_data = {}
        
        # Get all views that have data
        all_views = set()
        if "pose_results" in pose_results:
            all_views.update(pose_results["pose_results"].keys())
        if "silhouette_metrics" in silhouette_results:
            all_views.update(silhouette_results["silhouette_metrics"].keys())
        
        for view in all_views:
            view_data = {}
            
            # Add pose data if available
            if "pose_results" in pose_results and view in pose_results["pose_results"]:
                pose_data = pose_results["pose_results"][view]["data"]
                view_data.update({
                    "keypoints": pose_data.get("keypoints", {}),
                    "pose_metrics": pose_data.get("pose_metrics", {}),
                    "image_dimensions": pose_data.get("image_dimensions", {})
                })
            
            # Add silhouette data if available
            if "silhouette_metrics" in silhouette_results and view in silhouette_results["silhouette_metrics"]:
                silhouette_metrics = silhouette_results["silhouette_metrics"][view]
                view_data.update({
                    "centroid": {
                        "x": silhouette_metrics.get("centroid_x", 0),
                        "y": silhouette_metrics.get("centroid_y", 0)
                    },
                    "bbox": silhouette_metrics.get("bbox", {}),
                    "silhouette_metrics": silhouette_metrics
                })
            
            # Add image path from silhouette if available
            if "silhouette_paths" in silhouette_results and view in silhouette_results["silhouette_paths"]:
                view_data["image_path"] = silhouette_results["silhouette_paths"][view]
            
            if view_data:  # Only add if we have some data
                alignment_data[view] = view_data
        
        return alignment_data
    
    def _prepare_normalization_data(self, silhouette_results: Dict, pose_results: Dict) -> Dict:
        """Prepare data for normalization"""
        normalization_data = {}
        
        silhouette_metrics = silhouette_results.get("silhouette_metrics", {})
        
        for view, metrics in silhouette_metrics.items():
            view_data = {
                "bbox": metrics.get("bbox", {}),
                "centroid": {
                    "x": metrics.get("centroid_x", 0),
                    "y": metrics.get("centroid_y", 0)
                },
                "silhouette_metrics": metrics
            }
            
            # Add pose data if available
            if "pose_results" in pose_results and view in pose_results["pose_results"]:
                pose_data = pose_results["pose_results"][view]["data"]
                view_data["pose_metrics"] = pose_data.get("pose_metrics", {})
                view_data["image_dimensions"] = pose_data.get("image_dimensions", {})
            
            # Add image path from silhouette
            if "silhouette_paths" in silhouette_results and view in silhouette_results["silhouette_paths"]:
                view_data["image_path"] = silhouette_results["silhouette_paths"][view]
            
            normalization_data[view] = view_data
        
        return normalization_data
    
    def _prepare_quality_data(self, validation_results: Dict, segmentation_results: Dict,
                            pose_results: Dict, silhouette_results: Dict,
                            normalization_results: Dict) -> Dict:
        """Prepare data for quality assessment"""
        quality_data = {}
        
        # Get all views that passed validation
        valid_views = [
            view for view, data in validation_results.get("views", {}).items()
            if data.get("valid", False)
        ]
        
        for view in valid_views:
            view_data = {}
            
            # Add validation data
            if view in validation_results.get("views", {}):
                view_data["validation"] = validation_results["views"][view]
            
            # Add silhouette metrics
            silhouette_metrics = silhouette_results.get("silhouette_metrics", {})
            if view in silhouette_metrics:
                view_data["silhouette_metrics"] = silhouette_metrics[view]
            
            # Add pose metrics
            if "pose_results" in pose_results and view in pose_results["pose_results"]:
                pose_result = pose_results["pose_results"][view]
                if "data" in pose_result:
                    view_data["pose_metrics"] = pose_result["data"].get("pose_metrics", {})
            
            # Add image path from normalized results
            if normalization_results and "normalized_images" in normalization_results:
                if view in normalization_results["normalized_images"]:
                    view_data["image_path"] = normalization_results["normalized_images"][view]
            
            # Add segmentation info
            if "output_paths" in segmentation_results and view in segmentation_results["output_paths"]:
                view_data["segmentation_path"] = segmentation_results["output_paths"][view].get("segmented", "")
            
            quality_data[view] = view_data
        
        return quality_data
    
    def _generate_final_report(self, results: Dict, user_id: str) -> Dict:
        """Generate final processing report"""
        report = {
            "pipeline_version": "1.0.0",
            "user_id": user_id,
            "processing_date": datetime.now().isoformat(),
            "summary": {
                "success": results["success"],
                "total_duration": results.get("duration", 0),
                "steps_completed": [],
                "steps_failed": []
            },
            "step_details": {},
            "quality_summary": None,
            "outputs": results.get("outputs", {})
        }
        
        # Summarize steps
        for step_name, step_result in results.get("steps", {}).items():
            if step_result.get("success", False):
                report["summary"]["steps_completed"].append(step_name)
            else:
                report["summary"]["steps_failed"].append(step_name)
            
            report["step_details"][step_name] = {
                "success": step_result.get("success", False),
                "duration": step_result.get("duration", 0),
                "error": step_result.get("error")
            }
        
        # Add quality summary if available
        quality_step = results.get("steps", {}).get("quality_assessment")
        if quality_step and quality_step.get("success"):
            quality_result = quality_step.get("result", {})
            if "overall_assessment" in quality_result:
                report["quality_summary"] = quality_result["overall_assessment"]
        
        # Save report
        report_dir = config.PROCESSED_DIR / user_id / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        
        report_path = report_dir / "pipeline_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Also save a simplified version
        simple_report = self._generate_simple_report(report)
        simple_path = report_dir / "pipeline_summary.txt"
        with open(simple_path, 'w') as f:
            f.write(simple_report)
        
        self.logger.info(f"Generated final report for user {user_id}")
        
        return {
            "detailed_report": str(report_path),
            "summary_report": str(simple_path),
            "report_data": report
        }
    
    def _generate_simple_report(self, report: Dict) -> str:
        """Generate human-readable summary report"""
        lines = []
        lines.append("=" * 60)
        lines.append("PIPELINE PROCESSING REPORT")
        lines.append("=" * 60)
        lines.append(f"User ID: {report['user_id']}")
        lines.append(f"Date: {report['processing_date']}")
        lines.append(f"Status: {'✅ SUCCESS' if report['summary']['success'] else '❌ FAILED'}")
        lines.append(f"Total Duration: {report['summary']['total_duration']:.1f}s")
        lines.append("")
        
        lines.append("Steps Completed:")
        for step in report['summary']['steps_completed']:
            duration = report['step_details'][step]['duration']
            lines.append(f"  ✅ {step}: {duration:.2f}s")
        
        if report['summary']['steps_failed']:
            lines.append("")
            lines.append("Steps Failed:")
            for step in report['summary']['steps_failed']:
                error = report['step_details'][step].get('error', 'Unknown error')
                lines.append(f"  ❌ {step}: {error}")
        
        # Add quality summary if available
        if report.get('quality_summary'):
            lines.append("")
            lines.append("Quality Assessment:")
            q = report['quality_summary']
            lines.append(f"  Overall Status: {q.get('status', 'N/A')}")
            lines.append(f"  Average Score: {q.get('average_score', 0):.1f}/100")
            lines.append(f"  Consistency: {q.get('consistency_score', 0):.2f}")
        
        lines.append("")
        lines.append("Output Files:")
        outputs = report.get('outputs', {})
        
        # Check specific outputs
        output_types = [
            ("normalized_images", "Normalized Images"),
            ("silhouettes", "Silhouettes"),
            ("pose_data", "Pose Data"),
            ("segmented_images", "Segmented Images")
        ]
        
        for output_key, output_name in output_types:
            if output_key in outputs and outputs[output_key]:
                if isinstance(outputs[output_key], dict):
                    count = len(outputs[output_key])
                    if count > 0:
                        lines.append(f"  {output_name}: ✅ {count} views")
                else:
                    lines.append(f"  {output_name}: ✅ Available")
        
        lines.append("")
        lines.append("=" * 60)
        
        return "\n".join(lines)
    
    def _save_error_report(self, results: Dict, user_id: str):
        """Save error report for failed pipeline runs"""
        error_dir = config.PROCESSED_DIR / user_id / "errors"
        error_dir.mkdir(parents=True, exist_ok=True)
        
        # Find which steps failed
        failed_steps = []
        last_successful = None
        for step_name, step_result in results.get("steps", {}).items():
            if step_result.get("success", False):
                last_successful = step_name
            else:
                failed_steps.append(step_name)
        
        error_report = {
            "user_id": user_id,
            "error_time": results["end_time"],
            "error": results.get("error", "Unknown error"),
            "last_successful_step": last_successful,
            "failed_steps": failed_steps,
            "duration": results.get("duration", 0)
        }
        
        error_path = error_dir / "error_report.json"
        with open(error_path, 'w') as f:
            json.dump(error_report, f, indent=2)
        
        self.logger.error(f"Saved error report to {error_path}")
    
    def _save_processing_results(self, results: Dict, user_id: str):
        """Save complete processing results"""
        results_dir = config.PROCESSED_DIR / user_id / "results"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        # Convert Path objects to strings for JSON serialization
        def convert_paths(obj):
            if isinstance(obj, Path):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: convert_paths(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_paths(item) for item in obj]
            else:
                return obj
        
        serializable_results = convert_paths(results)
        
        results_path = results_dir / "pipeline_results.json"
        with open(results_path, 'w') as f:
            json.dump(serializable_results, f, indent=2, default=str)
        
        self.logger.info(f"Saved processing results to {results_path}")
    
    def _cleanup_intermediate_files(self, user_id: str):
        """Clean up intermediate processing files"""
        if not config.SAVE_INTERMEDIATE:
            user_dir = config.PROCESSED_DIR / user_id
            
            if not user_dir.exists():
                return
            
            # Define directories to keep
            keep_dirs = ["normalized", "silhouettes", "reports", "results", "quality", "metadata", "errors"]
            
            # Remove other directories
            for item in user_dir.iterdir():
                if item.is_dir() and item.name not in keep_dirs:
                    try:
                        shutil.rmtree(item)
                        self.logger.info(f"Cleaned up intermediate directory: {item}")
                    except Exception as e:
                        self.logger.warning(f"Failed to clean up {item}: {str(e)}")
    
    def batch_process(self, user_ids: List[str], max_workers: Optional[int] = None) -> Dict:
        """
        Process multiple users in batch mode
        
        Args:
            user_ids: List of user IDs to process
            max_workers: Maximum number of parallel workers
            
        Returns:
            Dictionary with batch processing results
        """
        if max_workers is None:
            max_workers = config.MAX_WORKERS if config.PARALLEL_PROCESSING else 1
        
        batch_results = {
            "start_time": datetime.now().isoformat(),
            "total_users": len(user_ids),
            "successful": 0,
            "failed": 0,
            "user_results": {},
            "summary": {}
        }
        
        self.logger.info(f"Starting batch processing of {len(user_ids)} users with {max_workers} workers")
        
        if max_workers == 1 or not config.PARALLEL_PROCESSING:
            # Sequential processing
            for user_id in user_ids:
                self.logger.info(f"Processing user: {user_id}")
                result = self.process_user(user_id)
                batch_results["user_results"][user_id] = result
                
                if result["success"]:
                    batch_results["successful"] += 1
                else:
                    batch_results["failed"] += 1
        else:
            # Parallel processing
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all tasks
                future_to_user = {
                    executor.submit(self.process_user, user_id): user_id
                    for user_id in user_ids
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_user):
                    user_id = future_to_user[future]
                    try:
                        result = future.result()
                        batch_results["user_results"][user_id] = result
                        
                        if result["success"]:
                            batch_results["successful"] += 1
                            self.logger.info(f"✅ Successfully processed user: {user_id}")
                        else:
                            batch_results["failed"] += 1
                            self.logger.error(f"❌ Failed to process user: {user_id}")
                    except Exception as e:
                        batch_results["failed"] += 1
                        batch_results["user_results"][user_id] = {
                            "success": False,
                            "error": str(e)
                        }
                        self.logger.error(f"❌ Exception processing user {user_id}: {str(e)}")
        
        # Generate batch summary
        batch_results["end_time"] = datetime.now().isoformat()
        
        # Calculate statistics
        successful_results = [
            r for r in batch_results["user_results"].values()
            if r.get("success", False)
        ]
        
        total_duration = sum(
            r.get("duration", 0) for r in successful_results
        )
        
        batch_results["summary"] = {
            "total_duration": total_duration,
            "avg_duration_per_user": total_duration / len(successful_results) if successful_results else 0,
            "success_rate": batch_results["successful"] / len(user_ids) if user_ids else 0
        }
        
        # Save batch report
        self._save_batch_report(batch_results)
        
        self.logger.info(f"Batch processing completed: {batch_results['successful']} successful, "
                        f"{batch_results['failed']} failed")
        
        return batch_results
    
    def _save_batch_report(self, batch_results: Dict):
        """Save batch processing report"""
        batch_dir = config.PROCESSED_DIR / "batch_reports"
        batch_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = batch_dir / f"batch_report_{timestamp}.json"
        
        with open(report_path, 'w') as f:
            json.dump(batch_results, f, indent=2, default=str)
        
        # Generate summary text
        summary = self._generate_batch_summary(batch_results)
        summary_path = batch_dir / f"batch_summary_{timestamp}.txt"
        
        with open(summary_path, 'w') as f:
            f.write(summary)
        
        self.logger.info(f"Saved batch report to {report_path}")
    
    def _generate_batch_summary(self, batch_results: Dict) -> str:
        """Generate human-readable batch summary"""
        lines = []
        lines.append("=" * 60)
        lines.append("BATCH PROCESSING SUMMARY")
        lines.append("=" * 60)
        lines.append(f"Processing Date: {batch_results['start_time'].split('T')[0]}")
        lines.append(f"Total Users: {batch_results['total_users']}")
        lines.append(f"Successful: {batch_results['successful']}")
        lines.append(f"Failed: {batch_results['failed']}")
        lines.append(f"Success Rate: {batch_results['summary']['success_rate']:.1%}")
        lines.append(f"Total Duration: {batch_results['summary']['total_duration']:.1f}s")
        lines.append(f"Average per User: {batch_results['summary']['avg_duration_per_user']:.1f}s")
        lines.append("")
        
        # Show failed users if any
        failed_users = [
            uid for uid, result in batch_results['user_results'].items()
            if not result.get('success', False)
        ]
        
        if failed_users:
            lines.append("Failed Users:")
            for uid in failed_users:
                error = batch_results['user_results'][uid].get('error', 'Unknown error')
                lines.append(f"  ❌ {uid}: {error}")
        else:
            lines.append("All users processed successfully! ✅")
        
        lines.append("")
        lines.append("=" * 60)
        
        return "\n".join(lines)
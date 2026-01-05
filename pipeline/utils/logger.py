"""
Centralized logging for the pipeline
"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import json

class PipelineLogger:
    """Pipeline logging manager"""
    
    def __init__(self, log_dir: Optional[Path] = None, level: str = "INFO"):
        self.logger = logging.getLogger("stylmorph_pipeline")
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Clear any existing handlers
        self.logger.handlers.clear()
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_format)
        self.logger.addHandler(console_handler)
        
        # File handler if log directory provided
        if log_dir:
            log_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = log_dir / f"pipeline_{timestamp}.log"
            
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(logging.DEBUG)
            file_format = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_format)
            self.logger.addHandler(file_handler)
    
    def get_logger(self) -> logging.Logger:
        return self.logger
    
    def log_step_start(self, step_name: str, user_id: str):
        """Log the start of a pipeline step"""
        self.logger.info(f"[{user_id}] Starting step: {step_name}")
    
    def log_step_complete(self, step_name: str, user_id: str, duration: float):
        """Log the completion of a pipeline step"""
        self.logger.info(f"[{user_id}] Completed step: {step_name} in {duration:.2f}s")
    
    def log_validation_results(self, user_id: str, results: dict):
        """Log validation results"""
        self.logger.info(f"[{user_id}] Validation results: {json.dumps(results, indent=2)}")
    
    def log_error(self, user_id: str, step_name: str, error: Exception):
        """Log pipeline errors"""
        self.logger.error(f"[{user_id}] Error in {step_name}: {str(error)}", exc_info=True)

# Global logger instance
logger = PipelineLogger()
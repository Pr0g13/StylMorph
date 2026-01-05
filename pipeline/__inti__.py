"""
StylMorph Data Cleaning Pipeline
"""
__version__ = "1.0.0"
__author__ = "StylMorph Team"

from .config import config
from .runner import PipelineRunner
from .utils.logger import logger

# Export main components
__all__ = ['PipelineRunner', 'config', 'logger']
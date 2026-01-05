"""
Custom exceptions for the pipeline
"""
class PipelineError(Exception):
    """Base exception for pipeline errors"""
    pass

class ValidationError(PipelineError):
    """Raised when image validation fails"""
    pass

class SegmentationError(PipelineError):
    """Raised when background removal fails"""
    pass

class PoseDetectionError(PipelineError):
    """Raised when pose detection fails"""
    pass

class AlignmentError(PipelineError):
    """Raised when image alignment fails"""
    pass

class QualityError(PipelineError):
    """Raised when quality check fails"""
    pass

class FileSystemError(PipelineError):
    """Raised for file system operations"""
    pass
import logging
import sentry_sdk
from typing import Any, Dict, Optional

# Configure standard logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("trimit")

def log_info(message: str, extra: Optional[Dict[str, Any]] = None):
    """Log an info message to both stdout and Sentry breadcrumbs."""
    logger.info(message)
    sentry_sdk.add_breadcrumb(
        category='auth',
        message=message,
        level='info',
        data=extra
    )

def log_error(message: str, error: Optional[Exception] = None, extra: Optional[Dict[str, Any]] = None):
    """Log an error message and capture the exception in Sentry."""
    logger.error(f"{message}: {str(error)}" if error else message)
    
    if error:
        sentry_sdk.capture_exception(error)
    else:
        sentry_sdk.capture_message(message, level='error')

def log_warning(message: str, extra: Optional[Dict[str, Any]] = None):
    """Log a warning message."""
    logger.warning(message)
    sentry_sdk.capture_message(message, level='warning')

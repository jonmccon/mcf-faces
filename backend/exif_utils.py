"""
EXIF utilities for extracting date information from photos.
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from PIL import Image
from PIL.ExifTags import TAGS


def get_exif_date(image_path: Path) -> Optional[str]:
    """
    Extract DateTimeOriginal from image EXIF data.
    
    Returns:
        ISO format date string (YYYY-MM-DD) or None if not found.
    """
    try:
        with Image.open(image_path) as img:
            exif_data = img.getexif()
            
            if exif_data is None:
                return None
            
            # Look for DateTimeOriginal (tag 36867) or DateTime (tag 306)
            date_tags = {
                36867: "DateTimeOriginal",
                36868: "DateTimeDigitized",
                306: "DateTime",
            }
            
            for tag_id, tag_name in date_tags.items():
                if tag_id in exif_data:
                    date_str = exif_data[tag_id]
                    return parse_exif_datetime(date_str)
            
            return None
    except Exception:
        return None


def parse_exif_datetime(date_str: str) -> Optional[str]:
    """
    Parse EXIF datetime string to ISO format date.
    
    EXIF format is typically "YYYY:MM:DD HH:MM:SS"
    
    Returns:
        ISO format date string (YYYY-MM-DD) or None if parsing fails.
    """
    if not date_str:
        return None
    
    # Try common EXIF datetime formats
    formats = [
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y:%m:%d",
        "%Y-%m-%d",
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    return None


def parse_date_from_filename(filename: str) -> Optional[str]:
    """
    Extract date from filename using common patterns.
    
    Supports patterns like:
    - 2021-05-12_photo.jpg
    - IMG_20210512_123456.jpg
    - photo_2021_05_12.jpg
    - 20210512.jpg
    
    Returns:
        ISO format date string (YYYY-MM-DD) or None if not found.
    """
    # Remove extension
    name = Path(filename).stem
    
    # Pattern 1: YYYY-MM-DD or YYYY_MM_DD at start or end
    pattern1 = r"(\d{4})[-_](\d{2})[-_](\d{2})"
    match = re.search(pattern1, name)
    if match:
        year, month, day = match.groups()
        if is_valid_date(year, month, day):
            return f"{year}-{month}-{day}"
    
    # Pattern 2: YYYYMMDD (8 consecutive digits)
    pattern2 = r"(\d{4})(\d{2})(\d{2})"
    match = re.search(pattern2, name)
    if match:
        year, month, day = match.groups()
        if is_valid_date(year, month, day):
            return f"{year}-{month}-{day}"
    
    # Pattern 3: IMG_YYYYMMDD format (common in cameras)
    pattern3 = r"IMG_(\d{4})(\d{2})(\d{2})"
    match = re.search(pattern3, name.upper())
    if match:
        year, month, day = match.groups()
        if is_valid_date(year, month, day):
            return f"{year}-{month}-{day}"
    
    return None


def is_valid_date(year: str, month: str, day: str) -> bool:
    """Check if the given year, month, day form a valid date."""
    try:
        year_int = int(year)
        month_int = int(month)
        day_int = int(day)
        
        # Basic range checks
        if not (1900 <= year_int <= 2100):
            return False
        if not (1 <= month_int <= 12):
            return False
        if not (1 <= day_int <= 31):
            return False
        
        # Try to create a datetime to verify
        datetime(year_int, month_int, day_int)
        return True
    except ValueError:
        return False


def get_photo_date(image_path: Path) -> Optional[str]:
    """
    Get the date for a photo, trying multiple methods in order:
    1. EXIF DateTimeOriginal
    2. Parse from filename
    3. Return None
    
    Returns:
        ISO format date string (YYYY-MM-DD) or None.
    """
    # Try EXIF first
    exif_date = get_exif_date(image_path)
    if exif_date:
        return exif_date
    
    # Try filename parsing
    filename_date = parse_date_from_filename(image_path.name)
    if filename_date:
        return filename_date
    
    return None


def get_all_exif_data(image_path: Path) -> dict:
    """
    Extract all EXIF data from an image.
    
    Returns:
        Dictionary of EXIF tag names to values.
    """
    try:
        with Image.open(image_path) as img:
            exif_data = img.getexif()
            
            if exif_data is None:
                return {}
            
            result = {}
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, str(tag_id))
                # Skip binary data
                if isinstance(value, bytes):
                    continue
                result[tag_name] = value
            
            return result
    except Exception:
        return {}

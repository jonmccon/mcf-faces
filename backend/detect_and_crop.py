"""
Face detection and cropping module using face_recognition library.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import cv2
import face_recognition
import numpy as np
from PIL import Image

from utils import (
    FACES_DIR,
    PHOTOS_DIR,
    generate_face_id,
    load_metadata,
    save_metadata,
    ensure_directories,
)
from exif_utils import get_photo_date


def detect_faces(image_path: Path) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces in an image using face_recognition library.
    
    Args:
        image_path: Path to the image file.
    
    Returns:
        List of face locations as (top, right, bottom, left) tuples.
    """
    # Load image
    image = face_recognition.load_image_file(str(image_path))
    
    # Detect faces using HOG model (faster) or CNN model (more accurate)
    # Using HOG for speed, switch to "cnn" for better accuracy if GPU available
    face_locations = face_recognition.face_locations(image, model="hog")
    
    return face_locations


def crop_face(
    image: np.ndarray,
    location: Tuple[int, int, int, int],
    padding: float = 0.3
) -> np.ndarray:
    """
    Crop a face from an image with optional padding.
    
    Args:
        image: Input image as numpy array (RGB).
        location: Face location as (top, right, bottom, left).
        padding: Fraction of face size to add as padding.
    
    Returns:
        Cropped face image as numpy array.
    """
    top, right, bottom, left = location
    height = bottom - top
    width = right - left
    
    # Add padding
    pad_h = int(height * padding)
    pad_w = int(width * padding)
    
    # Calculate padded bounds (clamped to image dimensions)
    img_h, img_w = image.shape[:2]
    new_top = max(0, top - pad_h)
    new_bottom = min(img_h, bottom + pad_h)
    new_left = max(0, left - pad_w)
    new_right = min(img_w, right + pad_w)
    
    # Crop
    face_crop = image[new_top:new_bottom, new_left:new_right]
    
    return face_crop


def save_face_thumbnail(
    face_crop: np.ndarray,
    output_path: Path,
    target_size: Tuple[int, int] = (150, 150)
) -> None:
    """
    Save a face crop as a thumbnail image.
    
    Args:
        face_crop: Face image as numpy array (RGB).
        output_path: Path to save the thumbnail.
        target_size: Target size as (width, height).
    """
    # Convert RGB to BGR for OpenCV
    face_bgr = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)
    
    # Resize to target size
    face_resized = cv2.resize(face_bgr, target_size, interpolation=cv2.INTER_AREA)
    
    # Save
    cv2.imwrite(str(output_path), face_resized)


def process_single_photo(
    photo_path: Path,
    metadata: Dict[str, Any],
    existing_face_ids: set
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process a single photo: detect faces, crop, and save thumbnails.
    
    Args:
        photo_path: Path to the photo.
        metadata: Current metadata dictionary.
        existing_face_ids: Set of existing face IDs to avoid duplicates.
    
    Returns:
        Tuple of (list of new face records, photo record).
    """
    photo_filename = photo_path.name
    
    # Check if photo already processed
    for photo in metadata.get("photos", []):
        if photo["file"] == photo_filename:
            print(f"  Skipping already processed: {photo_filename}")
            return [], None
    
    # Load image
    image = face_recognition.load_image_file(str(photo_path))
    
    # Detect faces
    face_locations = detect_faces(photo_path)
    
    if not face_locations:
        print(f"  No faces found in: {photo_filename}")
        # Still record the photo even if no faces
        photo_record = {
            "file": photo_filename,
            "date": get_photo_date(photo_path) or "",
            "faces": []
        }
        return [], photo_record
    
    print(f"  Found {len(face_locations)} face(s) in: {photo_filename}")
    
    # Get photo date
    photo_date = get_photo_date(photo_path) or ""
    
    # Process each face
    new_faces = []
    face_ids = []
    
    for idx, location in enumerate(face_locations):
        face_id = generate_face_id(photo_filename, idx)
        
        # Skip if face already exists
        if face_id in existing_face_ids:
            face_ids.append(face_id)
            continue
        
        # Crop face
        face_crop = crop_face(image, location)
        
        # Save thumbnail
        thumbnail_filename = f"{face_id}.jpg"
        thumbnail_path = FACES_DIR / thumbnail_filename
        save_face_thumbnail(face_crop, thumbnail_path)
        
        # Create face record
        face_record = {
            "face_id": face_id,
            "photo": photo_filename,
            "person_cluster": -1,  # Will be assigned during clustering
            "name": "",  # Will be assigned via name_map
            "bbox": list(location),  # [top, right, bottom, left]
            "date": photo_date,
            "thumbnail": thumbnail_filename
        }
        
        new_faces.append(face_record)
        face_ids.append(face_id)
        existing_face_ids.add(face_id)
    
    # Create photo record
    photo_record = {
        "file": photo_filename,
        "date": photo_date,
        "faces": face_ids
    }
    
    return new_faces, photo_record


def detect_and_crop_all(photos_dir: Optional[Path] = None) -> Dict[str, Any]:
    """
    Process all photos in the photos directory.
    
    Args:
        photos_dir: Optional path to photos directory. Defaults to PHOTOS_DIR.
    
    Returns:
        Updated metadata dictionary.
    """
    if photos_dir is None:
        photos_dir = PHOTOS_DIR
    
    ensure_directories()
    
    # Load existing metadata
    metadata = load_metadata()
    
    # Get set of existing face IDs
    existing_face_ids = {face["face_id"] for face in metadata.get("faces", [])}
    
    # Get list of photos
    extensions = (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp")
    photos = []
    for ext in extensions:
        photos.extend(photos_dir.glob(f"*{ext}"))
        photos.extend(photos_dir.glob(f"*{ext.upper()}"))
    
    photos = sorted(set(photos))
    
    print(f"Found {len(photos)} photos to process")
    
    # Process each photo
    all_new_faces = []
    all_new_photos = []
    
    for photo_path in photos:
        new_faces, photo_record = process_single_photo(
            photo_path, metadata, existing_face_ids
        )
        
        if new_faces:
            all_new_faces.extend(new_faces)
        
        if photo_record:
            all_new_photos.append(photo_record)
    
    # Update metadata
    metadata["faces"].extend(all_new_faces)
    metadata["photos"].extend(all_new_photos)
    
    # Save updated metadata
    save_metadata(metadata)
    
    print(f"\nProcessed {len(all_new_photos)} new photos")
    print(f"Detected {len(all_new_faces)} new faces")
    print(f"Total faces: {len(metadata['faces'])}")
    print(f"Total photos: {len(metadata['photos'])}")
    
    return metadata


if __name__ == "__main__":
    detect_and_crop_all()

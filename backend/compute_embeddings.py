"""
Compute face embeddings using face_recognition library.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import face_recognition
import numpy as np

from utils import (
    FACES_DIR,
    PHOTOS_DIR,
    EMBEDDINGS_FILE,
    load_metadata,
    save_metadata,
    ensure_directories,
)


def compute_embedding_from_photo(
    photo_path: Path,
    face_location: Tuple[int, int, int, int]
) -> Optional[np.ndarray]:
    """
    Compute face embedding for a specific face in a photo.
    
    Args:
        photo_path: Path to the photo file.
        face_location: Face location as (top, right, bottom, left).
    
    Returns:
        128-dimensional face embedding as numpy array, or None if failed.
    """
    try:
        # Load image
        image = face_recognition.load_image_file(str(photo_path))
        
        # Compute embedding for the specific face location
        encodings = face_recognition.face_encodings(
            image,
            known_face_locations=[face_location],
            num_jitters=1,
            model="large"  # Use large model for better accuracy
        )
        
        if encodings:
            return encodings[0]
        return None
    except Exception as e:
        print(f"Error computing embedding for {photo_path}: {e}")
        return None


def compute_embedding_from_crop(face_crop_path: Path) -> Optional[np.ndarray]:
    """
    Compute face embedding from a cropped face image.
    
    Args:
        face_crop_path: Path to the cropped face image.
    
    Returns:
        128-dimensional face embedding as numpy array, or None if failed.
    """
    try:
        # Load cropped face image
        image = face_recognition.load_image_file(str(face_crop_path))
        
        # Detect face in the crop (should be just one)
        face_locations = face_recognition.face_locations(image, model="hog")
        
        if not face_locations:
            # If no face detected in crop, use the whole image
            # This can happen with very zoomed-in crops
            encodings = face_recognition.face_encodings(image, num_jitters=1)
        else:
            encodings = face_recognition.face_encodings(
                image,
                known_face_locations=face_locations[:1],
                num_jitters=1
            )
        
        if encodings:
            return encodings[0]
        return None
    except Exception as e:
        print(f"Error computing embedding for {face_crop_path}: {e}")
        return None


def load_embeddings() -> Tuple[np.ndarray, List[str]]:
    """
    Load existing embeddings from file.
    
    Returns:
        Tuple of (embeddings array, list of face IDs).
    """
    if EMBEDDINGS_FILE.exists():
        data = np.load(str(EMBEDDINGS_FILE), allow_pickle=True).item()
        return data.get("embeddings", np.array([])), data.get("face_ids", [])
    return np.array([]), []


def save_embeddings(embeddings: np.ndarray, face_ids: List[str]) -> None:
    """
    Save embeddings to file.
    
    Args:
        embeddings: Array of face embeddings.
        face_ids: List of corresponding face IDs.
    """
    data = {
        "embeddings": embeddings,
        "face_ids": face_ids
    }
    np.save(str(EMBEDDINGS_FILE), data)


def compute_all_embeddings(recompute: bool = False) -> Tuple[np.ndarray, List[str]]:
    """
    Compute embeddings for all faces in metadata.
    
    Args:
        recompute: If True, recompute all embeddings. Otherwise, only compute
                   embeddings for faces without existing embeddings.
    
    Returns:
        Tuple of (embeddings array, list of face IDs).
    """
    ensure_directories()
    
    # Load metadata
    metadata = load_metadata()
    faces = metadata.get("faces", [])
    
    if not faces:
        print("No faces found in metadata")
        return np.array([]), []
    
    # Load existing embeddings
    if recompute:
        existing_embeddings = np.array([])
        existing_face_ids = []
    else:
        existing_embeddings, existing_face_ids = load_embeddings()
    
    existing_face_id_set = set(existing_face_ids)
    
    print(f"Found {len(faces)} faces in metadata")
    print(f"Existing embeddings: {len(existing_face_ids)}")
    
    # Compute embeddings for new faces
    new_embeddings = []
    new_face_ids = []
    
    for face in faces:
        face_id = face["face_id"]
        
        # Skip if already computed
        if face_id in existing_face_id_set:
            continue
        
        # Get the face crop path
        thumbnail = face.get("thumbnail", f"{face_id}.jpg")
        face_crop_path = FACES_DIR / thumbnail
        
        if not face_crop_path.exists():
            print(f"  Face crop not found: {face_crop_path}")
            continue
        
        # Try computing from the crop first
        embedding = compute_embedding_from_crop(face_crop_path)
        
        # If that fails, try from original photo
        if embedding is None:
            photo_path = PHOTOS_DIR / face["photo"]
            if photo_path.exists():
                bbox = face.get("bbox")
                if bbox:
                    embedding = compute_embedding_from_photo(
                        photo_path,
                        tuple(bbox)
                    )
        
        if embedding is not None:
            new_embeddings.append(embedding)
            new_face_ids.append(face_id)
            print(f"  Computed embedding for: {face_id}")
        else:
            print(f"  Failed to compute embedding for: {face_id}")
    
    print(f"\nComputed {len(new_embeddings)} new embeddings")
    
    # Merge with existing embeddings
    if len(existing_embeddings) > 0 and len(new_embeddings) > 0:
        all_embeddings = np.vstack([existing_embeddings, np.array(new_embeddings)])
        all_face_ids = existing_face_ids + new_face_ids
    elif len(new_embeddings) > 0:
        all_embeddings = np.array(new_embeddings)
        all_face_ids = new_face_ids
    else:
        all_embeddings = existing_embeddings
        all_face_ids = existing_face_ids
    
    # Save embeddings
    if len(all_embeddings) > 0:
        save_embeddings(all_embeddings, all_face_ids)
        print(f"Saved {len(all_face_ids)} embeddings to {EMBEDDINGS_FILE}")
    
    return all_embeddings, all_face_ids


def get_embedding_for_face(face_id: str) -> Optional[np.ndarray]:
    """
    Get the embedding for a specific face.
    
    Args:
        face_id: The face ID to look up.
    
    Returns:
        The embedding array or None if not found.
    """
    embeddings, face_ids = load_embeddings()
    
    if face_id in face_ids:
        idx = face_ids.index(face_id)
        return embeddings[idx]
    
    return None


if __name__ == "__main__":
    embeddings, face_ids = compute_all_embeddings()
    print(f"\nTotal embeddings: {len(face_ids)}")
    if len(embeddings) > 0:
        print(f"Embedding shape: {embeddings.shape}")

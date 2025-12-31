"""
Utility functions for the family photos face recognition system.
"""

import os
import json
from typing import Any, Dict, List, Optional
from pathlib import Path


# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
FACES_DIR = DATA_DIR / "faces"
PHOTOS_DIR = DATA_DIR / "photos"
MODELS_DIR = BASE_DIR / "models"

# Data files
METADATA_FILE = DATA_DIR / "metadata.json"
NAME_MAP_FILE = DATA_DIR / "name_map.json"
FAMILY_TREE_FILE = DATA_DIR / "family_tree.json"
EMBEDDINGS_FILE = DATA_DIR / "embeddings.npy"


def ensure_directories() -> None:
    """Ensure all required directories exist."""
    FACES_DIR.mkdir(parents=True, exist_ok=True)
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def load_json(filepath: Path) -> Dict[str, Any]:
    """Load JSON file, return empty dict if not exists."""
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_json(filepath: Path, data: Dict[str, Any]) -> None:
    """Save data to JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_metadata() -> Dict[str, Any]:
    """Load metadata.json file."""
    data = load_json(METADATA_FILE)
    if "faces" not in data:
        data["faces"] = []
    if "photos" not in data:
        data["photos"] = []
    return data


def save_metadata(data: Dict[str, Any]) -> None:
    """Save metadata to metadata.json."""
    save_json(METADATA_FILE, data)


def load_name_map() -> Dict[str, str]:
    """Load name_map.json file."""
    return load_json(NAME_MAP_FILE)


def save_name_map(data: Dict[str, str]) -> None:
    """Save name map to name_map.json."""
    save_json(NAME_MAP_FILE, data)


def load_family_tree() -> Dict[str, Any]:
    """Load family_tree.json file."""
    return load_json(FAMILY_TREE_FILE)


def save_family_tree(data: Dict[str, Any]) -> None:
    """Save family tree to family_tree.json."""
    save_json(FAMILY_TREE_FILE, data)


def get_supported_image_extensions() -> tuple:
    """Return tuple of supported image file extensions."""
    return (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp")


def list_photos(directory: Optional[Path] = None) -> List[Path]:
    """List all supported image files in the photos directory."""
    if directory is None:
        directory = PHOTOS_DIR
    
    extensions = get_supported_image_extensions()
    photos = []
    
    for ext in extensions:
        photos.extend(directory.glob(f"*{ext}"))
        photos.extend(directory.glob(f"*{ext.upper()}"))
    
    return sorted(photos)


def generate_face_id(photo_filename: str, face_index: int) -> str:
    """Generate a unique face ID from photo filename and face index."""
    base_name = Path(photo_filename).stem
    return f"{base_name}_face{face_index}"


def get_face_ids_for_photo(photo_filename: str, metadata: Dict[str, Any]) -> List[str]:
    """Get all face IDs associated with a photo."""
    for photo in metadata.get("photos", []):
        if photo["file"] == photo_filename:
            return photo.get("faces", [])
    return []


def find_face_by_id(face_id: str, metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Find a face record by its ID."""
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            return face
    return None


def get_faces_by_person(name: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get all faces for a specific person name."""
    return [
        face for face in metadata.get("faces", [])
        if face.get("name") == name
    ]


def get_unique_people(metadata: Dict[str, Any]) -> List[str]:
    """Get list of unique person names from metadata."""
    names = set()
    for face in metadata.get("faces", []):
        if face.get("name"):
            names.add(face["name"])
    return sorted(names)


def get_photos_by_date_range(
    metadata: Dict[str, Any],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get photos within a date range (ISO format strings)."""
    photos = metadata.get("photos", [])
    
    if start_date is None and end_date is None:
        return sorted(photos, key=lambda p: p.get("date", ""))
    
    filtered = []
    for photo in photos:
        date = photo.get("date", "")
        if start_date and date < start_date:
            continue
        if end_date and date > end_date:
            continue
        filtered.append(photo)
    
    return sorted(filtered, key=lambda p: p.get("date", ""))


def update_face_name(face_id: str, new_name: str) -> Dict[str, Any]:
    """Update the name for a specific face."""
    metadata = load_metadata()
    
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            old_name = face.get("name")
            face["name"] = new_name
            save_metadata(metadata)
            
            return {
                "face_id": face_id,
                "name": new_name,
                "previous_name": old_name
            }
    
    raise ValueError(f"Face {face_id} not found")


def remove_face_name(face_id: str) -> Dict[str, Any]:
    """Remove the name from a face."""
    metadata = load_metadata()
    
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            old_name = face.get("name")
            face["name"] = None
            save_metadata(metadata)
            
            return {"face_id": face_id, "previous_name": old_name}
    
    raise ValueError(f"Face {face_id} not found")


def get_face_suggestions(face_id: str) -> List[Dict[str, Any]]:
    """Get suggested people for a face based on context."""
    metadata = load_metadata()
    
    # Find the face and its photo
    target_face = None
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            target_face = face
            break
    
    if not target_face:
        return []
    
    suggestions = []
    
    # Find other people in the same photo
    for photo in metadata.get("photos", []):
        if face_id in photo.get("faces", []):
            for other_face_id in photo["faces"]:
                if other_face_id != face_id:
                    for face in metadata["faces"]:
                        if face["face_id"] == other_face_id and face.get("name"):
                            suggestions.append({
                                "name": face["name"],
                                "reason": "appears_in_same_photo"
                            })
    
    # Deduplicate by name
    seen = set()
    unique_suggestions = []
    for s in suggestions:
        if s["name"] not in seen:
            seen.add(s["name"])
            unique_suggestions.append(s)
    
    return unique_suggestions[:5]  # Top 5

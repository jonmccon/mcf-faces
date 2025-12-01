"""
Update and merge metadata for the face recognition system.
"""

from pathlib import Path
from typing import Dict, List, Optional, Any, Set

from utils import (
    load_metadata,
    save_metadata,
    load_name_map,
    save_name_map,
    load_family_tree,
    save_family_tree,
    FACES_DIR,
    PHOTOS_DIR,
)


def update_face_name(face_id: str, name: str) -> bool:
    """
    Update the name for a specific face.
    
    Args:
        face_id: The face ID to update.
        name: The new name to assign.
    
    Returns:
        True if successful, False otherwise.
    """
    metadata = load_metadata()
    
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            face["name"] = name
            save_metadata(metadata)
            return True
    
    return False


def update_cluster_name(cluster_id: int, name: str) -> int:
    """
    Update the name for all faces in a cluster.
    
    Also updates the name_map.json file.
    
    Args:
        cluster_id: The cluster ID to update.
        name: The new name to assign.
    
    Returns:
        Number of faces updated.
    """
    metadata = load_metadata()
    
    updated_count = 0
    for face in metadata.get("faces", []):
        if face.get("person_cluster") == cluster_id:
            face["name"] = name
            updated_count += 1
    
    if updated_count > 0:
        save_metadata(metadata)
        
        # Update name map
        name_map = load_name_map()
        name_map[f"cluster_{cluster_id}"] = name
        save_name_map(name_map)
    
    return updated_count


def update_photo_date(photo_filename: str, date: str) -> bool:
    """
    Manually update the date for a photo and its faces.
    
    Args:
        photo_filename: The photo filename.
        date: The new date in ISO format (YYYY-MM-DD).
    
    Returns:
        True if successful, False otherwise.
    """
    metadata = load_metadata()
    
    # Update photo record
    photo_updated = False
    for photo in metadata.get("photos", []):
        if photo["file"] == photo_filename:
            photo["date"] = date
            photo_updated = True
            break
    
    if not photo_updated:
        return False
    
    # Update all faces from this photo
    for face in metadata.get("faces", []):
        if face["photo"] == photo_filename:
            face["date"] = date
    
    save_metadata(metadata)
    return True


def merge_metadata(new_metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge new metadata into existing metadata.
    
    This is useful for incremental updates.
    
    Args:
        new_metadata: New metadata to merge.
    
    Returns:
        Merged metadata dictionary.
    """
    existing = load_metadata()
    
    # Get existing IDs
    existing_face_ids: Set[str] = {f["face_id"] for f in existing.get("faces", [])}
    existing_photo_files: Set[str] = {p["file"] for p in existing.get("photos", [])}
    
    # Merge faces
    for face in new_metadata.get("faces", []):
        if face["face_id"] not in existing_face_ids:
            existing["faces"].append(face)
            existing_face_ids.add(face["face_id"])
    
    # Merge photos
    for photo in new_metadata.get("photos", []):
        if photo["file"] not in existing_photo_files:
            existing["photos"].append(photo)
            existing_photo_files.add(photo["file"])
    
    save_metadata(existing)
    return existing


def cleanup_orphaned_faces() -> int:
    """
    Remove face records whose thumbnails don't exist.
    
    Returns:
        Number of faces removed.
    """
    metadata = load_metadata()
    
    original_count = len(metadata.get("faces", []))
    
    # Filter faces with existing thumbnails
    valid_faces = []
    for face in metadata.get("faces", []):
        thumbnail = face.get("thumbnail", "")
        if thumbnail and (FACES_DIR / thumbnail).exists():
            valid_faces.append(face)
    
    metadata["faces"] = valid_faces
    removed_count = original_count - len(valid_faces)
    
    if removed_count > 0:
        save_metadata(metadata)
        print(f"Removed {removed_count} orphaned face records")
    
    return removed_count


def cleanup_orphaned_photos() -> int:
    """
    Remove photo records whose files don't exist.
    
    Returns:
        Number of photos removed.
    """
    metadata = load_metadata()
    
    original_count = len(metadata.get("photos", []))
    
    # Filter photos with existing files
    valid_photos = []
    for photo in metadata.get("photos", []):
        photo_file = photo.get("file", "")
        if photo_file and (PHOTOS_DIR / photo_file).exists():
            valid_photos.append(photo)
    
    metadata["photos"] = valid_photos
    removed_count = original_count - len(valid_photos)
    
    if removed_count > 0:
        save_metadata(metadata)
        print(f"Removed {removed_count} orphaned photo records")
    
    return removed_count


def rebuild_photo_face_links() -> None:
    """
    Rebuild the face links in photo records from face records.
    """
    metadata = load_metadata()
    
    # Build photo to faces mapping
    photo_faces: Dict[str, List[str]] = {}
    for face in metadata.get("faces", []):
        photo = face.get("photo", "")
        if photo:
            if photo not in photo_faces:
                photo_faces[photo] = []
            photo_faces[photo].append(face["face_id"])
    
    # Update photo records
    for photo in metadata.get("photos", []):
        photo_file = photo.get("file", "")
        photo["faces"] = photo_faces.get(photo_file, [])
    
    save_metadata(metadata)
    print("Rebuilt photo-face links")


def propagate_names_from_name_map() -> int:
    """
    Apply names from name_map.json to all faces based on cluster IDs.
    
    Returns:
        Number of faces updated.
    """
    metadata = load_metadata()
    name_map = load_name_map()
    
    updated_count = 0
    for face in metadata.get("faces", []):
        cluster_id = face.get("person_cluster", -1)
        if cluster_id >= 0:
            cluster_key = f"cluster_{cluster_id}"
            if cluster_key in name_map:
                new_name = name_map[cluster_key]
                if face.get("name") != new_name:
                    face["name"] = new_name
                    updated_count += 1
    
    if updated_count > 0:
        save_metadata(metadata)
        print(f"Updated names for {updated_count} faces")
    
    return updated_count


def update_family_tree_entry(
    person: str,
    parents: Optional[List[str]] = None,
    children: Optional[List[str]] = None,
    spouse: Optional[str] = None
) -> None:
    """
    Update a person's entry in the family tree.
    
    Args:
        person: The person's name.
        parents: List of parent names.
        children: List of children names.
        spouse: Spouse name.
    """
    tree = load_family_tree()
    
    if person not in tree:
        tree[person] = {}
    
    if parents is not None:
        tree[person]["parents"] = parents
    
    if children is not None:
        tree[person]["children"] = children
    
    if spouse is not None:
        tree[person]["spouse"] = spouse
    
    save_family_tree(tree)
    print(f"Updated family tree entry for {person}")


def remove_family_tree_entry(person: str) -> bool:
    """
    Remove a person from the family tree.
    
    Args:
        person: The person's name to remove.
    
    Returns:
        True if removed, False if not found.
    """
    tree = load_family_tree()
    
    if person in tree:
        del tree[person]
        save_family_tree(tree)
        return True
    
    return False


def get_metadata_statistics() -> Dict[str, Any]:
    """
    Get statistics about the current metadata.
    
    Returns:
        Dictionary with various statistics.
    """
    metadata = load_metadata()
    name_map = load_name_map()
    tree = load_family_tree()
    
    faces = metadata.get("faces", [])
    photos = metadata.get("photos", [])
    
    # Count named vs unnamed faces
    named_faces = sum(1 for f in faces if f.get("name"))
    
    # Count clustered vs unclustered
    clustered = sum(1 for f in faces if f.get("person_cluster", -1) >= 0)
    
    # Get unique cluster IDs
    cluster_ids = set(f.get("person_cluster", -1) for f in faces if f.get("person_cluster", -1) >= 0)
    
    # Get date range
    dates = [f.get("date", "") for f in faces if f.get("date")]
    date_range = (min(dates), max(dates)) if dates else ("", "")
    
    # Count unique people in name map
    unique_names = set(name_map.values())
    
    return {
        "total_photos": len(photos),
        "total_faces": len(faces),
        "named_faces": named_faces,
        "unnamed_faces": len(faces) - named_faces,
        "clustered_faces": clustered,
        "unclustered_faces": len(faces) - clustered,
        "num_clusters": len(cluster_ids),
        "unique_people": len(unique_names),
        "date_range_start": date_range[0],
        "date_range_end": date_range[1],
        "family_tree_entries": len(tree),
    }


if __name__ == "__main__":
    stats = get_metadata_statistics()
    
    print("Metadata Statistics:")
    print(f"  Total photos: {stats['total_photos']}")
    print(f"  Total faces: {stats['total_faces']}")
    print(f"  Named faces: {stats['named_faces']}")
    print(f"  Clustered faces: {stats['clustered_faces']}")
    print(f"  Unique clusters: {stats['num_clusters']}")
    print(f"  Unique people: {stats['unique_people']}")
    if stats['date_range_start']:
        print(f"  Date range: {stats['date_range_start']} to {stats['date_range_end']}")
    print(f"  Family tree entries: {stats['family_tree_entries']}")

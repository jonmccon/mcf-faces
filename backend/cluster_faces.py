"""
Face clustering module using DBSCAN or HDBSCAN.
"""

from typing import Dict, List, Optional, Tuple, Any

import numpy as np
from sklearn.cluster import DBSCAN

from utils import (
    load_metadata,
    save_metadata,
    load_name_map,
    ensure_directories,
)
from compute_embeddings import load_embeddings


def cluster_faces_dbscan(
    embeddings: np.ndarray,
    eps: float = 0.5,
    min_samples: int = 2
) -> np.ndarray:
    """
    Cluster face embeddings using DBSCAN.
    
    Args:
        embeddings: Array of face embeddings (n_samples, n_features).
        eps: Maximum distance between two samples to be considered neighbors.
             Lower values = stricter matching (0.4-0.6 is typical for face recognition).
        min_samples: Minimum number of samples in a neighborhood to form a cluster.
    
    Returns:
        Array of cluster labels for each embedding.
        -1 indicates noise (unclustered).
    """
    if len(embeddings) == 0:
        return np.array([])
    
    # DBSCAN clustering
    clustering = DBSCAN(
        eps=eps,
        min_samples=min_samples,
        metric="euclidean"
    )
    
    labels = clustering.fit_predict(embeddings)
    
    return labels


def try_import_hdbscan():
    """Try to import HDBSCAN, return None if not available."""
    try:
        import hdbscan
        return hdbscan
    except ImportError:
        return None


def cluster_faces_hdbscan(
    embeddings: np.ndarray,
    min_cluster_size: int = 2,
    min_samples: int = 1
) -> np.ndarray:
    """
    Cluster face embeddings using HDBSCAN (if available).
    
    HDBSCAN is better at finding clusters of varying density.
    
    Args:
        embeddings: Array of face embeddings.
        min_cluster_size: Minimum size of clusters.
        min_samples: Number of samples in a neighborhood for a point to be core point.
    
    Returns:
        Array of cluster labels, or None if HDBSCAN not available.
    """
    hdbscan = try_import_hdbscan()
    if hdbscan is None:
        print("HDBSCAN not available, falling back to DBSCAN")
        return None
    
    if len(embeddings) == 0:
        return np.array([])
    
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric="euclidean"
    )
    
    labels = clusterer.fit_predict(embeddings)
    
    return labels


def assign_cluster_ids(
    face_ids: List[str],
    labels: np.ndarray,
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Assign cluster IDs to faces in metadata.
    
    Args:
        face_ids: List of face IDs corresponding to embeddings.
        labels: Cluster labels from clustering algorithm.
        metadata: Current metadata dictionary.
    
    Returns:
        Updated metadata dictionary.
    """
    # Create face_id to label mapping
    face_to_cluster = dict(zip(face_ids, labels))
    
    # Load name map
    name_map = load_name_map()
    
    # Update faces in metadata
    for face in metadata.get("faces", []):
        face_id = face["face_id"]
        
        if face_id in face_to_cluster:
            cluster_id = int(face_to_cluster[face_id])
            face["person_cluster"] = cluster_id
            
            # Assign name from name_map if available
            cluster_key = f"cluster_{cluster_id}"
            if cluster_key in name_map:
                face["name"] = name_map[cluster_key]
    
    return metadata


def get_cluster_statistics(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get statistics about face clusters.
    
    Returns:
        Dictionary with cluster statistics.
    """
    faces = metadata.get("faces", [])
    
    # Count faces per cluster
    cluster_counts = {}
    for face in faces:
        cluster_id = face.get("person_cluster", -1)
        cluster_counts[cluster_id] = cluster_counts.get(cluster_id, 0) + 1
    
    # Calculate statistics
    num_clusters = len([c for c in cluster_counts.keys() if c != -1])
    num_unclustered = cluster_counts.get(-1, 0)
    
    # Get date range per cluster
    cluster_dates = {}
    for face in faces:
        cluster_id = face.get("person_cluster", -1)
        date = face.get("date", "")
        if date and cluster_id != -1:
            if cluster_id not in cluster_dates:
                cluster_dates[cluster_id] = []
            cluster_dates[cluster_id].append(date)
    
    # Compile cluster info
    clusters_info = []
    for cluster_id in sorted(cluster_counts.keys()):
        if cluster_id == -1:
            continue
        
        dates = sorted(cluster_dates.get(cluster_id, []))
        info = {
            "cluster_id": cluster_id,
            "face_count": cluster_counts[cluster_id],
            "earliest_date": dates[0] if dates else "",
            "latest_date": dates[-1] if dates else "",
        }
        
        # Get name if mapped
        name_map = load_name_map()
        cluster_key = f"cluster_{cluster_id}"
        if cluster_key in name_map:
            info["name"] = name_map[cluster_key]
        
        clusters_info.append(info)
    
    return {
        "num_clusters": num_clusters,
        "num_unclustered": num_unclustered,
        "total_faces": len(faces),
        "clusters": clusters_info
    }


def cluster_all_faces(
    method: str = "dbscan",
    eps: float = 0.5,
    min_samples: int = 2
) -> Dict[str, Any]:
    """
    Cluster all faces and update metadata.
    
    Args:
        method: Clustering method ("dbscan" or "hdbscan").
        eps: DBSCAN eps parameter.
        min_samples: Minimum samples parameter.
    
    Returns:
        Cluster statistics dictionary.
    """
    ensure_directories()
    
    # Load embeddings
    embeddings, face_ids = load_embeddings()
    
    if len(embeddings) == 0:
        print("No embeddings found. Run compute_embeddings.py first.")
        return {}
    
    print(f"Clustering {len(embeddings)} faces using {method}")
    
    # Perform clustering
    if method == "hdbscan":
        labels = cluster_faces_hdbscan(embeddings, min_samples=min_samples)
        if labels is None:
            labels = cluster_faces_dbscan(embeddings, eps=eps, min_samples=min_samples)
    else:
        labels = cluster_faces_dbscan(embeddings, eps=eps, min_samples=min_samples)
    
    # Count unique clusters (excluding noise)
    unique_labels = set(labels)
    num_clusters = len([l for l in unique_labels if l != -1])
    num_noise = list(labels).count(-1)
    
    print(f"Found {num_clusters} clusters")
    print(f"Unclustered faces (noise): {num_noise}")
    
    # Update metadata with cluster assignments
    metadata = load_metadata()
    metadata = assign_cluster_ids(face_ids, labels, metadata)
    save_metadata(metadata)
    
    # Return statistics
    stats = get_cluster_statistics(metadata)
    
    print("\nCluster Statistics:")
    print(f"  Total clusters: {stats['num_clusters']}")
    print(f"  Unclustered: {stats['num_unclustered']}")
    print(f"  Total faces: {stats['total_faces']}")
    
    return stats


def merge_clusters(cluster_id_1: int, cluster_id_2: int) -> bool:
    """
    Merge two clusters into one.
    
    Args:
        cluster_id_1: First cluster ID (will be the target).
        cluster_id_2: Second cluster ID (will be merged into first).
    
    Returns:
        True if successful, False otherwise.
    """
    metadata = load_metadata()
    
    merged_count = 0
    for face in metadata.get("faces", []):
        if face.get("person_cluster") == cluster_id_2:
            face["person_cluster"] = cluster_id_1
            merged_count += 1
    
    if merged_count > 0:
        save_metadata(metadata)
        print(f"Merged {merged_count} faces from cluster {cluster_id_2} into cluster {cluster_id_1}")
        return True
    
    return False


def split_face_to_new_cluster(face_id: str) -> Optional[int]:
    """
    Move a face to a new cluster.
    
    Args:
        face_id: The face ID to move.
    
    Returns:
        The new cluster ID, or None if face not found.
    """
    metadata = load_metadata()
    
    # Find max cluster ID
    max_cluster = -1
    for face in metadata.get("faces", []):
        cluster = face.get("person_cluster", -1)
        if cluster > max_cluster:
            max_cluster = cluster
    
    new_cluster_id = max_cluster + 1
    
    # Find and update the face
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            face["person_cluster"] = new_cluster_id
            save_metadata(metadata)
            print(f"Moved face {face_id} to new cluster {new_cluster_id}")
            return new_cluster_id
    
    return None


if __name__ == "__main__":
    stats = cluster_all_faces(method="dbscan", eps=0.5, min_samples=2)
    
    if stats:
        print("\nDetailed cluster info:")
        for cluster in stats.get("clusters", [])[:10]:  # Show first 10
            print(f"  Cluster {cluster['cluster_id']}: {cluster['face_count']} faces")
            if cluster.get("name"):
                print(f"    Name: {cluster['name']}")
            if cluster.get("earliest_date"):
                print(f"    Date range: {cluster['earliest_date']} to {cluster['latest_date']}")

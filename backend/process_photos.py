#!/usr/bin/env python3
"""
Master script for processing family photos.

This script orchestrates the full pipeline:
1. Detect and crop faces from photos
2. Compute face embeddings
3. Cluster faces to identify individuals
4. Update metadata with names from name_map

Usage:
    python process_photos.py [--recompute-embeddings] [--recluster]
"""

import argparse
import sys
from pathlib import Path

from utils import (
    ensure_directories,
    load_metadata,
    save_metadata,
    PHOTOS_DIR,
)
from detect_and_crop import detect_and_crop_all
from compute_embeddings import compute_all_embeddings
from cluster_faces import cluster_all_faces
from update_metadata import (
    propagate_names_from_name_map,
    get_metadata_statistics,
    cleanup_orphaned_faces,
    cleanup_orphaned_photos,
)


def run_pipeline(
    recompute_embeddings: bool = False,
    recluster: bool = False,
    clustering_method: str = "dbscan",
    eps: float = 0.5,
    min_samples: int = 2
) -> None:
    """
    Run the full face recognition pipeline.
    
    Args:
        recompute_embeddings: If True, recompute all embeddings.
        recluster: If True, recluster all faces.
        clustering_method: Method to use for clustering ("dbscan" or "hdbscan").
        eps: DBSCAN eps parameter.
        min_samples: Minimum samples for clustering.
    """
    print("=" * 60)
    print("Family Photos Face Recognition Pipeline")
    print("=" * 60)
    
    # Ensure directories exist
    ensure_directories()
    
    # Check for photos
    extensions = (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp")
    photos = []
    for ext in extensions:
        photos.extend(PHOTOS_DIR.glob(f"*{ext}"))
        photos.extend(PHOTOS_DIR.glob(f"*{ext.upper()}"))
    
    if not photos:
        print(f"\nNo photos found in {PHOTOS_DIR}")
        print("Please add photos to the directory and run again.")
        return
    
    print(f"\nFound {len(photos)} photos in {PHOTOS_DIR}")
    
    # Step 1: Detect and crop faces
    print("\n" + "-" * 60)
    print("Step 1: Detecting and cropping faces")
    print("-" * 60)
    detect_and_crop_all()
    
    # Step 2: Compute embeddings
    print("\n" + "-" * 60)
    print("Step 2: Computing face embeddings")
    print("-" * 60)
    compute_all_embeddings(recompute=recompute_embeddings)
    
    # Step 3: Cluster faces
    print("\n" + "-" * 60)
    print("Step 3: Clustering faces")
    print("-" * 60)
    cluster_all_faces(
        method=clustering_method,
        eps=eps,
        min_samples=min_samples
    )
    
    # Step 4: Apply names from name map
    print("\n" + "-" * 60)
    print("Step 4: Applying names from name map")
    print("-" * 60)
    propagate_names_from_name_map()
    
    # Final statistics
    print("\n" + "=" * 60)
    print("Pipeline Complete!")
    print("=" * 60)
    
    stats = get_metadata_statistics()
    print("\nFinal Statistics:")
    print(f"  Photos processed: {stats['total_photos']}")
    print(f"  Faces detected: {stats['total_faces']}")
    print(f"  Clusters (individuals): {stats['num_clusters']}")
    print(f"  Named faces: {stats['named_faces']}")
    if stats['date_range_start']:
        print(f"  Date range: {stats['date_range_start']} to {stats['date_range_end']}")
    
    print("\nNext steps:")
    print("  1. Run the web UI to view and label faces")
    print("  2. Use name_map.json to assign names to clusters")
    print("  3. Edit family_tree.json to define relationships")


def run_incremental() -> None:
    """
    Run incremental processing for new photos only.
    """
    print("Running incremental update...")
    
    # This is essentially the same pipeline but will skip already-processed photos
    run_pipeline(
        recompute_embeddings=False,
        recluster=True  # Need to recluster to include new faces
    )


def run_cleanup() -> None:
    """
    Clean up orphaned records.
    """
    print("Cleaning up orphaned records...")
    
    faces_removed = cleanup_orphaned_faces()
    photos_removed = cleanup_orphaned_photos()
    
    print(f"Removed {faces_removed} orphaned face records")
    print(f"Removed {photos_removed} orphaned photo records")


def main():
    parser = argparse.ArgumentParser(
        description="Process family photos for face recognition"
    )
    
    parser.add_argument(
        "--recompute-embeddings",
        action="store_true",
        help="Recompute all embeddings from scratch"
    )
    
    parser.add_argument(
        "--recluster",
        action="store_true",
        help="Recluster all faces"
    )
    
    parser.add_argument(
        "--method",
        choices=["dbscan", "hdbscan"],
        default="dbscan",
        help="Clustering method to use (default: dbscan)"
    )
    
    parser.add_argument(
        "--eps",
        type=float,
        default=0.5,
        help="DBSCAN eps parameter (default: 0.5)"
    )
    
    parser.add_argument(
        "--min-samples",
        type=int,
        default=2,
        help="Minimum samples for clustering (default: 2)"
    )
    
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Run incremental update for new photos only"
    )
    
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Clean up orphaned records"
    )
    
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show current statistics only"
    )
    
    args = parser.parse_args()
    
    if args.stats:
        stats = get_metadata_statistics()
        print("Current Statistics:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        return
    
    if args.cleanup:
        run_cleanup()
        return
    
    if args.incremental:
        run_incremental()
        return
    
    run_pipeline(
        recompute_embeddings=args.recompute_embeddings,
        recluster=args.recluster,
        clustering_method=args.method,
        eps=args.eps,
        min_samples=args.min_samples
    )


if __name__ == "__main__":
    main()

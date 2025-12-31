"""
FastAPI server for the Family Photos Face Recognition system.

Provides REST API endpoints for:
- Listing and searching faces
- Managing name mappings
- Managing family tree
- Triggering reprocessing
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Add backend to path for imports
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from utils import (
    load_metadata,
    save_metadata,
    load_name_map,
    save_name_map,
    load_family_tree,
    save_family_tree,
    FACES_DIR,
    PHOTOS_DIR,
    get_unique_people,
    get_faces_by_person,
    get_photos_by_date_range,
    update_face_name,
    remove_face_name,
    get_face_suggestions,
)
from update_metadata import (
    update_cluster_name,
    update_photo_date,
    update_family_tree_entry,
    get_metadata_statistics,
    propagate_names_from_name_map,
)

# Create FastAPI app
app = FastAPI(
    title="Family Photos Face Recognition API",
    description="API for managing family photos and face recognition data",
    version="1.0.0"
)

# Enable CORS for web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving face thumbnails and photos
if FACES_DIR.exists():
    app.mount("/static/faces", StaticFiles(directory=str(FACES_DIR)), name="faces")
if PHOTOS_DIR.exists():
    app.mount("/static/photos", StaticFiles(directory=str(PHOTOS_DIR)), name="photos")


# Pydantic models for request/response
class NameUpdateRequest(BaseModel):
    name: str


class FaceIdentityRequest(BaseModel):
    name: str


class FamilyTreeUpdateRequest(BaseModel):
    person: str
    parents: Optional[List[str]] = None
    children: Optional[List[str]] = None
    spouse: Optional[str] = None


class DateUpdateRequest(BaseModel):
    date: str


class ClusterMergeRequest(BaseModel):
    source_cluster: int
    target_cluster: int


# ============================================================================
# Health Check
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "ok", "message": "Family Photos Face Recognition API"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# ============================================================================
# Statistics
# ============================================================================

@app.get("/stats")
async def get_stats():
    """Get overall statistics."""
    return get_metadata_statistics()


# ============================================================================
# Faces Endpoints
# ============================================================================

@app.get("/faces")
async def list_faces(
    name: Optional[str] = None,
    cluster_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    unrecognized: Optional[bool] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """
    List faces with optional filtering.
    
    Query parameters:
    - name: Filter by person name
    - cluster_id: Filter by cluster ID
    - start_date: Filter by date (ISO format)
    - end_date: Filter by date (ISO format)
    - unrecognized: Filter by recognition status (true for unrecognized faces)
    - limit: Maximum number of results
    - offset: Offset for pagination
    """
    metadata = load_metadata()
    faces = metadata.get("faces", [])
    
    # Apply filters
    if name:
        faces = [f for f in faces if f.get("name") == name]
    
    if cluster_id is not None:
        faces = [f for f in faces if f.get("person_cluster") == cluster_id]
    
    if unrecognized is not None:
        if unrecognized:
            # Faces without a name or with None/empty name
            faces = [f for f in faces if not f.get("name")]
        else:
            # Faces with a name
            faces = [f for f in faces if f.get("name")]
    
    if start_date:
        faces = [f for f in faces if f.get("date", "") >= start_date]
    
    if end_date:
        faces = [f for f in faces if f.get("date", "") <= end_date]
    
    # Sort by date
    faces = sorted(faces, key=lambda f: f.get("date", ""), reverse=True)
    
    # Pagination
    total = len(faces)
    faces = faces[offset:offset + limit]
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "faces": faces
    }


@app.get("/faces/{face_id}")
async def get_face(face_id: str):
    """Get a specific face by ID."""
    metadata = load_metadata()
    
    for face in metadata.get("faces", []):
        if face["face_id"] == face_id:
            return face
    
    raise HTTPException(status_code=404, detail="Face not found")


@app.get("/faces/by_name/{name}")
async def get_faces_by_name(name: str):
    """Get all faces for a specific person."""
    metadata = load_metadata()
    faces = get_faces_by_person(name, metadata)
    
    # Sort by date
    faces = sorted(faces, key=lambda f: f.get("date", ""))
    
    return {
        "name": name,
        "count": len(faces),
        "faces": faces
    }


@app.patch("/faces/{face_id}/identity")
async def update_face_identity(face_id: str, request: FaceIdentityRequest):
    """
    Update or assign a person's name to a face.
    Used for both new assignments and corrections.
    """
    try:
        result = update_face_name(face_id, request.name)
        return {
            **result,
            "status": "updated"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/faces/{face_id}/identity")
async def remove_face_identity(face_id: str):
    """
    Remove the name assignment from a face.
    Resets it to unrecognized state.
    """
    try:
        result = remove_face_name(face_id)
        return {
            **result,
            "status": "removed"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/faces/{face_id}/suggestions")
async def get_face_suggestions_endpoint(face_id: str):
    """
    Get suggested people for this face based on:
    - Other faces in the same photo
    - Recently assigned names
    - Faces from similar time periods
    """
    suggestions = get_face_suggestions(face_id)
    return {
        "face_id": face_id,
        "suggestions": suggestions
    }


# ============================================================================
# People/Names Endpoints
# ============================================================================

@app.get("/people")
async def list_people():
    """List all unique people names."""
    metadata = load_metadata()
    people = get_unique_people(metadata)
    
    # Get face count per person
    result = []
    for name in people:
        faces = get_faces_by_person(name, metadata)
        dates = [f.get("date", "") for f in faces if f.get("date")]
        result.append({
            "name": name,
            "face_count": len(faces),
            "earliest_date": min(dates) if dates else "",
            "latest_date": max(dates) if dates else ""
        })
    
    return result


@app.get("/name_map")
async def get_name_map():
    """Get the current name map (cluster ID to name mapping)."""
    return load_name_map()


@app.post("/name/{cluster_id}")
async def set_cluster_name(cluster_id: int, request: NameUpdateRequest):
    """Set the name for a cluster."""
    count = update_cluster_name(cluster_id, request.name)
    
    if count == 0:
        raise HTTPException(status_code=404, detail="No faces found for this cluster")
    
    return {
        "cluster_id": cluster_id,
        "name": request.name,
        "faces_updated": count
    }


# ============================================================================
# Photos Endpoints
# ============================================================================

@app.get("/photos")
async def list_photos(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    has_faces: Optional[bool] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """
    List photos with optional filtering.
    
    Query parameters:
    - start_date: Filter by date (ISO format)
    - end_date: Filter by date (ISO format)
    - has_faces: Filter by whether photo has detected faces
    - limit: Maximum number of results
    - offset: Offset for pagination
    """
    metadata = load_metadata()
    photos = metadata.get("photos", [])
    
    # Apply filters
    if start_date:
        photos = [p for p in photos if p.get("date", "") >= start_date]
    
    if end_date:
        photos = [p for p in photos if p.get("date", "") <= end_date]
    
    if has_faces is not None:
        if has_faces:
            photos = [p for p in photos if len(p.get("faces", [])) > 0]
        else:
            photos = [p for p in photos if len(p.get("faces", [])) == 0]
    
    # Sort by date
    photos = sorted(photos, key=lambda p: p.get("date", ""), reverse=True)
    
    # Pagination
    total = len(photos)
    photos = photos[offset:offset + limit]
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "photos": photos
    }


@app.get("/photos/{filename}")
async def get_photo_info(filename: str):
    """Get information about a specific photo."""
    metadata = load_metadata()
    
    for photo in metadata.get("photos", []):
        if photo["file"] == filename:
            # Include face details
            face_ids = photo.get("faces", [])
            faces = [
                f for f in metadata.get("faces", [])
                if f["face_id"] in face_ids
            ]
            
            return {
                **photo,
                "face_details": faces
            }
    
    raise HTTPException(status_code=404, detail="Photo not found")


@app.get("/photos/by_date")
async def get_photos_by_date(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get photos within a date range."""
    metadata = load_metadata()
    photos = get_photos_by_date_range(metadata, start_date, end_date)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "count": len(photos),
        "photos": photos
    }


@app.post("/photos/{filename}/date")
async def update_photo_date_endpoint(filename: str, request: DateUpdateRequest):
    """Update the date for a photo."""
    success = update_photo_date(filename, request.date)
    
    if not success:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return {
        "filename": filename,
        "date": request.date,
        "status": "updated"
    }


# ============================================================================
# Family Tree Endpoints
# ============================================================================

@app.get("/family_tree")
async def get_family_tree():
    """Get the complete family tree."""
    return load_family_tree()


@app.get("/family_tree/{person}")
async def get_family_tree_person(person: str):
    """Get family tree entry for a specific person."""
    tree = load_family_tree()
    
    if person not in tree:
        raise HTTPException(status_code=404, detail="Person not found in family tree")
    
    return {
        "person": person,
        **tree[person]
    }


@app.post("/family_tree/update")
async def update_family_tree(request: FamilyTreeUpdateRequest):
    """Update or create a family tree entry."""
    update_family_tree_entry(
        person=request.person,
        parents=request.parents,
        children=request.children,
        spouse=request.spouse
    )
    
    return {
        "person": request.person,
        "status": "updated"
    }


@app.delete("/family_tree/{person}")
async def delete_family_tree_person(person: str):
    """Remove a person from the family tree."""
    tree = load_family_tree()
    
    if person not in tree:
        raise HTTPException(status_code=404, detail="Person not found in family tree")
    
    del tree[person]
    save_family_tree(tree)
    
    return {
        "person": person,
        "status": "deleted"
    }


# ============================================================================
# Clusters Endpoints
# ============================================================================

@app.get("/clusters")
async def list_clusters():
    """List all clusters with their statistics."""
    metadata = load_metadata()
    name_map = load_name_map()
    
    # Group faces by cluster
    cluster_data: Dict[int, Dict[str, Any]] = {}
    
    for face in metadata.get("faces", []):
        cluster_id = face.get("person_cluster", -1)
        
        if cluster_id not in cluster_data:
            cluster_data[cluster_id] = {
                "cluster_id": cluster_id,
                "faces": [],
                "dates": []
            }
        
        cluster_data[cluster_id]["faces"].append(face["face_id"])
        if face.get("date"):
            cluster_data[cluster_id]["dates"].append(face["date"])
    
    # Build result
    result = []
    for cluster_id, data in sorted(cluster_data.items()):
        if cluster_id == -1:
            continue  # Skip unclustered
        
        cluster_key = f"cluster_{cluster_id}"
        dates = sorted(data["dates"])
        
        result.append({
            "cluster_id": cluster_id,
            "name": name_map.get(cluster_key, ""),
            "face_count": len(data["faces"]),
            "face_ids": data["faces"][:5],  # First 5 as sample
            "earliest_date": dates[0] if dates else "",
            "latest_date": dates[-1] if dates else ""
        })
    
    return {
        "total_clusters": len(result),
        "unclustered_faces": len(cluster_data.get(-1, {}).get("faces", [])),
        "clusters": result
    }


@app.post("/clusters/merge")
async def merge_clusters(request: ClusterMergeRequest):
    """Merge two clusters."""
    from cluster_faces import merge_clusters as do_merge
    
    success = do_merge(request.target_cluster, request.source_cluster)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to merge clusters")
    
    return {
        "source_cluster": request.source_cluster,
        "target_cluster": request.target_cluster,
        "status": "merged"
    }


# ============================================================================
# Processing Endpoints
# ============================================================================

@app.post("/reprocess")
async def trigger_reprocess(
    recompute_embeddings: bool = False,
    recluster: bool = True
):
    """
    Trigger reprocessing of photos.
    
    Note: This runs synchronously and may take a while for large photo collections.
    In production, this should be a background task.
    """
    from process_photos import run_pipeline
    
    try:
        run_pipeline(
            recompute_embeddings=recompute_embeddings,
            recluster=recluster
        )
        
        stats = get_metadata_statistics()
        
        return {
            "status": "completed",
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/apply_names")
async def apply_names():
    """Apply names from name_map to all faces."""
    count = propagate_names_from_name_map()
    
    return {
        "faces_updated": count,
        "status": "completed"
    }


# ============================================================================
# Timeline Endpoints
# ============================================================================

@app.get("/timeline")
async def get_timeline():
    """Get a timeline of photos grouped by year."""
    metadata = load_metadata()
    
    # Group photos by year
    years: Dict[str, List[Dict]] = {}
    
    for photo in metadata.get("photos", []):
        date = photo.get("date", "")
        year = date[:4] if date else "Unknown"
        
        if year not in years:
            years[year] = []
        
        years[year].append(photo)
    
    # Sort and format
    result = []
    for year in sorted(years.keys(), reverse=True):
        photos = years[year]
        # Sort photos within year by date
        photos = sorted(photos, key=lambda p: p.get("date", ""))
        
        result.append({
            "year": year,
            "photo_count": len(photos),
            "photos": photos[:10]  # First 10 as sample
        })
    
    return result


@app.get("/timeline/person/{name}")
async def get_person_timeline(name: str):
    """Get timeline of a specific person's appearances."""
    metadata = load_metadata()
    
    # Get faces for this person
    faces = get_faces_by_person(name, metadata)
    
    if not faces:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Group by year
    years: Dict[str, List[Dict]] = {}
    
    for face in faces:
        date = face.get("date", "")
        year = date[:4] if date else "Unknown"
        
        if year not in years:
            years[year] = []
        
        years[year].append(face)
    
    # Sort and format
    result = []
    for year in sorted(years.keys()):
        year_faces = years[year]
        result.append({
            "year": year,
            "appearances": len(year_faces),
            "faces": year_faces
        })
    
    return {
        "name": name,
        "total_appearances": len(faces),
        "timeline": result
    }


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )

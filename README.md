# Family Photos Face Recognition System

A local, privacy-preserving facial recognition and family photo management system built with OpenCV, dlib, and face_recognition. This system helps organize and browse family photos by detecting faces, clustering them to identify individuals, and maintaining family relationships.

## Features

- **Face Detection & Cropping**: Automatically detect and crop faces from family photos
- **Face Embedding & Clustering**: Use machine learning to group faces belonging to the same person
- **Name Management**: Map cluster IDs to real names
- **Family Tree Support**: Define and maintain family relationships
- **Chronological Ordering**: Extract dates from EXIF data or filenames
- **Incremental Processing**: Add new photos without reprocessing existing ones
- **Web UI**: Browse photos by person, year, or family relationship
- **REST API**: FastAPI backend for all operations

## Project Structure

```
family-photos-face-recognition/
│
├── backend/
│   ├── process_photos.py       # Master pipeline script
│   ├── detect_and_crop.py      # Face detection and cropping
│   ├── compute_embeddings.py   # Generate face embeddings
│   ├── cluster_faces.py        # DBSCAN/HDBSCAN clustering
│   ├── update_metadata.py      # Metadata management
│   ├── exif_utils.py           # EXIF date extraction
│   ├── utils.py                # Common utilities
│   ├── data/
│   │   ├── faces/              # Cropped face thumbnails
│   │   ├── photos/             # Source photos
│   │   ├── embeddings.npy      # Face embeddings
│   │   ├── metadata.json       # Face and photo metadata
│   │   ├── name_map.json       # Cluster ID to name mapping
│   │   └── family_tree.json    # Family relationships
│   └── models/                 # Model files (if needed)
│
├── api/
│   └── server.py               # FastAPI server
│
├── web/
│   ├── public/
│   │   └── faces/              # Symlink or copied thumbnails
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── App.jsx             # Main React app
│   │   ├── api.js              # API client
│   │   └── styles.css          # Styling
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 18+
- CMake (for dlib compilation)

### Backend Setup

** don't use a venv on a devcontainer **
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install opencv-python face_recognition numpy scikit-learn pillow fastapi uvicorn python-multipart
   ```
   use `opencv-python-headless` for devcontainers / codespaces

   may also need to install `git+https://github.com/ageitgey/face_recognition_models`

   Note: `face_recognition` requires `dlib`, which may need CMake and a C++ compiler to build.

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd web
   npm install
   ```

## Usage

### 1. Add Photos

Place your family photos in `backend/data/photos/`:

```bash
cp /path/to/your/photos/* backend/data/photos/
```

Supported formats: JPG, JPEG, PNG, GIF, BMP, TIFF, WEBP

### 2. Process Photos

Run the main processing pipeline:

```bash
cd backend
python process_photos.py
```

This will:
1. Detect and crop all faces
2. Compute face embeddings
3. Cluster faces to identify individuals
4. Apply any existing name mappings

#### Pipeline Options

```bash
# Recompute all embeddings from scratch
python process_photos.py --recompute-embeddings

# Recluster all faces
python process_photos.py --recluster

# Use HDBSCAN clustering (requires hdbscan package)
python process_photos.py --method hdbscan

# Adjust clustering parameters
python process_photos.py --eps 0.4 --min-samples 3

# Incremental update (for new photos only)
python process_photos.py --incremental

# Show current statistics
python process_photos.py --stats

# Clean up orphaned records
python process_photos.py --cleanup
```

### 3. Start the API Server

```bash
cd api
python server.py
```

The API will be available at `http://localhost:8000`.

### 4. Start the Web UI

```bash
cd web
npm run dev
```

The UI will be available at `http://localhost:3000`.

#### Simplified Gallery View

For a lightweight, read-only gallery view, you can access the simplified gallery at `http://localhost:3000/gallery.html`. This standalone HTML page provides:

- Clean, minimal photo grid interface
- No authentication or admin features required
- Perfect for public sharing or embedding
- Responsive design for all devices
- Click photos to view full-size

See [web/GALLERY.md](web/GALLERY.md) for more details.

### 5. Label Faces

1. Open the web UI
2. Go to the "Clusters" tab
3. Click "Name" or "Edit" to assign names to face clusters
4. All faces in a cluster will be automatically labeled

### 6. Define Family Relationships

1. Go to the "Family Tree" tab
2. Click "Add Person" to create entries
3. Define parents, children, and spouse relationships

## API Endpoints

### Statistics
- `GET /stats` - Get overall statistics

### Faces
- `GET /faces` - List all faces (with filtering)
- `GET /faces/{face_id}` - Get specific face
- `GET /faces/by_name/{name}` - Get faces by person name

### Photos
- `GET /photos` - List all photos (with filtering)
- `GET /photos/{filename}` - Get photo info
- `GET /photos/by_date` - Get photos by date range
- `POST /photos/{filename}/date` - Update photo date

### People & Names
- `GET /people` - List all people
- `GET /name_map` - Get cluster-to-name mapping
- `POST /name/{cluster_id}` - Set name for cluster

### Family Tree
- `GET /family_tree` - Get complete family tree
- `GET /family_tree/{person}` - Get person's relationships
- `POST /family_tree/update` - Update family tree entry
- `DELETE /family_tree/{person}` - Remove person from tree

### Clusters
- `GET /clusters` - List all face clusters
- `POST /clusters/merge` - Merge two clusters

### Processing
- `POST /reprocess` - Trigger photo reprocessing
- `POST /apply_names` - Apply name map to all faces

### Timeline
- `GET /timeline` - Get photos grouped by year
- `GET /timeline/person/{name}` - Get person's timeline

## Data Models

### metadata.json

```json
{
  "faces": [
    {
      "face_id": "photo123_face0",
      "photo": "photo123.jpg",
      "person_cluster": 7,
      "name": "Robert Johnson",
      "bbox": [100, 300, 250, 150],
      "date": "2001-05-12",
      "thumbnail": "photo123_face0.jpg"
    }
  ],
  "photos": [
    {
      "file": "photo123.jpg",
      "date": "2001-05-12",
      "faces": ["photo123_face0", "photo123_face1"]
    }
  ]
}
```

### name_map.json

```json
{
  "cluster_4": "Alice Johnson",
  "cluster_7": "Robert Johnson",
  "cluster_12": "Grandma Rose"
}
```

### family_tree.json

```json
{
  "Alice Johnson": {
    "parents": ["Robert Johnson", "Mary Johnson"],
    "children": ["Tom Johnson"],
    "spouse": "Mark Johnson"
  }
}
```

## Adding New Photos

1. Copy new photos to `backend/data/photos/`
2. Run the incremental pipeline:
   ```bash
   cd backend
   python process_photos.py --incremental
   ```
3. Refresh the web UI

The system will:
- Detect faces in new photos only
- Generate embeddings for new faces
- Recluster to assign cluster IDs
- Apply existing name mappings

## Tips for Best Results

### Photo Quality
- Higher resolution photos yield better face detection
- Good lighting improves recognition accuracy
- Front-facing photos work better than profiles

### Clustering Parameters
- Lower `eps` (e.g., 0.4) = stricter matching, more clusters
- Higher `eps` (e.g., 0.6) = looser matching, fewer clusters
- Adjust `min-samples` based on expected appearances per person

### Date Extraction
The system extracts dates in this order:
1. EXIF `DateTimeOriginal`
2. EXIF `DateTimeDigitized`
3. EXIF `DateTime`
4. Filename patterns (e.g., `2021-05-12`, `IMG_20210512`)

### Manual Date Override
Use the API to manually set dates:
```bash
curl -X POST "http://localhost:8000/photos/photo123.jpg/date" \
  -H "Content-Type: application/json" \
  -d '{"date": "2001-05-12"}'
```

## Troubleshooting

### dlib Installation Issues
If you have trouble installing `face_recognition`:
```bash
# Ubuntu/Debian
sudo apt-get install cmake libboost-all-dev

# macOS
brew install cmake boost

# Then install
pip install dlib face_recognition
```

### No Faces Detected
- Check image quality and resolution
- Try adjusting the detection model in `detect_and_crop.py`
- Ensure faces are visible and not too small

### Too Many/Few Clusters
- Adjust the `eps` parameter (lower = more clusters)
- Try HDBSCAN for varying density: `--method hdbscan`

## License

MIT License
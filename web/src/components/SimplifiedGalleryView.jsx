import { useState, useEffect } from 'react';
import * as api from '../api';

// Constants
const FALLBACK_DATE_MAX = '9999-12-31'; // For sorting unknown dates to the end
const FALLBACK_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f1f5f9" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="16">Photo unavailable</text></svg>';

/**
 * SimplifiedGalleryView - A minimal, clean gallery interface
 * 
 * Features:
 * - Grid layout with responsive design
 * - Simple photo display without overlays or complex filters
 * - Minimal controls for easy navigation
 * - Click photos to view details
 * - Easily extensible for future features (sorting, filtering, etc.)
 */
function SimplifiedGalleryView({ onPhotoClick }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, name

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const data = await api.listPhotos({ limit: 200 });
      
      // Load face details for each photo (for metadata)
      const photoPromises = data.photos.map(photo => 
        api.getPhoto(photo.file).catch(() => ({ ...photo, face_details: [] }))
      );
      const photosData = await Promise.all(photoPromises);
      setPhotos(photosData);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSortedPhotos = () => {
    const sorted = [...photos];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = a.date || '0000-00-00';
          const dateB = b.date || '0000-00-00';
          return dateB.localeCompare(dateA);
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = a.date || FALLBACK_DATE_MAX;
          const dateB = b.date || FALLBACK_DATE_MAX;
          return dateA.localeCompare(dateB);
        });
      case 'name':
        return sorted.sort((a, b) => a.file.localeCompare(b.file));
      default:
        return sorted;
    }
  };

  if (loading) {
    return (
      <div className="simplified-gallery-loading">
        <div className="spinner"></div>
        <p>Loading gallery...</p>
      </div>
    );
  }

  const sortedPhotos = getSortedPhotos();

  return (
    <div className="simplified-gallery">
      {/* Minimal header with sort option */}
      <div className="simplified-gallery-header">
        <h2 className="simplified-gallery-title">Photo Gallery</h2>
        <div className="simplified-gallery-controls">
          <label htmlFor="sort-select" className="simplified-sort-label">Sort by:</label>
          <select 
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="simplified-sort-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Photo count */}
      <div className="simplified-gallery-info">
        <p>{sortedPhotos.length} photo{sortedPhotos.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Empty state */}
      {sortedPhotos.length === 0 ? (
        <div className="simplified-gallery-empty">
          <div className="simplified-empty-icon">📷</div>
          <h3>No photos yet</h3>
          <p>Add photos to your collection to see them here</p>
        </div>
      ) : (
        /* Responsive grid */
        <div className="simplified-gallery-grid">
          {sortedPhotos.map(photo => (
            <div 
              key={photo.file}
              className="simplified-gallery-item"
              onClick={() => onPhotoClick && onPhotoClick(photo)}
            >
              <img 
                src={api.getPhotoUrl(photo.file)}
                alt={photo.date || 'Photo'}
                className="simplified-gallery-image"
                loading="lazy"
                onError={(e) => {
                  e.target.src = FALLBACK_SVG;
                }}
              />
              {/* Optional: Date overlay (minimal) */}
              {photo.date && (
                <div className="simplified-gallery-date-tag">
                  {photo.date}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SimplifiedGalleryView;

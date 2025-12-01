import { useState, useEffect } from 'react';
import * as api from '../api';

function MemoriesView({ onFaceClick, onPhotoClick }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState(null);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const timelineData = await api.getTimeline();
      
      // Enrich timeline with photo details
      const enrichedTimeline = await Promise.all(
        timelineData.map(async (year) => {
          const photosWithFaces = await Promise.all(
            year.photos.map(async (photo) => {
              try {
                const details = await api.getPhoto(photo.file);
                return details;
              } catch {
                return { ...photo, face_details: [] };
              }
            })
          );
          return {
            ...year,
            photos: photosWithFaces
          };
        })
      );
      
      setTimeline(enrichedTimeline);
      // Auto-expand the first year
      if (enrichedTimeline.length > 0) {
        setExpandedYear(enrichedTimeline[0].year);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="empty-state">
        <h3>No memories yet</h3>
        <p>Add photos with dates to see your memories timeline.</p>
      </div>
    );
  }

  // Get all unique people across all photos
  const getAllPeople = () => {
    const people = new Set();
    timeline.forEach(year => {
      year.photos.forEach(photo => {
        if (photo.face_details) {
          photo.face_details.forEach(face => {
            if (face.name) people.add(face.name);
          });
        }
      });
    });
    return Array.from(people).sort();
  };

  const allPeople = getAllPeople();

  return (
    <div className="memories-view">
      <div className="memories-header">
        <h2>📸 Family Memories</h2>
        <p className="memories-subtitle">
          {timeline.reduce((sum, y) => sum + y.photo_count, 0)} photos spanning {timeline.length} year{timeline.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* People quick access */}
      {allPeople.length > 0 && (
        <div className="memories-people-bar">
          <span className="people-label">People in photos:</span>
          <div className="people-chips">
            {allPeople.map(name => (
              <span key={name} className="people-chip">{name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Year sections */}
      <div className="memories-timeline">
        {timeline.map(year => (
          <div 
            key={year.year}
            className={`memories-year ${expandedYear === year.year ? 'expanded' : ''}`}
          >
            <div 
              className="memories-year-header"
              onClick={() => setExpandedYear(expandedYear === year.year ? null : year.year)}
            >
              <div className="year-info">
                <span className="year-number">{year.year}</span>
                <span className="year-stats">{year.photo_count} photo{year.photo_count !== 1 ? 's' : ''}</span>
              </div>
              <span className="year-expand-icon">{expandedYear === year.year ? '▼' : '▶'}</span>
            </div>

            {expandedYear === year.year && (
              <div className="memories-year-content">
                <div className="memories-photo-grid">
                  {year.photos.map(photo => (
                    <div 
                      key={photo.file}
                      className="memories-photo-card"
                      onClick={() => onPhotoClick && onPhotoClick(photo)}
                    >
                      <div className="memories-photo-image">
                        <img 
                          src={api.getPhotoUrl(photo.file)}
                          alt={photo.file}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23e2e8f0" width="400" height="300"/></svg>';
                          }}
                        />
                      </div>
                      <div className="memories-photo-overlay">
                        <span className="photo-date">{photo.date}</span>
                        {photo.face_details && photo.face_details.length > 0 && (
                          <div className="photo-faces-preview">
                            {photo.face_details.slice(0, 3).map(face => (
                              <img 
                                key={face.face_id}
                                src={api.getFaceThumbnailUrl(face.thumbnail)}
                                alt={face.name || 'Unknown'}
                                className="face-preview-thumb"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFaceClick && onFaceClick(face);
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {photo.face_details && photo.face_details.length > 0 && (
                        <div className="memories-photo-people">
                          {photo.face_details.map(f => f.name).filter(Boolean).join(', ') || 
                           `${photo.face_details.length} person${photo.face_details.length !== 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MemoriesView;

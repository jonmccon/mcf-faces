import { useState, useEffect } from 'react';
import * as api from '../api';

function GalleryView({ onFaceClick, onPhotoClick }) {
  const [photos, setPhotos] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [selectedPerson]);

  const loadData = async () => {
    try {
      const peopleData = await api.listPeople();
      setPeople(peopleData);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (selectedPerson) {
        // Get faces for this person to find their photos
        const facesData = await api.getFacesByName(selectedPerson);
        const photoFiles = [...new Set(facesData.faces.map(f => f.photo))];
        // Load each photo's details
        const photoPromises = photoFiles.map(file => api.getPhoto(file).catch(() => null));
        const photosData = await Promise.all(photoPromises);
        setPhotos(photosData.filter(p => p !== null));
      } else {
        const data = await api.listPhotos(params);
        // Load face details for each photo
        const photoPromises = data.photos.map(photo => 
          api.getPhoto(photo.file).catch(() => ({ ...photo, face_details: [] }))
        );
        const photosData = await Promise.all(photoPromises);
        setPhotos(photosData);
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
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

  return (
    <div className="gallery-view">
      <div className="gallery-header">
        <h2>Photo Gallery</h2>
        <div className="gallery-filter">
          <select 
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="gallery-select"
          >
            <option value="">All Photos</option>
            {people.map(person => (
              <option key={person.name} value={person.name}>
                {person.name} ({person.face_count} photos)
              </option>
            ))}
          </select>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="empty-state">
          <h3>No photos found</h3>
          <p>Add photos to the system to see them here.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map(photo => (
            <div 
              key={photo.file}
              className="gallery-item"
              onClick={() => onPhotoClick && onPhotoClick(photo)}
            >
              <div className="gallery-image-container">
                <img 
                  src={api.getPhotoUrl(photo.file)}
                  alt={photo.file}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23e2e8f0" width="400" height="300"/><text x="200" y="155" text-anchor="middle" fill="%2364748b" font-size="14">Photo</text></svg>';
                  }}
                />
                {photo.face_details && photo.face_details.length > 0 && (
                  <div className="gallery-faces-strip">
                    {photo.face_details.slice(0, 4).map(face => (
                      <div 
                        key={face.face_id}
                        className="gallery-face-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFaceClick && onFaceClick(face);
                        }}
                        title={face.name || 'Unknown'}
                      >
                        <img 
                          src={api.getFaceThumbnailUrl(face.thumbnail)}
                          alt={face.name || 'Unknown'}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {face.name && <span className="face-badge-name">{face.name.split(' ')[0]}</span>}
                      </div>
                    ))}
                    {photo.face_details.length > 4 && (
                      <div className="gallery-face-more">+{photo.face_details.length - 4}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="gallery-item-info">
                <span className="gallery-date">{photo.date || 'Unknown date'}</span>
                {photo.face_details && photo.face_details.length > 0 && (
                  <span className="gallery-people">
                    {photo.face_details.map(f => f.name).filter(Boolean).join(', ') || 
                     `${photo.face_details.length} face${photo.face_details.length !== 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GalleryView;

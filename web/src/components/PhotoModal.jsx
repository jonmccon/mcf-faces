import { useState, useEffect } from 'react';
import * as api from '../api';

function PhotoModal({ photo, onClose, onFaceClick }) {
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotoData();
  }, [photo.file]);

  const loadPhotoData = async () => {
    try {
      setLoading(true);
      const data = await api.getPhoto(photo.file);
      setPhotoData(data);
    } catch (err) {
      console.error('Failed to load photo data:', err);
      setPhotoData({
        ...photo,
        face_details: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{photo.file}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <img 
                  src={api.getPhotoUrl(photo.file)}
                  alt={photo.file}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '400px',
                    borderRadius: 'var(--radius)',
                    display: 'block',
                    margin: '0 auto'
                  }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23e2e8f0" width="400" height="300"/><text x="200" y="155" text-anchor="middle" fill="%2364748b" font-size="16">Image not available</text></svg>';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p><strong>Date:</strong> {photoData?.date || 'Unknown'}</p>
                  <p><strong>Faces detected:</strong> {photoData?.faces?.length || 0}</p>
                </div>
              </div>

              {photoData?.face_details && photoData.face_details.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '12px' }}>Faces in this photo</h4>
                  <div className="faces-grid">
                    {photoData.face_details.map(face => (
                      <div 
                        key={face.face_id}
                        className="face-card"
                        onClick={() => {
                          onFaceClick(face);
                          onClose();
                        }}
                      >
                        <img 
                          src={api.getFaceThumbnailUrl(face.thumbnail)}
                          alt={face.name || 'Unknown'}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/></svg>';
                          }}
                        />
                        <div className="face-info">
                          <div className="face-name">{face.name || `Cluster ${face.person_cluster}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhotoModal;

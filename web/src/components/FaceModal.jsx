import { useState, useEffect } from 'react';
import * as api from '../api';

function FaceModal({ face, onClose, onPhotoClick, onDataChange }) {
  const [faceData, setFaceData] = useState(face);
  const [familyTree, setFamilyTree] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFaceData();
    loadFamilyTree();
  }, [face.face_id]);

  const loadFaceData = async () => {
    try {
      setLoading(true);
      const data = await api.getFace(face.face_id);
      setFaceData(data);
    } catch (err) {
      console.error('Failed to load face data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyTree = async () => {
    try {
      const data = await api.getFamilyTree();
      setFamilyTree(data);
    } catch (err) {
      console.error('Failed to load family tree:', err);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const personRelations = faceData.name ? familyTree[faceData.name] : null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>{faceData.name || `Cluster ${faceData.person_cluster}`}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <img 
                  src={api.getFaceThumbnailUrl(faceData.thumbnail)}
                  alt={faceData.name || 'Face'}
                  style={{ 
                    width: '150px', 
                    height: '150px', 
                    objectFit: 'cover',
                    borderRadius: 'var(--radius)'
                  }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect fill="%23e2e8f0" width="150" height="150"/><text x="75" y="80" text-anchor="middle" fill="%2364748b" font-size="14">No image</text></svg>';
                  }}
                />
                <div>
                  <p><strong>Face ID:</strong> {faceData.face_id}</p>
                  <p><strong>Photo:</strong> 
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        onPhotoClick({ file: faceData.photo });
                        onClose();
                      }}
                      style={{ marginLeft: '4px', color: 'var(--primary-color)' }}
                    >
                      {faceData.photo}
                    </a>
                  </p>
                  <p><strong>Date:</strong> {faceData.date || 'Unknown'}</p>
                  <p><strong>Cluster:</strong> {faceData.person_cluster}</p>
                  {faceData.bbox && (
                    <p><strong>Bounding Box:</strong> [{faceData.bbox.join(', ')}]</p>
                  )}
                </div>
              </div>

              {personRelations && (
                <div style={{ 
                  background: 'var(--background)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius)',
                  marginBottom: '16px'
                }}>
                  <h4 style={{ marginBottom: '8px' }}>Family Relationships</h4>
                  {personRelations.parents && personRelations.parents.length > 0 && (
                    <p><strong>Parents:</strong> {personRelations.parents.join(', ')}</p>
                  )}
                  {personRelations.spouse && (
                    <p><strong>Spouse:</strong> {personRelations.spouse}</p>
                  )}
                  {personRelations.children && personRelations.children.length > 0 && (
                    <p><strong>Children:</strong> {personRelations.children.join(', ')}</p>
                  )}
                </div>
              )}

              <div>
                <h4 style={{ marginBottom: '8px' }}>Original Photo</h4>
                <img 
                  src={api.getPhotoUrl(faceData.photo)}
                  alt={faceData.photo}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '300px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onPhotoClick({ file: faceData.photo });
                    onClose();
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
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

export default FaceModal;

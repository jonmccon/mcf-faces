import { useState, useEffect } from 'react';
import * as api from '../api';

function PhotosView({ onPhotoClick }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    has_faces: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 30
  });

  useEffect(() => {
    loadPhotos();
  }, [filters, pagination.offset]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      // Remove empty values, but keep has_faces if set
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined) delete params[key];
      });

      if (filters.has_faces !== '') {
        params.has_faces = filters.has_faces === 'true';
      }

      const data = await api.listPhotos(params);
      setPhotos(data.photos);
      setPagination(prev => ({
        ...prev,
        total: data.total
      }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (newOffset) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  if (loading && photos.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="filters">
        <div className="form-group">
          <label>From Date</label>
          <input 
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>To Date</label>
          <input 
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Has Faces</label>
          <select 
            value={filters.has_faces}
            onChange={(e) => handleFilterChange('has_faces', e.target.value)}
          >
            <option value="">All photos</option>
            <option value="true">With faces</option>
            <option value="false">Without faces</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {photos.length === 0 ? (
        <div className="empty-state">
          <h3>No photos found</h3>
          <p>Try adjusting your filters or add some photos to the backend/data/photos directory.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h2>Photos ({pagination.total})</h2>
              <div>
                Page {currentPage} of {totalPages || 1}
              </div>
            </div>
            <div className="card-body">
              <div className="photos-grid">
                {photos.map(photo => (
                  <div 
                    key={photo.file}
                    className="photo-card"
                    onClick={() => onPhotoClick(photo)}
                  >
                    <img 
                      src={api.getPhotoUrl(photo.file)}
                      alt={photo.file}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75"><rect fill="%23e2e8f0" width="100" height="75"/><text x="50" y="40" text-anchor="middle" fill="%2364748b" font-size="10">No preview</text></svg>';
                      }}
                    />
                    <div className="photo-info">
                      <div className="photo-filename" title={photo.file}>{photo.file}</div>
                      <div className="photo-date">{photo.date || 'Unknown date'}</div>
                      <div className="photo-faces-count">
                        {photo.faces.length} face{photo.faces.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(pagination.offset + pagination.limit)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PhotosView;

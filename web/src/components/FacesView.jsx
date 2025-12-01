import { useState, useEffect } from 'react';
import * as api from '../api';

function FacesView({ onFaceClick, onPhotoClick }) {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    start_date: '',
    end_date: ''
  });
  const [people, setPeople] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 50
  });

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    loadFaces();
  }, [filters, pagination.offset]);

  const loadPeople = async () => {
    try {
      const data = await api.listPeople();
      setPeople(data);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  };

  const loadFaces = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const data = await api.listFaces(params);
      setFaces(data.faces);
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

  if (loading && faces.length === 0) {
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
          <label>Person</label>
          <select 
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
          >
            <option value="">All people</option>
            {people.map(person => (
              <option key={person.name} value={person.name}>
                {person.name} ({person.face_count})
              </option>
            ))}
          </select>
        </div>
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
      </div>

      {error && <div className="error">{error}</div>}

      {faces.length === 0 ? (
        <div className="empty-state">
          <h3>No faces found</h3>
          <p>Try adjusting your filters or add some photos to process.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h2>Faces ({pagination.total})</h2>
              <div>
                Page {currentPage} of {totalPages || 1}
              </div>
            </div>
            <div className="card-body">
              <div className="faces-grid">
                {faces.map(face => (
                  <div 
                    key={face.face_id}
                    className="face-card"
                    onClick={() => onFaceClick(face)}
                  >
                    <img 
                      src={api.getFaceThumbnailUrl(face.thumbnail)}
                      alt={face.name || 'Unknown'}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="12">No image</text></svg>';
                      }}
                    />
                    <div className="face-info">
                      <div className="face-name">{face.name || `Cluster ${face.person_cluster}`}</div>
                      <div className="face-date">{face.date || 'Unknown date'}</div>
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

export default FacesView;

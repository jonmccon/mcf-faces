import { useState, useEffect } from 'react';
import * as api from '../api';
import FaceCard from './FaceCard';
import Toast from './Toast';

function FacesView({ onFaceClick, onPhotoClick }) {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    start_date: '',
    end_date: '',
    unrecognized: false
  });
  const [people, setPeople] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 50
  });
  const [toast, setToast] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

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
      
      // Remove empty values and false unrecognized filter
      Object.keys(params).forEach(key => {
        if (params[key] === '' || (key === 'unrecognized' && params[key] === false)) {
          delete params[key];
        }
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

  const handleFaceUpdate = async (faceId, newName) => {
    const oldFace = faces.find(f => f.face_id === faceId);
    
    // Optimistic update
    setFaces(prev => prev.map(f => 
      f.face_id === faceId ? {...f, name: newName} : f
    ));
    
    try {
      await api.updateFaceIdentity(faceId, newName);
      
      // Reload people list
      loadPeople();
      
      // Show success toast with undo
      setToast({
        message: 'Face identity updated!',
        type: 'success',
        undoData: { type: 'update', face: oldFace }
      });
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-4), { type: 'update', face: oldFace }]);
      
    } catch (err) {
      // Rollback on error
      setFaces(prev => prev.map(f => 
        f.face_id === faceId ? oldFace : f
      ));
      setToast({ 
        message: `Failed to update: ${err.message}`, 
        type: 'error' 
      });
    }
  };

  const handleFaceDelete = async (faceId) => {
    const oldFace = faces.find(f => f.face_id === faceId);
    
    // Optimistic update
    setFaces(prev => prev.map(f => 
      f.face_id === faceId ? {...f, name: null} : f
    ));
    
    try {
      await api.removeFaceIdentity(faceId);
      
      // Reload people list
      loadPeople();
      
      // Show success toast with undo
      setToast({
        message: 'Face identity removed!',
        type: 'success',
        undoData: { type: 'delete', face: oldFace }
      });
      
      // Add to undo stack
      setUndoStack(prev => [...prev.slice(-4), { type: 'delete', face: oldFace }]);
      
    } catch (err) {
      // Rollback on error
      setFaces(prev => prev.map(f => 
        f.face_id === faceId ? oldFace : f
      ));
      setToast({ 
        message: `Failed to remove: ${err.message}`, 
        type: 'error' 
      });
    }
  };

  const handleUndo = async () => {
    if (!toast?.undoData) return;
    
    const undoData = toast.undoData;
    const face = undoData.face;
    
    try {
      if (undoData.type === 'update' || undoData.type === 'delete') {
        // Restore the original face data
        if (face.name) {
          await api.updateFaceIdentity(face.face_id, face.name);
        } else {
          await api.removeFaceIdentity(face.face_id);
        }
        
        // Update local state
        setFaces(prev => prev.map(f => 
          f.face_id === face.face_id ? face : f
        ));
        
        // Reload people list
        loadPeople();
        
        setToast({ message: 'Change undone', type: 'info' });
      }
    } catch (err) {
      setToast({ 
        message: `Failed to undo: ${err.message}`, 
        type: 'error' 
      });
    }
  };

  const handleCloseToast = () => {
    setToast(null);
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
        <div className="form-group">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filters.unrecognized}
              onChange={(e) => handleFilterChange('unrecognized', e.target.checked)}
            />
            <span>Show only unrecognized</span>
          </label>
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
                  <FaceCard
                    key={face.face_id}
                    face={face}
                    people={people}
                    onUpdate={handleFaceUpdate}
                    onDelete={handleFaceDelete}
                    onClick={onFaceClick}
                  />
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
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onUndo={toast.undoData ? handleUndo : null}
          onClose={handleCloseToast}
        />
      )}
    </div>
  );
}

export default FacesView;

import { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import FacesView from './components/FacesView';
import PhotosView from './components/PhotosView';
import PeopleView from './components/PeopleView';
import ClustersView from './components/ClustersView';
import TimelineView from './components/TimelineView';
import FamilyTreeView from './components/FamilyTreeView';
import FaceModal from './components/FaceModal';
import PhotoModal from './components/PhotoModal';

function App() {
  const [view, setView] = useState('faces');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedFace, setSelectedFace] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadStats()
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadStats]);

  const handleFaceClick = (face) => {
    setSelectedFace(face);
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleCloseModals = () => {
    setSelectedFace(null);
    setSelectedPhoto(null);
  };

  const handleDataChange = () => {
    loadStats();
  };

  const renderView = () => {
    switch (view) {
      case 'faces':
        return <FacesView onFaceClick={handleFaceClick} onPhotoClick={handlePhotoClick} />;
      case 'photos':
        return <PhotosView onPhotoClick={handlePhotoClick} />;
      case 'people':
        return <PeopleView onFaceClick={handleFaceClick} />;
      case 'clusters':
        return <ClustersView onDataChange={handleDataChange} onFaceClick={handleFaceClick} />;
      case 'timeline':
        return <TimelineView onPhotoClick={handlePhotoClick} />;
      case 'family':
        return <FamilyTreeView onDataChange={handleDataChange} />;
      default:
        return <FacesView onFaceClick={handleFaceClick} onPhotoClick={handlePhotoClick} />;
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Family Photos Face Recognition</h1>
        <nav className="nav">
          <button 
            className={`nav-btn ${view === 'faces' ? 'active' : ''}`}
            onClick={() => setView('faces')}
          >
            Faces
          </button>
          <button 
            className={`nav-btn ${view === 'photos' ? 'active' : ''}`}
            onClick={() => setView('photos')}
          >
            Photos
          </button>
          <button 
            className={`nav-btn ${view === 'people' ? 'active' : ''}`}
            onClick={() => setView('people')}
          >
            People
          </button>
          <button 
            className={`nav-btn ${view === 'clusters' ? 'active' : ''}`}
            onClick={() => setView('clusters')}
          >
            Clusters
          </button>
          <button 
            className={`nav-btn ${view === 'timeline' ? 'active' : ''}`}
            onClick={() => setView('timeline')}
          >
            Timeline
          </button>
          <button 
            className={`nav-btn ${view === 'family' ? 'active' : ''}`}
            onClick={() => setView('family')}
          >
            Family Tree
          </button>
        </nav>
      </header>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Photos</h3>
            <div className="value">{stats.total_photos}</div>
          </div>
          <div className="stat-card">
            <h3>Faces</h3>
            <div className="value">{stats.total_faces}</div>
          </div>
          <div className="stat-card">
            <h3>People</h3>
            <div className="value">{stats.unique_people}</div>
          </div>
          <div className="stat-card">
            <h3>Clusters</h3>
            <div className="value">{stats.num_clusters}</div>
          </div>
          <div className="stat-card">
            <h3>Named</h3>
            <div className="value">{stats.named_faces}</div>
          </div>
          <div className="stat-card">
            <h3>Unnamed</h3>
            <div className="value">{stats.unnamed_faces}</div>
          </div>
        </div>
      )}

      {renderView()}

      {selectedFace && (
        <FaceModal 
          face={selectedFace} 
          onClose={handleCloseModals}
          onPhotoClick={handlePhotoClick}
          onDataChange={handleDataChange}
        />
      )}

      {selectedPhoto && (
        <PhotoModal 
          photo={selectedPhoto} 
          onClose={handleCloseModals}
          onFaceClick={handleFaceClick}
        />
      )}
    </div>
  );
}

export default App;

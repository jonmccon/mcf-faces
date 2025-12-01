import { useState, useEffect } from 'react';
import * as api from '../api';

function PeopleView({ onFaceClick }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personFaces, setPersonFaces] = useState([]);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      setLoading(true);
      const data = await api.listPeople();
      setPeople(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonClick = async (person) => {
    if (selectedPerson === person.name) {
      setSelectedPerson(null);
      setPersonFaces([]);
      return;
    }

    setSelectedPerson(person.name);
    try {
      const data = await api.getFacesByName(person.name);
      setPersonFaces(data.faces);
    } catch (err) {
      console.error('Failed to load faces:', err);
      setPersonFaces([]);
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
    <div>
      {error && <div className="error">{error}</div>}

      {people.length === 0 ? (
        <div className="empty-state">
          <h3>No people found</h3>
          <p>Process some photos and assign names to clusters to see people here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>People ({people.length})</h2>
          </div>
          <div className="card-body">
            <div className="people-list">
              {people.map(person => (
                <div key={person.name}>
                  <div 
                    className="person-card"
                    onClick={() => handlePersonClick(person)}
                    style={{
                      borderColor: selectedPerson === person.name ? 'var(--primary-color)' : undefined
                    }}
                  >
                    <div className="person-name">{person.name}</div>
                    <div className="person-stats">
                      {person.face_count} photo{person.face_count !== 1 ? 's' : ''}
                      {person.earliest_date && (
                        <> · {person.earliest_date} to {person.latest_date}</>
                      )}
                    </div>
                  </div>
                  
                  {selectedPerson === person.name && personFaces.length > 0 && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px',
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)'
                    }}>
                      <div className="faces-grid">
                        {personFaces.map(face => (
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
                              <div className="face-date">{face.date || 'Unknown'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PeopleView;

import { useState, useEffect } from 'react';
import * as api from '../api';

function PersonGalleryView({ onFaceClick, onPhotoClick }) {
  const [people, setPeople] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personData, setPersonData] = useState(null);
  const [familyInfo, setFamilyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    if (selectedPerson) {
      loadPersonData(selectedPerson);
    }
  }, [selectedPerson]);

  const loadPeople = async () => {
    try {
      setLoading(true);
      const data = await api.listPeople();
      setPeople(data);
      if (data.length > 0 && !selectedPerson) {
        setSelectedPerson(data[0].name);
      }
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonData = async (name) => {
    try {
      const [facesData, familyTree] = await Promise.all([
        api.getFacesByName(name),
        api.getFamilyTree()
      ]);
      
      setPersonData(facesData);
      setFamilyInfo(familyTree[name] || null);
    } catch (err) {
      console.error('Failed to load person data:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="empty-state">
        <h3>No people found</h3>
        <p>Process photos and assign names to see people here.</p>
      </div>
    );
  }

  // Group faces by year
  const facesByYear = {};
  if (personData?.faces) {
    personData.faces.forEach(face => {
      const year = face.date ? face.date.substring(0, 4) : 'Unknown';
      if (!facesByYear[year]) {
        facesByYear[year] = [];
      }
      facesByYear[year].push(face);
    });
  }

  const sortedYears = Object.keys(facesByYear).sort();
  const personInfo = people.find(p => p.name === selectedPerson);

  return (
    <div className="person-gallery">
      {/* Person selector - horizontal scrollable */}
      <div className="person-selector">
        {people.map(person => (
          <button
            key={person.name}
            className={`person-selector-btn ${selectedPerson === person.name ? 'active' : ''}`}
            onClick={() => setSelectedPerson(person.name)}
          >
            <span className="person-selector-name">{person.name}</span>
            <span className="person-selector-count">{person.face_count}</span>
          </button>
        ))}
      </div>

      {/* Person profile header */}
      {selectedPerson && personInfo && (
        <div className="person-profile">
          <div className="person-profile-header">
            <div className="person-avatar">
              {personData?.faces?.[0] && (
                <img 
                  src={api.getFaceThumbnailUrl(personData.faces[0].thumbnail)}
                  alt={selectedPerson}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100" rx="50"/><text x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="24">👤</text></svg>';
                  }}
                />
              )}
            </div>
            <div className="person-profile-info">
              <h2>{selectedPerson}</h2>
              <p className="person-meta">
                {personInfo.face_count} photo{personInfo.face_count !== 1 ? 's' : ''}
                {personInfo.earliest_date && (
                  <> · {personInfo.earliest_date} to {personInfo.latest_date}</>
                )}
              </p>
              {familyInfo && (
                <div className="person-family">
                  {familyInfo.spouse && (
                    <span className="family-tag">💑 {familyInfo.spouse}</span>
                  )}
                  {familyInfo.parents?.length > 0 && (
                    <span className="family-tag">👨‍👩‍👧 {familyInfo.parents.join(', ')}</span>
                  )}
                  {familyInfo.children?.length > 0 && (
                    <span className="family-tag">👶 {familyInfo.children.join(', ')}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline of photos */}
      <div className="person-timeline">
        {sortedYears.map(year => (
          <div key={year} className="person-year-section">
            <h3 className="year-label">{year}</h3>
            <div className="person-faces-row">
              {facesByYear[year].map(face => (
                <div 
                  key={face.face_id}
                  className="person-face-item"
                  onClick={() => onFaceClick && onFaceClick(face)}
                >
                  <img 
                    src={api.getFaceThumbnailUrl(face.thumbnail)}
                    alt={`${selectedPerson} - ${face.date}`}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/></svg>';
                    }}
                  />
                  <span className="face-date-label">{face.date || ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PersonGalleryView;

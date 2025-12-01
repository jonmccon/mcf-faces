import { useState, useEffect } from 'react';
import * as api from '../api';

function TimelineView({ onPhotoClick }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedYear, setExpandedYear] = useState(null);
  const [yearPhotos, setYearPhotos] = useState([]);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await api.getTimeline();
      setTimeline(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYearClick = async (year) => {
    if (expandedYear === year) {
      setExpandedYear(null);
      setYearPhotos([]);
      return;
    }

    setExpandedYear(year);
    
    // Load all photos for this year
    try {
      const data = await api.listPhotos({
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        limit: 100
      });
      setYearPhotos(data.photos);
    } catch (err) {
      console.error('Failed to load year photos:', err);
      setYearPhotos([]);
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

      {timeline.length === 0 ? (
        <div className="empty-state">
          <h3>No timeline data</h3>
          <p>Process some photos with dates to see the timeline.</p>
        </div>
      ) : (
        <div className="timeline">
          {timeline.map(year => (
            <div 
              key={year.year}
              className="timeline-year"
            >
              <h3 
                onClick={() => handleYearClick(year.year)}
                style={{ cursor: 'pointer' }}
              >
                {year.year} ({year.photo_count} photo{year.photo_count !== 1 ? 's' : ''})
                <span style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                  {expandedYear === year.year ? '▼' : '▶'}
                </span>
              </h3>
              
              <div className="year-photos">
                {(expandedYear === year.year ? yearPhotos : year.photos).map(photo => (
                  <img 
                    key={photo.file}
                    src={api.getPhotoUrl(photo.file)}
                    alt={photo.file}
                    title={`${photo.file} - ${photo.date}`}
                    onClick={() => onPhotoClick(photo)}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75"><rect fill="%23e2e8f0" width="100" height="75"/></svg>';
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimelineView;

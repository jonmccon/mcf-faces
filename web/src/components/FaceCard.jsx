import { useState } from 'react';
import * as api from '../api';
import FaceIdentityEditor from './FaceIdentityEditor';

/**
 * Face Card Component
 * Enhanced face card with status badges and inline editing
 * 
 * @param {object} props
 * @param {object} props.face - Face object with face_id, name, thumbnail, etc.
 * @param {Array} props.people - List of existing people for autocomplete
 * @param {function} props.onUpdate - Callback when face is updated (faceId, newName) => {}
 * @param {function} props.onDelete - Callback when face is deleted (faceId) => {}
 * @param {function} props.onClick - Callback when card is clicked (face) => {}
 */
function FaceCard({ face, people = [], onUpdate, onDelete, onClick }) {
  const [isEditing, setIsEditing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const isRecognized = face.name && face.name.trim() !== '';
  const displayName = isRecognized ? face.name : 'Unknown';
  
  const handleEdit = async (e) => {
    e.stopPropagation();
    setIsEditing(true);
    
    // Load suggestions
    setLoadingSuggestions(true);
    try {
      const result = await api.getFaceSuggestions(face.face_id);
      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };
  
  const handleSave = (newName) => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate(face.face_id, newName);
    }
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Remove the name "${face.name}" from this face?`)) {
      onDelete(face.face_id);
    }
  };
  
  const handleCardClick = () => {
    if (!isEditing && onClick) {
      onClick(face);
    }
  };
  
  return (
    <div 
      className={`face-card ${isRecognized ? 'matched' : 'unrecognized'}`}
      onClick={handleCardClick}
    >
      {/* Status Badge */}
      <div className="status-badge">
        {isRecognized ? '✓' : '?'}
      </div>
      
      {/* Face Image */}
      <img 
        src={api.getFaceThumbnailUrl(face.thumbnail)}
        alt={displayName}
        onError={(e) => {
          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2364748b" font-size="12">No image</text></svg>';
        }}
      />
      
      {/* Face Info */}
      {isEditing ? (
        <div className="face-edit-overlay" onClick={(e) => e.stopPropagation()}>
          <FaceIdentityEditor
            face={face}
            people={people}
            suggestions={suggestions}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <>
          <div className="face-info">
            <div className="face-name">{displayName}</div>
            <div className="face-date">{face.date || 'Unknown date'}</div>
          </div>
          
          {/* Action Buttons (shown on hover) */}
          <div className="face-actions">
            <button
              className="face-action-btn"
              onClick={handleEdit}
              aria-label="Edit face identity"
            >
              {isRecognized ? 'Edit' : 'Add Name'}
            </button>
            {isRecognized && (
              <button
                className="face-action-btn"
                onClick={handleDelete}
                aria-label="Remove face identity"
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FaceCard;

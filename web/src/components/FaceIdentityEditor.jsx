import { useState, useEffect, useRef } from 'react';

/**
 * Face Identity Editor Component
 * Modal/popover for editing face identity with autocomplete
 * 
 * @param {object} props
 * @param {object} props.face - The face object being edited
 * @param {Array} props.people - List of existing people for autocomplete
 * @param {Array} props.suggestions - Suggested names for this face
 * @param {function} props.onSave - Callback when name is saved (name) => {}
 * @param {function} props.onCancel - Callback when editing is cancelled
 */
function FaceIdentityEditor({ face, people, suggestions = [], onSave, onCancel }) {
  const [searchText, setSearchText] = useState(face?.name || '');
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef(null);
  
  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  useEffect(() => {
    // Filter people based on search text
    if (searchText.trim()) {
      const filtered = people.filter(person => 
        person.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredPeople(filtered.slice(0, 10)); // Limit to 10 results
      setShowSuggestions(false);
    } else {
      setFilteredPeople([]);
      setShowSuggestions(true);
    }
  }, [searchText, people]);
  
  const handleSave = () => {
    if (searchText.trim()) {
      onSave(searchText.trim());
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  const handleSelectName = (name) => {
    setSearchText(name);
    onSave(name);
  };
  
  return (
    <div className="face-identity-editor">
      <div className="identity-editor-header">
        <h3>Who is this?</h3>
      </div>
      
      <div className="identity-search">
        <input
          ref={inputRef}
          type="text"
          className="identity-search-input"
          placeholder="Type a name..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="identity-suggestions">
          <div className="suggestions-label">Suggested:</div>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="identity-suggestion-item"
              onClick={() => handleSelectName(suggestion.name)}
            >
              <div className="suggestion-name">{suggestion.name}</div>
              <div className="suggestion-reason">
                {suggestion.reason === 'appears_in_same_photo' && '(in same photo)'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filteredPeople.length > 0 && (
        <div className="identity-suggestions">
          <div className="suggestions-label">Existing people:</div>
          {filteredPeople.map((person) => (
            <div
              key={person.name}
              className="identity-suggestion-item"
              onClick={() => handleSelectName(person.name)}
            >
              <div className="suggestion-name">{person.name}</div>
              <div className="suggestion-count">({person.face_count} photos)</div>
            </div>
          ))}
        </div>
      )}
      
      <div className="identity-editor-actions">
        <button
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!searchText.trim()}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default FaceIdentityEditor;

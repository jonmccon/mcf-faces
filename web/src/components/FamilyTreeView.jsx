import { useState, useEffect } from 'react';
import * as api from '../api';

function FamilyTreeView({ onDataChange }) {
  const [tree, setTree] = useState({});
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    person: '',
    parents: '',
    children: '',
    spouse: ''
  });
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [treeData, peopleData] = await Promise.all([
        api.getFamilyTree(),
        api.listPeople()
      ]);
      setTree(treeData);
      setPeople(peopleData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (person) => {
    const entry = tree[person] || {};
    setEditingPerson(person);
    setFormData({
      person: person,
      parents: (entry.parents || []).join(', '),
      children: (entry.children || []).join(', '),
      spouse: entry.spouse || ''
    });
    setShowAddForm(true);
  };

  const handleAddNew = () => {
    setEditingPerson(null);
    setFormData({
      person: '',
      parents: '',
      children: '',
      spouse: ''
    });
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.person.trim()) {
      setError('Person name is required');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        person: formData.person.trim(),
        parents: formData.parents ? formData.parents.split(',').map(s => s.trim()).filter(Boolean) : [],
        children: formData.children ? formData.children.split(',').map(s => s.trim()).filter(Boolean) : [],
        spouse: formData.spouse.trim() || null
      };

      await api.updateFamilyTree(updateData);
      setShowAddForm(false);
      setEditingPerson(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person) => {
    if (!window.confirm(`Remove ${person} from the family tree?`)) {
      return;
    }

    try {
      await api.deleteFamilyTreePerson(person);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPerson(null);
    setFormData({
      person: '',
      parents: '',
      children: '',
      spouse: ''
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const treeEntries = Object.entries(tree);

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Family Tree ({treeEntries.length} entries)</h2>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Person
          </button>
        </div>
        <div className="card-body">
          {showAddForm && (
            <div style={{ 
              background: 'var(--background)', 
              padding: '16px', 
              borderRadius: 'var(--radius)',
              marginBottom: '16px'
            }}>
              <h3 style={{ marginBottom: '16px' }}>
                {editingPerson ? `Edit: ${editingPerson}` : 'Add New Person'}
              </h3>
              
              <div className="form-group">
                <label>Person Name</label>
                <select
                  value={formData.person}
                  onChange={(e) => setFormData(prev => ({ ...prev, person: e.target.value }))}
                  disabled={editingPerson !== null}
                >
                  <option value="">Select a person or type below</option>
                  {people.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                {!editingPerson && (
                  <input
                    type="text"
                    value={formData.person}
                    onChange={(e) => setFormData(prev => ({ ...prev, person: e.target.value }))}
                    placeholder="Or type a new name"
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>
              
              <div className="form-group">
                <label>Parents (comma-separated)</label>
                <input
                  type="text"
                  value={formData.parents}
                  onChange={(e) => setFormData(prev => ({ ...prev, parents: e.target.value }))}
                  placeholder="e.g., John Smith, Jane Smith"
                />
              </div>
              
              <div className="form-group">
                <label>Children (comma-separated)</label>
                <input
                  type="text"
                  value={formData.children}
                  onChange={(e) => setFormData(prev => ({ ...prev, children: e.target.value }))}
                  placeholder="e.g., Tom Smith, Sarah Smith"
                />
              </div>
              
              <div className="form-group">
                <label>Spouse</label>
                <input
                  type="text"
                  value={formData.spouse}
                  onChange={(e) => setFormData(prev => ({ ...prev, spouse: e.target.value }))}
                  placeholder="e.g., Mary Smith"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {treeEntries.length === 0 && !showAddForm ? (
            <div className="empty-state">
              <h3>No family tree data</h3>
              <p>Add family members and their relationships.</p>
            </div>
          ) : (
            <div className="family-tree">
              {treeEntries.map(([person, relations]) => (
                <div key={person} className="family-member">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3>{person}</h3>
                      <div className="relations">
                        {relations.parents && relations.parents.length > 0 && (
                          <span><strong>Parents:</strong> {relations.parents.join(', ')}</span>
                        )}
                        {relations.spouse && (
                          <span><strong>Spouse:</strong> {relations.spouse}</span>
                        )}
                        {relations.children && relations.children.length > 0 && (
                          <span><strong>Children:</strong> {relations.children.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleEditClick(person)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleDelete(person)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FamilyTreeView;

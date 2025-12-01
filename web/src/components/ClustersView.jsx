import { useState, useEffect } from 'react';
import * as api from '../api';

function ClustersView({ onDataChange, onFaceClick }) {
  const [clusters, setClusters] = useState([]);
  const [unclusteredCount, setUnclusteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCluster, setEditingCluster] = useState(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      setLoading(true);
      const data = await api.listClusters();
      setClusters(data.clusters);
      setUnclusteredCount(data.unclustered_faces);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cluster, e) => {
    e.stopPropagation();
    setEditingCluster(cluster.cluster_id);
    setNewName(cluster.name || '');
  };

  const handleSave = async (clusterId) => {
    try {
      setSaving(true);
      await api.setClusterName(clusterId, newName);
      setEditingCluster(null);
      await loadClusters();
      if (onDataChange) onDataChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCluster(null);
    setNewName('');
  };

  const handleKeyDown = (e, clusterId) => {
    if (e.key === 'Enter') {
      handleSave(clusterId);
    } else if (e.key === 'Escape') {
      handleCancel();
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

      <div className="card">
        <div className="card-header">
          <h2>Face Clusters ({clusters.length})</h2>
          <div>Unclustered: {unclusteredCount}</div>
        </div>
        <div className="card-body">
          {clusters.length === 0 ? (
            <div className="empty-state">
              <h3>No clusters found</h3>
              <p>Process photos to detect and cluster faces.</p>
            </div>
          ) : (
            <div className="cluster-list">
              {clusters.map(cluster => (
                <div key={cluster.cluster_id} className="cluster-item">
                  <div className="cluster-faces">
                    {cluster.face_ids.slice(0, 4).map((faceId, idx) => (
                      <img 
                        key={idx}
                        src={api.getFaceThumbnailUrl(`${faceId}.jpg`)}
                        alt={`Face from cluster ${cluster.cluster_id}`}
                        onClick={() => onFaceClick && onFaceClick({ face_id: faceId, thumbnail: `${faceId}.jpg` })}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="%23e2e8f0" width="48" height="48" rx="4"/></svg>';
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="cluster-info">
                    <div className="cluster-id">Cluster {cluster.cluster_id}</div>
                    
                    {editingCluster === cluster.cluster_id ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, cluster.cluster_id)}
                          placeholder="Enter name"
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleSave(cluster.cluster_id)}
                          disabled={saving}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="cluster-name">
                        {cluster.name || <em style={{ color: 'var(--text-secondary)' }}>Unnamed</em>}
                      </div>
                    )}
                    
                    <div className="cluster-count">
                      {cluster.face_count} face{cluster.face_count !== 1 ? 's' : ''}
                      {cluster.earliest_date && (
                        <> · {cluster.earliest_date} to {cluster.latest_date}</>
                      )}
                    </div>
                  </div>

                  {editingCluster !== cluster.cluster_id && (
                    <button 
                      className="btn btn-secondary"
                      onClick={(e) => handleEditClick(cluster, e)}
                    >
                      {cluster.name ? 'Edit' : 'Name'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClustersView;

/**
 * API client for the Family Photos Face Recognition system.
 */

const API_BASE = '/api';

/**
 * Make an API request.
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get overall statistics.
 * @returns {Promise<object>} Statistics object
 */
export async function getStats() {
  return apiRequest('/stats');
}

// ============================================================================
// Faces
// ============================================================================

/**
 * List faces with optional filtering.
 * @param {object} params - Query parameters
 * @returns {Promise<object>} Faces response with pagination
 */
export async function listFaces(params = {}) {
  const query = new URLSearchParams();
  
  if (params.name) query.set('name', params.name);
  if (params.cluster_id !== undefined) query.set('cluster_id', params.cluster_id);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.unrecognized !== undefined) query.set('unrecognized', params.unrecognized);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  
  const queryString = query.toString();
  return apiRequest(`/faces${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get a specific face by ID.
 * @param {string} faceId - Face ID
 * @returns {Promise<object>} Face object
 */
export async function getFace(faceId) {
  return apiRequest(`/faces/${encodeURIComponent(faceId)}`);
}

/**
 * Get all faces for a specific person.
 * @param {string} name - Person name
 * @returns {Promise<object>} Faces for person
 */
export async function getFacesByName(name) {
  return apiRequest(`/faces/by_name/${encodeURIComponent(name)}`);
}

/**
 * Update face identity/name assignment
 * @param {string} faceId - Face ID
 * @param {string} name - Name to assign to the face
 * @returns {Promise<object>} Update result
 */
export async function updateFaceIdentity(faceId, name) {
  return apiRequest(`/faces/${encodeURIComponent(faceId)}/identity`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/**
 * Remove face identity
 * @param {string} faceId - Face ID
 * @returns {Promise<object>} Remove result
 */
export async function removeFaceIdentity(faceId) {
  return apiRequest(`/faces/${encodeURIComponent(faceId)}/identity`, {
    method: 'DELETE',
  });
}

/**
 * Get suggested people for a face
 * @param {string} faceId - Face ID
 * @returns {Promise<object>} Suggestions response
 */
export async function getFaceSuggestions(faceId) {
  return apiRequest(`/faces/${encodeURIComponent(faceId)}/suggestions`);
}

// ============================================================================
// People
// ============================================================================

/**
 * List all unique people.
 * @returns {Promise<Array>} List of people
 */
export async function listPeople() {
  return apiRequest('/people');
}

/**
 * Get the name map (cluster ID to name).
 * @returns {Promise<object>} Name map
 */
export async function getNameMap() {
  return apiRequest('/name_map');
}

/**
 * Set the name for a cluster.
 * @param {number} clusterId - Cluster ID
 * @param {string} name - Name to assign
 * @returns {Promise<object>} Update result
 */
export async function setClusterName(clusterId, name) {
  return apiRequest(`/name/${clusterId}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// ============================================================================
// Photos
// ============================================================================

/**
 * List photos with optional filtering.
 * @param {object} params - Query parameters
 * @returns {Promise<object>} Photos response with pagination
 */
export async function listPhotos(params = {}) {
  const query = new URLSearchParams();
  
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.has_faces !== undefined) query.set('has_faces', params.has_faces);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  
  const queryString = query.toString();
  return apiRequest(`/photos${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get information about a specific photo.
 * @param {string} filename - Photo filename
 * @returns {Promise<object>} Photo object with face details
 */
export async function getPhoto(filename) {
  return apiRequest(`/photos/${encodeURIComponent(filename)}`);
}

/**
 * Update the date for a photo.
 * @param {string} filename - Photo filename
 * @param {string} date - New date (ISO format)
 * @returns {Promise<object>} Update result
 */
export async function updatePhotoDate(filename, date) {
  return apiRequest(`/photos/${encodeURIComponent(filename)}/date`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

// ============================================================================
// Family Tree
// ============================================================================

/**
 * Get the complete family tree.
 * @returns {Promise<object>} Family tree
 */
export async function getFamilyTree() {
  return apiRequest('/family_tree');
}

/**
 * Get family tree entry for a specific person.
 * @param {string} person - Person name
 * @returns {Promise<object>} Family tree entry
 */
export async function getFamilyTreePerson(person) {
  return apiRequest(`/family_tree/${encodeURIComponent(person)}`);
}

/**
 * Update a family tree entry.
 * @param {object} data - Update data (person, parents, children, spouse)
 * @returns {Promise<object>} Update result
 */
export async function updateFamilyTree(data) {
  return apiRequest('/family_tree/update', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a person from the family tree.
 * @param {string} person - Person name
 * @returns {Promise<object>} Delete result
 */
export async function deleteFamilyTreePerson(person) {
  return apiRequest(`/family_tree/${encodeURIComponent(person)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Clusters
// ============================================================================

/**
 * List all clusters.
 * @returns {Promise<object>} Clusters data
 */
export async function listClusters() {
  return apiRequest('/clusters');
}

/**
 * Merge two clusters.
 * @param {number} sourceCluster - Source cluster ID (to be merged)
 * @param {number} targetCluster - Target cluster ID
 * @returns {Promise<object>} Merge result
 */
export async function mergeClusters(sourceCluster, targetCluster) {
  return apiRequest('/clusters/merge', {
    method: 'POST',
    body: JSON.stringify({
      source_cluster: sourceCluster,
      target_cluster: targetCluster,
    }),
  });
}

// ============================================================================
// Processing
// ============================================================================

/**
 * Trigger reprocessing of photos.
 * @param {object} options - Reprocess options
 * @returns {Promise<object>} Process result
 */
export async function reprocess(options = {}) {
  const query = new URLSearchParams();
  
  if (options.recompute_embeddings) query.set('recompute_embeddings', 'true');
  if (options.recluster !== false) query.set('recluster', 'true');
  
  const queryString = query.toString();
  return apiRequest(`/reprocess${queryString ? `?${queryString}` : ''}`, {
    method: 'POST',
  });
}

/**
 * Apply names from name_map to all faces.
 * @returns {Promise<object>} Apply result
 */
export async function applyNames() {
  return apiRequest('/apply_names', {
    method: 'POST',
  });
}

// ============================================================================
// Timeline
// ============================================================================

/**
 * Get timeline of photos by year.
 * @returns {Promise<Array>} Timeline data
 */
export async function getTimeline() {
  return apiRequest('/timeline');
}

/**
 * Get timeline for a specific person.
 * @param {string} name - Person name
 * @returns {Promise<object>} Person timeline
 */
export async function getPersonTimeline(name) {
  return apiRequest(`/timeline/person/${encodeURIComponent(name)}`);
}

// ============================================================================
// Static file URLs
// ============================================================================

/**
 * Get URL for a face thumbnail.
 * @param {string} thumbnail - Thumbnail filename
 * @returns {string} Full URL
 */
export function getFaceThumbnailUrl(thumbnail) {
  return `/static/faces/${thumbnail}`;
}

/**
 * Get URL for a photo.
 * @param {string} filename - Photo filename
 * @returns {string} Full URL
 */
export function getPhotoUrl(filename) {
  return `/static/photos/${filename}`;
}

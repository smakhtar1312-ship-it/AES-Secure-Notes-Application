
// API service - all requests to backend go through here
// Using /api prefix which Vite proxies to http://localhost:3001

const BASE = '/api';

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, options);

  // Safely read the server response
  const responseText = await res.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        throw new Error(
          `Server error (${res.status}). Please check the backend terminal.`
        );
      }

      throw new Error('The server returned an invalid response.');
    }
  }

  if (!res.ok) {
    const message =
      data.error ||
      data.errors?.[0]?.msg ||
      `Request failed with status ${res.status}.`;

    throw new Error(message);
  }

  return data;
}

// ========================================
// AUTHENTICATION APIs
// ========================================

export const register = (email, password) =>
  request('POST', '/auth/register', { email, password });

export const login = (email, password) =>
  request('POST', '/auth/login', { email, password });

export const logout = () =>
  request('POST', '/auth/logout');

export const getMe = () =>
  request('GET', '/auth/me');


// ========================================
// PERSONAL NOTES APIs
// ========================================

export const getNotes = () =>
  request('GET', '/notes');

export const getNoteById = (id) =>
  request('GET', `/notes/${id}`);

export const createNote = (title, content) =>
  request('POST', '/notes', { title, content });

export const updateNote = (id, title, content) =>
  request('PUT', `/notes/${id}`, { title, content });

export const deleteNote = (id) =>
  request('DELETE', `/notes/${id}`);


// ========================================
// ADMINISTRATOR APIs
// ========================================

export const getAdminUsers = () =>
  request('GET', '/admin/users');

export const getAdminNotes = () =>
  request('GET', '/admin/notes');

// Admin requests permission from the note owner
export const createAdminAccessRequest = (noteId, reason) =>
  request(
    'POST',
    `/admin/notes/${noteId}/access-request`,
    { reason }
  );

// Admin decrypts a note after owner approval
export const decryptApprovedAdminNote = (requestId) =>
  request(
    'POST',
    `/admin/access-requests/${requestId}/decrypt`
  );

// Emergency access requires the admin's password and a detailed reason
export const emergencyDecryptAdminNote = (noteId, password, reason) =>
  request(
    'POST',
    `/admin/notes/${noteId}/emergency-decrypt`,
    { password, reason }
  );


// ========================================
// USER ACCESS REQUEST APIs
// ========================================

// User checks requests made by administrators
export const getMyAccessRequests = () =>
  request('GET', '/notes/access-requests');


export const respondToAccessRequest = (requestId, decision) =>
  request(
    'POST',
    `/notes/access-requests/${requestId}/respond`,
    { decision }
  );
 

export const getEmergencyAccessNotifications = () =>
  request('GET', '/notes/security-notifications');


import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import {
  getNotes,
  deleteNote,
  getMyAccessRequests,
  respondToAccessRequest,
  getEmergencyAccessNotifications,
} from '../services/api';

function DashboardPage() {
  const [notes, setNotes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [activeSection, setActiveSection] = useState('NOTES');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [requestLoading, setRequestLoading] = useState(null);

  const loadNotes = useCallback(async () => {
    try {
      const data = await getNotes();
      setNotes(data.notes || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccessRequests = useCallback(async () => {
    try {
      const data = await getMyAccessRequests();
      setRequests(data.requests || []);
      setRequestError('');
    } catch (err) {
      setRequestError(err.message || 'Failed to load access requests.');
    }
  }, []);

  const loadEmergencyNotifications = useCallback(async () => {
    try {
      const data = await getEmergencyAccessNotifications();
      setNotifications(data.notifications || []);
      setNotificationError('');
    } catch (err) {
      setNotificationError(
        err.message || 'Failed to load security alerts.'
      );
    }
  }, []);

  useEffect(() => {
    loadNotes();
    loadAccessRequests();
    loadEmergencyNotifications();

    const interval = setInterval(() => {
      loadAccessRequests();
      loadEmergencyNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadNotes, loadAccessRequests, loadEmergencyNotifications]);

  async function handleRespond(requestId, decision) {
    const action = decision === 'APPROVED' ? 'approve' : 'deny';

    if (!window.confirm(`Are you sure you want to ${action} this request?`)) {
      return;
    }

    setRequestLoading(requestId);
    setRequestError('');

    try {
      await respondToAccessRequest(requestId, decision);
      await loadAccessRequests();
    } catch (err) {
      setRequestError(err.message || 'Unable to respond to request.');
      await loadAccessRequests();
    } finally {
      setRequestLoading(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete note.');
    }
  }

  function formatDate(date) {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(date) {
    if (!date) return 'N/A';

    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getRequestStatus(request) {
    if (
      request.status === 'PENDING' &&
      new Date(request.expiresAt) <= new Date()
    ) {
      return 'EXPIRED';
    }

    return request.status;
  }

  const pendingCount = requests.filter(
    (request) => getRequestStatus(request) === 'PENDING'
  ).length;

  const emergencyCount = notifications.length;

  const historyItems = [
    ...requests.map((request) => ({
      id: `request-${request.id}`,
      type: 'NORMAL',
      title: request.note?.title || 'Unavailable note',
      actor: request.admin?.email || 'Unknown administrator',
      reason: request.reason,
      status: getRequestStatus(request),
      date: request.createdAt,
    })),
    ...notifications.map((notification) => ({
      id: `emergency-${notification.id}`,
      type: 'EMERGENCY',
      title: notification.noteTitle,
      actor: notification.adminEmail,
      reason: notification.reason,
      status: 'COMPLETED',
      date: notification.accessedAt,
    })),
  ].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div style={styles.layout}>

      {/* SECURITY SIDEBAR */}
      <aside style={styles.sidebar}>

        <div style={styles.sidebarHeader}>
          <div style={styles.shieldIcon}>🛡️</div>
          <h2 style={styles.sidebarTitle}>My Secure Notes</h2>
          <p style={styles.sidebarSubtitle}>Personal security center</p>
        </div>

        <div style={styles.sidebarMenu}>

          <button
            style={activeSection === 'NOTES' ? styles.activeMenu : styles.menuButton}
            onClick={() => setActiveSection('NOTES')}
          >
            <span>📝</span>
            <span>My Notes</span>
          </button>

          <button
            style={activeSection === 'ALERTS' ? styles.activeMenu : styles.menuButton}
            onClick={() => setActiveSection('ALERTS')}
          >
            <span>🔔</span>
            <span>Security Alerts</span>

            {emergencyCount > 0 && (
              <span style={styles.dangerBadge}>
                {emergencyCount}
              </span>
            )}
          </button>

          <button
            style={activeSection === 'REQUESTS' ? styles.activeMenu : styles.menuButton}
            onClick={() => setActiveSection('REQUESTS')}
          >
            <span>🔐</span>
            <span>Access Requests</span>

            {pendingCount > 0 && (
              <span style={styles.warningBadge}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            style={activeSection === 'HISTORY' ? styles.activeMenu : styles.menuButton}
            onClick={() => setActiveSection('HISTORY')}
          >
            <span>📋</span>
            <span>Security History</span>
          </button>

        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.securityStatus}>
            <span style={{ color: '#16a34a' }}>●</span>
            Security monitoring active
          </div>
          <p style={styles.footerText}>
            AES-256-GCM Secure Notes
          </p>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.mainContent}>

        {/* ================================= */}
        {/* MY NOTES */}
        {/* ================================= */}

        {activeSection === 'NOTES' && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>My Personal Notes</h1>
                <p style={styles.pageSubtitle}>
                  Create and securely manage your notes.
                </p>
              </div>

              <Link to="/notes/new" className="btn btn-primary">
                + New Note
              </Link>
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {notes.length === 0 ? (
              <div className="empty-state">
                <h3>No notes yet</h3>
                <p>Create your first secure note.</p>
                <Link to="/notes/new">Create Note</Link>
              </div>
            ) : (
              <div style={styles.notesGrid}>
                {notes.map((note) => (
                  <div key={note.id} className="note-card">
                    <div>
                      <h3>{note.title}</h3>
                      <div className="note-date">
                        Last updated: {formatDate(note.updatedAt)}
                      </div>
                    </div>

                    <div className="note-actions">
                      <Link
                        to={`/notes/${note.id}`}
                        className="btn btn-secondary"
                      >
                        View
                      </Link>

                      <Link
                        to={`/notes/${note.id}/edit`}
                        className="btn btn-primary"
                      >
                        Edit
                      </Link>

                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================================= */}
        {/* SECURITY ALERTS */}
        {/* ================================= */}

        {activeSection === 'ALERTS' && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>Security Alerts</h1>
                <p style={styles.pageSubtitle}>
                  View emergency administrator access to your notes.
                </p>
              </div>

              <button
                className="btn btn-secondary"
                onClick={loadEmergencyNotifications}
              >
                Refresh Alerts
              </button>
            </div>

            {notificationError && (
              <div className="alert alert-error">
                {notificationError}
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="empty-state">
                <h3>All clear!</h3>
                <p>No emergency access events have been recorded.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={styles.emergencyCard}
                >
                  <h3 style={{ color: '#dc2626', marginBottom: '12px' }}>
                    ⚠ EMERGENCY ACCESS ALERT
                  </h3>

                  <p>
                    An administrator accessed your note using emergency access.
                  </p>

                  <p>
                    <strong>Note:</strong> {notification.noteTitle}
                  </p>

                  <p>
                    <strong>Administrator:</strong> {notification.adminEmail}
                  </p>

                  <p>
                    <strong>Justification:</strong> {notification.reason}
                  </p>

                  <p>
                    <strong>Date and time:</strong>{' '}
                    {formatDateTime(notification.accessedAt)}
                  </p>

                  <p>
                    <strong>Event ID:</strong> {notification.id}
                  </p>
                </div>
              ))
            )}
          </>
        )}

        {/* ================================= */}
        {/* ACCESS REQUESTS */}
        {/* ================================= */}

        {activeSection === 'REQUESTS' && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>Access Requests</h1>
                <p style={styles.pageSubtitle}>
                  Control administrator access to your personal notes.
                </p>
              </div>

              <button
                className="btn btn-secondary"
                onClick={loadAccessRequests}
              >
                Refresh Requests
              </button>
            </div>

            {requestError && (
              <div className="alert alert-error">
                {requestError}
              </div>
            )}

            {requests.length === 0 ? (
              <div className="empty-state">
                <h3>No access requests</h3>
                <p>No administrator has requested access to your notes.</p>
              </div>
            ) : (
              requests.map((request) => {
                const status = getRequestStatus(request);
                const isPending = status === 'PENDING';

                return (
                  <div
                    key={request.id}
                    style={styles.requestCard}
                  >
                    <div style={styles.cardHeader}>
                      <h3>Access Request #{request.id}</h3>

                      <span style={getStatusStyle(status)}>
                        {status}
                      </span>
                    </div>

                    <p>
                      <strong>Administrator:</strong>{' '}
                      {request.admin?.email || 'Unknown'}
                    </p>

                    <p>
                      <strong>Note:</strong>{' '}
                      {request.note?.title || 'Unavailable'}
                    </p>

                    <p>
                      <strong>Reason:</strong> {request.reason}
                    </p>

                    <p>
                      <strong>Requested:</strong>{' '}
                      {formatDateTime(request.createdAt)}
                    </p>

                    <p>
                      <strong>Expires:</strong>{' '}
                      {formatDateTime(request.expiresAt)}
                    </p>

                    {isPending && (
                      <div style={styles.actionButtons}>
                        <button
                          className="btn btn-primary"
                          disabled={requestLoading === request.id}
                          onClick={() =>
                            handleRespond(request.id, 'APPROVED')
                          }
                        >
                          {requestLoading === request.id
                            ? 'Processing...'
                            : 'Approve'}
                        </button>

                        <button
                          className="btn btn-danger"
                          disabled={requestLoading === request.id}
                          onClick={() =>
                            handleRespond(request.id, 'DENIED')
                          }
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ================================= */}
        {/* SECURITY HISTORY */}
        {/* ================================= */}

        {activeSection === 'HISTORY' && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>Security History</h1>
                <p style={styles.pageSubtitle}>
                  Review previous access requests and emergency access events.
                </p>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  loadAccessRequests();
                  loadEmergencyNotifications();
                }}
              >
                Refresh History
              </button>
            </div>

            {requestError && (
              <div className="alert alert-error">{requestError}</div>
            )}

            {notificationError && (
              <div className="alert alert-error">{notificationError}</div>
            )}

            {historyItems.length === 0 ? (
              <div className="empty-state">
                <h3>No security history</h3>
                <p>Your security activity will appear here.</p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {historyItems.map((item) => (
                  <div key={item.id} style={styles.historyCard}>
                    <div style={styles.cardHeader}>
                      <strong>
                        {item.type === 'EMERGENCY'
                          ? '⚠ Emergency Access'
                          : '🔐 Normal Access Request'}
                      </strong>

                      <span style={getStatusStyle(item.status)}>
                        {item.status}
                      </span>
                    </div>

                    <p><strong>Note:</strong> {item.title}</p>
                    <p><strong>Administrator:</strong> {item.actor}</p>
                    <p><strong>Reason:</strong> {item.reason}</p>
                    <p><strong>Date:</strong> {formatDateTime(item.date)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

// ========================================
// STATUS STYLING
// ========================================

function getStatusStyle(status) {
  const colors = {
    PENDING: { background: '#fef3c7', color: '#92400e' },
    APPROVED: { background: '#dcfce7', color: '#166534' },
    DENIED: { background: '#fee2e2', color: '#991b1b' },
    EXPIRED: { background: '#e2e8f0', color: '#334155' },
    COMPLETED: { background: '#dbeafe', color: '#1e40af' },
  };

  return {
    ...colors[status],
    padding: '5px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
  };
}

// ========================================
// DASHBOARD STYLES
// ========================================

const styles = {
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 70px)',
    background: '#f4f6f9',
    fontFamily: 'Arial, sans-serif',
  },

  sidebar: {
    width: '250px',
    minWidth: '250px',
    background: '#172033',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    boxSizing: 'border-box',
  },

  sidebarHeader: {
    textAlign: 'center',
    padding: '15px 5px 25px',
    borderBottom: '1px solid #354156',
  },

  shieldIcon: {
    fontSize: '35px',
    marginBottom: '10px',
  },

  sidebarTitle: {
    fontSize: '18px',
    margin: '0 0 6px',
    color: '#ffffff',
  },

  sidebarSubtitle: {
    color: '#aebbd0',
    fontSize: '12px',
    margin: 0,
  },

  sidebarMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '25px',
  },

  menuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '13px 12px',
    border: 'none',
    borderRadius: '7px',
    background: 'transparent',
    color: '#d5ddeb',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
  },

  activeMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '13px 12px',
    border: 'none',
    borderRadius: '7px',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 'bold',
  },

  dangerBadge: {
    marginLeft: 'auto',
    background: '#dc2626',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '3px 8px',
    fontSize: '11px',
  },

  warningBadge: {
    marginLeft: 'auto',
    background: '#d97706',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '3px 8px',
    fontSize: '11px',
  },

  sidebarFooter: {
    marginTop: 'auto',
    padding: '20px 5px 5px',
    borderTop: '1px solid #354156',
  },

  securityStatus: {
    fontSize: '12px',
    color: '#d5ddeb',
  },

  footerText: {
    color: '#8795aa',
    fontSize: '11px',
    marginTop: '10px',
  },

  mainContent: {
    flex: 1,
    minWidth: 0,
    padding: '30px',
    overflowX: 'hidden',
  },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
    marginBottom: '25px',
  },

  pageTitle: {
    fontSize: '25px',
    margin: 0,
    color: '#172033',
  },

  pageSubtitle: {
    color: '#64748b',
    fontSize: '14px',
    marginTop: '7px',
  },

  notesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  emergencyCard: {
    background: '#ffffff',
    border: '1px solid #fecaca',
    borderLeft: '5px solid #dc2626',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    lineHeight: '1.8',
    overflowWrap: 'anywhere',
  },

  requestCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderLeft: '5px solid #d97706',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
    lineHeight: '1.8',
    overflowWrap: 'anywhere',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '12px',
  },

  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    flexWrap: 'wrap',
  },

  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  historyCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '18px',
    lineHeight: '1.8',
    overflowWrap: 'anywhere',
  },
};

export default DashboardPage;


import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  getAdminUsers,
  getAdminNotes,
  createAdminAccessRequest,
  decryptApprovedAdminNote,
  emergencyDecryptAdminNote,
} from '../services/api';

function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);

  const [activeSection, setActiveSection] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('ALL');
  const [noteSearch, setNoteSearch] = useState('');

  const [selectedNote, setSelectedNote] = useState(null);
  const [accessMode, setAccessMode] = useState('NORMAL');

  const [reason, setReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [requestId, setRequestId] = useState('');

  const [decryptedContent, setDecryptedContent] = useState('');
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [usersData, notesData] = await Promise.all([
        getAdminUsers(),
        getAdminNotes(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setNotes(Array.isArray(notesData) ? notesData : []);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function showSection(section) {
    setActiveSection(section);
    setError('');
    setSuccess('');
  }

  function openAccessPanel(note, mode) {
    setSelectedNote(note);
    setAccessMode(mode);
    setReason('');
    setAdminPassword('');
    setRequestId('');
    setDecryptedContent('');
    setError('');
    setSuccess('');
  }

  function closeAccessPanel() {
    setSelectedNote(null);
    setReason('');
    setAdminPassword('');
    setRequestId('');
    setDecryptedContent('');
    setError('');
    setSuccess('');
  }

  async function handleAccessRequest(event) {
    event.preventDefault();

    if (!selectedNote || reason.trim().length < 10) {
      setError('Please provide a reason of at least 10 characters.');
      return;
    }

    setDecrypting(true);
    setError('');
    setSuccess('');
    setDecryptedContent('');

    try {
      const result = await createAdminAccessRequest(
        selectedNote.id,
        reason.trim()
      );

      const id = result.request?.id ?? result.requestId;

      if (id) setRequestId(String(id));

      setSuccess(
        id
          ? `Request submitted successfully. Request ID: ${id}. The owner must approve it before decryption.`
          : result.message || 'Access request submitted successfully.'
      );
    } catch (err) {
      setError(err.message || 'Unable to create access request.');
    } finally {
      setDecrypting(false);
    }
  }

  async function handleApprovedDecryption(event) {
    event.preventDefault();

    const id = Number(requestId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      setError('Enter a valid access request ID.');
      return;
    }

    setDecrypting(true);
    setError('');
    setSuccess('');
    setDecryptedContent('');

    try {
      const result = await decryptApprovedAdminNote(id);

      setDecryptedContent(result.content || '');
      setSuccess(
        'Note decrypted successfully after owner approval. This approval has been consumed.'
      );
    } catch (err) {
      setError(err.message || 'Unable to decrypt the approved note.');
    } finally {
      setDecrypting(false);
    }
  }

  async function handleEmergencyDecryption(event) {
    event.preventDefault();

    if (!selectedNote) return;

    if (!adminPassword) {
      setError('Enter your administrator password.');
      return;
    }

    if (reason.trim().length < 30) {
      setError('Emergency justification must contain at least 30 characters.');
      return;
    }

    const confirmed = window.confirm(
      'Emergency access bypasses owner approval and will be recorded in the audit log. Continue?'
    );

    if (!confirmed) return;

    setDecrypting(true);
    setError('');
    setSuccess('');
    setDecryptedContent('');

    try {
      const result = await emergencyDecryptAdminNote(
        selectedNote.id,
        adminPassword,
        reason.trim()
      );

      setDecryptedContent(result.content || '');

      setSuccess(
        'Emergency access successful. The action has been audited and a security notification has been recorded for the note owner.'
      );

      setAdminPassword('');
    } catch (err) {
      setError(err.message || 'Emergency decryption failed.');
    } finally {
      setDecrypting(false);
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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        String(user.id).includes(userSearch);

      const matchesRole =
        userRole === 'ALL' || user.role === userRole;

      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRole]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const search = noteSearch.toLowerCase();

      return (
        note.title.toLowerCase().includes(search) ||
        (note.user?.email || '').toLowerCase().includes(search) ||
        String(note.id).includes(search)
      );
    });
  }, [notes, noteSearch]);

  const adminCount = users.filter(
    (user) => user.role === 'ADMIN'
  ).length;

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingIcon}>🛡️</div>
        <h2>Loading Administrator Console</h2>
        <p>Please wait...</p>
      </div>
    );
  }

  return (
    <div style={styles.layout}>

      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🛡️</div>
          <h2>Secure Notes</h2>
          <p>Administration Console</p>
        </div>

        <div style={styles.navLabel}>MAIN MENU</div>

        <nav style={styles.navigation}>
          <SidebarButton
            icon="📊"
            label="Overview"
            active={activeSection === 'OVERVIEW'}
            onClick={() => showSection('OVERVIEW')}
          />

          <SidebarButton
            icon="👥"
            label="User Management"
            active={activeSection === 'USERS'}
            onClick={() => showSection('USERS')}
          />

          <SidebarButton
            icon="🔐"
            label="Notes Management"
            active={activeSection === 'NOTES'}
            onClick={() => showSection('NOTES')}
          />

          <SidebarButton
            icon="🛡️"
            label="Access Control"
            active={activeSection === 'ACCESS'}
            onClick={() => showSection('ACCESS')}
          />
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.adminStatus}>
            <span style={{ color: '#22c55e' }}>●</span>
            Administrator session
          </div>

          <Link to="/my-notes" style={styles.personalNotesLink}>
            📝 My Personal Notes
          </Link>

          <p style={styles.sidebarFooter}>
            AES-256-GCM Secure Notes
          </p>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main style={styles.main}>

        <header style={styles.topbar}>
          <div>
            <h1 style={styles.topbarTitle}>
              {getSectionTitle(activeSection)}
            </h1>
            <p style={styles.topbarSubtitle}>
              Manage users, encrypted notes and security access.
            </p>
          </div>

          <button
            style={styles.refreshButton}
            onClick={() => loadAdminData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </header>

        {error && (
          <div style={styles.errorAlert}>
            <strong>⚠</strong> {error}
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <strong>✓</strong> {success}
          </div>
        )}

        {/* OVERVIEW */}
        {activeSection === 'OVERVIEW' && (
          <>
            <div style={styles.welcomeCard}>
              <div>
                <h2>Welcome, Administrator</h2>
                <p>
                  Monitor your secure notes application from one place.
                </p>
              </div>
              <div style={styles.welcomeIcon}>🔒</div>
            </div>

            <div style={styles.statsGrid}>
              <StatCard
                icon="👥"
                label="Total Users"
                value={users.length}
                color="#2563eb"
              />

              <StatCard
                icon="🔐"
                label="Total Notes"
                value={notes.length}
                color="#059669"
              />

              <StatCard
                icon="🛡️"
                label="Administrators"
                value={adminCount}
                color="#7c3aed"
              />

              <StatCard
                icon="📈"
                label="Regular Users"
                value={users.length - adminCount}
                color="#d97706"
              />
            </div>

            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>

              <div style={styles.quickActions}>
                <QuickAction
                  icon="👥"
                  title="Manage Users"
                  description="View registered accounts and roles."
                  onClick={() => showSection('USERS')}
                />

                <QuickAction
                  icon="🔐"
                  title="Manage Notes"
                  description="Find notes and manage access requests."
                  onClick={() => showSection('NOTES')}
                />

                <QuickAction
                  icon="🛡️"
                  title="Access Control"
                  description="Review the available decryption procedures."
                  onClick={() => showSection('ACCESS')}
                />
              </div>
            </div>

            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Recent Registered Users</h2>

              {users.length === 0 ? (
                <p style={styles.muted}>No registered users found.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Registered</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.slice(0, 5).map((user) => (
                        <tr key={user.id}>
                          <td style={styles.td}>{user.id}</td>
                          <td style={styles.td}>{user.email}</td>
                          <td style={styles.td}>
                            <RoleBadge role={user.role} />
                          </td>
                          <td style={styles.td}>
                            {formatDate(user.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* USER MANAGEMENT */}
        {activeSection === 'USERS' && (
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>User Management</h2>
                <p style={styles.muted}>
                  {filteredUsers.length} of {users.length} accounts
                </p>
              </div>
            </div>

            <div style={styles.filters}>
              <input
                style={styles.searchInput}
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by email or user ID..."
              />

              <select
                style={styles.filterSelect}
                value={userRole}
                onChange={(event) => setUserRole(event.target.value)}
              >
                <option value="ALL">All Roles</option>
                <option value="USER">Regular Users</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={styles.emptyState}>No matching users found.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User ID</th>
                      <th style={styles.th}>Email Address</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Registration Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td style={styles.td}>{user.id}</td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>
                          <RoleBadge role={user.role} />
                        </td>
                        <td style={styles.td}>
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* NOTES MANAGEMENT */}
        {activeSection === 'NOTES' && (
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>All Users' Notes</h2>
                <p style={styles.muted}>
                  Notes are listed as metadata. Encrypted content is not exposed.
                </p>
              </div>
            </div>

            <input
              style={styles.searchInput}
              value={noteSearch}
              onChange={(event) => setNoteSearch(event.target.value)}
              placeholder="Search by note title, owner or note ID..."
            />

            {filteredNotes.length === 0 ? (
              <div style={styles.emptyState}>No matching notes found.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Note ID</th>
                      <th style={styles.th}>Title</th>
                      <th style={styles.th}>Owner</th>
                      <th style={styles.th}>Updated</th>
                      <th style={styles.th}>Security</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredNotes.map((note) => (
                      <tr key={note.id}>
                        <td style={styles.td}>{note.id}</td>
                        <td style={styles.td}>
                          <strong>{note.title}</strong>
                        </td>
                        <td style={styles.td}>
                          {note.user?.email || 'Unknown'}
                        </td>
                        <td style={styles.td}>
                          {formatDate(note.updatedAt)}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.encryptedBadge}>
                            🔒 Encrypted
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            <button
                              style={styles.normalButton}
                              onClick={() => openAccessPanel(note, 'NORMAL')}
                            >
                              Request Access
                            </button>

                            <button
                              style={styles.emergencyButton}
                              onClick={() => openAccessPanel(note, 'EMERGENCY')}
                            >
                              Emergency
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ACCESS CONTROL */}
        {activeSection === 'ACCESS' && (
          <>
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Access Control Center</h2>

              <p style={styles.muted}>
                Choose the appropriate access procedure for a user's note.
              </p>

              <div style={styles.accessInfoGrid}>
                <div style={styles.accessInfoCard}>
                  <div style={styles.accessIcon}>🔐</div>
                  <h3>Normal Access</h3>
                  <p>
                    Submit an access request. The note owner must approve it.
                    The approval is valid for one-time decryption.
                  </p>
                  <span style={styles.normalTag}>Owner approval required</span>
                </div>

                <div style={styles.accessInfoCard}>
                  <div style={styles.accessIcon}>🚨</div>
                  <h3>Emergency Access</h3>
                  <p>
                    Requires fresh administrator password verification
                    and a detailed justification. The action is audited.
                  </p>
                  <span style={styles.emergencyTag}>Owner approval bypassed</span>
                </div>
              </div>

              <h3 style={{ marginTop: '25px' }}>Select a note</h3>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Note</th>
                      <th style={styles.th}>Owner</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notes.map((note) => (
                      <tr key={note.id}>
                        <td style={styles.td}>
                          <strong>{note.title}</strong>
                          <div style={styles.smallText}>
                            Note ID: {note.id}
                          </div>
                        </td>

                        <td style={styles.td}>
                          {note.user?.email || 'Unknown'}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.actionGroup}>
                            <button
                              style={styles.normalButton}
                              onClick={() => openAccessPanel(note, 'NORMAL')}
                            >
                              Normal Access
                            </button>

                            <button
                              style={styles.emergencyButton}
                              onClick={() => openAccessPanel(note, 'EMERGENCY')}
                            >
                              Emergency Access
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {notes.length === 0 && (
                      <tr>
                        <td style={styles.td} colSpan="3">
                          No notes available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>

      {/* ACCESS MODAL */}
      {selectedNote && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>

            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalEyebrow}>
                  {accessMode === 'NORMAL'
                    ? 'NORMAL ACCESS PROCEDURE'
                    : 'EMERGENCY ACCESS PROCEDURE'}
                </span>

                <h2 style={styles.modalTitle}>
                  {accessMode === 'NORMAL'
                    ? 'Request Note Access'
                    : 'Emergency Note Access'}
                </h2>
              </div>

              <button
                style={styles.closeButton}
                onClick={closeAccessPanel}
                aria-label="Close access panel"
              >
                ×
              </button>
            </div>

            <div style={styles.noteInfo}>
              <p><strong>Note:</strong> {selectedNote.title}</p>
              <p>
                <strong>Owner:</strong>{' '}
                {selectedNote.user?.email || 'Unknown'}
              </p>
              <p><strong>Note ID:</strong> {selectedNote.id}</p>
            </div>

            {error && (
              <div style={styles.errorAlert}>{error}</div>
            )}

            {success && (
              <div style={styles.successAlert}>{success}</div>
            )}

            {accessMode === 'NORMAL' && (
              <>
                <div style={styles.infoMessage}>
                  The owner must approve this request before you can decrypt
                  the note. Requests expire after five minutes.
                </div>

                <form onSubmit={handleAccessRequest}>
                  <label style={styles.formLabel}>
                    Reason for requesting access
                  </label>

                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain why access to this note is required..."
                    minLength={10}
                    maxLength={500}
                    required
                    rows={3}
                    style={styles.textarea}
                  />

                  <button
                    type="submit"
                    style={styles.normalButton}
                    disabled={decrypting || reason.trim().length < 10}
                  >
                    {decrypting ? 'Submitting...' : 'Submit Access Request'}
                  </button>
                </form>

                <div style={styles.modalDivider} />

                <h3>Decrypt an Approved Request</h3>

                <p style={styles.muted}>
                  Enter the request ID after the owner approves it.
                  Each approval can be used only once.
                </p>

                <form onSubmit={handleApprovedDecryption}>
                  <label style={styles.formLabel}>Access Request ID</label>

                  <input
                    type="number"
                    min="1"
                    value={requestId}
                    onChange={(event) => setRequestId(event.target.value)}
                    placeholder="Enter approved request ID"
                    required
                    style={styles.formInput}
                  />

                  <button
                    type="submit"
                    style={styles.decryptButton}
                    disabled={decrypting || !requestId}
                  >
                    {decrypting ? 'Decrypting...' : 'Decrypt Approved Note'}
                  </button>
                </form>
              </>
            )}

            {accessMode === 'EMERGENCY' && (
              <>
                <div style={styles.warningMessage}>
                  Emergency access bypasses owner approval. Your password,
                  detailed justification and audit record are mandatory.
                </div>

                <form onSubmit={handleEmergencyDecryption}>
                  <label style={styles.formLabel}>
                    Confirm Administrator Password
                  </label>

                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    placeholder="Enter your current administrator password"
                    autoComplete="current-password"
                    required
                    style={styles.formInput}
                  />

                  <label style={styles.formLabel}>
                    Detailed Emergency Justification
                  </label>

                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explain the emergency and why immediate access is necessary..."
                    minLength={30}
                    maxLength={500}
                    required
                    rows={4}
                    style={styles.textarea}
                  />

                  <button
                    type="submit"
                    style={styles.emergencyButton}
                    disabled={
                      decrypting ||
                      !adminPassword ||
                      reason.trim().length < 30
                    }
                  >
                    {decrypting
                      ? 'Verifying and decrypting...'
                      : 'Verify Password and Decrypt'}
                  </button>
                </form>
              </>
            )}

            {decryptedContent !== '' && (
              <div style={styles.decryptedPanel}>
                <div style={styles.decryptedHeading}>
                  <span>🔓</span>
                  <h3>Decrypted Note Content</h3>
                </div>

                <pre style={styles.decryptedContent}>
                  {decryptedContent}
                </pre>

                <p style={styles.smallText}>
                  This content is displayed temporarily in this session.
                  Do not share or leave it exposed.
                </p>
              </div>
            )}

            <button
              type="button"
              style={styles.closeModalButton}
              onClick={closeAccessPanel}
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function getSectionTitle(section) {
  const titles = {
    OVERVIEW: 'Dashboard Overview',
    USERS: 'User Management',
    NOTES: 'Notes Management',
    ACCESS: 'Access Control',
  };

  return titles[section] || 'Admin Dashboard';
}

function SidebarButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.sidebarButton,
        ...(active ? styles.sidebarButtonActive : {}),
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}18` }}>
        <span>{icon}</span>
      </div>

      <div>
        <p style={styles.statLabel}>{label}</p>
        <h2 style={styles.statValue}>{value}</h2>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, description, onClick }) {
  return (
    <button style={styles.quickAction} onClick={onClick}>
      <span style={styles.quickActionIcon}>{icon}</span>
      <strong>{title}</strong>
      <span style={styles.quickDescription}>{description}</span>
      <span style={styles.quickLink}>Open section →</span>
    </button>
  );
}

function RoleBadge({ role }) {
  return (
    <span
      style={{
        ...styles.roleBadge,
        ...(role === 'ADMIN'
          ? styles.adminBadge
          : styles.userBadge),
      }}
    >
      {role}
    </span>
  );
}

// ========================================
// DASHBOARD STYLES
// ========================================

const styles = {
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 70px)',
    background: '#f1f5f9',
    fontFamily: 'Arial, sans-serif',
    color: '#172033',
  },

  loadingScreen: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#172033',
  },

  loadingIcon: { fontSize: '45px', marginBottom: '12px' },

  sidebar: {
    width: '250px',
    minWidth: '250px',
    background: '#172033',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px 14px',
    boxSizing: 'border-box',
  },

  brand: {
    textAlign: 'center',
    padding: '12px 5px 28px',
    borderBottom: '1px solid #354156',
  },

  brandIcon: { fontSize: '38px', marginBottom: '10px' },

  brandTitle: { fontSize: '19px' },

  navLabel: {
    fontSize: '10px',
    color: '#91a0b8',
    letterSpacing: '1.5px',
    margin: '28px 10px 12px',
  },

  navigation: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  sidebarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    border: 'none',
    borderRadius: '7px',
    padding: '13px',
    color: '#d4deed',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
  },

  sidebarButtonActive: {
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 'bold',
  },

  sidebarBottom: { marginTop: 'auto' },

  adminStatus: {
    color: '#d4deed',
    fontSize: '12px',
    padding: '15px 5px',
    borderTop: '1px solid #354156',
  },

  personalNotesLink: {
    display: 'block',
    color: '#ffffff',
    background: '#26364e',
    padding: '12px',
    borderRadius: '7px',
    textDecoration: 'none',
    fontSize: '13px',
  },

  sidebarFooter: {
    fontSize: '10px',
    color: '#91a0b8',
    textAlign: 'center',
    marginTop: '20px',
  },

  main: {
    flex: 1,
    minWidth: 0,
    padding: '28px',
    overflowX: 'hidden',
  },

  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
    marginBottom: '25px',
  },

  topbarTitle: { fontSize: '25px', margin: 0 },

  topbarSubtitle: {
    color: '#64748b',
    fontSize: '13px',
    marginTop: '7px',
  },

  refreshButton: {
    padding: '11px 16px',
    border: 'none',
    borderRadius: '7px',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 'bold',
  },

  welcomeCard: {
    background: '#1e3a8a',
    color: '#ffffff',
    padding: '25px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '22px',
  },

  welcomeIcon: { fontSize: '45px' },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '15px',
    marginBottom: '22px',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
  },

  statIcon: {
    width: '48px',
    height: '48px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '10px',
    fontSize: '23px',
  },

  statLabel: { color: '#64748b', fontSize: '12px', margin: 0 },

  statValue: { fontSize: '27px', margin: '5px 0 0' },

  sectionCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '22px',
    marginBottom: '22px',
    minWidth: 0,
  },

  sectionTitle: { fontSize: '19px', margin: '0 0 8px' },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: '18px',
  },

  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginTop: '18px',
  },

  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    gap: '9px',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
    padding: '18px',
    background: '#f8fafc',
    cursor: 'pointer',
    color: '#172033',
  },

  quickActionIcon: { fontSize: '27px' },

  quickDescription: { color: '#64748b', fontSize: '12px' },

  quickLink: { color: '#2563eb', fontSize: '12px', fontWeight: 'bold' },

  filters: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '18px',
  },

  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    fontSize: '13px',
    boxSizing: 'border-box',
    marginBottom: '15px',
  },

  filterSelect: {
    padding: '11px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    background: '#ffffff',
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    marginTop: '15px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },

  th: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '13px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '13px',
    borderBottom: '1px solid #e2e8f0',
    verticalAlign: 'middle',
  },

  roleBadge: {
    display: 'inline-block',
    padding: '5px 9px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 'bold',
  },

  adminBadge: { background: '#ede9fe', color: '#6d28d9' },

  userBadge: { background: '#dbeafe', color: '#1d4ed8' },

  encryptedBadge: {
    background: '#dcfce7',
    color: '#166534',
    padding: '5px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    whiteSpace: 'nowrap',
  },

  actionGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '7px',
  },

  normalButton: {
    border: 'none',
    borderRadius: '6px',
    padding: '9px 12px',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
  },

  emergencyButton: {
    border: 'none',
    borderRadius: '6px',
    padding: '9px 12px',
    background: '#dc2626',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
  },

  decryptButton: {
    border: 'none',
    borderRadius: '6px',
    padding: '10px 14px',
    background: '#059669',
    color: '#ffffff',
    cursor: 'pointer',
  },

  accessInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '15px',
    marginTop: '20px',
  },

  accessInfoCard: {
    padding: '20px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '9px',
  },

  accessIcon: { fontSize: '30px', marginBottom: '10px' },

  normalTag: {
    display: 'inline-block',
    marginTop: '10px',
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '6px 9px',
    borderRadius: '15px',
    fontSize: '11px',
  },

  emergencyTag: {
    display: 'inline-block',
    marginTop: '10px',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '6px 9px',
    borderRadius: '15px',
    fontSize: '11px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px 15px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px',
    marginTop: '15px',
  },

  muted: { color: '#64748b', fontSize: '13px' },

  smallText: { color: '#64748b', fontSize: '11px', marginTop: '5px' },

  errorAlert: {
    padding: '13px',
    border: '1px solid #fca5a5',
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: '7px',
    marginBottom: '15px',
    fontSize: '13px',
  },

  successAlert: {
    padding: '13px',
    border: '1px solid #86efac',
    background: '#f0fdf4',
    color: '#166534',
    borderRadius: '7px',
    marginBottom: '15px',
    fontSize: '13px',
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.72)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '18px',
    overflowY: 'auto',
  },

  modal: {
    width: '100%',
    maxWidth: '650px',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '25px',
    boxSizing: 'border-box',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },

  modalEyebrow: {
    color: '#64748b',
    fontSize: '10px',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },

  modalTitle: { fontSize: '22px', margin: '7px 0 0' },

  closeButton: {
    border: 'none',
    background: '#f1f5f9',
    borderRadius: '7px',
    fontSize: '24px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
  },

  noteInfo: {
    padding: '13px',
    background: '#f1f5f9',
    borderRadius: '7px',
    lineHeight: '1.8',
    marginBottom: '18px',
    fontSize: '13px',
    overflowWrap: 'anywhere',
  },

  infoMessage: {
    padding: '12px',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '7px',
    marginBottom: '18px',
    fontSize: '13px',
  },

  warningMessage: {
    padding: '12px',
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: '7px',
    marginBottom: '18px',
    fontSize: '13px',
  },

  formLabel: {
    display: 'block',
    fontWeight: 'bold',
    fontSize: '13px',
    marginBottom: '7px',
  },

  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    marginBottom: '15px',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    marginBottom: '15px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },

  modalDivider: {
    borderTop: '1px solid #e2e8f0',
    margin: '23px 0',
  },

  decryptedPanel: {
    marginTop: '20px',
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '16px',
  },

  decryptedHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  decryptedContent: {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    background: '#ffffff',
    border: '1px solid #bbf7d0',
    padding: '15px',
    borderRadius: '6px',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: '1.6',
  },

  closeModalButton: {
    marginTop: '20px',
    padding: '10px 17px',
    border: 'none',
    borderRadius: '6px',
    background: '#64748b',
    color: '#ffffff',
    cursor: 'pointer',
  },
};

export default AdminDashboardPage;

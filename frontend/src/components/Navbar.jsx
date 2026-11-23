import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <h1>🔒 Secure Notes</h1>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;

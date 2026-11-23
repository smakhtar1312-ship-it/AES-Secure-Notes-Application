
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NoteDetailPage from './pages/NoteDetailPage';
import NoteFormPage from './pages/NoteFormPage';

import './index.css';

function HomeDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (user?.role === 'ADMIN') {
    return <AdminDashboardPage />;
  }

  return <DashboardPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Main dashboard: automatically selected by role */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Personal notes: available to both admin and normal users */}
          <Route
            path="/my-notes"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes/new"
            element={
              <ProtectedRoute>
                <NoteFormPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes/:id"
            element={
              <ProtectedRoute>
                <NoteDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes/:id/edit"
            element={
              <ProtectedRoute>
                <NoteFormPage />
              </ProtectedRoute>
            }
          />

          {/* Unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

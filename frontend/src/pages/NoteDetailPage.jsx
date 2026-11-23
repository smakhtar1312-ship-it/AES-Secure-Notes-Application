import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getNoteById } from '../services/api';

function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNoteById(id)
      .then((data) => setNote(data.note))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading note...</div>;

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
        <Link to="/">Back to Notes</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="note-detail">
        <h2>{note.title}</h2>

        {/* Note: content rendered as text, not HTML - XSS prevention */}
        <div className="note-content">{note.content}</div>

        <div className="note-meta">
          Created: {new Date(note.createdAt).toLocaleString()} &nbsp;|&nbsp;
          Updated: {new Date(note.updatedAt).toLocaleString()}
        </div>

        <div className="detail-actions">
          <Link to={`/notes/${note.id}/edit`} className="btn btn-primary">Edit</Link>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>
    </div>
  );
}

export default NoteDetailPage;

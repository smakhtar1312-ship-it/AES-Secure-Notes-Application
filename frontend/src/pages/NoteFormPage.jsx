import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createNote, updateNote, getNoteById } from '../services/api';


function NoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);

  
  useEffect(() => {
    if (!isEditing) return;

    getNoteById(id)
      .then((data) => {
        setTitle(data.note.title);
        setContent(data.note.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id, isEditing]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing) {
        await updateNote(id, title, content);
        navigate(`/notes/${id}`);
      } else {
        const data = await createNote(title, content);
        navigate(`/notes/${data.note.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="form-container" style={{ margin: '30px auto' }}>
        <h2>{isEditing ? 'Edit Note' : 'New Note'}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Note title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={10000}
              placeholder="Write your note here..."
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(isEditing ? `/notes/${id}` : '/')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NoteFormPage;

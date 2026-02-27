import './PoemCard.css';

function excerpt(str, maxLen) {
  const line = (str || '').split('\n')[0] || '';
  return line.length > maxLen ? line.slice(0, maxLen) + '…' : line;
}

export default function PoemCard({ poem, onClick, onDelete, draggable, collected }) {
  const coverUrl = poem.coverPath
    ? (poem.coverPath.startsWith('http') ? poem.coverPath : poem.coverPath)
    : null;

  function handleDelete(e) {
    e.stopPropagation();
    if (onDelete && confirm('Delete this poem?')) onDelete(poem);
  }

  function handleDragStart(e) {
    if (!draggable) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: poem.id }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('poem-card-dragging');
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('poem-card-dragging');
  }

  return (
    <article
      className={`poem-card ${draggable ? 'poem-card-draggable' : ''} ${collected ? 'poem-card-collected' : ''}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="poem-card-frame">
        <div className="poem-card-art">
          {collected && (
            <span className="poem-card-collected-badge" aria-hidden>✓</span>
          )}
          {coverUrl ? (
            <img src={coverUrl} alt={poem.title} />
          ) : (
            <div className="poem-card-placeholder">
              <span>{poem.title.charAt(0)}</span>
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              className="poem-card-delete"
              onClick={handleDelete}
              aria-label="Delete poem"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>
        <div className="poem-card-info">
          <h3>{poem.title}</h3>
          <span className="category">{poem.category || 'General'}</span>
          {poem.audioPath && <span className="audio-badge">♪</span>}
          {(poem.originalText || poem.translatedText) && (
            <div className="poem-card-preview">
              {poem.originalText && (
                <span className="poem-preview-original">{excerpt(poem.originalText, 28)}</span>
              )}
              {poem.originalText && poem.translatedText && <span className="poem-preview-divider" />}
              {poem.translatedText && (
                <span className="poem-preview-translation">{excerpt(poem.translatedText, 36)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

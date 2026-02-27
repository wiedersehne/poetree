import { useState, useEffect, useMemo } from 'react';
import { getPoems, getCategories, deletePoem, updatePoem, shareBook } from '../api';
import PoemCard from '../components/PoemCard';
import PoemDetail from '../components/PoemDetail';
import { exportBook, exportBookAsBlob } from '../utils/exportBook';
import './Exhibition.css';

export default function Exhibition() {
  const [poems, setPoems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPoem, setSelectedPoem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookMode, setBookMode] = useState(false);
  const [collectedPoems, setCollectedPoems] = useState(new Set());
  const [layout, setLayout] = useState('tree');
  const [shareModal, setShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  const poemsByCategory = useMemo(() => {
    const map = {};
    for (const p of poems) {
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [poems]);

  async function load() {
    try {
      setLoading(true);
      const [poemsData, catsData] = await Promise.all([getPoems(), getCategories()]);
      setPoems(poemsData);
      setCategories(catsData.length ? catsData : ['General']);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDropOnBranch(poemId, targetCategory) {
    try {
      await updatePoem(poemId, { category: targetCategory });
      load();
    } catch (e) {
      console.error('Failed to move poem:', e);
    }
  }

  function toggleCollect(poem) {
    setCollectedPoems((prev) => {
      const next = new Set(prev);
      if (next.has(poem.id)) next.delete(poem.id);
      else next.add(poem.id);
      return next;
    });
  }

  function handleExportBook() {
    const toExport = poems.filter((p) => collectedPoems.has(p.id));
    if (toExport.length === 0) return;
    exportBook(toExport);
    setBookMode(false);
    setCollectedPoems(new Set());
  }

  async function handleShareBook(e) {
    e.preventDefault();
    const toShare = poems.filter((p) => collectedPoems.has(p.id));
    if (toShare.length === 0) return;
    const email = shareEmail.trim();
    if (!email) {
      setShareStatus('Please enter an email address');
      return;
    }
    setShareStatus('Generating PDF…');
    try {
      const pdfBlob = await exportBookAsBlob(toShare);
      await shareBook(toShare, email, pdfBlob);
      setShareStatus('Sent! ✓');
      setShareModal(false);
      setShareEmail('');
    } catch (err) {
      setShareStatus(err.message || 'Failed to send');
    }
  }

  return (
    <div className="exhibition">
      <div className="layout-switcher" title="Change layout">
        {[
          { id: 'tree', label: 'Tree', icon: '🌳' },
          { id: 'grid', label: 'Grid', icon: '⊞' },
          { id: 'list', label: 'List', icon: '≡' },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`layout-btn ${layout === id ? 'active' : ''}`}
            onClick={() => setLayout(id)}
            title={label}
            aria-label={`${label} layout`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="exhibition-header">
        <h1>Poetree</h1>
        <p className="subtitle">
          {bookMode
            ? 'Click poems to add to your book, then export'
            : layout === 'tree'
              ? 'Your poems, blossoming by mood — drag to move between branches'
              : 'Your poems, blossoming by mood'}
        </p>
        <div className="exhibition-actions">
          <button
            type="button"
            className={`action-btn ${bookMode ? 'active' : ''}`}
            onClick={() => {
              setBookMode(!bookMode);
              if (bookMode) setCollectedPoems(new Set());
            }}
          >
            {bookMode ? 'Cancel' : '📖 Create book'}
          </button>
          {bookMode && (
            <>
              <button
                type="button"
                className="action-btn primary"
                onClick={handleExportBook}
                disabled={collectedPoems.size === 0}
              >
                Export PDF ({collectedPoems.size})
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => setShareModal(true)}
                disabled={collectedPoems.size === 0}
              >
                📧 Share via email
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Growing your tree…</div>
      ) : poems.length === 0 ? (
        <div className="empty">
          <p>No poems yet. Plant your first seed.</p>
          <a href="/upload">Add your first poem →</a>
        </div>
      ) : layout === 'tree' ? (
        <div className="poetree">
          <div className="tree-trunk" />
          <div className="tree-branches">
            {poemsByCategory.map(([cat, items], i) => {
              const isLeft = i % 2 === 0;
              return (
                <div
                  key={cat}
                  className={`tree-branch ${isLeft ? 'branch-left' : 'branch-right'}`}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('branch-drop-over'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('branch-drop-over'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('branch-drop-over');
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                      if (data?.id) handleDropOnBranch(data.id, cat);
                    } catch (_) {}
                  }}
                >
                  <div className="branch-stem" />
                  <div className="branch-head">
                    <div className="branch-label">
                      <span className="branch-name">{cat}</span>
                      <span className="branch-count">{items.length} {items.length === 1 ? 'poem' : 'poems'}</span>
                    </div>
                    <div className="branch-leaves">
                      {items.map((poem) => (
                        <PoemCard
                          key={poem.id}
                          poem={poem}
                          onClick={() => bookMode ? toggleCollect(poem) : setSelectedPoem(poem)}
                          onDelete={async (p) => {
                            await deletePoem(p.id);
                            setSelectedPoem(null);
                            load();
                          }}
                          draggable={!bookMode}
                          collected={bookMode && collectedPoems.has(poem.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : layout === 'grid' ? (
        <div className="exhibition-grid">
          {poems.map((poem) => (
            <PoemCard
              key={poem.id}
              poem={poem}
              onClick={() => bookMode ? toggleCollect(poem) : setSelectedPoem(poem)}
              onDelete={async (p) => {
                await deletePoem(p.id);
                setSelectedPoem(null);
                load();
              }}
              draggable={false}
              collected={bookMode && collectedPoems.has(poem.id)}
            />
          ))}
        </div>
      ) : (
        <div className="exhibition-list">
          {poemsByCategory.map(([cat, items]) => (
            <div key={cat} className="list-category">
              <h3 className="list-category-title">{cat} ({items.length})</h3>
              <div className="list-items">
                {items.map((poem) => (
                  <PoemCard
                    key={poem.id}
                    poem={poem}
                    onClick={() => bookMode ? toggleCollect(poem) : setSelectedPoem(poem)}
                    onDelete={async (p) => {
                      await deletePoem(p.id);
                      setSelectedPoem(null);
                      load();
                    }}
                    draggable={false}
                    collected={bookMode && collectedPoems.has(poem.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPoem && (
        <PoemDetail
          poem={selectedPoem}
          onClose={() => setSelectedPoem(null)}
          onUpdate={load}
        />
      )}

      {shareModal && (
        <div className="share-modal-overlay" onClick={() => setShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share book via email</h3>
            <form onSubmit={handleShareBook}>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />
              <div className="share-modal-actions">
                <button type="button" className="action-btn" onClick={() => setShareModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary">
                  Send
                </button>
              </div>
            </form>
            {shareStatus && (
              <p className={`share-status ${shareStatus.startsWith('Sent') ? 'success' : 'error'}`}>
                {shareStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

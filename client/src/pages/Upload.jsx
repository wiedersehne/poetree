import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  uploadPoem,
  createPoem,
  translatePoem,
  updatePoem,
  generateAudio,
  generateMusic,
  getPoem,
  getAvailableMusic,
  generateCover,
} from '../api';
import './Upload.css';

const VOICES = [
  { id: 'onyx', name: 'Onyx', desc: 'Male, deep, resonant', gender: 'male' },
  { id: 'echo', name: 'Echo', desc: 'Male, clear, articulate', gender: 'male' },
  { id: 'ash', name: 'Ash', desc: 'Male, soft, gentle', gender: 'male' },
  { id: 'nova', name: 'Nova', desc: 'Female, warm, expressive', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Female, light, melodic', gender: 'female' },
  { id: 'coral', name: 'Coral', desc: 'Female, warm, friendly', gender: 'female' },
  { id: 'fable', name: 'Fable', desc: 'Female, storytelling quality', gender: 'female' },
  { id: 'sage', name: 'Sage', desc: 'Female, calm, wise', gender: 'female' },
  { id: 'alloy', name: 'Alloy', desc: 'Neutral, balanced', gender: 'neutral' },
];

const MUSIC_STYLES = [
  { id: 'ambient', name: 'Ambient', desc: 'Soft, atmospheric' },
  { id: 'piano', name: 'Piano', desc: 'Gentle solo piano' },
  { id: 'cinematic', name: 'Cinematic', desc: 'Orchestral, emotional' },
  { id: 'nature', name: 'Nature', desc: 'Peaceful, natural sounds' },
  { id: 'jazz', name: 'Jazz', desc: 'Smooth, improvisational' },
  { id: 'folk', name: 'Folk', desc: 'Acoustic, storytelling' },
  { id: 'classical', name: 'Classical', desc: 'Orchestral, timeless' },
  { id: 'electronic', name: 'Electronic', desc: 'Synth, modern' },
  { id: 'lofi', name: 'Lo-fi', desc: 'Chill, nostalgic' },
  { id: 'melancholic', name: 'Melancholic', desc: 'Sad, reflective' },
  { id: 'uplifting', name: 'Uplifting', desc: 'Hopeful, bright' },
  { id: 'epic', name: 'Epic', desc: 'Grand, dramatic' },
];

const STYLES = [
  { id: 'impressionism', name: 'Impressionism', desc: 'Soft brushstrokes, dappled light' },
  { id: 'surrealism', name: 'Surrealism', desc: 'Dreamlike, soft imagery' },
  { id: 'expressionism', name: 'Expressionism', desc: 'Bold, warm colors' },
  { id: 'abstract', name: 'Abstract', desc: 'Geometric, bright palette' },
  { id: 'romanticism', name: 'Romanticism', desc: 'Golden light, sublime' },
  { id: 'minimalism', name: 'Minimalism', desc: 'Sparse, serene' },
  { id: 'japanese', name: 'Japanese Ukiyo-e', desc: 'Woodblock, clean lines' },
  { id: 'watercolor', name: 'Watercolor', desc: 'Delicate, light-filled' },
  { id: 'oil_painting', name: 'Oil Painting', desc: 'Classical, luminous' },
  { id: 'chinese_ink', name: 'Chinese Ink Wash', desc: 'Shui-mo, misty mountains' },
  { id: 'chinese_gongbi', name: 'Chinese Gongbi', desc: 'Fine brushwork, flowers' },
  { id: 'taoist', name: 'Taoist', desc: 'Shanshui, flowing qi' },
  { id: 'zen', name: 'Zen', desc: 'Wabi-sabi, stillness' },
  { id: 'confucian', name: 'Confucian', desc: 'Harmony, refinement' },
  { id: 'sumi_e', name: 'Sumi-e', desc: 'Minimal ink, negative space' },
];

export default function Upload() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [poem, setPoem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [step, setStep] = useState('upload');
  const [error, setError] = useState('');
  const [voice, setVoice] = useState('nova');
  const [speed, setSpeed] = useState(0.9);
  const [pitch, setPitch] = useState(1);
  const [musicStyle, setMusicStyle] = useState('ambient');
  const [style, setStyle] = useState('impressionism');
  const [availableMusic, setAvailableMusic] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (text.trim()) {
      try {
        setLoading(true);
        const p = await createPoem(text, title?.trim() || '', category);
        setPoem(p);
        setStep('transform');
      } catch (err) {
        setError(err.message || 'Failed to create poem');
      } finally {
        setLoading(false);
      }
    } else if (file) {
      try {
        setLoading(true);
        const p = await uploadPoem(file, title?.trim() || '', category);
        setPoem(p);
        setStep('transform');
      } catch (err) {
        setError(err.message || 'Upload failed');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please enter your poem or upload a file');
    }
  }

  async function handleTranslate() {
    if (!poem) return;
    setError('');
    setLoadingAction('translate');
    try {
      const p = await translatePoem(poem.id);
      setPoem(p);
    } catch (err) {
      setError(err.message || 'Translation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGenerateAudio() {
    if (!poem) return;
    setError('');
    setLoadingAction('audio');
    try {
      const p = await generateAudio(poem.id, { voice, speed, pitch });
      setPoem(p);
    } catch (err) {
      setError(err.message || 'Audio generation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  useEffect(() => {
    if (step === 'transform' && poem?.id) {
      getAvailableMusic(poem.id).then(setAvailableMusic).catch(() => setAvailableMusic([]));
    }
  }, [step, poem?.id]);

  async function handleGenerateMusic() {
    if (!poem) return;
    setError('');
    setLoadingAction('music');
    try {
      const res = await generateMusic(poem.id, musicStyle);
      if (res.status === 'generating') {
        const pollMs = 3000;
        const maxAttempts = 100; // ~5 min
        let done = false;
        for (let i = 0; i < maxAttempts && !done; i++) {
          await new Promise((r) => setTimeout(r, pollMs));
          const updated = await getPoem(poem.id);
          if (updated.musicGenerationError) {
            setError(updated.musicGenerationError);
            done = true;
          } else if (updated.musicPath) {
            setPoem(updated);
            setAvailableMusic(await getAvailableMusic(poem.id));
            done = true;
          }
        }
        if (!done) setError('Music generation timed out');
      } else {
        setPoem(res);
        setAvailableMusic(await getAvailableMusic(poem.id));
      }
    } catch (err) {
      setError(err.message || 'Music generation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSelectMusic(path) {
    if (!poem || !path) return;
    setError('');
    try {
      const p = await updatePoem(poem.id, { musicPath: path });
      setPoem(p);
    } catch (err) {
      setError(err.message || 'Failed to apply music');
    }
  }

  async function handleGenerateCover() {
    if (!poem) return;
    setError('');
    setLoadingAction('cover');
    try {
      const p = await generateCover(poem.id, style);
      setPoem(p);
    } catch (err) {
      setError(err.message || 'Cover generation failed');
    } finally {
      setLoadingAction(null);
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setText('');
      if (!title && f.name.endsWith('.txt')) {
        setTitle(f.name.replace('.txt', ''));
      }
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>New Poem</h1>
        <p className="subtitle">Upload your poem and transform it</p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {step === 'upload' ? (
        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your poem</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your poem here…"
              rows={12}
              className="poem-textarea"
            />
          </div>
          <p className="or-divider">— or upload a .txt file —</p>
          <div className="form-group">
            <input
              ref={fileRef}
              type="file"
              accept=".txt"
              onChange={handleFileChange}
            />
            {file && <span className="file-name">{file.name}</span>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Optional — auto-detected from content"
              />
            </div>
          </div>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Adding…' : 'Add Poem'}
          </button>
        </form>
      ) : (
        <div className="transform-panel">
          <div className="transform-header">
            <h2>{poem?.title}</h2>
            <p className="category-badge">{poem?.category || 'General'}</p>
          </div>

          <div className="transform-sections">
            <section className="transform-section">
              <h3>1. Translate to English</h3>
              {poem?.translatedText ? (
                <div className="generated-preview">
                  <div className="preview-translation">
                    <textarea
                      value={poem.translatedText}
                      onChange={(e) => setPoem((p) => ({ ...p, translatedText: e.target.value }))}
                      onBlur={async () => {
                        try {
                          const p = await updatePoem(poem.id, { translatedText: poem.translatedText });
                          setPoem(p);
                        } catch (err) {
                          setError(err.message || 'Failed to save edits');
                        }
                      }}
                      rows={10}
                      className="poem-textarea editable-translation"
                      placeholder="Translated poem (editable)"
                    />
                  </div>
                  <button
                    className="regenerate-btn"
                    onClick={handleTranslate}
                    disabled={loadingAction === 'translate'}
                  >
                    {loadingAction === 'translate' ? 'Regenerating…' : '↻ Regenerate'}
                  </button>
                </div>
              ) : (
                <button
                  className="action-btn"
                  onClick={handleTranslate}
                  disabled={loadingAction === 'translate'}
                >
                  {loadingAction === 'translate' ? 'Translating…' : 'Translate'}
                </button>
              )}
            </section>

            <section className="transform-section">
              <h3>2. Generate Audio (TTS)</h3>
              <p className="hint">Choose a voice, pace, and pitch. Produces spoken-word only (no music). Use step 3 for music, then &quot;Play with music&quot; in the poem view.</p>
              <div className="voice-grid">
                {VOICES.map((v) => (
                  <label key={v.id} className={`voice-option voice-${v.gender}`}>
                    <input
                      type="radio"
                      name="voice"
                      value={v.id}
                      checked={voice === v.id}
                      onChange={() => setVoice(v.id)}
                    />
                    <span className="voice-name">{v.name}</span>
                    <span className="voice-gender">{v.gender}</span>
                    <span className="voice-desc">{v.desc}</span>
                  </label>
                ))}
              </div>
              <div className="audio-options-row">
                <div className="option-group">
                  <label>Pace (speed)</label>
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                    <option value={0.75}>Slower (0.75×)</option>
                    <option value={0.9}>Poetry pace (0.9×)</option>
                    <option value={0.95}>Slightly slower (0.95×)</option>
                    <option value={1}>Normal (1×)</option>
                    <option value={1.1}>Slightly faster (1.1×)</option>
                    <option value={1.25}>Faster (1.25×)</option>
                  </select>
                </div>
                <div className="option-group">
                  <label>Pitch</label>
                  <select value={pitch} onChange={(e) => setPitch(Number(e.target.value))}>
                    <option value={0.9}>Lower</option>
                    <option value={1}>Normal</option>
                    <option value={1.1}>Higher</option>
                  </select>
                </div>
              </div>
              {poem?.audioPath ? (
                <div className="generated-preview">
                  <audio
                    key={poem.audioGeneratedAt || poem.audioPath}
                    src={`${poem.audioPath}${poem.audioGeneratedAt ? `?v=${poem.audioGeneratedAt}` : ''}`}
                    controls
                    className="preview-audio"
                  />
                  <button
                    className="regenerate-btn"
                    onClick={handleGenerateAudio}
                    disabled={loadingAction === 'audio'}
                  >
                    {loadingAction === 'audio' ? 'Regenerating…' : '↻ Regenerate'}
                  </button>
                </div>
              ) : (
                <button
                  className="action-btn"
                  onClick={handleGenerateAudio}
                  disabled={loadingAction === 'audio'}
                >
                  {loadingAction === 'audio' ? 'Generating…' : 'Generate Audio'}
                </button>
              )}
            </section>

            <section className="transform-section">
              <h3>3. Generate background music</h3>
              <p className="hint">Generate new music or select from previously generated tracks.</p>
              <div className="style-grid music-style-grid">
                {MUSIC_STYLES.map((s) => (
                  <label key={s.id} className="style-option">
                    <input
                      type="radio"
                      name="musicStyle"
                      value={s.id}
                      checked={musicStyle === s.id}
                      onChange={() => setMusicStyle(s.id)}
                    />
                    <span className="style-name">{s.name}</span>
                    <span className="style-desc">{s.desc}</span>
                  </label>
                ))}
              </div>
              <div className="music-actions-row">
                <button
                  className="action-btn"
                  onClick={handleGenerateMusic}
                  disabled={loadingAction === 'music'}
                >
                  {loadingAction === 'music' ? 'Generating…' : 'Generate new music'}
                </button>
                {availableMusic.length > 0 && (
                  <div className="select-existing-music">
                    <label htmlFor="select-music">Or use from:</label>
                    <select
                      id="select-music"
                      value=""
                      onChange={(e) => {
                        const path = e.target.value;
                        if (path) handleSelectMusic(path);
                        e.target.value = '';
                      }}
                    >
                      <option value="">— Select existing —</option>
                      {availableMusic.map((m) => (
                        <option key={m.id} value={m.path}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {poem?.musicPath ? (
                <div className="generated-preview">
                  <audio key={poem.musicPath} src={poem.musicPath} controls className="preview-audio" preload="metadata" />
                  <button
                    className="regenerate-btn"
                    onClick={handleGenerateMusic}
                    disabled={loadingAction === 'music'}
                  >
                    {loadingAction === 'music' ? 'Regenerating…' : '↻ Regenerate'}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="transform-section">
              <h3>4. Generate Cover Art</h3>
              <p className="hint">Select an artistic style for your cover.</p>
              <div className="style-grid">
                {STYLES.map((s) => (
                  <label key={s.id} className="style-option">
                    <input
                      type="radio"
                      name="style"
                      value={s.id}
                      checked={style === s.id}
                      onChange={() => setStyle(s.id)}
                    />
                    <span className="style-name">{s.name}</span>
                    <span className="style-desc">{s.desc}</span>
                  </label>
                ))}
              </div>
              {poem?.coverPath ? (
                <div className="generated-preview">
                  <img src={poem.coverPath} alt="Cover" className="preview-cover" />
                  <button
                    className="regenerate-btn"
                    onClick={handleGenerateCover}
                    disabled={loadingAction === 'cover'}
                  >
                    {loadingAction === 'cover' ? 'Regenerating…' : '↻ Regenerate'}
                  </button>
                </div>
              ) : (
                <button
                  className="action-btn"
                  onClick={handleGenerateCover}
                  disabled={loadingAction === 'cover'}
                >
                  {loadingAction === 'cover' ? 'Generating…' : 'Generate Cover'}
                </button>
              )}
            </section>
          </div>

          <div className="transform-actions">
            <button
              className="secondary-btn"
              onClick={() => {
                setPoem(null);
                setStep('upload');
                setFile(null);
                setText('');
                setTitle('');
              }}
            >
              Add Another Poem
            </button>
            <button
              className="primary-btn"
              onClick={() => navigate('/')}
            >
              View in Exhibition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

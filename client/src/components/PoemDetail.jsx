import { useState, useRef, useEffect } from 'react';
import './PoemDetail.css';

export default function PoemDetail({ poem, onClose, onUpdate }) {
  const [playing, setPlaying] = useState(false);
  const [withMusic, setWithMusic] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [highlightLine, setHighlightLine] = useState(-1);
  const audioCtxRef = useRef(null);
  const audioRef = useRef(null);

  const hasBoth = poem.originalText && poem.translatedText;
  const coverUrl = poem.coverPath;
  const spokenText = poem.translatedText || poem.originalText;
  const spokenLines = spokenText ? spokenText.split(/\r?\n/).filter((l) => l.trim()) : [];

  function handlePlayPause() {
    if (!poem.audioPath) return;
    const audio = audioRef.current || document.getElementById(`audio-${poem.id}`);
    if (!audio) return;
    if (playing && !withMusic) {
      audio.pause();
      setPlaying(false);
    } else if (!playing) {
      setWithMusic(false);
      audio.volume = 1;
      audio.muted = false;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  async function handlePlayWithMusic() {
    if (!poem.audioPath) return;
    if (playing && withMusic) {
      audioCtxRef.current?.close?.();
      setPlaying(false);
      setWithMusic(false);
      setHighlightLine(-1);
      return;
    }
    try {
      const musicUrl = poem.musicPath || '/api/ambient-music';
      const [speechRes, musicRes] = await Promise.all([
        fetch(poem.audioPath),
        fetch(musicUrl),
      ]);
      if (!speechRes.ok || !musicRes.ok) throw new Error('Failed to load audio');
      const [speechBuf, musicBuf] = await Promise.all([
        speechRes.arrayBuffer(),
        musicRes.arrayBuffer(),
      ]);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const [speechData, musicData] = await Promise.all([
        ctx.decodeAudioData(speechBuf.slice(0)),
        ctx.decodeAudioData(musicBuf.slice(0)),
      ]);
      const speechSource = ctx.createBufferSource();
      speechSource.buffer = speechData;
      const musicSource = ctx.createBufferSource();
      musicSource.buffer = musicData;
      musicSource.loop = true;
      const speechGain = ctx.createGain();
      speechGain.gain.value = 1.2;
      const musicGain = ctx.createGain();
      musicGain.gain.value = 0.12;
      speechSource.connect(speechGain);
      musicSource.connect(musicGain);
      speechGain.connect(ctx.destination);
      musicGain.connect(ctx.destination);
      speechSource.start(0);
      musicSource.start(0);
      setPlaying(true);
      setWithMusic(true);
      speechSource.onended = () => {
        musicSource.stop();
        ctx.close();
        setPlaying(false);
        setWithMusic(false);
        setHighlightLine(-1);
      };
    } catch (e) {
      console.warn('Play with music failed:', e);
      handlePlayPause();
    }
  }

  function handleEnded() {
    setPlaying(false);
    setHighlightLine(-1);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, onClose]);

  useEffect(() => {
    const audio = audioRef.current || document.getElementById(`audio-${poem.id}`);
    if (!audio || spokenLines.length === 0) return;
    const totalChars = spokenText.length;
    const lineStarts = spokenLines.map((line, i) => {
      const charsBefore = spokenLines.slice(0, i).join('\n').length;
      return charsBefore / totalChars;
    });
    function onTimeUpdate() {
      if (!audio.duration || audio.duration === Infinity) return;
      const progress = audio.currentTime / audio.duration;
      let idx = -1;
      for (let i = 0; i < lineStarts.length; i++) {
        const next = i + 1 < lineStarts.length ? lineStarts[i + 1] : 1;
        if (progress >= lineStarts[i] && progress < next) {
          idx = i;
          break;
        }
      }
      if (progress >= 0.99) idx = spokenLines.length - 1;
      setHighlightLine(idx);
    }
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [poem.id, spokenLines, spokenText]);

  function renderWithHighlight(text, isSpoken) {
    const lines = text.split(/\r?\n/); /* preserve empty lines = paragraph breaks */
    return lines.map((line, i) => {
      const spokenIdx = lines.slice(0, i + 1).filter((l) => l.trim()).length - 1;
      const active = isSpoken && line.trim() && spokenIdx === highlightLine;
      return (
        <span key={i} className={active ? 'poem-line highlight' : 'poem-line'}>
          {i > 0 && '\n'}
          {line}
        </span>
      );
    });
  }

  return (
    <div className={`poem-detail-overlay ${fullscreen ? 'fullscreen' : ''}`} onClick={onClose} role="dialog" aria-modal>
      <div className={`poem-detail ${fullscreen ? 'poem-detail-fullscreen' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="poem-detail-toolbar">
          <button className="toolbar-btn" onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen reading'}>
            {fullscreen ? '✕' : '⛶'}
          </button>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="poem-detail-content">
          <div className="poem-detail-art">
            {coverUrl ? (
              <img src={coverUrl} alt={poem.title} />
            ) : (
              <div className="poem-detail-placeholder" />
            )}
          </div>

          <div className="poem-detail-text">
            <h2>{poem.title}</h2>
            <span className="meta">{poem.category || 'General'}</span>

            <div className="poem-body paper-effect">
              {hasBoth ? (
                <>
                  <pre className="poem-original poem-lines">
                    {renderWithHighlight(poem.originalText, spokenText === poem.originalText)}
                  </pre>
                  <pre className="poem-translation poem-lines">
                    {renderWithHighlight(poem.translatedText, spokenText === poem.translatedText)}
                  </pre>
                </>
              ) : (
                <pre className="poem-lines">
                  {renderWithHighlight(poem.translatedText || poem.originalText, true)}
                </pre>
              )}
            </div>

            {poem.audioPath ? (
              <div className="audio-controls">
                <audio
                  ref={audioRef}
                  id={`audio-${poem.id}`}
                  key={poem.audioGeneratedAt || poem.audioPath}
                  src={`${poem.audioPath}${poem.audioGeneratedAt ? `?v=${poem.audioGeneratedAt}` : ''}`}
                  onEnded={handleEnded}
                  controls
                />
                <div className="play-buttons">
                  <button
                    className="play-btn"
                    onClick={handlePlayPause}
                    aria-label={playing && !withMusic ? 'Pause' : 'Play'}
                    disabled={withMusic}
                  >
                    {playing && !withMusic ? '⏸ Pause' : '▶ Listen'}
                  </button>
                  <button
                    className="play-btn secondary"
                    onClick={handlePlayWithMusic}
                    aria-label="Play with background music"
                  >
                    {playing && withMusic ? '⏸ Stop' : '♪ Play with music'}
                  </button>
                </div>
                <p className="audio-hint">Use &quot;Play with music&quot; to hear the reading mixed with your generated background music.</p>
              </div>
            ) : (
              <p className="no-audio">No audio yet. Generate it from the Upload page.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

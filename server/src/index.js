import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { translatePoem } from './services/translate.js';
import { categorizePoem } from './services/categorize.js';
import { generateAudio, getAmbientMusicPath } from './services/audio.js';
import { generateCover } from './services/cover.js';
import { generateMusic } from './services/music.js';
import { generateBookPdf } from './services/bookPdf.js';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/generated', express.static(path.join(__dirname, '../generated')));

const clientDist = path.join(__dirname, '../../client/dist');
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  app.get('/', (req, res) => {
    res.json({ name: 'Poetree API', status: 'ok', message: 'Use the app at http://localhost:5173' });
  });
}

const uploadsDir = path.join(__dirname, '../uploads');
const generatedDir = path.join(__dirname, '../generated');
const poemsFile = path.join(__dirname, '../data/poems.json');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.txt`);
  },
});
const upload = multer({ storage });

function extractTitleFromText(text) {
  const firstLine = String(text).split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return 'Untitled';
  return firstLine.trim().slice(0, 100);
}

// Create poem from text (no file upload)
app.post('/api/poems/create', async (req, res) => {
  try {
    const { title, category, text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Poem text is required' });
    }
    const textContent = String(text).trim();
    const autoCategory = category || await categorizePoem(textContent);
    const poem = {
      id: uuidv4(),
      title: (title && title.trim()) ? title.trim() : extractTitleFromText(textContent),
      originalText: textContent,
      translatedText: null,
      category: autoCategory,
      coverPath: null,
      audioPath: null,
      musicPath: null,
      createdAt: new Date().toISOString(),
    };
    const poems = await getPoems();
    poems.push(poem);
    await savePoems(poems);
    res.json(poem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function ensureDataDir() {
  await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(path.join(generatedDir, 'covers'), { recursive: true });
  await fs.mkdir(path.join(generatedDir, 'audio'), { recursive: true });
  await fs.mkdir(path.join(generatedDir, 'music'), { recursive: true });
  try {
    await fs.access(poemsFile);
  } catch {
    await fs.writeFile(poemsFile, JSON.stringify([]));
  }
}

async function getPoems() {
  const data = await fs.readFile(poemsFile, 'utf-8');
  return JSON.parse(data);
}

async function savePoems(poems) {
  await fs.writeFile(poemsFile, JSON.stringify(poems, null, 2));
}

// Upload poem
app.post('/api/poems', upload.single('poem'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No poem file uploaded' });
    }
    const content = await fs.readFile(req.file.path, 'utf-8');
    const autoCategory = req.body.category || await categorizePoem(content);
    const poem = {
      id: uuidv4(),
      title: (req.body.title && req.body.title.trim()) ? req.body.title.trim() : extractTitleFromText(content),
      originalText: content,
      translatedText: null,
      category: autoCategory,
      coverPath: null,
      audioPath: null,
      musicPath: null,
      createdAt: new Date().toISOString(),
    };
    const poems = await getPoems();
    poems.push(poem);
    await savePoems(poems);
    res.json(poem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update translated text (for manual edits)
app.patch('/api/poems/:id', async (req, res) => {
  try {
    const { translatedText, musicPath, category } = req.body;
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });
    if (translatedText !== undefined) poem.translatedText = String(translatedText).trim() || null;
    if (musicPath !== undefined) poem.musicPath = musicPath ? String(musicPath) : null;
    if (category !== undefined) poem.category = String(category).trim() || 'General';
    await savePoems(poems);
    res.json(poem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Translate poem
app.post('/api/poems/:id/translate', async (req, res) => {
  try {
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });

    const translated = await translatePoem(poem.originalText);
    poem.translatedText = translated;
    await savePoems(poems);
    res.json(poem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate audio
app.post('/api/poems/:id/audio', async (req, res) => {
  try {
    const { voice, speed, pitch } = req.body;
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });

    const textToSpeak = poem.translatedText || poem.originalText;
    const audioPath = await generateAudio(textToSpeak, poem.id, {
      voice, speed, pitch,
    });
    poem.audioPath = audioPath;
    poem.audioGeneratedAt = new Date().toISOString();
    await savePoems(poems);
    res.json({ ...poem, audioPath, audioGeneratedAt: poem.audioGeneratedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate background music (async to avoid request timeouts; Suno/ffmpeg can take minutes)
app.post('/api/poems/:id/music', async (req, res) => {
  try {
    const { style } = req.body;
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });

    delete poem.musicGenerationError; // clear any prior error
    const text = poem.translatedText || poem.originalText;
    const s = style || 'ambient';

    res.status(202).json({ status: 'generating', ...poem });

    (async () => {
      try {
        const musicPath = await generateMusic(poem.id, text, s);
        poem.musicPath = musicPath;
        delete poem.musicGenerationError;
      } catch (err) {
        console.error('[music]', err);
        poem.musicGenerationError = err.message;
      }
      const updated = await getPoems();
      const idx = updated.findIndex((p) => p.id === poem.id);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...poem };
        await savePoems(updated);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate cover
app.post('/api/poems/:id/cover', async (req, res) => {
  try {
    const { style } = req.body;
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });

    const text = poem.translatedText || poem.originalText;
    const coverPath = await generateCover(text, poem.id, style);
    poem.coverPath = coverPath;
    poem.coverStyle = style;
    await savePoems(poems);
    res.json({ ...poem, coverPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all poems
app.get('/api/poems', async (req, res) => {
  try {
    const poems = await getPoems();
    res.json(poems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single poem
app.get('/api/poems/:id', async (req, res) => {
  try {
    const poems = await getPoems();
    const poem = poems.find((p) => p.id === req.params.id);
    if (!poem) return res.status(404).json({ error: 'Poem not found' });
    res.json(poem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete poem
app.delete('/api/poems/:id', async (req, res) => {
  try {
    const poems = await getPoems();
    const index = poems.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Poem not found' });
    poems.splice(index, 1);
    await savePoems(poems);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve ambient music for client-side mixing (fallback when server mixing fails)
app.get('/api/ambient-music', async (req, res) => {
  try {
    const ambientPath = await getAmbientMusicPath();
    res.sendFile(ambientPath);
  } catch (err) {
    res.status(500).json({ error: 'Could not load ambient music' });
  }
});

// Share book via email
app.post('/api/share-book', async (req, res) => {
  try {
    const { poems, email, pdfBase64 } = req.body;
    const addr = String(email || '').trim();
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    let pdfBuffer;
    let poemCount = 0;
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      poemCount = (poems && Array.isArray(poems)) ? poems.length : 0;
    } else if (poems && Array.isArray(poems) && poems.length > 0) {
      pdfBuffer = await generateBookPdf(poems);
      poemCount = poems.length;
    } else {
      return res.status(400).json({ error: 'Poems array or pdfBase64 is required' });
    }
    const poemText = poemCount > 0 ? `${poemCount} poem${poemCount === 1 ? '' : 's'}` : 'poems';
    const filename = `poetree-${new Date().toISOString().slice(0, 10)}.pdf`;

    // Option 1: Resend (simplest - just API key)
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendKey) {
      const from = (process.env.RESEND_FROM || 'Poetree <onboarding@resend.dev>').trim();
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from,
        to: [addr],
        subject: 'My Poetry Collection from Poetree',
        text: `I'm sharing my poetry collection with you. Attached is a PDF of ${poemText}.`,
        attachments: [{ filename, content: pdfBuffer }],
      });
      if (error) throw new Error(error.message);
      return res.json({ success: true, message: 'Book sent successfully' });
    }

    // Option 2: SMTP (Gmail App Password or other)
    const smtpHost = (process.env.SMTP_HOST || '').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    let smtpPass = (process.env.SMTP_PASS || '').trim();
    if ((smtpPass.startsWith('"') && smtpPass.endsWith('"')) || (smtpPass.startsWith("'") && smtpPass.endsWith("'"))) {
      smtpPass = smtpPass.slice(1, -1);
    }
    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(503).json({
        error: 'Email not configured',
        hint: 'Set RESEND_API_KEY (easiest) or SMTP_HOST+SMTP_USER+SMTP_PASS in .env',
      });
    }
    const transporter = nodemailer.createTransport(
      smtpHost.includes('gmail')
        ? { service: 'gmail', auth: { user: smtpUser, pass: smtpPass } }
        : {
            host: smtpHost,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_PORT === '465',
            auth: { user: smtpUser, pass: smtpPass },
          }
    );
    await transporter.sendMail({
      from: (process.env.SMTP_FROM || smtpUser).trim(),
      to: addr,
      subject: 'My Poetry Collection from Poetree',
      text: `I'm sharing my poetry collection with you. Attached is a PDF of ${poemText}.`,
      attachments: [{ filename, content: pdfBuffer }],
    });
    res.json({ success: true, message: 'Book sent successfully' });
  } catch (err) {
    console.error('Share book error:', err);
    let msg = err.message || 'Failed to send email';
    if (err.code === 'EAUTH') {
      msg = 'Gmail rejected login. Use an App Password (not your regular password): https://myaccount.google.com/apppasswords';
    }
    res.status(500).json({ error: msg });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const poems = await getPoems();
    const categories = [...new Set(poems.map((p) => p.category || 'General'))].sort();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Production: serve built client and SPA fallback
if (isProduction) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', async () => {
  await ensureDataDir();
  console.log(`Poetree server running on port ${PORT}`);
});

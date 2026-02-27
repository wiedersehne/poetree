import OpenAI from 'openai';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OPENAI_API_KEY } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ffmpeg = ffmpegStatic || 'ffmpeg';

function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to server/.env');
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

const VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

const AMBIENT_URLS = [
  'https://cdn.pixabay.com/audio/2022/03/10/audio_8af4c6f2a9.mp3',
  'https://cdn.pixabay.com/audio/2021/08/09/audio_2f2d4e68e3.mp3',
  'https://cdn.pixabay.com/audio/2022/08/04/audio_8a1cc6909c.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-past-75.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-gently-soft-background-155.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
];

const TTS_CHUNK_SIZE = 3800;

async function prepareForExpressiveReading(text, openai) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Prepare this poem for expressive spoken-word performance. Read it as a human would—with feeling, breath, and rhythm.
RULES: Do not add or remove any words. Do not change any words.
ONLY add punctuation for natural delivery: commas where a reader would pause to breathe, ellipses for reflective pauses, em-dashes for dramatic breaks.
Preserve all line breaks and stanza breaks exactly.
Output ONLY the poem text, no explanation.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });
    return res.choices[0].message.content.trim();
  } catch (e) {
    console.warn('[audio] GPT prepare failed, using original:', e.message);
    return text;
  }
}

function splitIntoChunks(text) {
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= TTS_CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, TTS_CHUNK_SIZE);
    const lastPeriod = Math.max(chunk.lastIndexOf('. '), chunk.lastIndexOf('! '), chunk.lastIndexOf('? '), chunk.lastIndexOf('\n'));
    const splitAt = lastPeriod > TTS_CHUNK_SIZE / 2 ? lastPeriod + 1 : TTS_CHUNK_SIZE;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks.filter((c) => c.length > 0);
}

export async function generateAudio(text, poemId, options = {}) {
  const openai = getClient();
  const voice = options.voice || 'nova';
  const speed = Math.max(0.25, Math.min(4, options.speed ?? 1));
  const pitch = options.pitch ?? 1;

  const preparedText = await prepareForExpressiveReading(text, openai);
  const chunks = splitIntoChunks(preparedText);
  const audioDir = path.join(__dirname, '../../generated/audio');

  let speechFile;
  if (chunks.length === 1) {
    speechFile = path.join(audioDir, `${poemId}.mp3`);
    const response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: VOICES.includes(voice) ? voice : 'nova',
      input: chunks[0],
      speed,
    });
    await fs.writeFile(speechFile, Buffer.from(await response.arrayBuffer()));
  } else {
    const partFiles = [];
    for (let i = 0; i < chunks.length; i++) {
      const partPath = path.join(audioDir, `${poemId}-part${i}.mp3`);
      const response = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: VOICES.includes(voice) ? voice : 'nova',
        input: chunks[i],
        speed,
      });
      await fs.writeFile(partPath, Buffer.from(await response.arrayBuffer()));
      partFiles.push(partPath);
    }
    speechFile = path.join(audioDir, `${poemId}.mp3`);
    const listPath = path.join(audioDir, `${poemId}-concat.txt`);
    const listContent = partFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.writeFile(listPath, listContent);
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', speechFile]);
    for (const f of partFiles) await fs.unlink(f).catch(() => {});
    await fs.unlink(listPath).catch(() => {});
  }

  let processedFile = speechFile;
  if (pitch !== 1) {
    const pitchedPath = path.join(__dirname, '../../generated/audio', `${poemId}-pitched.mp3`);
    try {
      await applyPitch(speechFile, pitchedPath, pitch);
      await fs.unlink(speechFile).catch(() => {});
      processedFile = pitchedPath;
    } catch (e) {
      console.warn('Pitch adjustment failed, using original:', e.message);
    }
  }

  return processedFile === speechFile ? `/generated/audio/${poemId}.mp3` : `/generated/audio/${poemId}-pitched.mp3`;
}

async function runFfmpeg(args) {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  return promisify(execFile)(ffmpeg, args, { timeout: 60000 });
}

async function applyPitch(inputPath, outputPath, pitchRatio) {
  const rate = Math.round(44100 * pitchRatio);
  await runFfmpeg(['-y', '-i', inputPath, '-af', `asetrate=${rate},aresample=44100`, outputPath]);
}

export { VOICES };

export async function getAmbientMusicPath() {
  const musicDir = path.join(__dirname, '../../assets/music');
  await fs.mkdir(musicDir, { recursive: true });
  const existing = await fs.readdir(musicDir).catch(() => []);
  let musicFile = existing.find((f) => f.endsWith('.mp3'));
  if (musicFile) return path.join(musicDir, musicFile);
  const ambientPath = path.join(musicDir, 'ambient.mp3');
  for (const url of AMBIENT_URLS) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) {
          await fs.writeFile(ambientPath, buf);
          return ambientPath;
        }
      }
    } catch (e) {
      continue;
    }
  }
  const genPath = path.join(musicDir, 'generated-ambient.mp3');
  await runFfmpeg([
    '-y', '-f', 'lavfi', '-i', 'sine=frequency=55:duration=600',
    '-f', 'lavfi', '-i', 'sine=frequency=82:duration=600',
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest,volume=0.05,afade=t=in:st=0:d=2',
    '-t', '600', genPath,
  ]);
  return genPath;
}

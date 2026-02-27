import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ffmpeg = ffmpegStatic || 'ffmpeg';

const SUNO_API = 'https://api.sunoapi.org/api/v1';

async function runFfmpeg(args) {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  return promisify(execFile)(ffmpeg, args, { timeout: 20000 });
}

export async function generateMusic(poemId, text, style = 'ambient') {
  const musicDir = path.join(__dirname, '../../generated/music');
  await fs.mkdir(musicDir, { recursive: true });
  const filePath = path.join(musicDir, `${poemId}.mp3`);

  const token = process.env.SUNO_API_KEY;
  if (token) {
    try {
      const audioUrl = await generateWithSuno(token, text, style);
      if (audioUrl) {
        const res = await fetch(audioUrl);
        if (res.ok) {
          await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
          return `/generated/music/${poemId}.mp3`;
        }
      }
    } catch (e) {
      console.warn('[music] Suno failed, using ffmpeg fallback:', e.message);
    }
  }

  await runFfmpeg([
    '-y', '-f', 'lavfi', '-i', 'sine=frequency=55:duration=120',
    '-f', 'lavfi', '-i', 'sine=frequency=82:duration=120',
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest,volume=0.05,afade=t=in:st=0:d=2',
    '-t', '120', filePath,
  ]);
  return `/generated/music/${poemId}.mp3`;
}

async function generateWithSuno(token, text, style) {
  const prompt = buildMusicPrompt(text, style);
  const styleMap = {
    ambient: 'Ambient',
    piano: 'Classical Piano',
    cinematic: 'Cinematic',
    nature: 'Nature Sounds',
  };
  const sunoStyle = styleMap[style] || 'Ambient';

  const res = await fetch(`${SUNO_API}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customMode: false,
      instrumental: true,
      model: 'V4_5',
      callBackUrl: 'https://example.com/suno-callback',
      prompt: prompt.slice(0, 500),
    }),
  });

  const data = await res.json();
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(data.msg || 'Suno generation failed');
  }

  const taskId = data.data.taskId;
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${SUNO_API}/generate/record-info?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const statusData = await statusRes.json();
    if (statusData.code !== 200) continue;
    const status = statusData.data?.status;
    if (status === 'SUCCESS' && statusData.data?.response?.sunoData?.length > 0) {
      return statusData.data.response.sunoData[0].audioUrl;
    }
    if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'SENSITIVE_WORD_ERROR'].includes(status)) {
      throw new Error(statusData.data?.errorMessage || status);
    }
  }
  throw new Error('Suno generation timed out');
}

function buildMusicPrompt(text, style) {
  const excerpt = text.split('\n').slice(0, 3).join(' ').slice(0, 150);
  const stylePrompts = {
    ambient: 'soft ambient instrumental, gentle pads, atmospheric, calm, meditative, suitable for poetry reading',
    piano: 'solo piano, gentle, emotional, romantic, contemplative, instrumental',
    cinematic: 'cinematic orchestral, subtle strings, emotional, film score',
    nature: 'nature sounds with soft music, birds, gentle wind, peaceful, ambient',
    jazz: 'smooth jazz instrumental, soft saxophone, gentle piano, laid-back, sophisticated',
    folk: 'acoustic folk instrumental, fingerpicking guitar, storytelling, warm, organic',
    classical: 'classical orchestral, strings and piano, elegant, timeless, contemplative',
    electronic: 'soft electronic instrumental, atmospheric synths, modern, ethereal',
    lofi: 'lo-fi hip hop beat, chill, nostalgic, vinyl warmth, relaxed',
    melancholic: 'melancholic instrumental, sad, reflective, minor keys, emotional depth',
    uplifting: 'uplifting inspirational instrumental, hopeful, bright, major keys, joyful',
    epic: 'epic orchestral, grand, dramatic, powerful, cinematic buildup',
  };
  const base = stylePrompts[style] || stylePrompts.ambient;
  return `${base}. Mood from poem: ${excerpt}`;
}

export const MUSIC_STYLES = ['ambient', 'piano', 'cinematic', 'nature', 'jazz', 'folk', 'classical', 'electronic', 'lofi', 'melancholic', 'uplifting', 'epic'];

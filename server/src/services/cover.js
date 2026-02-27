import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OPENAI_API_KEY } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to server/.env');
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

const STYLES = {
  impressionism: 'soft brushstrokes, dappled light, atmospheric, light and airy, Monet-style impressionist, luminous',
  surrealism: 'dreamlike, soft surrealism, melting forms, gentle impossible imagery, pastel tones, not dark',
  expressionism: 'bold brushstrokes, vivid but warm colors, emotional intensity, expressive yet hopeful',
  abstract: 'abstract art, geometric shapes, flowing forms, bright palette, Kandinsky-style, playful',
  romanticism: 'dramatic yet luminous, sublime nature, Turner-inspired, golden light, not gloomy',
  minimalism: 'minimalist, sparse composition, quiet contemplative, soft whites and grays, serene',
  japanese: 'Japanese ukiyo-e, woodblock print, Hokusai-inspired, clean lines, light colors',
  watercolor: 'delicate watercolor, soft washes, poetic fluidity, translucent, light-filled',
  oil_painting: 'classical oil painting, rich but warm textures, Renaissance mastery, luminous',
  chinese_ink: 'traditional Chinese ink wash painting, shui-mo, brush and ink on rice paper, misty mountains, Zen minimalism, soft grays',
  chinese_gongbi: 'Chinese gongbi painting, fine brushwork, delicate colors, flowers and birds, refined detail, light palette',
  taoist: 'Taoist philosophy art, flowing qi, mountain-and-water shanshui, emptiness and fullness, mist, soft greens and blues',
  zen: 'Zen Buddhist aesthetic, wabi-sabi, asymmetry, simplicity, soft earth tones, contemplative stillness',
  confucian: 'Confucian harmony, balanced composition, scholarly elegance, bamboo and plum, restrained refinement',
  sumi_e: 'sumi-e ink painting, Japanese minimalist, single brush strokes, vast negative space, meditative',
};

async function poemToSafeImagePrompt(text, openai) {
  const excerpt = text.split('\n').slice(0, 8).join('\n').slice(0, 600);
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a visual poet. Read this poem and distill its SOUL—the emotional truth, the ache or joy at its core, the metaphor beneath the words.

Output a DALL-E image prompt (max 100 words) that makes the poem's spirit VISIBLE. Do not describe the poem literally. Instead, create imagery that embodies its inner feeling:
- If it speaks of loss → imagery of absence, fading light, empty spaces, something gone
- If it speaks of longing → imagery of distance, horizons, thresholds, waiting
- If it speaks of love → imagery of connection, warmth, intertwining, bloom
- If it speaks of time → imagery of flux, decay, renewal, the eternal moment
- If it speaks of solitude → imagery of quiet vastness, a single presence, stillness

Use symbolic, atmospheric, painterly language. Favor LIGHT, SOFT, LUMINOUS imagery—avoid dark shadows, gloom, or heavy darkness. No violence, no recognizable faces, no text in the image. Output ONLY the prompt, nothing else.`,
      },
      { role: 'user', content: excerpt },
    ],
    temperature: 0.6,
  });
  return res.choices[0].message.content.trim();
}

export async function generateCover(text, poemId, style = 'impressionism') {
  const openai = getClient();
  const styleDesc = STYLES[style] || STYLES.impressionism;
  const safePrompt = await poemToSafeImagePrompt(text, openai);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Create a cover painting that captures the soul of a poem. Artistic style: ${styleDesc}.

Visual essence to embody: ${safePrompt}

The image must feel like the poem made visible—its emotional truth rendered in paint. Prefer LIGHT, LUMINOUS, AIRY aesthetics—avoid dark, gloomy, or heavy tones. Evocative, profound, museum-quality. No text, no letters, no words in the image.`,
    n: 1,
    size: '1792x1024',
    quality: 'hd',
    style: 'vivid',
  });

  const imageUrl = response.data[0].url;
  const imageResponse = await fetch(imageUrl);
  let buffer = Buffer.from(await imageResponse.arrayBuffer());

  const coversDir = path.join(__dirname, '../../generated/covers');
  await fs.mkdir(coversDir, { recursive: true });
  const filename = `${poemId}-${style}.png`;
  const filepath = path.join(coversDir, filename);

  const { width, height } = await sharp(buffer).metadata();
  const targetRatio = 4 / 3;
  const currentRatio = width / height;
  let cropW = width, cropH = height, left = 0, top = 0;
  if (currentRatio > targetRatio) {
    cropW = Math.round(height * targetRatio);
    left = Math.round((width - cropW) / 2);
  } else {
    cropH = Math.round(width / targetRatio);
    top = Math.round((height - cropH) / 2);
  }
  buffer = await sharp(buffer)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();

  await fs.writeFile(filepath, buffer);
  return `/generated/covers/${filename}`;
}

export { STYLES };

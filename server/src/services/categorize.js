import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config.js';

const POETRY_CATEGORIES = [
  'Love', 'Nature', 'Life', 'Death', 'Time', 'Memory', 'Joy', 'Sorrow',
  'Hope', 'Dreams', 'Solitude', 'Friendship', 'Longing', 'Beauty', 'Mortality', 'General',
];

function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for auto-categorization');
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

export async function categorizePoem(text) {
  if (!OPENAI_API_KEY) return 'General';
  const openai = getClient();
  const excerpt = String(text).trim().slice(0, 800);
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a poetry curator. Classify this poem into exactly ONE of these categories. Reply with ONLY the category name, nothing else.
Categories: ${POETRY_CATEGORIES.join(', ')}`,
        },
        { role: 'user', content: excerpt },
      ],
      temperature: 0.2,
    });
    const raw = res.choices[0].message.content.trim();
    const match = POETRY_CATEGORIES.find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    return match || 'General';
  } catch (e) {
    console.warn('[categorize] GPT failed, using General:', e.message);
    return 'General';
  }
}

export { POETRY_CATEGORIES };

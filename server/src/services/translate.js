import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config.js';

function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to server/.env');
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

export async function translatePoem(text) {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert literary translator specializing in poetry. Translate the following poem into excellent, lyrical English. 
Preserve the poem's rhythm, imagery, emotional resonance, and metaphorical depth. 
Use evocative, beautiful language that honors the original's artistry. 
Return ONLY the translated poem, no explanations or commentary.`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

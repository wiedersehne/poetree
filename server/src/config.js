import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = dotenv.config({ path: path.join(__dirname, '../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || '';
if (result.error) {
  console.warn('[config] .env load failed:', result.error.message);
} else if (!OPENAI_API_KEY) {
  console.warn('[config] OPENAI_API_KEY empty. Add it to server/.env');
} else {
  console.log('[config] OPENAI_API_KEY loaded');
}
export { OPENAI_API_KEY };

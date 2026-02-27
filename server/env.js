import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('[env] Could not load .env from', envPath, result.error.message);
} else if (!process.env.OPENAI_API_KEY) {
  console.warn('[env] OPENAI_API_KEY is empty. Add your key to server/.env');
} else {
  console.log('[env] OPENAI_API_KEY loaded');
}

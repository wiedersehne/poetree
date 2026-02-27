# Poetree

A website to upload your poems, translate them to English, generate beautiful audio with natural voices and background music, and create AI cover art. Browse your collection in an art exhibition–style gallery.

## Features

1. **Upload poems** — Type or upload poems with title and category
2. **Translate to English** — Literary-quality translation
3. **Generate background music** — AI-composed music from poem mood (Suno; optional)
4. **Generate audio** — Full-text TTS with male/female voices, pace, pitch, and optional background music
5. **Generate cover art** — AI paintings in 9 artistic styles
6. **Read & listen** — Click any cover to read and play; "Play with music" for client-side mixing
7. **Exhibition view** — Poems categorized gallery-style

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure OpenAI API key

Create `server/.env`:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your [OpenAI API key](https://platform.openai.com/api-keys). The app uses:

- **GPT-4o** for poem translation
- **DALL-E 3** for cover art
- **TTS (tts-1-hd)** for audio with 13 voice options

### 3. (Optional) Background music & AI music

- **AI-generated music**: Add `SUNO_API_KEY` to `server/.env`. Get a token at [sunoapi.org](https://sunoapi.org).
- **Fallback mixing**: Uses bundled `ffmpeg-static`. If URL fetch fails, generates ambient with ffmpeg.
- **Client-side mixing**: "Play with music" in the poem view mixes TTS + ambient in the browser (no server mixing needed).

### 4. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3001  

## Usage

1. Go to **+ New Poem** and upload a `.txt` file
2. Set title and category, then **Upload Poem**
3. Translate, generate audio (choose voice + music), and generate cover (choose style)
4. Open **Exhibition** to browse your poems by category
5. Click any cover to read the poem and play the audio

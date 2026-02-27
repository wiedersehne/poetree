# Deploy Poetree to the Web

This guide walks you through deploying Poetree using [Render](https://render.com) (free tier available). Your GitHub: [wiedersehne](https://github.com/wiedersehne?tab=repositories).

## Prerequisites

- [GitHub](https://github.com) account
- [Render](https://render.com) account (free)
- [OpenAI API key](https://platform.openai.com/api-keys) (for translation & categorization)

## Step 1: Push to GitHub

If Poetree is not yet a GitHub repo:

```bash
cd /home/tong/Documents/poetree

# Initialize git (skip if already done)
git init

# Add all files
git add .
git commit -m "Initial commit: Poetree poetry app"

# Create a new repo at github.com/new named "poetree", then:
git remote add origin https://github.com/wiedersehne/poetree.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in (e.g. with GitHub).
2. Click **New** → **Blueprint** (or **Web Service**).
3. Connect your GitHub account if needed.
4. Select the **poetree** repository.
5. Render will detect `render.yaml`. Confirm the settings:
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Add these in **Environment**:
     - `OPENAI_API_KEY` (required) – from [platform.openai.com](https://platform.openai.com/api-keys)
     - `RESEND_API_KEY` + `RESEND_FROM` (optional) – for email sharing via [Resend](https://resend.com)
     - Or use Gmail SMTP vars instead – see `server/.env.example`
6. Click **Deploy**.

Your app will be available at `https://poetree-xxxx.onrender.com` (or a similar URL).

## Step 3: Notes

- **Free tier:** App sleeps after inactivity; first load can take 30–60 seconds.
- **Data:** Poems and generated files are stored on Render’s ephemeral disk. Data is lost on redeploys. For persistent data, add a database later.
- **Email:** Configure Resend or SMTP in env vars if you want “Share book via email” to work.

## Alternative: Manual Web Service

If you prefer not to use `render.yaml`:

1. **New** → **Web Service**
2. Connect the **poetree** repo
3. Set:
   - **Root Directory:** (leave empty)
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Add `OPENAI_API_KEY` and any email-related variables

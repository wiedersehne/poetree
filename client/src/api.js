const API = '/api';

export async function getPoems() {
  const res = await fetch(`${API}/poems`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPoem(id) {
  const res = await fetch(`${API}/poems/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API}/categories`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadPoem(file, title, category) {
  const form = new FormData();
  form.append('poem', file);
  form.append('title', title?.trim() || '');
  form.append('category', category?.trim() || '');
  const res = await fetch(`${API}/poems`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createPoem(text, title, category) {
  const res = await fetch(`${API}/poems/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim(), title: title?.trim() || undefined, category: category?.trim() || undefined }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePoem(id, updates) {
  const res = await fetch(`${API}/poems/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function translatePoem(id) {
  const res = await fetch(`${API}/poems/${id}/translate`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateAudio(id, options = {}) {
  const { voice, speed = 1, pitch = 1 } = options;
  const res = await fetch(`${API}/poems/${id}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice, speed, pitch }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAvailableMusic(excludePoemId = null) {
  const poems = await getPoems();
  return poems
    .filter((p) => p.musicPath && p.id !== excludePoemId)
    .map((p) => ({ id: p.id, title: p.title, path: p.musicPath }));
}

export async function generateMusic(id, style = 'ambient') {
  const res = await fetch(`${API}/poems/${id}/music`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ style }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (data.status === 'generating') return { status: 'generating', poem: data };
  return data;
}

export async function generateCover(id, style) {
  const res = await fetch(`${API}/poems/${id}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ style }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePoem(id) {
  const res = await fetch(`${API}/poems/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function shareBook(poems, email, pdfBlob = null) {
  let body = { poems, email };
  if (pdfBlob && pdfBlob instanceof Blob) {
    const pdfBase64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const parts = (r.result || '').split(',');
        resolve(parts[1] || null);
      };
      r.onerror = reject;
      r.readAsDataURL(pdfBlob);
    });
    if (pdfBase64) body = { email, pdfBase64 };
  }
  const res = await fetch(`${API}/share-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let err = {};
    try { err = JSON.parse(text); } catch { /* use text as message */ }
    throw new Error(err.error || text || 'Failed to send');
  }
  return res.json();
}

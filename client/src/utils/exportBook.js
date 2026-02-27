import { jsPDF } from 'jspdf';
import initFont from 'jspdf-font';

initFont(jsPDF.API, 'SongtiSCBlack');

/* Match PoemDetail: pre with line-height: 1.8, white-space: pre-wrap */
const LINE_HEIGHT = 6.2;
const ORIGINAL_TRANSLATION_GAP = 10;

async function loadImageAsBase64(src) {
  const url = src.startsWith('http') || src.startsWith('/') ? src : '/' + src.replace(/^\//, '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load image');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function renderLines(text) {
  if (text == null || typeof text !== 'string') return [];
  return text.split(/\r?\n/);
}

async function buildPdfDoc(poems) {
  const doc = new jsPDF({ format: 'a5', unit: 'mm' });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('My Poetry Collection', pageWidth / 2, y, { align: 'center' });
  y += 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${poems.length} poem${poems.length === 1 ? '' : 's'}`, pageWidth / 2, y, { align: 'center' });
  y += 22;

  for (let i = 0; i < poems.length; i++) {
    const poem = poems[i];
    if (!poem || typeof poem !== 'object') continue;

    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    if (poem.coverPath) {
      try {
        const imgData = await loadImageAsBase64(poem.coverPath);
        const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, format, margin, y, contentWidth, 45);
        y += 55;
      } catch {
        /* skip cover if failed */
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(poem.title || 'Untitled', contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * LINE_HEIGHT + 4;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`— ${poem.category || 'General'}`, margin, y);
    y += 10;

    doc.setFontSize(11);
    const textBlocks = [];
    if (poem.originalText) textBlocks.push({ text: poem.originalText, font: 'SongtiSCBlack' });
    if (poem.translatedText) textBlocks.push({ text: poem.translatedText, font: 'helvetica' });
    if (textBlocks.length === 0 && (poem.originalText || poem.translatedText)) {
      textBlocks.push({ text: poem.originalText || poem.translatedText, font: 'helvetica' });
    }

    for (let bi = 0; bi < textBlocks.length; bi++) {
      const { text, font } = textBlocks[bi];
      doc.setFont(font, 'normal');
      const lines = renderLines(text);
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        if (line.trim() === '') {
          y += LINE_HEIGHT;
        } else {
          const wrapped = doc.splitTextToSize(line, contentWidth);
          for (const w of wrapped) {
            doc.text(w, margin, y);
            y += LINE_HEIGHT;
          }
        }
      }
      if (bi < textBlocks.length - 1) y += ORIGINAL_TRANSLATION_GAP;
    }

    y += 18;
  }

  return doc;
}

export function exportBook(poems) {
  if (!poems || poems.length === 0) return;
  buildPdfDoc(poems).then((doc) => {
    doc.save(`poetree-${new Date().toISOString().slice(0, 10)}.pdf`);
  });
}

export async function exportBookAsBlob(poems) {
  if (!poems || poems.length === 0) return null;
  const doc = await buildPdfDoc(poems);
  return doc.output('blob');
}

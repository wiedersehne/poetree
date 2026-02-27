import { jsPDF } from 'jspdf';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateBookPdf(poems) {
  const doc = new jsPDF({ format: 'a5', unit: 'mm' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const generatedDir = path.join(__dirname, '../../generated');
  let y = margin;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('My Poetry Collection', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${poems.length} poem${poems.length === 1 ? '' : 's'}`, pageWidth / 2, y, { align: 'center' });
  y += 30;

  for (let i = 0; i < poems.length; i++) {
    const p = poems[i];
    const title = p.title || 'Untitled';
    const category = p.category || 'General';

    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    if (p.coverPath) {
      try {
        const coverPath = p.coverPath.startsWith('/')
          ? path.join(generatedDir, p.coverPath.replace(/^\/generated\/?/, ''))
          : path.join(generatedDir, p.coverPath);
        const buf = await fs.readFile(coverPath);
        const base64 = Buffer.from(buf).toString('base64');
        const ext = path.extname(coverPath).toLowerCase();
        const mime = ext === '.png' ? 'PNG' : 'JPEG';
        const imgW = contentWidth;
        const imgH = Math.min(45, imgW * 0.75);
        doc.addImage(base64, mime, margin, y, imgW, imgH);
        y += imgH + 8;
      } catch {
        /* skip cover if not found */
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6.2 + 4;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`— ${category}`, margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const texts = [];
    if (p.originalText) texts.push({ text: p.originalText });
    if (p.translatedText) texts.push({ text: p.translatedText });
    if (texts.length === 0) texts.push({ text: '' });

    const LINE_HEIGHT = 6.2;
    const ORIGINAL_TRANSLATION_GAP = 10;
    for (let ti = 0; ti < texts.length; ti++) {
      const lines = String(texts[ti].text).split(/\r?\n/);
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
      if (ti < texts.length - 1) y += ORIGINAL_TRANSLATION_GAP;
    }

    y += 15;
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

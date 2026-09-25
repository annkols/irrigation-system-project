import { jsPDF } from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR_TEXT = [31, 41, 55];
const COLOR_MUTED = [107, 114, 128];
const COLOR_PRIMARY = [0, 109, 61];
const COLOR_BORDER = [229, 231, 235];

export function createReport() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return { doc, y: MARGIN };
}

function ensureSpace(ctx, needed) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }
}

export function addCoverTitle(ctx, { title, experimentName, generatedAt, generatedBy }) {
  const { doc } = ctx;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(title, MARGIN, ctx.y + 8);
  ctx.y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(experimentName, MARGIN, ctx.y);
  ctx.y += 8;

  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}${generatedBy ? `  ·  by ${generatedBy}` : ""}`, MARGIN, ctx.y);
  ctx.y += 6;

  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 10;
}

export function addSectionHeading(ctx, text) {
  ensureSpace(ctx, 16);
  const { doc } = ctx;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(text, MARGIN, ctx.y + 5);
  ctx.y += 8;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 7;
}

export function addSubheading(ctx, text) {
  ensureSpace(ctx, 10);
  const { doc } = ctx;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(text, MARGIN, ctx.y + 4);
  ctx.y += 8;
}

export function addEmptyNote(ctx, text) {
  ensureSpace(ctx, 8);
  const { doc } = ctx;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(text, MARGIN, ctx.y + 4);
  ctx.y += 9;
}

// pairs: [[label, value], ...] rendered as a two-column label/value list
export function addKeyValueList(ctx, pairs) {
  const { doc } = ctx;
  const labelWidth = 45;
  const valueWidth = CONTENT_WIDTH - labelWidth;

  pairs.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_MUTED);
    const lines = doc.splitTextToSize(String(value ?? "-"), valueWidth);
    const rowHeight = Math.max(6, lines.length * 4.6 + 2);
    ensureSpace(ctx, rowHeight);

    doc.text(label.toUpperCase(), MARGIN, ctx.y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(lines, MARGIN + labelWidth, ctx.y + 4);
    ctx.y += rowHeight;
  });
  ctx.y += 3;
}

export function addParagraph(ctx, text, { italic = false } = {}) {
  const { doc } = ctx;
  doc.setFont("helvetica", italic ? "italic" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  const needed = lines.length * 4.8 + 2;
  ensureSpace(ctx, needed);
  doc.text(lines, MARGIN, ctx.y + 4);
  ctx.y += needed;
}

// columns: [{ header, width }], rows: [[cell, ...]]
export function addTable(ctx, { columns, rows }) {
  const { doc } = ctx;
  const rowHeight = 7;

  const drawHeader = () => {
    ensureSpace(ctx, rowHeight + 2);
    let x = MARGIN;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT);
    columns.forEach((col) => {
      doc.text(col.header, x, ctx.y + 5);
      x += col.width;
    });
    ctx.y += rowHeight;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
    ctx.y += 2;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rows.forEach((row) => {
    if (ctx.y + rowHeight > PAGE_HEIGHT - MARGIN) {
      ctx.doc.addPage();
      ctx.y = MARGIN;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    let x = MARGIN;
    doc.setTextColor(...COLOR_TEXT);
    row.forEach((cell, i) => {
      doc.text(String(cell ?? "-"), x, ctx.y + 5);
      x += columns[i].width;
    });
    ctx.y += rowHeight;
  });
  ctx.y += 4;
}

// dataUrl: full-quality PNG/JPEG data URL; caption optional
export function addImage(ctx, { dataUrl, caption, maxWidth = CONTENT_WIDTH, maxHeight = 90 }) {
  const { doc } = ctx;
  let width = maxWidth;
  let height = maxHeight;
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / props.height;
    height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
  } catch {
    // keep fallback box size
  }

  ensureSpace(ctx, height + (caption ? 6 : 0) + 4);
  try {
    doc.addImage(dataUrl, MARGIN, ctx.y, width, height);
  } catch {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("(image could not be embedded)", MARGIN, ctx.y + 4);
  }
  ctx.y += height + 2;

  if (caption) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(caption, MARGIN, ctx.y + 3);
    ctx.y += 6;
  }
  ctx.y += 3;
}

export function savePdf(ctx, filename) {
  ctx.doc.save(filename);
}

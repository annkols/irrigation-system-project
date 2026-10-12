import { jsPDF } from "jspdf";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR_TEXT = [31, 41, 55];
const COLOR_MUTED = [107, 114, 128];
const COLOR_PRIMARY = [0, 109, 61];
const COLOR_BORDER = [229, 231, 235];
const COLOR_ROW_ALT = [247, 248, 250];

const FONT = "Roboto";
const FONT_FILES = {
  normal: "Roboto-Regular.ttf",
  bold: "Roboto-Bold.ttf",
  italic: "Roboto-Italic.ttf",
};
let fontCache = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function loadFonts() {
  if (!fontCache) {
    fontCache = Promise.all(
      Object.entries(FONT_FILES).map(async ([style, file]) => {
        const res = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
        if (!res.ok) throw new Error(`Could not load font ${file}.`);
        return [style, file, arrayBufferToBase64(await res.arrayBuffer())];
      })
    ).catch((err) => {
      fontCache = null;
      throw err;
    });
  }
  return fontCache;
}

export async function createReport() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fonts = await loadFonts();
  fonts.forEach(([style, file, data]) => {
    doc.addFileToVFS(file, data);
    doc.addFont(file, FONT, style);
  });
  doc.setFont(FONT, "normal");
  doc.setLineHeightFactor(1.3);
  return { doc, y: MARGIN };
}

function setStyle(doc, { style = "normal", size = 10, color = COLOR_TEXT }) {
  doc.setFont(FONT, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function lineHeight(doc) {
  return (doc.getFontSize() * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
}

function newPage(ctx) {
  ctx.doc.addPage();
  ctx.y = MARGIN;
}

function ensureSpace(ctx, needed) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN) newPage(ctx);
}

function writeLines(ctx, lines, x = MARGIN) {
  const lh = lineHeight(ctx.doc);
  lines.forEach((line) => {
    ensureSpace(ctx, lh);
    ctx.doc.text(line, x, ctx.y, { baseline: "top" });
    ctx.y += lh;
  });
}

function writeWrapped(ctx, text, width = CONTENT_WIDTH, x = MARGIN) {
  writeLines(ctx, ctx.doc.splitTextToSize(String(text ?? ""), width), x);
}

export function addCoverTitle(ctx, { title, experimentName, generatedAt, generatedBy }) {
  const { doc } = ctx;
  setStyle(doc, { style: "bold", size: 22 });
  writeWrapped(ctx, title);
  ctx.y += 2;

  setStyle(doc, { size: 14, color: COLOR_MUTED });
  writeWrapped(ctx, experimentName);
  ctx.y += 2;

  setStyle(doc, { size: 9.5, color: COLOR_MUTED });
  writeWrapped(ctx, `Generated: ${generatedAt}${generatedBy ? `  ·  by ${generatedBy}` : ""}`);
  ctx.y += 3;

  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 8;
}

export function addSectionHeading(ctx, text) {
  const { doc } = ctx;
  ensureSpace(ctx, 24);
  ctx.y += 2;
  setStyle(doc, { style: "bold", size: 15 });
  writeWrapped(ctx, text);
  ctx.y += 1;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 5;
}

export function addSubheading(ctx, text) {
  ensureSpace(ctx, 18);
  ctx.y += 2;
  setStyle(ctx.doc, { style: "bold", size: 11.5 });
  writeWrapped(ctx, text);
  ctx.y += 2;
}

export function addEmptyNote(ctx, text) {
  setStyle(ctx.doc, { style: "italic", size: 10, color: COLOR_MUTED });
  writeWrapped(ctx, text);
  ctx.y += 4;
}

export function addKeyValueList(ctx, pairs) {
  const { doc } = ctx;
  const labelWidth = 48;
  const gap = 4;
  const valueWidth = CONTENT_WIDTH - labelWidth - gap;

  pairs.forEach(([label, value]) => {
    setStyle(doc, { style: "bold", size: 8.5, color: COLOR_MUTED });
    const labelLines = doc.splitTextToSize(label.toUpperCase(), labelWidth);
    const labelHeight = labelLines.length * lineHeight(doc);

    setStyle(doc, { size: 10 });
    const valueLines = doc.splitTextToSize(String(value ?? "-"), valueWidth);
    const valueHeight = valueLines.length * lineHeight(doc);

    ensureSpace(ctx, Math.min(Math.max(labelHeight, valueHeight), 40));
    const top = ctx.y;

    setStyle(doc, { style: "bold", size: 8.5, color: COLOR_MUTED });
    doc.text(labelLines, MARGIN, top + 0.6, { baseline: "top" });

    setStyle(doc, { size: 10 });
    writeLines(ctx, valueLines, MARGIN + labelWidth + gap);
    ctx.y = Math.max(ctx.y, top + labelHeight) + 2.2;
  });
  ctx.y += 3;
}

export function addParagraph(ctx, text, { italic = false } = {}) {
  setStyle(ctx.doc, { style: italic ? "italic" : "normal", size: 10 });
  String(text ?? "")
    .split(/\r?\n/)
    .forEach((line) => {
      if (!line.trim()) {
        ctx.y += lineHeight(ctx.doc) * 0.6;
        return;
      }
      writeWrapped(ctx, line);
    });
  ctx.y += 4;
}

// columns: [{ header, width }], rows: [[cell, ...]]
export function addTable(ctx, { columns, rows }) {
  const { doc } = ctx;
  const padX = 2;
  const padY = 1.8;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const widths = columns.map((col) => (col.width / totalWidth) * CONTENT_WIDTH);

  const measureRow = (cells) => {
    const wrapped = cells.map((cell, i) =>
      doc.splitTextToSize(String(cell ?? "-"), widths[i] - padX * 2)
    );
    const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight(doc) + padY * 2;
    return { wrapped, height };
  };

  const drawRow = ({ wrapped, height }, fill) => {
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(MARGIN, ctx.y, CONTENT_WIDTH, height, "F");
    }
    let x = MARGIN;
    wrapped.forEach((lines, i) => {
      doc.text(lines, x + padX, ctx.y + padY, { baseline: "top" });
      x += widths[i];
    });
    ctx.y += height;
  };

  const drawHeader = () => {
    setStyle(doc, { style: "bold", size: 8.5 });
    const header = measureRow(columns.map((col) => col.header));
    ensureSpace(ctx, header.height + 10);
    drawRow(header, null);
    doc.setDrawColor(...COLOR_PRIMARY);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
    ctx.y += 0.5;
    setStyle(doc, { size: 9 });
  };

  drawHeader();
  rows.forEach((row, index) => {
    const measured = measureRow(row);
    if (ctx.y + measured.height > PAGE_HEIGHT - MARGIN) {
      newPage(ctx);
      drawHeader();
    }
    drawRow(measured, index % 2 === 1 ? COLOR_ROW_ALT : null);
  });
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;
}

export function addImage(ctx, { dataUrl, caption, maxWidth = CONTENT_WIDTH, maxHeight = 90 }) {
  const { doc } = ctx;
  let width = maxWidth;
  let height = maxHeight;
  let props = null;
  try {
    props = doc.getImageProperties(dataUrl);
  } catch {
    props = null;
  }
  if (props) {
    const ratio = props.width / props.height;
    height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
  }

  ensureSpace(ctx, height + (caption ? 6 : 0) + 4);
  try {
    doc.addImage(dataUrl, MARGIN, ctx.y, width, height);
  } catch {
    setStyle(doc, { style: "italic", size: 9, color: COLOR_MUTED });
    doc.text("(image could not be embedded)", MARGIN, ctx.y, { baseline: "top" });
  }
  ctx.y += height + 2;

  if (caption) {
    setStyle(doc, { size: 9, color: COLOR_MUTED });
    writeWrapped(ctx, caption);
  }
  ctx.y += 3;
}

export function savePdf(ctx, filename) {
  const { doc } = ctx;
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setStyle(doc, { size: 8, color: COLOR_MUTED });
    doc.text(`${i} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: "right" });
  }
  doc.save(filename);
}

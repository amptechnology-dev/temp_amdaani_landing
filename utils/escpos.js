// Low-level ESC/POS byte-command builder — mirrors what your RN Printer
// native module does internally, but in pure JS for the browser.

const ESC = 0x1b;
const GS = 0x1d;

export function textToBytes(str) {
  return new TextEncoder().encode(str + "\n");
}

export function initPrinter() {
  return new Uint8Array([ESC, 0x40]); // ESC @ — reset
}

export function setAlign(align = "left") {
  const map = { left: 0, center: 1, right: 2 };
  return new Uint8Array([ESC, 0x61, map[align] ?? 0]);
}

export function setBold(on = true) {
  return new Uint8Array([ESC, 0x45, on ? 1 : 0]);
}

export function setFont(font = "a") {
  return new Uint8Array([ESC, 0x4d, font === "b" ? 1 : 0]);
}

export function setSize(sizeW = 1, sizeH = 1) {
  const n = ((sizeW - 1) << 4) | (sizeH - 1);
  return new Uint8Array([GS, 0x21, n]);
}

export function feed(lines = 1) {
  return new Uint8Array([ESC, 0x64, lines]);
}

export function cutPaper() {
  return new Uint8Array([GS, 0x56, 0x00]); // full cut
}

// Concatenate multiple Uint8Array buffers into one
export function concatBytes(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// Build a printable "line" with align/bold/size options — returns bytes
export function line(text, { align, bold, sizeW = 1, sizeH = 1, font } = {}) {
  const parts = [];
  if (font) parts.push(setFont(font));
  if (align) parts.push(setAlign(align));
  if (bold) parts.push(setBold(true));
  if (sizeW > 1 || sizeH > 1) parts.push(setSize(sizeW, sizeH));
  parts.push(textToBytes(text));
  if (sizeW > 1 || sizeH > 1) parts.push(setSize(1, 1));
  if (bold) parts.push(setBold(false));
  if (align) parts.push(setAlign("left"));
  return concatBytes(parts);
}

// Simple fixed-width column printer — pads/truncates each cell to width
export function columns(widths, aligns, values) {
  let row = "";
  values.forEach((val, i) => {
    const w = widths[i] ?? 10;
    const a = aligns[i] ?? "left";
    let cell = String(val ?? "").slice(0, w);
    const pad = w - cell.length;
    if (a === "right") cell = " ".repeat(pad) + cell;
    else if (a === "center") {
      const left = Math.floor(pad / 2);
      cell = " ".repeat(left) + cell + " ".repeat(pad - left);
    } else {
      cell = cell + " ".repeat(pad);
    }
    row += cell;
  });
  return textToBytes(row);
}

export function divider(width = 32) {
  return textToBytes("-".repeat(width));
}

// Convert an <img>/canvas to ESC/POS raster bitmap bytes (GS v 0)
export async function imageUrlToRaster(url, maxWidthPx = 300) {
  const img = await loadImage(url);
  const scale = Math.min(1, maxWidthPx / img.width);
  const w = Math.floor(img.width * scale);
  const h = Math.floor(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h).data;
  const widthBytes = Math.ceil(w / 8);
  const raster = new Uint8Array(widthBytes * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlack = gray < 180; // threshold
      if (isBlack) {
        const byteIndex = y * widthBytes + Math.floor(x / 8);
        raster[byteIndex] |= 0x80 >> x % 8;
      }
    }
  }

  const header = new Uint8Array([
    GS, 0x76, 0x30, 0x00,
    widthBytes & 0xff, (widthBytes >> 8) & 0xff,
    h & 0xff, (h >> 8) & 0xff,
  ]);

  return concatBytes([header, raster]);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
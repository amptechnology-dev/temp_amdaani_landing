import { format } from "date-fns";

export const PRINTER_DOT_WIDTH = { 58: 384, 80: 576 };
export function resolveDotWidth(paperWidthMM) {
  return PRINTER_DOT_WIDTH[paperWidthMM] || PRINTER_DOT_WIDTH[58];
}

async function fetchImageAsDataURL(url) {
  if (!url) return null;
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Image proxy failed: ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[ThermalReceipt] Image fetch failed, skipping:", url, err);
    return null;
  }
}

const FONT_FAMILY = '"Courier New", Courier, monospace';

// ---- FONT SIZE CONFIG ----
// These are the TRUE font sizes (in printer dots/px) that will show up on paper.
// Since html2canvas renders at scale:1, 1 CSS px === 1 printer dot.
// Tune these two numbers up/down until the printed text matches what you want
// (bigger number = bigger text on paper = fewer characters fit per line).
const BASE_WIDTH_PX = 384; // reference width = 58mm paper
const BASE_FONT_SIZE_PX = { a: 30, b: 24 }; // font "a" = bigger/bold headers, "b" = normal body

function getFontSizePx(font = "b", printerWidthPx = 384) {
  const base = BASE_FONT_SIZE_PX[font] || BASE_FONT_SIZE_PX.b;
  // scale proportionally if using 80mm (576px) paper etc.
  return Math.max(10, Math.round(base * (printerWidthPx / BASE_WIDTH_PX)));
}

let _measureCanvas = null;
const _charWidthCache = new Map();
function measureCharWidthPx(fontSizePx) {
  if (typeof document === "undefined") return fontSizePx * 0.6;
  if (_charWidthCache.has(fontSizePx)) return _charWidthCache.get(fontSizePx);
  if (!_measureCanvas) _measureCanvas = document.createElement("canvas");
  const ctx = _measureCanvas.getContext("2d");
  ctx.font = `${fontSizePx}px ${FONT_FAMILY}`;
  const w = ctx.measureText("0").width;
  _charWidthCache.set(fontSizePx, w);
  return w;
}

// capacity is now DERIVED from the real font size, not the other way around
function getLineCapacity(printerWidthPx = 384, font = "a", sizeW = 1) {
  const fontSizePx = getFontSizePx(font, printerWidthPx);
  const charWidth = measureCharWidthPx(fontSizePx) * sizeW;
  if (!charWidth) return 32;
  return Math.max(1, Math.floor(printerWidthPx / charWidth));
}

function wrapTextForPrinter(text, sizeW = 1, lineCapacityBase = 32) {
  const lineCapacity = Math.floor(lineCapacityBase / sizeW);
  const words = String(text ?? "").split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length <= lineCapacity) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);

  return lines.length ? lines : [""];
}

function getColumnWidths(font = "b", sizeW = 1, printerWidthPx = 384) {
  const total = getLineCapacity(printerWidthPx, font, sizeW);
  const ratios = [0.4, 0.1, 0.25, 0.25];
  const widths = ratios.map((r) => Math.floor(total * r));
  const diff = total - widths.reduce((a, b) => a + b, 0);
  widths[0] += diff;
  return widths;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function padCell(text, width, align) {
  const str = String(text ?? "");
  if (str.length >= width) return str;
  const diff = width - str.length;
  if (align === "right") return " ".repeat(diff) + str;
  if (align === "center") {
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return " ".repeat(left) + str + " ".repeat(right);
  }
  return str + " ".repeat(diff);
}

function formatColumns(widths, aligns, values) {
  return widths.map((w, i) => padCell(values[i], w, aligns[i])).join("");
}

function lineText(text, { align = "left", bold = false, font = "b", big = false } = {}) {
  const classes = ["ln", font === "a" ? "fontA" : "fontB", align, bold ? "bold" : "", big ? "big" : ""]
    .filter(Boolean)
    .join(" ");
  return `<div class="${classes}">${escapeHtml(text)}</div>`;
}

function lineDivider(font = "b", widthPx) {
  const cap = getLineCapacity(widthPx, font, 1);
  return lineText("-".repeat(cap), { font, align: "left" });
}

function lineColumns(widths, aligns, values, { bold = false, font = "b" } = {}) {
  return lineText(formatColumns(widths, aligns, values), { align: "left", bold, font });
}

function wrappedTextLines(text, opts, widthPx) {
  const cap = getLineCapacity(widthPx, opts.font || "b", 1);
  return wrapTextForPrinter(text, 1, cap)
    .map((line) => lineText(line, opts))
    .join("");
}

async function buildThermalReceiptHTML({
  createdInvoice,
  invoiceData = {},
  formValues = {},
  cartItems = [],
  invoiceCalculations = {},
  invoiceNumber,
  invoiceDate,
  storedata = {},
  isGstInvoice = false,
  isFreePlan = true,
  payment = { paid: 0, due: 0, status: "unpaid" },
  widthPx = 384,
}) {
  const out = [];

  const logoDataUrl = await fetchImageAsDataURL(storedata?.logoUrl);
  if (logoDataUrl) {
    out.push(`<div class="center"><img src="${logoDataUrl}" class="logo"/></div>`);
  }

  out.push(wrappedTextLines(storedata?.name || "STORE", { align: "center", bold: true, font: "a" }, widthPx));
  if (storedata?.tagline) {
    out.push(wrappedTextLines(storedata.tagline, { align: "center", font: "b" }, widthPx));
  }
  out.push(lineDivider("b", widthPx));

  const addr = storedata?.address || {};
  if (addr.street || addr.city || addr.state || addr.postalCode) {
    out.push(
      wrappedTextLines(
        `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.postalCode || ""} `,
        { align: "center", font: "b" },
        widthPx,
      ),
    );
  }
  if (isGstInvoice && storedata?.gstNumber) {
    out.push(wrappedTextLines(`GSTIN: ${storedata.gstNumber}`, { align: "center", font: "b" }, widthPx));
  }
  if (storedata?.contactNo) {
    out.push(wrappedTextLines(`Ph.No.: +91 - ${storedata.contactNo} `, { align: "center", font: "b" }, widthPx));
  }
  if (storedata?.email) {
    out.push(wrappedTextLines(`Email: ${storedata.email} `, { align: "center", font: "b" }, widthPx));
  }
  out.push(lineDivider("b", widthPx));

  out.push(wrappedTextLines(`Invoice: ${invoiceNumber} `, { font: "b" }, widthPx));
  out.push(
    wrappedTextLines(`Date: ${format(new Date(invoiceDate), "dd-MMM-yyyy hh:mm a")} `, { font: "b" }, widthPx),
  );
  if (formValues.contactNumber) {
    out.push(wrappedTextLines(`Customer Mobile: ${formValues.contactNumber} `, { font: "b" }, widthPx));
  }
  if (formValues.partyName || formValues.customerName) {
    out.push(
      wrappedTextLines(
        `Customer Name: ${formValues.partyName || formValues.customerName || ""} `,
        { font: "b" },
        widthPx,
      ),
    );
  }
  out.push(lineDivider("b", widthPx));

  if (invoiceData?.status?.toLowerCase?.() === "cancelled") {
    out.push(lineText("CANCELLED", { align: "center", bold: true, font: "a", big: true }));
    out.push(lineDivider("a", widthPx));
  }

  const colWidths = getColumnWidths("b", 1, widthPx);
  out.push(lineColumns(colWidths, ["left", "center", "right", "right"], ["Item", "Qty", "Rate", "Amt"], {
    bold: true,
    font: "b",
  }));
  out.push(lineDivider("b", widthPx));

  const items = cartItems?.length ? cartItems : invoiceData?.items || [];
  for (const item of items) {
    const qty = Number(item.qty || item.quantity || 0);
    const baseRate = Number(item.baseRate || item.effectiveRate || item.price || 0);
    const discount = Number(item.discount || 0);
    const gstRate = Number(item.gstRate || 0);
    const isTaxInclusive = !!item.isTaxInclusive;
    const totalAmount = Number(item.total || baseRate * qty);

    let perItemDiscount = discount;
    if (isTaxInclusive && gstRate > 0) {
      perItemDiscount = perItemDiscount / (1 + gstRate / 100);
    }
    const totalDiscount = perItemDiscount * qty;
    const discountPercent =
      baseRate > 0 && perItemDiscount > 0 ? ((perItemDiscount / baseRate) * 100).toFixed(2) : null;

    const wrappedName = wrapTextForPrinter(item.name || "", 1, colWidths[0]);
    wrappedName.forEach((line, i) => {
      if (i === 0) {
        out.push(
          lineColumns(
            colWidths,
            ["left", "center", "right", "right"],
            [line, String(qty), baseRate.toFixed(2), totalAmount.toFixed(2)],
            { font: "b" },
          ),
        );
      } else {
        out.push(lineColumns(colWidths, ["left", "center", "right", "right"], [line, "", "", ""], { font: "b" }));
      }
    });

    if (totalDiscount > 0) {
      out.push(
        lineColumns(
          colWidths,
          ["left", "center", "right", "right"],
          [`${item.hsn ? `HSN: ${item.hsn} ` : ""}`, "", `Dis ${discountPercent ? `${discountPercent}%` : ""}`, ""],
          { font: "b" },
        ),
      );
    }

    out.push(lineDivider("b", widthPx));
  }

  const totalsWidths = [20, 12];
  const subTotal = createdInvoice ? Number(invoiceData?.subTotal || 0) : Number(invoiceCalculations.subtotal || 0);
  out.push(lineColumns(totalsWidths, ["left", "right"], ["Sub Total", subTotal.toFixed(2)], { font: "a" }));

  const discountTotal = createdInvoice
    ? Number(invoiceData?.discountTotal || 0)
    : Number(invoiceCalculations.discountTotal || 0);
  if (discountTotal > 0) {
    out.push(
      lineColumns(totalsWidths, ["left", "right"], ["Extra discount", `-${discountTotal.toFixed(2)}`], {
        font: "a",
      }),
    );
  }

  const rawRoundOff = createdInvoice
    ? Number(invoiceData?.roundOff || 0)
    : Number(invoiceCalculations.roundOff || 0);
  const roundOffValue = Number((rawRoundOff || 0).toFixed(2));
  if (roundOffValue !== 0) {
    const sign = roundOffValue > 0 ? "+" : "";
    out.push(
      lineColumns(totalsWidths, ["left", "right"], ["Round Off", `${sign}${roundOffValue.toFixed(2)}`], {
        font: "a",
      }),
    );
  }

  out.push(lineDivider("b", widthPx));

  const grandTotal = createdInvoice
    ? Math.round(invoiceData?.grandTotal || 0)
    : Math.round((invoiceCalculations.grandTotal || 0) - (invoiceCalculations?.discountTotal || 0));
  out.push(lineColumns(totalsWidths, ["left", "right"], ["Net Total", grandTotal.toFixed(2)], {
    font: "a",
    bold: true,
  }));

  const isUnpaid = (payment.status || "").toLowerCase() === "unpaid";
  if (!isUnpaid && (payment.paid > 0 || payment.due > 0)) {
    out.push(
      lineColumns(totalsWidths, ["left", "right"], ["Paid Amount", Number(payment.paid || 0).toFixed(2)], {
        font: "a",
      }),
    );
    out.push(
      lineColumns(totalsWidths, ["left", "right"], ["Due Amount", Math.round(payment.due || 0).toFixed(2)], {
        font: "a",
      }),
    );
  }

  out.push(lineText("", {}));

  let statusText = "";
  switch ((payment.status || "").toLowerCase()) {
    case "paid":
      statusText = "Amount Fully Paid";
      break;
    case "partial":
      statusText = "Amount Partially Paid";
      break;
    case "unpaid":
      statusText = "Amount is Unpaid";
      break;
    default:
      statusText = "";
  }
  if (statusText) {
    out.push(wrappedTextLines(statusText, { align: "center", bold: true, font: "b" }, widthPx));
  }

  if (payment.paid > 0 && (invoiceData?.paymentMethod || invoiceData?.paymentNote)) {
    const s = (payment.status || "").toLowerCase();
    if (invoiceData?.paymentMethod && (s === "paid" || s === "partial")) {
      out.push(
        wrappedTextLines(
          `Payment: ${invoiceData.paymentMethod.toUpperCase()} ${
            invoiceData?.paymentNote ? `(Ref:${invoiceData.paymentNote})` : ""
          }`,
          { align: "center", bold: true, font: "b" },
          widthPx,
        ),
      );
    }
  }

  if (!isUnpaid && invoiceData?.transactions && invoiceData.transactions.length > 0) {
    out.push(lineDivider("a", widthPx));
    out.push(lineText("PAYMENT SUMMARY", { align: "center", bold: true, font: "b" }));
    out.push(lineDivider("b", widthPx));

    const cap = getLineCapacity(widthPx, "b", 1);
    const ratios = [0.5, 0.25, 0.25];
    const widths = ratios.map((r) => Math.floor(cap * r));
    widths[widths.length - 1] += cap - widths.reduce((a, b) => a + b, 0);
    const aligns = ["left", "right", "center"];

    out.push(lineColumns(widths, aligns, ["Date", "Amount", "Method"], { font: "b", bold: true }));
    out.push(lineDivider("b", widthPx));

    for (const tx of invoiceData.transactions) {
      out.push(
        lineColumns(
          widths,
          aligns,
          [
            format(new Date(tx.createdAt), "dd/MM hh:mm a"),
            Number(tx.amount || 0).toFixed(2),
            (tx.paymentMethod || "").toUpperCase(),
          ],
          { font: "b" },
        ),
      );
    }
  }

  const gstBreakdown = invoiceCalculations.gstBreakdown || {};
  const gstRates = Object.keys(gstBreakdown).filter((r) => parseFloat(r) > 0);
  if (isGstInvoice && gstRates.length > 0) {
    const isIgst = invoiceData?.isIgst === true;

    out.push(lineDivider("a", widthPx));
    out.push(lineText("TAX SUMMARY", { align: "center", bold: true, font: "b" }));
    out.push(lineDivider("b", widthPx));

    const cap = getLineCapacity(widthPx, "b", 1);
    const ratios = isIgst ? [0.25, 0.35, 0.4] : [0.25, 0.25, 0.25, 0.25];
    const widths = ratios.map((r) => Math.floor(cap * r));
    widths[widths.length - 1] += cap - widths.reduce((a, b) => a + b, 0);
    const aligns = ["left", "right", "right", "right"];
    const headers = isIgst ? ["GST%", "Tax Value", "IGST"] : ["GST%", "Tax Value", "CGST", "SGST"];

    out.push(lineColumns(widths, aligns.slice(0, headers.length), headers, { font: "b", bold: true }));
    out.push(lineDivider("b", widthPx));

    let totalTaxable = 0,
      totalCGST = 0,
      totalSGST = 0,
      totalIGST = 0;

    for (const rate of gstRates) {
      const b = gstBreakdown[rate];
      const taxable = Number(b.taxableAmount || 0);
      const cgst = Number(b.cgstAmount || 0);
      const sgst = Number(b.sgstAmount || 0);
      const igst = Number(b.igstAmount || cgst + sgst);

      totalTaxable += taxable;
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;

      const row = isIgst
        ? [`${parseFloat(rate).toFixed(2)}%`, taxable.toFixed(2), igst.toFixed(2)]
        : [`${parseFloat(rate).toFixed(2)}%`, taxable.toFixed(2), cgst.toFixed(2), sgst.toFixed(2)];

      out.push(lineColumns(widths, aligns.slice(0, row.length), row, { font: "b" }));
    }

    out.push(lineDivider("b", widthPx));
    const totalRow = isIgst
      ? ["Total", totalTaxable.toFixed(2), totalIGST.toFixed(2)]
      : ["Total", totalTaxable.toFixed(2), totalCGST.toFixed(2), totalSGST.toFixed(2)];
    out.push(lineColumns(widths, aligns.slice(0, totalRow.length), totalRow, { font: "b", bold: true }));
  }

  if (storedata?.bankDetails?.upiId) {
    const rawGrandTotal = (invoiceCalculations.grandTotal || 0) - (invoiceCalculations?.discountTotal || 0);
    const roundedGrandTotal = createdInvoice ? Math.round(invoiceData?.grandTotal || 0) : Math.round(rawGrandTotal);
    const upiString = `upi://pay?pa=${storedata.bankDetails.upiId}&pn=${encodeURIComponent(
      storedata?.name || "Merchant",
    )}&am=${roundedGrandTotal}&cu=INR`;
    const qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;
    const qrDataUrl = await fetchImageAsDataURL(qrURL);

    out.push(lineText("Scan & Pay", { align: "center", bold: true, font: "b" }));
    if (qrDataUrl) {
      out.push(`<div class="center"><img src="${qrDataUrl}" class="qr"/></div>`);
    }
    out.push(wrappedTextLines(`UPI: ${storedata.bankDetails.upiId}`, { align: "center", font: "a" }, widthPx));
    out.push(wrappedTextLines(`Amount: Rs.${roundedGrandTotal}`, { align: "center", font: "a" }, widthPx));
  }

  out.push(lineDivider("a", widthPx));
  out.push(wrappedTextLines("Thank you for your purchase!", { align: "center", font: "b" }, widthPx));
  out.push(wrappedTextLines("Visit Again", { align: "center", font: "b" }, widthPx));

  const sigDataUrl = await fetchImageAsDataURL(storedata?.signatureUrl);
  if (sigDataUrl) {
    out.push(`<div class="center"><img src="${sigDataUrl}" class="sig"/></div>`);
  }
  if (isFreePlan) {
    out.push(wrappedTextLines('"Power by AMDAANI"', { align: "center", font: "a", bold: true }, widthPx));
  }

  const body = out.join("");

  const fontSizeA = getFontSizePx("a", widthPx);
  const fontSizeB = getFontSizePx("b", widthPx);

  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: ${FONT_FAMILY};
          margin: 0 auto;
          color: #000;
          background: #fff;
        }
        #container {
          width: ${widthPx}px;
          margin: 0 auto;
          overflow-x: hidden;
        }
        .ln {
          white-space: pre;
          line-height: 1.4;
          letter-spacing: 0;
        }
        .fontA { font-size: ${fontSizeA}px; }
        .fontB { font-size: ${fontSizeB}px; }
        .big { font-size: ${Math.round(widthPx / 8)}px; line-height: 1.3; }
        .bold { font-weight: 700; }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }
        .logo { max-width: 90px; margin: 4px auto; display: block; }
        .qr { width: 180px; height: 180px; margin: 4px auto; display: block; }
        .sig { max-width: 150px; object-fit: contain; margin: 8px auto 0; display: block; }
      </style>
    </head>
    <body>
      <div id="container">${body}</div>
    </body>
  </html>`;
}

export async function generateThermalReceiptPreviewHTML(params, paperWidthMM = 58) {
  const widthPx = resolveDotWidth(paperWidthMM);
  return buildThermalReceiptHTML({ ...params, widthPx });
}

const ESC = "\x1B";
const GS = "\x1D";
const INIT = `${ESC}\x40`;
const CUT = `${GS}\x56\x00`;
const feed = (n = 3) => "\n".repeat(n);

function canvasToRasterBytes(canvas, threshold = 160) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      const lum = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < threshold) {
        const byteIndex = y * bytesPerRow + (x >> 3);
        raster[byteIndex] |= 0x80 >> x % 8;
      }
    }
  }
  return { raster, bytesPerRow, height };
}

function rasterToEscPosString({ raster, bytesPerRow, height }) {
  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  let header =
    `${GS}v0` +
    String.fromCharCode(0x00) +
    String.fromCharCode(xL) +
    String.fromCharCode(xH) +
    String.fromCharCode(yL) +
    String.fromCharCode(yH);

  let body = "";
  for (let i = 0; i < raster.length; i++) body += String.fromCharCode(raster[i]);

  return header + body;
}

export async function generateThermalInvoiceESCPOS(params, paperWidthMM = 58) {
  const widthPx = resolveDotWidth(paperWidthMM);
  const html = await buildThermalReceiptHTML({ ...params, widthPx });

  const { default: html2canvas } = await import("html2canvas-pro");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    const idoc = iframe.contentDocument;
    const imgs = Array.from(idoc.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            }),
      ),
    );
    await new Promise((r) => setTimeout(r, 80));

    const container = idoc.getElementById("container") || idoc.body;
    const canvas = await html2canvas(container, {
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: widthPx,
      windowWidth: widthPx,
    });

    const rasterInfo = canvasToRasterBytes(canvas);
    const image = rasterToEscPosString(rasterInfo);

    return INIT + image + feed(3) + CUT;
  } finally {
    document.body.removeChild(iframe);
  }
}
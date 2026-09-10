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
const BASE_WIDTH_PX = 384;

// ✅ Only TWO font sizes now — this mirrors the app's actual ESC/POS
// printer fonts: 'a' (big) and 'b' (normal). The old 4-tier system
// (a/b/c/d) is why the web receipt never matched the app's look —
// the app doesn't have a "small" font at all, it only has these two.
const BASE_FONT_SIZE_PX = {
  a: 22, // store name, CANCELLED banner, the whole totals block, UPI id/amount, "Power by AMDAANI"
  b: 16, // everything else — tagline, address, meta, items, item headers, payment/tax tables, footer
};
function scaleFont(key, widthPx) {
  const base = BASE_FONT_SIZE_PX[key] || BASE_FONT_SIZE_PX.b;
  return Math.max(9, Math.round(base * (widthPx / BASE_WIDTH_PX)));
}

// ✅ Logo/QR/signature sizes scaled from the SAME dot-widths the app
// uses (200 / 180 / 150 out of a 384-dot base) instead of the old
// fixed 130/140/120px — so they come out the same relative size as
// on the app, on both 58mm and 80mm paper.
const BASE_IMG_PX = { logo: 200, qr: 180, sig: 150 };
function scaleImg(key, widthPx) {
  return Math.max(40, Math.round(BASE_IMG_PX[key] * (widthPx / BASE_WIDTH_PX)));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  paperWidthMM = 58,
}) {
  const items = cartItems?.length ? cartItems : invoiceData?.items || [];
  const isUnpaid = (payment.status || "").toLowerCase() === "unpaid";
  const isIgst = invoiceData?.isIgst === true;

  const logoDataUrl = await fetchImageAsDataURL(storedata?.logoUrl);
  const logoW = scaleImg("logo", widthPx);

  // ── Items ── mirrors printThermal.ts exactly:
  // main row  = name | qty | rate | amt      (40/10/25/25 columns)
  // extra row = HSN  |     | Dis X% |        (only when discount > 0)
  // a dashed divider after EVERY item — not just once after the whole
  // table — which is what makes the app receipt look "lomba"/spacious.
  const itemsHTML = items
    .map((item) => {
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

      const mainRow = `
        <tr>
          <td class="item-name">${escapeHtml(item.name || "")}</td>
          <td class="center nowrap">${qty}</td>
          <td class="right nowrap">${baseRate.toFixed(2)}</td>
          <td class="right nowrap">${totalAmount.toFixed(2)}</td>
        </tr>`;

      const discountRow =
        totalDiscount > 0
          ? `
        <tr>
          <td class="item-name">${item.hsn ? `HSN: ${escapeHtml(item.hsn)}` : ""}</td>
          <td></td>
          <td class="right nowrap">${discountPercent ? `Dis ${discountPercent}%` : ""}</td>
          <td></td>
        </tr>`
          : "";

      return `${mainRow}${discountRow}
        <tr class="item-divider-row"><td colspan="4"><div class="dashed"></div></td></tr>`;
    })
    .join("");

  // ── GST breakdown ── ratios now match app: 25/35/40 (IGST) or 25/25/25/25
  let gstBreakdownHTML = "";
  const gstBreakdown = invoiceCalculations.gstBreakdown || {};
  const gstRates = Object.keys(gstBreakdown).filter((r) => parseFloat(r) > 0);
  if (isGstInvoice && gstRates.length > 0) {
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
    const rows = gstRates
      .map((rate) => {
        const b = gstBreakdown[rate];
        const taxable = Number(b.taxableAmount || 0);
        const cgst = Number(b.cgstAmount || 0);
        const sgst = Number(b.sgstAmount || 0);
        const igst = Number(b.igstAmount || cgst + sgst);
        totalTaxable += taxable;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;
        return `
          <tr>
            <td>${parseFloat(rate).toFixed(2)}%</td>
            <td class="right nowrap">${taxable.toFixed(2)}</td>
            ${isIgst ? `<td class="right nowrap">${igst.toFixed(2)}</td>` : `<td class="right nowrap">${cgst.toFixed(2)}</td><td class="right nowrap">${sgst.toFixed(2)}</td>`}
          </tr>`;
      })
      .join("");

    const colWidths = isIgst ? ["25%", "35%", "40%"] : ["25%", "25%", "25%", "25%"];

    gstBreakdownHTML = `
      <div class="dashed"></div>
      <div class="section-title">TAX SUMMARY</div>
      <table class="data-table">
        <colgroup>${colWidths.map((w) => `<col style="width:${w};"/>`).join("")}</colgroup>
        <thead>
          <tr>
            <th>GST%</th><th class="right">Taxable</th>
            ${isIgst ? `<th class="right">IGST</th>` : `<th class="right">CGST</th><th class="right">SGST</th>`}
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="bold">
            <td>Total</td><td class="right nowrap">${totalTaxable.toFixed(2)}</td>
            ${isIgst ? `<td class="right nowrap">${totalIGST.toFixed(2)}</td>` : `<td class="right nowrap">${totalCGST.toFixed(2)}</td><td class="right nowrap">${totalSGST.toFixed(2)}</td>`}
          </tr>
        </tbody>
      </table>`;
  }

  // ── Payment summary ── ratio now matches app: 50/25/25
  let paymentSummaryHTML = "";
  if (!isUnpaid && invoiceData?.transactions?.length > 0) {
    const rows = invoiceData.transactions
      .map(
        (tx) => `
        <tr>
          <td>${format(new Date(tx.createdAt), "dd/MM hh:mm a")}</td>
          <td class="right nowrap">${Number(tx.amount || 0).toFixed(2)}</td>
          <td class="center">${(tx.paymentMethod || "").toUpperCase()}</td>
        </tr>`,
      )
      .join("");
    paymentSummaryHTML = `
      <div class="dashed"></div>
      <div class="section-title">PAYMENT SUMMARY</div>
      <table class="data-table">
        <colgroup><col style="width:50%;"/><col style="width:25%;"/><col style="width:25%;"/></colgroup>
        <thead><tr><th>Date</th><th class="right">Amount</th><th class="center">Method</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── UPI QR ──
  let upiHTML = "";
  const qrW = scaleImg("qr", widthPx);
  if (storedata?.bankDetails?.upiId) {
    const rawGrandTotal = (invoiceCalculations.grandTotal || 0) - (invoiceCalculations?.discountTotal || 0);
    const roundedGrandTotal = createdInvoice ? Math.round(invoiceData?.grandTotal || 0) : Math.round(rawGrandTotal);
    const upiString = `upi://pay?pa=${storedata.bankDetails.upiId}&pn=${encodeURIComponent(
      storedata?.name || "Merchant",
    )}&am=${roundedGrandTotal}&cu=INR`;
    const qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;
    const qrDataUrl = await fetchImageAsDataURL(qrURL);
    upiHTML = `
      <div class="dashed"></div>
      <div class="center bold sizeB">Scan & Pay</div>
      ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:${qrW}px;height:${qrW}px;" class="qr"/>` : ""}
      <div class="center sizeA">UPI: ${escapeHtml(storedata.bankDetails.upiId)}</div>
      <div class="center sizeA">Amount: Rs.${roundedGrandTotal}</div>`;
  }

  const subTotal = createdInvoice ? Number(invoiceData?.subTotal || 0) : Number(invoiceCalculations.subtotal || 0);
  const discountTotal = createdInvoice
    ? Number(invoiceData?.discountTotal || 0)
    : Number(invoiceCalculations.discountTotal || 0);
  const rawRoundOff = createdInvoice ? Number(invoiceData?.roundOff || 0) : Number(invoiceCalculations.roundOff || 0);
  const roundOffValue = Number((rawRoundOff || 0).toFixed(2));
  const grandTotal = createdInvoice
    ? Math.round(invoiceData?.grandTotal || 0)
    : Math.round((invoiceCalculations.grandTotal || 0) - (invoiceCalculations?.discountTotal || 0));

  const addr = storedata?.address || {};
  const addrLine = [addr.street, addr.city].filter(Boolean).join(", ");
  const addrLine2 = [addr.state, addr.postalCode].filter(Boolean).join(" ");

  const sigDataUrl = await fetchImageAsDataURL(storedata?.signatureUrl);
  const sigW = scaleImg("sig", widthPx);

  const fA = scaleFont("a", widthPx);
  const fB = scaleFont("b", widthPx);

  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page {
          size: ${paperWidthMM}mm auto !important;
          margin: 0 !important;
        }
        @media print {
          html, body {
            width: ${paperWidthMM}mm !important;
            min-width: 0 !important;
            max-width: ${paperWidthMM}mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          #container {
            width: 100% !important;
            overflow-x: visible !important;
          }
        }
        * { box-sizing: border-box; }
        html, body {
          width: ${widthPx}px;
          margin: 0 auto;
          color: #000;
          background: #fff;
          font-family: ${FONT_FAMILY};
          overflow-x: hidden;
        }
        #container {
          width: 100%;
          overflow-x: hidden;
          padding: 4px 6px;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: 700; }
        .nowrap { white-space: nowrap; }
        .dashed { border-top: 1px dashed #000; margin: 5px 0; }
        .sizeA { font-size: ${fA}px; }
        .sizeB { font-size: ${fB}px; }

        /* ✅ Store name — font 'a', bold, big, with a clear gap under
           the (now bigger) logo, matching the app */
        .store-name { font-size: ${fA}px; font-weight: 700; }
        .tagline { font-size: ${fB}px; }
        .addr-block { margin-top: 4px; }
        .addr { font-size: ${fB}px; line-height: 1.35; }

        /* ✅ Meta (Invoice/Date/Customer) — app prints these plain,
           NOT bold, font 'b'. Old web code bolded these; removed. */
        .meta { font-size: ${fB}px; line-height: 1.4; font-weight: 400; }
        .meta div { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .section-title {
          text-align: center;
          font-weight: 700;
          font-size: ${fB}px;
          margin: 3px 0;
          text-transform: uppercase;
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }

        /* ✅ Items — 40/10/25/25 columns, font 'b', matching app */
        .items-table { font-size: ${fB}px; margin-top: 2px; }
        .items-table th {
          border-bottom: 1px solid #000;
          text-align: left;
          padding: 2px 4px;
          font-size: ${fB}px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .items-table td { padding: 3px 4px; vertical-align: top; }
        .items-table .item-name { word-wrap: break-word; overflow-wrap: break-word; padding-right: 6px; }
        .items-table th.right, .items-table td.right { text-align: right; }
        .items-table th.center, .items-table td.center { text-align: center; }
        .item-divider-row td { padding: 0; }
        .item-divider-row .dashed { margin: 4px 0; }

        /* ✅ Totals — the WHOLE block is font 'a' size (matches app;
           Sub Total/Extra discount/Round Off/Paid/Due all print at
           font 'a' there too), only "Net Total" is bold + has the
           divider line above it */
        .totals-table { font-size: ${fA}px; margin-top: 4px; }
        .totals-table td { padding: 2px 0; white-space: nowrap; }
        .totals-table .grand td { font-weight: 700; border-top: 1px dashed #000; padding-top: 5px; }

        .data-table { font-size: ${fB}px; margin-top: 2px; }
        .data-table th, .data-table td { padding: 2px 3px; text-align: left; }
        .data-table th { border-bottom: 1px solid #000; font-weight: 700; }

        .status-text { text-align: center; font-weight: 700; font-size: ${fB}px; margin-top: 4px; }
        .logo { margin: 6px auto 8px; display: block; }
        .qr { margin: 6px auto; display: block; }
        .sig { object-fit: contain; margin: 8px auto 0; display: block; }
        .footer-text { text-align: center; font-size: ${fB}px; margin-top: 4px; }
        .powered { text-align: center; font-size: ${fA}px; font-weight: 700; margin-top: 4px; }
        .cancel-banner {
          text-align: center;
          font-weight: 700;
          font-size: ${fA * 2}px;
          margin: 6px 0;
        }
      </style>
    </head>
    <body>
      <div id="container">
        ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:${logoW}px;" class="logo"/>` : ""}

        <div class="center store-name">${escapeHtml(storedata?.name || "STORE")}</div>
        ${storedata?.tagline ? `<div class="center tagline">${escapeHtml(storedata.tagline)}</div>` : ""}

        <div class="dashed"></div>

        <div class="addr-block">
          ${
            addrLine || addrLine2
              ? `<div class="center addr">
                  ${addrLine ? `${escapeHtml(addrLine)}<br/>` : ""}
                  ${addrLine2 ? escapeHtml(addrLine2) : ""}
                </div>`
              : ""
          }
          ${isGstInvoice && storedata?.gstNumber ? `<div class="center addr">GSTIN: ${escapeHtml(storedata.gstNumber)}</div>` : ""}
          ${storedata?.contactNo ? `<div class="center addr">Ph.No.: +91 - ${escapeHtml(storedata.contactNo)}</div>` : ""}
          ${storedata?.email ? `<div class="center addr">Email: ${escapeHtml(storedata.email)}</div>` : ""}
        </div>

        <div class="dashed"></div>

        <div class="meta">
          <div>Invoice: ${escapeHtml(invoiceNumber)}</div>
          <div>Date: ${format(new Date(invoiceDate), "dd-MMM-yyyy hh:mm a")}</div>
          ${formValues.contactNumber ? `<div>Customer Mobile: ${escapeHtml(formValues.contactNumber)}</div>` : ""}
          ${
            formValues.partyName || formValues.customerName
              ? `<div>Customer Name: ${escapeHtml(formValues.partyName || formValues.customerName)}</div>`
              : ""
          }
        </div>

        <div class="dashed"></div>

        ${
          invoiceData?.status?.toLowerCase?.() === "cancelled"
            ? `<div class="cancel-banner">CANCELLED</div><div class="dashed"></div>`
            : ""
        }

        <table class="items-table">
          <colgroup>
            <col style="width:40%;" />
            <col style="width:10%;" />
            <col style="width:25%;" />
            <col style="width:25%;" />
          </colgroup>
          <thead>
            <tr>
              <th class="item-name">Item</th>
              <th class="center">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amt</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <table class="totals-table">
          <tr><td>Sub Total</td><td class="right">${subTotal.toFixed(2)}</td></tr>
          ${discountTotal > 0 ? `<tr><td>Extra discount</td><td class="right">-${discountTotal.toFixed(2)}</td></tr>` : ""}
          ${
            roundOffValue !== 0
              ? `<tr><td>Round Off</td><td class="right">${roundOffValue > 0 ? "+" : ""}${roundOffValue.toFixed(2)}</td></tr>`
              : ""
          }
          <tr class="grand"><td>Net Total</td><td class="right">${grandTotal.toFixed(2)}</td></tr>
          ${
            !isUnpaid && (payment.paid > 0 || payment.due > 0)
              ? `<tr><td>Paid Amount</td><td class="right">${Number(payment.paid || 0).toFixed(2)}</td></tr>
                 <tr><td>Due Amount</td><td class="right">${Math.round(payment.due || 0).toFixed(2)}</td></tr>`
              : ""
          }
        </table>

        ${
          (() => {
            switch ((payment.status || "").toLowerCase()) {
              case "paid": return `<div class="status-text">Amount Fully Paid</div>`;
              case "partial": return `<div class="status-text">Amount Partially Paid</div>`;
              case "unpaid": return `<div class="status-text">Amount is Unpaid</div>`;
              default: return "";
            }
          })()
        }

        ${
          payment.paid > 0 && (invoiceData?.paymentMethod || invoiceData?.paymentNote)
            ? (() => {
                const s = (payment.status || "").toLowerCase();
                if (invoiceData?.paymentMethod && (s === "paid" || s === "partial")) {
                  return `<div class="status-text">Payment: ${invoiceData.paymentMethod.toUpperCase()} ${
                    invoiceData?.paymentNote ? `(Ref:${escapeHtml(invoiceData.paymentNote)})` : ""
                  }</div>`;
                }
                return "";
              })()
            : ""
        }

        ${paymentSummaryHTML}
        ${gstBreakdownHTML}
        ${upiHTML}

        <div class="dashed"></div>
        <div class="footer-text">Thank you for your purchase!</div>
        <div class="footer-text">Visit Again</div>

        ${sigDataUrl ? `<img src="${sigDataUrl}" style="width:${sigW}px;" class="sig"/>` : ""}
        ${isFreePlan ? `<div class="powered">"Power by AMDAANI"</div>` : ""}
      </div>
    </body>
  </html>`;
}

export async function generateThermalReceiptPreviewHTML(params, paperWidthMM = 58) {
  const widthPx = resolveDotWidth(paperWidthMM);
  return buildThermalReceiptHTML({ ...params, widthPx, paperWidthMM });
}

const ESC = "\x1B";
const GS = "\x1D";
const INIT = `${ESC}\x40`;
const CUT = `${GS}\x56\x00`;
const feed = (n = 3) => "\n".repeat(n);

// Floyd–Steinberg dithering (unchanged from last fix) — flat threshold
// turns gradient/photo logos into noise, dithering keeps them clean.
function canvasToRasterBytes(canvas, threshold = 160) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(bytesPerRow * height);

  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      gray[y * width + x] = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = gray[idx];
      const newPixel = oldPixel < threshold ? 0 : 255;
      const error = oldPixel - newPixel;

      if (newPixel === 0) {
        const byteIndex = y * bytesPerRow + (x >> 3);
        raster[byteIndex] |= 0x80 >> x % 8;
      }

      if (x + 1 < width) gray[idx + 1] += error * (7 / 16);
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[idx - 1 + width] += error * (3 / 16);
        gray[idx + width] += error * (5 / 16);
        if (x + 1 < width) gray[idx + 1 + width] += error * (1 / 16);
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
  const html = await buildThermalReceiptHTML({ ...params, widthPx, paperWidthMM });

  const { default: html2canvas } = await import("html2canvas-pro");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = "10px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    const idoc = iframe.contentDocument;
    const iwin = iframe.contentWindow;

    const imgs = Array.from(idoc.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            }),
      ),
    );

    if (idoc.fonts && idoc.fonts.ready) {
      try {
        await idoc.fonts.ready;
      } catch (_) {}
    }

    const container = idoc.getElementById("container") || idoc.body;

    const fullHeight = Math.max(
      container.scrollHeight,
      idoc.body.scrollHeight,
      idoc.documentElement.scrollHeight,
    );
    iframe.style.height = `${fullHeight}px`;

    await new Promise((res) =>
      iwin.requestAnimationFrame(() => iwin.requestAnimationFrame(res)),
    );

    const canvas = await html2canvas(container, {
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: widthPx,
      height: fullHeight,
      windowWidth: widthPx,
      windowHeight: fullHeight,
    });

    const rasterInfo = canvasToRasterBytes(canvas);
    const image = rasterToEscPosString(rasterInfo);

    return INIT + image + feed(3) + CUT;
  } finally {
    document.body.removeChild(iframe);
  }
}
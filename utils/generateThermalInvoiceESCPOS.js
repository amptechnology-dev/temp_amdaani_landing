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
const BASE_FONT_SIZE_PX = {
  a: 22, // store name only
  b: 16, // body — item rows, meta info, normal totals
  c: 13, // store address / GSTIN / phone / email / item sub-lines
  d: 18, // Net Total / Paid / Due — bold emphasis, smaller than before
};

function scaleFont(key, widthPx) {
  const base = BASE_FONT_SIZE_PX[key] || BASE_FONT_SIZE_PX.b;
  return Math.max(9, Math.round(base * (widthPx / BASE_WIDTH_PX)));
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

      return `
        <tr>
          <td class="item-name">
            ${escapeHtml(item.name || "")}
            ${item.hsn ? `<div class="sub">HSN: ${escapeHtml(item.hsn)}</div>` : ""}
          </td>
          <td class="center nowrap">${qty}</td>
          <td class="right rate-cell">
            <div class="nowrap">${baseRate.toFixed(2)}</div>
            ${
              totalDiscount > 0
                ? `<div class="sub">Dis ${discountPercent ? `${discountPercent}% ` : ""}(-${totalDiscount.toFixed(2)})</div>`
                : ""
            }
          </td>
          <td class="right nowrap">${totalAmount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  // ── GST breakdown ── colgroup added so Taxable/CGST/SGST never touch
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

    const colWidths = isIgst ? ["28%", "40%", "32%"] : ["22%", "34%", "22%", "22%"];

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

  // ── Payment summary ── colgroup added too
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
        <colgroup><col style="width:40%;"/><col style="width:30%;"/><col style="width:30%;"/></colgroup>
        <thead><tr><th>Date</th><th class="right">Amount</th><th class="center">Method</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── UPI QR ──
  let upiHTML = "";
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
      <div class="center bold small">Scan & Pay</div>
      ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr"/>` : ""}
      <div class="center small">UPI: ${escapeHtml(storedata.bankDetails.upiId)}</div>
      <div class="center small">Amount: Rs.${roundedGrandTotal}</div>`;
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

  const fA = scaleFont("a", widthPx);
  const fB = scaleFont("b", widthPx);
  const fC = scaleFont("c", widthPx);
  const fD = scaleFont("d", widthPx);

  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        /* ✅ Hard-enforced 2-inch (mm-based) page size — wins over
           browser default Letter/A4 so print preview & saved PDF
           always come out at the receipt's real width, not A4. */
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
        .small { font-size: ${fC}px; }
        .nowrap { white-space: nowrap; }
        .dashed { border-top: 1px dashed #000; margin: 4px 0; }
        .store-name { font-size: ${fA}px; font-weight: 700; }
        .tagline { font-size: ${fC}px; }
        /* ✅ no border under store-name/tagline — dashed line removed
           from markup, address block sits right after with small gap */
        .addr-block { margin-top: 4px; }
        .addr { font-size: ${fC}px; line-height: 1.3; }

        /* ✅ Customer Mobile / Invoice meta — bold, single line, no wrap */
        .meta { font-size: ${fC}px; line-height: 1.35; font-weight: 700; }
        .meta div { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .section-title {
          text-align: center;
          font-weight: 700;
          font-size: ${fC}px;
          margin: 2px 0;
          text-transform: uppercase;
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }

        /* ✅ Items table — extra padding + letter-spacing so
           Qty / Rate / Amt don't feel glued together */
        .items-table { font-size: ${fB}px; margin-top: 2px; }
        .items-table th {
          border-bottom: 1px solid #000;
          text-align: left;
          padding: 2px 4px;
          font-size: ${fC}px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .items-table td { padding: 3px 4px; vertical-align: top; }
        .items-table .item-name { word-wrap: break-word; overflow-wrap: break-word; padding-right: 6px; }
        .items-table th.right, .items-table td.right { text-align: right; }
        .items-table th.center, .items-table td.center { text-align: center; }
        .items-table .rate-cell { text-align: right; }
        .items-table .sub { font-size: ${fC}px; color: #333; white-space: normal; line-height: 1.25; }

        /* ✅ Totals — normal rows small, Net/Paid/Due bold + slightly
           bigger (fD) but not oversized, each on its own single line */
        .totals-table { font-size: ${fB}px; margin-top: 4px; }
        .totals-table td { padding: 1px 0; }
        .totals-emphasis td {
          font-size: ${fD}px;
          font-weight: 700;
          white-space: nowrap;
        }
        .totals-emphasis.grand td { border-top: 1px dashed #000; padding-top: 4px; }

        .data-table { font-size: ${fC}px; margin-top: 2px; }
        .data-table th, .data-table td { padding: 2px 3px; text-align: left; }
        .data-table th { border-bottom: 1px solid #000; }

        .status-text { text-align: center; font-weight: 700; font-size: ${fC}px; margin-top: 4px; }
        .logo { max-width: 130px; margin: 4px auto; display: block; }
        .qr { width: 140px; height: 140px; margin: 6px auto; display: block; }
        .sig { max-width: 120px; object-fit: contain; margin: 8px auto 0; display: block; }
        .footer-text { text-align: center; font-size: ${fC}px; margin-top: 4px; }
        .powered { text-align: center; font-size: ${fB}px; font-weight: 700; margin-top: 4px; }
        .cancel-banner {
          text-align: center;
          font-weight: 700;
          font-size: ${Math.round(widthPx / 9)}px;
          margin: 6px 0;
        }
      </style>
    </head>
    <body>
      <div id="container">
        ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo"/>` : ""}

        <div class="center store-name">${escapeHtml(storedata?.name || "STORE")}</div>
        ${storedata?.tagline ? `<div class="center tagline">${escapeHtml(storedata.tagline)}</div>` : ""}

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
            <col style="width:34%;" />
            <col style="width:16%;" />
            <col style="width:28%;" />
            <col style="width:22%;" />
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

        <div class="dashed"></div>

        <table class="totals-table">
          <tr><td>Sub Total</td><td class="right nowrap">${subTotal.toFixed(2)}</td></tr>
          ${discountTotal > 0 ? `<tr><td>Extra discount</td><td class="right nowrap">-${discountTotal.toFixed(2)}</td></tr>` : ""}
          ${
            roundOffValue !== 0
              ? `<tr><td>Round Off</td><td class="right nowrap">${roundOffValue > 0 ? "+" : ""}${roundOffValue.toFixed(2)}</td></tr>`
              : ""
          }
          <tr class="totals-emphasis grand"><td>Net Total</td><td class="right">${grandTotal.toFixed(2)}</td></tr>
          ${
            !isUnpaid && (payment.paid > 0 || payment.due > 0)
              ? `<tr class="totals-emphasis"><td>Paid Amount</td><td class="right">${Number(payment.paid || 0).toFixed(2)}</td></tr>
                 <tr class="totals-emphasis"><td>Due Amount</td><td class="right">${Math.round(payment.due || 0).toFixed(2)}</td></tr>`
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

        ${sigDataUrl ? `<img src="${sigDataUrl}" class="sig"/>` : ""}
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

function canvasToRasterBytes(canvas, threshold = 160) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
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
  const html = await buildThermalReceiptHTML({ ...params, widthPx, paperWidthMM });

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
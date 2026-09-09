import { format } from "date-fns";

// ============================================================
// ONE file, ONE HTML builder (buildThermalReceiptHTML) used by
// BOTH the on-screen preview AND the actual USB print. Preview
// renders it in an iframe; print screenshots the SAME html (same
// width, no responsive scaling) and sends it as an ESC/POS raster
// image (GS v 0). Since print is literally a screenshot of what
// preview shows, they can never drift apart again.
// ============================================================

// ---------- Paper size ----------
// Most 58mm thermal printers print at 203dpi with a 384-dot-wide head;
// most 80mm printers are 576 dots wide. Check your printer's spec sheet
// if prints come out too narrow/wide or blank on one side.
export const PRINTER_DOT_WIDTH = { 58: 384, 80: 576 };
export function resolveDotWidth(paperWidthMM) {
  return PRINTER_DOT_WIDTH[paperWidthMM] || PRINTER_DOT_WIDTH[58];
}

// ---------- Styled HTML (design ported from the React Native template) ----------
// widthPx is REQUIRED and must be the same value for preview and for the
// raster capture — that single shared number is what guarantees identical
// output. No @media scaling here on purpose: a scale rule keyed off the
// iframe's own viewport width would differ between the visible preview
// dialog and the off-screen capture iframe, silently reintroducing drift.
function buildThermalReceiptHTML({
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
  const itemsHTML = cartItems
    .map((item) => {
      const qty = item.qty || item.quantity || 0;
      const baseRate = item.baseRate || item.effectiveRate || item.price || 0;
      const gstRate = item.gstRate || 0;
      const totalAmount = item.total || baseRate * qty;
      const isTaxInclusive = item.isTaxInclusive || false;

      let perItemDiscount = Number(item.discount || 0);
      if (isTaxInclusive && gstRate > 0) {
        perItemDiscount = perItemDiscount / (1 + gstRate / 100);
      }
      const totalDiscount = perItemDiscount * qty;
      const discountPercent =
        baseRate > 0 && perItemDiscount > 0
          ? ((perItemDiscount / baseRate) * 100).toFixed(2)
          : null;

      return `
        <tr class="line">
          <td>${item.name}<br>${item.hsn ? `HSN: ${item.hsn}` : ""}</td>
          <td class="right">${qty}</td>
          <td class="right">${baseRate.toFixed(2)} ${
        Number(totalDiscount || 0) > 0 ? `<br>Dis @ ${discountPercent}%` : ""
      }</td>
          <td class="right">${totalAmount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  let gstTotals = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
  let gstBreakdownHTML = "";
  const isIgst = invoiceData?.isIgst === true;

  for (const [rate, breakdown] of Object.entries(invoiceCalculations.gstBreakdown || {})) {
    if (parseFloat(rate) === 0) continue;
    const taxable = breakdown.taxableAmount || 0;
    const cgst = isIgst ? 0 : breakdown.cgstAmount || 0;
    const sgst = isIgst ? 0 : breakdown.sgstAmount || 0;
    const igst = isIgst ? breakdown.igstAmount || (breakdown.cgstAmount || 0) + (breakdown.sgstAmount || 0) : 0;

    gstBreakdownHTML += `
      <tr>
        <td>${rate}%</td>
        <td>${taxable.toFixed(2)}</td>
        ${isIgst ? `<td>${igst.toFixed(2)}</td>` : `<td>${cgst.toFixed(2)}</td><td>${sgst.toFixed(2)}</td>`}
      </tr>`;

    gstTotals.taxableValue += taxable;
    gstTotals.cgst += cgst;
    gstTotals.sgst += sgst;
    gstTotals.igst += igst;
  }

  if (Object.keys(invoiceCalculations.gstBreakdown || {}).length > 0 && isGstInvoice) {
    gstBreakdownHTML += `
      <tr class="gst-total-row">
        <td>Total</td>
        <td>${gstTotals.taxableValue.toFixed(2)}</td>
        ${isIgst ? `<td>${gstTotals.igst.toFixed(2)}</td>` : `<td>${gstTotals.cgst.toFixed(2)}</td><td>${gstTotals.sgst.toFixed(2)}</td>`}
      </tr>`;
  }

  const rawGrandTotal = invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0);
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOffValue = (roundedGrandTotal - rawGrandTotal).toFixed(2);

  const upiString = `upi://pay?pa=${storedata.bankDetails?.upiId}&pn=${encodeURIComponent(
    storedata?.name || "Merchant",
  )}&am=${roundedGrandTotal}&cu=INR`;
  const qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;

  const isUnpaid = payment.status?.toLowerCase() === "unpaid";

  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: monospace, Arial, sans-serif;
          font-size: 12px;
          width: ${widthPx}px;
          margin: 0 auto;
          color: #000;
          overflow-x: hidden;
        }
        #container { width: ${widthPx}px; margin: 0 auto; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 0; }
        th { border-bottom: 1px solid #000; font-size: 12px; }
        td { font-size: 11px; }
        .totals td { padding: 2px 0; }
        .grand { font-size: 13px; font-weight: bold; }
        .footer { margin-top: 10px; text-align: center; font-size: 11px; }
        img.logo { max-width: 90px; margin: 4px auto; display: block; }
        .gst-breakdown { width: 100%; margin-top: 4px; padding-top: 3px; }
        .gst-title {
          text-align: center; font-weight: bold; font-size: 11px;
          margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .gst-table { width: 100%; border-collapse: collapse; font-size: 10px; line-height: 1.2; }
        .gst-table th { text-align: center; border-bottom: 1px solid #000; padding: 2px 0; }
        .gst-table td { text-align: center; padding: 2px 0; border-bottom: 1px dotted #999; }
        .gst-total-row { font-weight: bold; border-top: 1px solid #000; }
        .gst-total-row td { border-bottom: none; padding-top: 3px; }
        .payment-status {
          display: inline-block; padding: 3px 12px; border-radius: 16px;
          font-weight: 600; font-size: 10px; text-transform: capitalize;
          font-style: italic; letter-spacing: 0.3px; color: #fff;
        }
        .payment-status.paid { background-color: #43a047; }
        .payment-status.partial { background-color: #fb8c00; }
        .payment-status.unpaid { background-color: #e53935; }
      </style>
    </head>
    <body>
      <div id="container">
        <div class="center">
          ${storedata?.logoUrl ? `<img src="${storedata.logoUrl}" class="logo"/>` : ""}
          <div class="bold" style="font-size:14px;">${storedata?.name || "STORE NAME"}</div>
          ${storedata?.tagline ? `<div>${storedata.tagline}</div>` : ""}
          <div>${storedata?.address?.street || ""}, ${storedata?.address?.city || ""}</div>
          ${isGstInvoice && storedata?.gstNumber ? `<div>GSTIN: ${storedata.gstNumber}</div>` : ""}
          <div>${storedata?.address?.state || ""} ${storedata?.address?.postalCode || ""}</div>
          <div>Ph. No.: ${storedata?.contactNo || ""}</div>
          ${storedata?.email ? `<div>Email: ${storedata.email}</div>` : ""}
        </div>

        <div class="line"></div>

        <div>
          <div><span class="bold">Invoice:</span> ${invoiceNumber}</div>
          <div><span class="bold">Date:</span> ${format(new Date(invoiceDate), "dd-MMM-yyyy hh:mm a")}</div>
          ${formValues.contactNumber ? `<div><span class="bold">Customer Mobile:</span> ${formValues.contactNumber}</div>` : ""}
          ${
            formValues.partyName || formValues.customerName
              ? `<div><span class="bold">Customer Name:</span> ${formValues.partyName || formValues.customerName}</div>`
              : ""
          }
        </div>

        <div class="line"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th class="right">Qty</th>
              <th class="right">Rate</th>
              <th class="right">Amt</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="line"></div>

        <table class="totals">
          <tr>
            <td class="bold">Sub Total</td>
            <td class="right">${
              createdInvoice ? Number(invoiceData?.subTotal || 0).toFixed(2) : invoiceCalculations.subtotal.toFixed(2)
            }</td>
          </tr>
          ${
            Number(invoiceCalculations.discountTotal || 0) > 0
              ? `<tr>
                  <td class="bold">Extra Discount</td>
                  <td class="right">-${
                    createdInvoice
                      ? Number(invoiceData?.discountTotal || 0).toFixed(2)
                      : Number(invoiceCalculations.discountTotal).toFixed(2)
                  }</td>
                </tr>`
              : ""
          }
          ${
            roundOffValue != 0
              ? `<tr>
                  <td class="bold">Round Off</td>
                  <td class="right" style="color:${roundOffValue < 0 ? "#e53935" : "#43a047"};">
                    ${
                      createdInvoice
                        ? `${Number(invoiceData?.roundOff || 0) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff || 0).toFixed(2)}`
                        : `${roundOffValue < 0 ? "−" : "+"}${Math.abs(roundOffValue).toFixed(2)}`
                    }
                  </td>
                </tr>`
              : ""
          }
          <tr>
            <td class="grand">Net Total</td>
            <td class="right grand">
              ${createdInvoice ? Math.round(invoiceData?.grandTotal || 0).toFixed(2) : roundedGrandTotal.toFixed(2)}
            </td>
          </tr>
          ${
            !isUnpaid && (payment.paid > 0 || payment.due > 0)
              ? `<tr>
                  <td class="grand">Paid Amount</td>
                  <td class="right grand">${payment.paid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="grand">Due Amount</td>
                  <td class="right grand" style="color:${payment.due > 0 ? "#e53935" : "#000"};">
                    ${Math.round(payment.due).toFixed(2)}
                  </td>
                </tr>`
              : ""
          }
        </table>

        <div class="center" style="margin-top:6px;">
          <span class="payment-status ${payment.status?.toLowerCase()}">
            ${
              payment.status === "paid"
                ? "Amount is Fully Paid"
                : payment.status === "partial"
                ? "Amount is Partially Paid"
                : "Amount is Unpaid"
            }
          </span>
        </div>

        ${
          !isUnpaid && (invoiceData?.paymentMethod || invoiceData?.paymentNote)
            ? `<div style="text-align:center;margin-top:4px;font-size:10px;line-height:1.5;">
                <div style="margin-bottom:4px;">
                  <span style="color:#666;">Payment:</span>
                  <span style="font-weight:600;margin-left:4px;">${(invoiceData.paymentMethod || "").toUpperCase()}</span>
                  ${invoiceData?.paymentNote ? `(${invoiceData.paymentNote})` : ""}
                </div>
              </div>`
            : ""
        }

        <div class="line"></div>

        ${
          !isUnpaid && invoiceData?.transactions && invoiceData.transactions.length > 0
            ? `<div class="gst-breakdown">
                <div class="gst-title">Payment Summary</div>
                <table class="gst-table">
                  <thead>
                    <tr>
                      <th style="text-align:left;">Date</th>
                      <th style="text-align:right;">Amount</th>
                      <th style="text-align:center;">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${invoiceData.transactions
                      .map(
                        (tx) => `
                      <tr>
                        <td style="text-align:left;">${format(new Date(tx.createdAt), "dd/MM hh:mm a")}</td>
                        <td style="text-align:right;">₹${tx.amount.toFixed(2)}</td>
                        <td style="text-align:center;">${tx.paymentMethod.toUpperCase()}</td>
                      </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`
            : ""
        }

        ${
          Object.keys(invoiceCalculations.gstBreakdown || {}).some((r) => parseFloat(r) > 0) && isGstInvoice
            ? `<div class="gst-breakdown">
                <div class="gst-title">Tax Summary</div>
                <table class="gst-table">
                  <thead>
                    <tr>
                      <th>GST%</th>
                      <th>Tax Value</th>
                      ${isIgst ? `<th>IGST</th>` : `<th>CGST</th><th>SGST</th>`}
                    </tr>
                  </thead>
                  <tbody>${gstBreakdownHTML}</tbody>
                </table>
              </div>`
            : ""
        }

        ${
          storedata?.bankDetails?.upiId
            ? `<div style="text-align:center;margin-top:10px;">
                <div style="font-weight:bold;margin-bottom:4px;">Scan & Pay</div>
                <img src="${qrURL}" style="width:110px;height:110px;"/>
                <div style="font-size:11px;">UPI: ${storedata.bankDetails.upiId}</div>
                <div style="font-size:11px;">Amount: ₹${roundedGrandTotal}</div>
              </div>`
            : ""
        }

        <div class="footer">
          Thank you for your purchase!<br/>
          Visit Again
          ${
            storedata?.signatureUrl
              ? `<div class="center"><img src="${storedata.signatureUrl}" style="max-width:100px;object-fit:contain;margin-top:8px;"/></div>`
              : ""
          }
          ${isFreePlan ? `<div style="font-size:18px;text-align:center;margin-top:8px;">Powered by AMDAANI</div>` : ""}
        </div>
      </div>
    </body>
  </html>`;
}

// ---------- Preview: same HTML, same width the print will use ----------
export function generateThermalReceiptPreviewHTML(params, paperWidthMM = 58) {
  const widthPx = resolveDotWidth(paperWidthMM);
  return buildThermalReceiptHTML({ ...params, widthPx });
}

// ---------- Print: screenshot the SAME HTML, send as ESC/POS raster ----------
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
        raster[byteIndex] |= 0x80 >> (x % 8);
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
  const html = buildThermalReceiptHTML({ ...params, widthPx });

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
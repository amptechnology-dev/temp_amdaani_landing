import { format } from "date-fns";

// ---------- Raw ESC/POS command bytes ----------
const ESC = "\x1B";
const GS = "\x1D";
const RAW = {
  INIT: `${ESC}\x40`,
  ALIGN_LEFT: `${ESC}\x61\x00`,
  ALIGN_CENTER: `${ESC}\x61\x01`,
  BOLD_ON: `${ESC}\x45\x01`,
  BOLD_OFF: `${ESC}\x45\x00`,
  DOUBLE_ON: `${GS}\x21\x11`,
  DOUBLE_OFF: `${GS}\x21\x00`,
  CUT: `${GS}\x56\x00`,
};

// ---------- Text helpers (shared by ESC/POS + preview => identical alignment) ----------
function padRight(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}
function padLeft(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(-len) : " ".repeat(len - str.length) + str;
}
function dashLine(width) {
  return "-".repeat(width);
}
function twoCol(left, right, width) {
  left = String(left ?? "");
  right = String(right ?? "");
  const space = width - left.length - right.length;
  if (space < 1) {
    const cutLeft = left.slice(0, Math.max(0, width - right.length - 1));
    return `${cutLeft} ${right}`;
  }
  return `${left}${" ".repeat(space)}${right}`;
}

/**
 * Builds a printer-agnostic list of "blocks" describing the receipt.
 * Both the ESC/POS renderer AND the HTML preview renderer walk this
 * exact same list — so whatever the preview shows on screen is
 * guaranteed to match what actually comes out of the thermal printer
 * (USB or Bluetooth, web or React Native).
 */
function buildReceiptBlocks({
  createdInvoice,
  invoiceData = {},
  formValues = {},
  cartItems = [],
  invoiceCalculations = {},
  invoiceNumber,
  invoiceDate,
  storedata = {},
  isGstInvoice = false,
  payment = { paid: 0, due: 0, status: "unpaid" },
  charWidth = 42, // 80mm printer ≈ 42 chars, 58mm ≈ 32 chars
}) {
  const blocks = [];
  const push = (b) => blocks.push(b);

  const isIgst = invoiceData?.isIgst === true;
  const isUnpaid = (payment.status || "").toLowerCase() === "unpaid";

  // ── Store header ──
  push({ t: "align", v: "center" });
  push({ t: "text", v: (storedata?.name || "STORE NAME").toUpperCase(), bold: true });
  if (storedata?.tagline) push({ t: "text", v: storedata.tagline });
  const addr1 = [storedata?.address?.street, storedata?.address?.city].filter(Boolean).join(", ");
  if (addr1) push({ t: "text", v: addr1 });
  if (isGstInvoice && storedata?.gstNumber) push({ t: "text", v: `GSTIN: ${storedata.gstNumber}` });
  const addr2 = [storedata?.address?.state, storedata?.address?.postalCode].filter(Boolean).join(" ");
  if (addr2) push({ t: "text", v: addr2 });
  if (storedata?.contactNo) push({ t: "text", v: `Ph: ${storedata.contactNo}` });

  push({ t: "line" });
  push({ t: "align", v: "left" });

  // ── Invoice info ──
  push({ t: "text", v: `Invoice: ${invoiceNumber}` });
  push({ t: "text", v: `Date: ${format(new Date(invoiceDate), "dd-MMM-yyyy hh:mm a")}` });
  if (formValues.contactNumber) push({ t: "text", v: `Mobile: ${formValues.contactNumber}` });
  const customerName = formValues.partyName || formValues.customerName;
  if (customerName) push({ t: "text", v: `Customer: ${customerName}` });

  push({ t: "line" });

  // ── Items ──
  const nameW = charWidth - 22;
  push({
    t: "text",
    v: padRight("Item", nameW) + padLeft("Qty", 5) + padLeft("Rate", 8) + padLeft("Amt", 9),
    bold: true,
  });
  push({ t: "line" });

  cartItems.forEach((item) => {
    const qty = item.qty || item.quantity || 0;
    const baseRate = item.baseRate || item.effectiveRate || item.price || 0;
    const totalAmount = item.total || baseRate * qty;
    const name = item.name || "";

    for (let i = 0; i < name.length || i === 0; i += nameW) {
      const chunk = name.slice(i, i + nameW) || "";
      if (i === 0) {
        push({
          t: "text",
          v:
            padRight(chunk, nameW) +
            padLeft(qty, 5) +
            padLeft(baseRate.toFixed(2), 8) +
            padLeft(totalAmount.toFixed(2), 9),
        });
      } else {
        push({ t: "text", v: padRight(chunk, nameW) });
      }
      if (chunk.length < nameW) break;
    }

    if (item.hsn) push({ t: "text", v: `  HSN: ${item.hsn}`, dim: true });

    const discount = Number(item.discount || 0);
    if (discount > 0) {
      const discPercent = baseRate > 0 ? ((discount / baseRate) * 100).toFixed(1) : 0;
      push({ t: "text", v: `  Dis @ ${discPercent}%`, dim: true });
    }
  });

  push({ t: "line" });

  // ── Totals ──
  const subTotal = createdInvoice ? invoiceData?.subTotal : invoiceCalculations.subtotal;
  push({ t: "twoCol", left: "Sub Total", right: Number(subTotal || 0).toFixed(2) });

  const discountTotal = createdInvoice ? invoiceData?.discountTotal : invoiceCalculations.discountTotal;
  if (Number(discountTotal || 0) > 0) {
    push({ t: "twoCol", left: "Extra Discount", right: `-${Number(discountTotal).toFixed(2)}` });
  }

  const grandTotalRaw = createdInvoice
    ? invoiceData?.grandTotal
    : invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0);
  const roundedGrandTotal = Math.round(grandTotalRaw);
  const roundOffValue = createdInvoice
    ? Number(invoiceData?.roundOff || 0)
    : Number((roundedGrandTotal - grandTotalRaw).toFixed(2));

  if (roundOffValue !== 0) {
    push({
      t: "twoCol",
      left: "Round Off",
      right: `${roundOffValue >= 0 ? "+" : ""}${roundOffValue.toFixed(2)}`,
    });
  }

  push({
    t: "twoCol",
    left: "Net Total",
    right: `Rs.${roundedGrandTotal.toFixed(2)}`,
    double: true,
    bold: true,
    width: Math.floor(charWidth / 2),
  });

  if (!isUnpaid && (payment.paid > 0 || payment.due > 0)) {
    push({ t: "twoCol", left: "Paid", right: Number(payment.paid).toFixed(2), bold: true });
    push({ t: "twoCol", left: "Due", right: Math.round(payment.due).toFixed(2), bold: true });
  }

  push({ t: "line" });

  // ── Payment status ──
  push({ t: "align", v: "center" });
  const statusText =
    payment.status === "paid"
      ? "AMOUNT FULLY PAID"
      : payment.status === "partial"
      ? "AMOUNT PARTIALLY PAID"
      : "AMOUNT UNPAID";
  push({ t: "text", v: statusText, bold: true });

  // ── GST breakdown (properly tabulated, matches web/RN receipt) ──
  if (isGstInvoice && invoiceCalculations.gstBreakdown) {
    const rows = Object.entries(invoiceCalculations.gstBreakdown).filter(([rate]) => parseFloat(rate) > 0);
    if (rows.length) {
      push({ t: "align", v: "left" });
      push({ t: "line" });
      push({ t: "text", v: "TAX SUMMARY", bold: true, align: "center" });

      const rateW = 6;
      const col2W = isIgst ? 10 : 10;
      const taxW = charWidth - rateW - (isIgst ? col2W : col2W * 2);

      push({
        t: "text",
        v: isIgst
          ? padRight("GST%", rateW) + padRight("Taxable", taxW) + padLeft("IGST", col2W)
          : padRight("GST%", rateW) + padRight("Taxable", taxW) + padLeft("CGST", col2W) + padLeft("SGST", col2W),
        bold: true,
      });

      rows.forEach(([rate, b]) => {
        const taxable = (b.taxableAmount || 0).toFixed(2);
        if (isIgst) {
          const igst = (b.igstAmount || (b.cgstAmount || 0) + (b.sgstAmount || 0)).toFixed(2);
          push({ t: "text", v: padRight(`${rate}%`, rateW) + padRight(taxable, taxW) + padLeft(igst, col2W) });
        } else {
          const cgst = (b.cgstAmount || 0).toFixed(2);
          const sgst = (b.sgstAmount || 0).toFixed(2);
          push({
            t: "text",
            v: padRight(`${rate}%`, rateW) + padRight(taxable, taxW) + padLeft(cgst, col2W) + padLeft(sgst, col2W),
          });
        }
      });
    }
  }

  // ── Payment summary (only when paid/partial, mirrors web/RN receipt) ──
  if (!isUnpaid && invoiceData?.transactions?.length) {
    push({ t: "align", v: "left" });
    push({ t: "line" });
    push({ t: "text", v: "PAYMENT SUMMARY", bold: true, align: "center" });
    invoiceData.transactions.forEach((tx) => {
      const d = format(new Date(tx.createdAt), "dd/MM hh:mm a");
      push({
        t: "text",
        v:
          padRight(d, 14) +
          padLeft(`Rs.${tx.amount.toFixed(2)}`, 12) +
          padLeft((tx.paymentMethod || "").toUpperCase(), Math.max(0, charWidth - 26)),
      });
    });
  }

  // ── Footer ──
  push({ t: "align", v: "center" });
  push({ t: "line" });
  push({ t: "text", v: "Thank you for your purchase!" });
  push({ t: "text", v: "Visit Again" });
  push({ t: "feed", n: 3 });
  push({ t: "cut" });

  return blocks;
}

// ---------- ESC/POS renderer (bytes for USB/Bluetooth print) ----------
export function generateThermalInvoiceESCPOS(params) {
  const { charWidth = 42 } = params;
  const blocks = buildReceiptBlocks(params);

  let r = RAW.INIT;
  let bold = false;
  let double = false;

  blocks.forEach((b) => {
    switch (b.t) {
      case "align":
        r += b.v === "center" ? RAW.ALIGN_CENTER : RAW.ALIGN_LEFT;
        break;
      case "line":
        r += dashLine(charWidth) + "\n";
        break;
      case "text": {
        if (b.align) r += b.align === "center" ? RAW.ALIGN_CENTER : RAW.ALIGN_LEFT;
        const wantBold = !!b.bold;
        const wantDouble = !!b.double;
        if (wantBold !== bold) {
          r += wantBold ? RAW.BOLD_ON : RAW.BOLD_OFF;
          bold = wantBold;
        }
        if (wantDouble !== double) {
          r += wantDouble ? RAW.DOUBLE_ON : RAW.DOUBLE_OFF;
          double = wantDouble;
        }
        r += b.v + "\n";
        break;
      }
      case "twoCol": {
        const wantBold = !!b.bold;
        const wantDouble = !!b.double;
        if (wantBold !== bold) {
          r += wantBold ? RAW.BOLD_ON : RAW.BOLD_OFF;
          bold = wantBold;
        }
        if (wantDouble !== double) {
          r += wantDouble ? RAW.DOUBLE_ON : RAW.DOUBLE_OFF;
          double = wantDouble;
        }
        r += twoCol(b.left, b.right, b.width || charWidth) + "\n";
        break;
      }
      case "feed":
        r += "\n".repeat(b.n || 1);
        break;
      case "cut":
        r += RAW.CUT;
        break;
      default:
        break;
    }
  });

  return r;
}

// ---------- HTML preview renderer (used for the "print preview" dialog) ----------
// Walks the SAME blocks as the ESC/POS renderer, in a monospace fixed-width
// column, so this preview is a pixel-accurate mirror of what the thermal
// printer will actually output — no separate design to keep in sync.
export function generateThermalReceiptPreviewHTML(params) {
  const { charWidth = 42 } = params;
  const blocks = buildReceiptBlocks(params);

  let align = "left";
  let html = "";

  blocks.forEach((b) => {
    switch (b.t) {
      case "align":
        align = b.v;
        break;
      case "line":
        html += `<div class="tline"></div>`;
        break;
      case "text": {
        const a = b.align || align;
        html += `<div class="trow" style="text-align:${a};font-weight:${b.bold ? 700 : 400};${
          b.double ? "font-size:1.6em;letter-spacing:1px;" : ""
        }${b.dim ? "color:#555;font-size:0.9em;" : ""}">${escapeHtml(b.v)}</div>`;
        break;
      }
      case "twoCol": {
        html += `<div class="trow" style="white-space:pre;font-weight:${b.bold ? 700 : 400};${
          b.double ? "font-size:1.6em;letter-spacing:1px;" : ""
        }">${escapeHtml(twoCol(b.left, b.right, b.width || charWidth))}</div>`;
        break;
      }
      case "feed":
        html += `<div style="height:${(b.n || 1) * 14}px;"></div>`;
        break;
      default:
        break;
    }
  });

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { margin:0; background:#e5e7eb; font-family: 'Courier New', monospace; }
        #paper {
          width: ${charWidth * 8.6}px;
          margin: 16px auto;
          background: #fff;
          padding: 14px 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,.15);
          font-size: 13px;
          line-height: 1.35;
        }
        .trow { white-space: pre-wrap; word-break: break-word; }
        .tline { border-top: 1px dashed #000; margin: 4px 0; }
      </style>
    </head>
    <body>
      <div id="paper">${html}</div>
    </body>
  </html>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
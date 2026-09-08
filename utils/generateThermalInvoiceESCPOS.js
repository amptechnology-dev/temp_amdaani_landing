import { format } from "date-fns";

const ESC = "\x1B";
const GS = "\x1D";

const CMD = {
  INIT: `${ESC}\x40`,
  ALIGN_LEFT: `${ESC}\x61\x00`,
  ALIGN_CENTER: `${ESC}\x61\x01`,
  BOLD_ON: `${ESC}\x45\x01`,
  BOLD_OFF: `${ESC}\x45\x00`,
  DOUBLE_ON: `${GS}\x21\x11`,
  DOUBLE_OFF: `${GS}\x21\x00`,
  CUT: `${GS}\x56\x00`,
  FEED: (n = 1) => "\n".repeat(n),
};

function padRight(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}
function padLeft(str, len) {
  str = String(str ?? "");
  return str.length >= len ? str.slice(-len) : " ".repeat(len - str.length) + str;
}
function line(char = "-", width) {
  return char.repeat(width) + "\n";
}
function twoCol(left, right, width) {
  left = String(left ?? "");
  right = String(right ?? "");
  const space = width - left.length - right.length;
  if (space < 1) {
    const cutLeft = left.slice(0, Math.max(0, width - right.length - 1));
    return `${cutLeft} ${right}\n`;
  }
  return `${left}${" ".repeat(space)}${right}\n`;
}

export function generateThermalInvoiceESCPOS({
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
  let r = "";
  const isIgst = invoiceData?.isIgst === true;
  const isUnpaid = (payment.status || "").toLowerCase() === "unpaid";

  r += CMD.INIT;
  r += CMD.ALIGN_CENTER;

  // ── Store Header ──
  r += CMD.BOLD_ON + (storedata?.name || "STORE NAME").toUpperCase() + "\n" + CMD.BOLD_OFF;
  if (storedata?.tagline) r += storedata.tagline + "\n";
  const addr1 = [storedata?.address?.street, storedata?.address?.city].filter(Boolean).join(", ");
  if (addr1) r += addr1 + "\n";
  if (isGstInvoice && storedata?.gstNumber) r += `GSTIN: ${storedata.gstNumber}\n`;
  const addr2 = [storedata?.address?.state, storedata?.address?.postalCode].filter(Boolean).join(" ");
  if (addr2) r += addr2 + "\n";
  if (storedata?.contactNo) r += `Ph: ${storedata.contactNo}\n`;

  r += line("-", charWidth);
  r += CMD.ALIGN_LEFT;

  // ── Invoice Info ──
  r += `Invoice: ${invoiceNumber}\n`;
  r += `Date: ${format(new Date(invoiceDate), "dd-MMM-yyyy hh:mm a")}\n`;
  if (formValues.contactNumber) r += `Mobile: ${formValues.contactNumber}\n`;
  const customerName = formValues.partyName || formValues.customerName;
  if (customerName) r += `Customer: ${customerName}\n`;

  r += line("-", charWidth);

  // ── Items ──
  const nameW = charWidth - 22;
  r += CMD.BOLD_ON;
  r += padRight("Item", nameW) + padLeft("Qty", 5) + padLeft("Rate", 8) + padLeft("Amt", 9) + "\n";
  r += CMD.BOLD_OFF;
  r += line("-", charWidth);

  cartItems.forEach((item) => {
    const qty = item.qty || item.quantity || 0;
    const baseRate = item.baseRate || item.effectiveRate || item.price || 0;
    const totalAmount = item.total || baseRate * qty;
    const name = item.name || "";

    for (let i = 0; i < name.length || i === 0; i += nameW) {
      const chunk = name.slice(i, i + nameW) || "";
      if (i === 0) {
        r +=
          padRight(chunk, nameW) +
          padLeft(qty, 5) +
          padLeft(baseRate.toFixed(2), 8) +
          padLeft(totalAmount.toFixed(2), 9) +
          "\n";
      } else {
        r += padRight(chunk, nameW) + "\n";
      }
      if (chunk.length < nameW) break;
    }

    if (item.hsn) r += `  HSN: ${item.hsn}\n`;

    const discount = Number(item.discount || 0);
    if (discount > 0) {
      const discPercent = baseRate > 0 ? ((discount / baseRate) * 100).toFixed(1) : 0;
      r += `  Dis @ ${discPercent}%\n`;
    }
  });

  r += line("-", charWidth);

  // ── Totals ──
  const subTotal = createdInvoice ? invoiceData?.subTotal : invoiceCalculations.subtotal;
  r += twoCol("Sub Total", Number(subTotal || 0).toFixed(2), charWidth);

  const discountTotal = createdInvoice
    ? invoiceData?.discountTotal
    : invoiceCalculations.discountTotal;
  if (Number(discountTotal || 0) > 0) {
    r += twoCol("Extra Discount", `-${Number(discountTotal).toFixed(2)}`, charWidth);
  }

  const grandTotalRaw = createdInvoice
    ? invoiceData?.grandTotal
    : invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0);
  const roundedGrandTotal = Math.round(grandTotalRaw);
  const roundOffValue = createdInvoice
    ? Number(invoiceData?.roundOff || 0)
    : Number((roundedGrandTotal - grandTotalRaw).toFixed(2));

  if (roundOffValue != 0) {
    r += twoCol(
      "Round Off",
      `${roundOffValue >= 0 ? "+" : ""}${roundOffValue.toFixed(2)}`,
      charWidth,
    );
  }

  r += CMD.DOUBLE_ON;
  r += twoCol("Net Total", `Rs.${roundedGrandTotal.toFixed(2)}`, Math.floor(charWidth / 2));
  r += CMD.DOUBLE_OFF;

  if (!isUnpaid && (payment.paid > 0 || payment.due > 0)) {
    r += CMD.BOLD_ON;
    r += twoCol("Paid", Number(payment.paid).toFixed(2), charWidth);
    r += twoCol("Due", Math.round(payment.due).toFixed(2), charWidth);
    r += CMD.BOLD_OFF;
  }

  r += line("-", charWidth);

  // ── Payment Status ──
  r += CMD.ALIGN_CENTER;
  const statusText =
    payment.status === "paid"
      ? "AMOUNT FULLY PAID"
      : payment.status === "partial"
      ? "AMOUNT PARTIALLY PAID"
      : "AMOUNT UNPAID";
  r += CMD.BOLD_ON + statusText + "\n" + CMD.BOLD_OFF;

  // ── GST Breakdown ──
  if (isGstInvoice && invoiceCalculations.gstBreakdown) {
    const rows = Object.entries(invoiceCalculations.gstBreakdown).filter(
      ([rate]) => parseFloat(rate) > 0,
    );
    if (rows.length) {
      r += CMD.ALIGN_LEFT;
      r += line("-", charWidth);
      r += CMD.BOLD_ON + "TAX SUMMARY\n" + CMD.BOLD_OFF;
      rows.forEach(([rate, b]) => {
        const taxable = (b.taxableAmount || 0).toFixed(2);
        if (isIgst) {
          const igst = (b.igstAmount || (b.cgstAmount || 0) + (b.sgstAmount || 0)).toFixed(2);
          r += `${rate}% Taxable:${taxable} IGST:${igst}\n`;
        } else {
          const cgst = (b.cgstAmount || 0).toFixed(2);
          const sgst = (b.sgstAmount || 0).toFixed(2);
          r += `${rate}% Taxable:${taxable} C:${cgst} S:${sgst}\n`;
        }
      });
    }
  }

  // ── Footer ──
  r += CMD.ALIGN_CENTER;
  r += line("-", charWidth);
  r += "Thank you for your purchase!\n";
  r += "Visit Again\n";

  r += CMD.FEED(3);
  r += CMD.CUT;

  return r;
}
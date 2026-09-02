import { format } from "date-fns";
import {
  concatBytes,
  divider,
  feed,
  cutPaper,
  initPrinter,
  line,
  columns as escposColumns,
  imageUrlToRaster,
} from "./escpos";
import { writeBytes, ensurePrinterConnected } from "./webBluetoothPrinter";

const LINE_WIDTH = 32; // characters per line — adjust for 58mm(32) vs 80mm(48)

export async function printThermalInvoiceWeb({
  invoice,
  paidAmount,
  dueAmount,
  paymentStatus,
  gstBreakdown,
  enrichedItems,
  isFreePlan,
  store,
}) {
  const connected = await ensurePrinterConnected();
  if (!connected) {
    throw new Error("Printer not connected. Please connect your printer first.");
  }

  const isGstInvoice = (invoice?.type || "gst") !== "non-gst";
  const discountTotal = Number(invoice.discountTotal || 0);
  const roundedTotal = Math.round(invoice.grandTotal);
  const chunks = [];

  chunks.push(initPrinter());

  // ── Logo ──
  if (store?.logoUrl) {
    try {
      chunks.push(new Uint8Array([0x1b, 0x61, 1])); // center
      chunks.push(await imageUrlToRaster(store.logoUrl, 200));
      chunks.push(feed(1));
    } catch {
      /* skip logo if it fails to load/decode */
    }
  }

  // ── Store header ──
  chunks.push(line(store?.name || "STORE", { align: "center", bold: true }));
  if (store?.tagline) chunks.push(line(store.tagline, { align: "center" }));
  chunks.push(divider(LINE_WIDTH));

  if (store?.address?.street || store?.address?.city) {
    chunks.push(
      line(
        `${store?.address?.street || ""}, ${store?.address?.city || ""} ${
          store?.address?.state || ""
        } ${store?.address?.postalCode || ""}`,
        { align: "center" },
      ),
    );
  }
  if (isGstInvoice && store?.gstNumber) {
    chunks.push(line(`GSTIN: ${store.gstNumber}`, { align: "center" }));
  }
  if (store?.contactNo) {
    chunks.push(line(`Ph.No.: +91-${store.contactNo}`, { align: "center" }));
  }
  chunks.push(divider(LINE_WIDTH));

  // ── Invoice details ──
  chunks.push(line(`Invoice: ${invoice.invoiceNumber}`));
  chunks.push(
    line(`Date: ${format(new Date(invoice.invoiceDate), "dd-MMM-yyyy hh:mm a")}`),
  );
  if (invoice.customerMobile) chunks.push(line(`Mobile: ${invoice.customerMobile}`));
  if (invoice.customerName) chunks.push(line(`Customer: ${invoice.customerName}`));
  chunks.push(divider(LINE_WIDTH));

  if (invoice?.status?.toLowerCase?.() === "cancelled") {
    chunks.push(line("CANCELLED", { align: "center", bold: true, sizeW: 2, sizeH: 2 }));
    chunks.push(divider(LINE_WIDTH));
  }

  // ── Items ──
  const colWidths = [14, 4, 7, 7];
  chunks.push(
    escposColumns(colWidths, ["left", "center", "right", "right"], [
      "Item",
      "Qty",
      "Rate",
      "Amt",
    ]),
  );
  chunks.push(divider(LINE_WIDTH));

  const items = enrichedItems?.length ? enrichedItems : invoice.items || [];
  for (const item of items) {
    const qty = Number(item.qty || item.quantity || 0);
    const baseRate = Number(item.baseRate || item.effectiveRate || item.price || 0);
    const totalAmount = Number(item.total || baseRate * qty);
    const discount = Number(item.discount || 0);
    const gstRate = Number(item.gstRate || 0);
    const isTaxInclusive = !!item.isTaxInclusive;

    let perItemDiscount = discount;
    if (isTaxInclusive && gstRate > 0) perItemDiscount = perItemDiscount / (1 + gstRate / 100);
    const totalDiscount = perItemDiscount * qty;
    const discountPercent =
      baseRate > 0 && perItemDiscount > 0
        ? ((perItemDiscount / baseRate) * 100).toFixed(2)
        : null;

    chunks.push(
      escposColumns(colWidths, ["left", "center", "right", "right"], [
        item.name || "",
        String(qty),
        baseRate.toFixed(2),
        totalAmount.toFixed(2),
      ]),
    );

    if (totalDiscount > 0) {
      chunks.push(
        escposColumns(colWidths, ["left", "center", "right", "right"], [
          item.hsn ? `HSN: ${item.hsn}` : "",
          "",
          discountPercent ? `Dis ${discountPercent}%` : "",
          "",
        ]),
      );
    }
    chunks.push(divider(LINE_WIDTH));
  }

  // ── Totals ──
  chunks.push(escposColumns([20, 12], ["left", "right"], [
    "Sub Total",
    Number(invoice.subTotal || 0).toFixed(2),
  ]));

  if (discountTotal > 0) {
    chunks.push(
      escposColumns([20, 12], ["left", "right"], [
        "Extra Discount",
        `-${discountTotal.toFixed(2)}`,
      ]),
    );
  }

  const roundOffValue = Number((invoice?.roundOff || 0).toFixed(2));
  if (roundOffValue !== 0) {
    const sign = roundOffValue > 0 ? "+" : "";
    chunks.push(
      escposColumns([20, 12], ["left", "right"], [
        "Round Off",
        `${sign}${roundOffValue.toFixed(2)}`,
      ]),
    );
  }

  chunks.push(divider(LINE_WIDTH));
  chunks.push(
    line(
      `${"Net Total".padEnd(20)}${roundedTotal.toFixed(2).padStart(12)}`,
      { bold: true },
    ),
  );

  if ((paymentStatus || "").toLowerCase() !== "unpaid" && (paidAmount > 0 || dueAmount > 0)) {
    chunks.push(
      escposColumns([20, 12], ["left", "right"], ["Paid Amount", paidAmount.toFixed(2)]),
    );
    chunks.push(
      escposColumns([20, 12], ["left", "right"], [
        "Due Amount",
        Math.round(dueAmount).toFixed(2),
      ]),
    );
  }

  // ── Status ──
  let statusText = "";
  switch ((paymentStatus || "").toLowerCase()) {
    case "paid":
      statusText = "Amount Fully Paid";
      break;
    case "partial":
      statusText = "Amount Partially Paid";
      break;
    case "unpaid":
      statusText = "Amount is Unpaid";
      break;
  }
  if (statusText) chunks.push(line(statusText, { align: "center", bold: true }));

  if (paidAmount > 0 && invoice?.paymentMethod) {
    chunks.push(
      line(
        `Payment: ${invoice.paymentMethod.toUpperCase()}${
          invoice?.paymentNote ? ` (Ref:${invoice.paymentNote})` : ""
        }`,
        { align: "center" },
      ),
    );
  }

  // ── GST breakdown ──
  const gstRates = Object.keys(gstBreakdown || {}).filter((r) => parseFloat(r) > 0);
  if (isGstInvoice && gstRates.length > 0) {
    chunks.push(divider(LINE_WIDTH));
    chunks.push(line("TAX SUMMARY", { align: "center", bold: true }));
    const isIgst = invoice?.isIgst === true;
    const headers = isIgst
      ? ["GST%", "Taxable", "IGST"]
      : ["GST%", "Taxable", "CGST", "SGST"];
    const w = isIgst ? [8, 12, 12] : [6, 10, 8, 8];
    chunks.push(escposColumns(w, ["left", "right", "right", "right"], headers));

    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
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
        : [
            `${parseFloat(rate).toFixed(2)}%`,
            taxable.toFixed(2),
            cgst.toFixed(2),
            sgst.toFixed(2),
          ];
      chunks.push(escposColumns(w, ["left", "right", "right", "right"], row));
    }
    chunks.push(divider(LINE_WIDTH));
    const totalRow = isIgst
      ? ["Total", totalTaxable.toFixed(2), totalIGST.toFixed(2)]
      : ["Total", totalTaxable.toFixed(2), totalCGST.toFixed(2), totalSGST.toFixed(2)];
    chunks.push(escposColumns(w, ["left", "right", "right", "right"], totalRow));
  }

  // ── QR / UPI ──
  if (store?.bankDetails?.upiId) {
    const upiString = `upi://pay?pa=${store.bankDetails.upiId}&pn=${encodeURIComponent(
      store?.name || "Merchant",
    )}&am=${roundedTotal}&cu=INR`;
    const qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;
    try {
      chunks.push(divider(LINE_WIDTH));
      chunks.push(line("Scan & Pay", { align: "center", bold: true }));
      chunks.push(new Uint8Array([0x1b, 0x61, 1])); // center
      chunks.push(await imageUrlToRaster(qrURL, 180));
      chunks.push(line(`UPI: ${store.bankDetails.upiId}`, { align: "center" }));
      chunks.push(line(`Amount: Rs.${roundedTotal}`, { align: "center" }));
    } catch {
      /* skip QR if it fails to load */
    }
  }

  // ── Footer ──
  chunks.push(divider(LINE_WIDTH));
  chunks.push(line("Thank you for your purchase!", { align: "center" }));
  chunks.push(line("Visit Again", { align: "center" }));
  if (isFreePlan) {
    chunks.push(line('"Powered by AMDAANI"', { align: "center", bold: true }));
  }
  chunks.push(feed(3));
  chunks.push(cutPaper());

  await writeBytes(concatBytes(chunks));
}
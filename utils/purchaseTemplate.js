import { format } from "date-fns";
import numberToWords from "number-to-words";

/* ============================================================
   Shared helpers (used by both A4 and A5 branches)
   ============================================================ */

const getPerUnitDiscountAmount = (item) => {
  const costPrice = Number(item.costPrice ?? item.rate ?? item.price ?? 0);
  const discountType = item.purchaseDiscountType || "amount";
  const rawDiscountInput = Number(item.purchaseDiscount ?? item.discount ?? 0);
  return discountType === "percentage"
    ? (costPrice * rawDiscountInput) / 100
    : rawDiscountInput;
};

function parseSafeDate(value) {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

/* ============================================================
   A5 — multi-page, mobile-style layout.
   ✅ NOTE: To match A4, this template does NOT render:
      - Store header (logo/company name/address/GSTIN)
      - Store party column ("To, StoreName")
      - Bank details / UPI QR
      - Terms & Conditions
      - Signature block
   Only Vendor ("From") details, items, totals and payment info
   are shown — kept minimal, same as the A4 purchase template.
   ============================================================ */

const A5_CONTENT_W_MM = 210;
const A5_CONTENT_H_MM = 148;
const A5_PRINT_SAFE_MARGIN_MM = 3;

const A5_ITEMS_PER_CONT_PAGE = 20;
// ✅ Base bumped up (16 → 19) since bank/terms/signature blocks are
// permanently gone now — the footer needs less reserved space.
const A5_ITEMS_LAST_PAGE_BASE = 19;
const A5_LAST_PAGE_MAX_CAPACITY = 22;

function getA5LastPageCapacity({ hasRemarks, hasPaymentNote }) {
  let capacity = A5_ITEMS_LAST_PAGE_BASE;
  if (!hasRemarks) capacity += 1;
  if (!hasPaymentNote) capacity += 1;
  return Math.min(capacity, A5_LAST_PAGE_MAX_CAPACITY);
}

function paginateA5Items(items, lastPageCapacity) {
  const total = items.length;
  if (total === 0) return [[]];
  if (total <= lastPageCapacity) return [items.slice()];

  const copy = [...items];
  const pages = [];
  let remaining = total;

  while (remaining > lastPageCapacity) {
    pages.push(copy.splice(0, A5_ITEMS_PER_CONT_PAGE));
    remaining -= A5_ITEMS_PER_CONT_PAGE;
  }
  pages.push(copy);

  if (pages.length >= 2 && pages[pages.length - 1].length === 0) {
    const prevPage = pages[pages.length - 2];
    const lastPage = pages[pages.length - 1];
    const borrowCount = Math.min(lastPageCapacity, prevPage.length);
    lastPage.push(...prevPage.splice(prevPage.length - borrowCount, borrowCount));
  }

  return pages;
}

const a5SharedCSS = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eee; }

  @media screen {
    html, body { width: ${A5_CONTENT_W_MM}mm; height: auto; overflow-x: auto; }
    .page { width: ${A5_CONTENT_W_MM}mm; min-height: ${A5_CONTENT_H_MM}mm; background: #fff; margin-bottom: 8mm; }
    .wrap {
      width: ${A5_CONTENT_W_MM}mm; min-height: ${A5_CONTENT_H_MM}mm; background: #fff;
      display: flex; flex-direction: column; font-family: 'Arial', sans-serif;
      font-size: 8.5px; line-height: 1.3; color: #1a1a1a; border: 1px solid #2c5aa0;
      overflow: hidden; padding: ${A5_PRINT_SAFE_MARGIN_MM}mm;
    }
  }

  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    @page { size: ${A5_CONTENT_W_MM}mm ${A5_CONTENT_H_MM}mm landscape; margin: 0; }
    .page { width: ${A5_CONTENT_W_MM}mm !important; height: ${A5_CONTENT_H_MM}mm !important; page-break-after: always; overflow: hidden !important; background: #fff !important; }
    .page:last-child { page-break-after: avoid; }
    .wrap {
      width: ${A5_CONTENT_W_MM}mm !important; height: ${A5_CONTENT_H_MM}mm !important; background: #fff !important;
      display: flex !important; flex-direction: column !important; font-family: 'Arial', sans-serif !important;
      font-size: 8.5px !important; line-height: 1.3 !important; color: #1a1a1a !important; border: none !important;
      overflow: hidden !important; padding: ${A5_PRINT_SAFE_MARGIN_MM}mm !important; box-sizing: border-box !important;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }

  .brand-strip {
    display: flex; align-items: center; gap: 5px; padding: 1.5px 8px; border-bottom: 1px solid #ccc;
    background: #f9fafc; font-size: 7px; color: #666; flex-shrink: 0; line-height: 1.2;
  }
  .brand-strip img { height: 9px; width: auto; }

  .hdr-title-row {
    display: flex; align-items: center; justify-content: center; position: relative;
    padding: 6px 10px; border-bottom: 2px solid #2c5aa0; flex-shrink: 0;
    background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
  }
  .hdr-title-center { text-align: center; }
  .hdr-title-center .main-title { font-size: 14px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #2c5aa0; }
  .hdr-title-center .invoice-rule { width: 70px; height: 2px; background: #2c5aa0; margin: 2px auto 0; }
  .hdr-status-block { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); }
  .hdr-status-block .ps-inline {
    padding: 2px 10px; border-radius: 10px; font-size: 7.5px; font-weight: 700; color: #fff;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .ps-inline.paid    { background: #43a047; }
  .ps-inline.partial { background: #fb8c00; }
  .ps-inline.unpaid  { background: #e53935; }

  .hdr-parties-row { border-bottom: 1px solid #2c5aa0; font-size: 8px; flex-shrink: 0; }
  .hdr-party { padding: 4px 10px; min-width: 0; }
  .hdr-party .ttl { font-weight: 700; margin-bottom: 1px; color: #2c5aa0; text-transform: uppercase; font-size: 7.5px; letter-spacing: 0.3px; }
  .hdr-party .p-row { line-height: 1.3; }
  .hdr-party .p-lbl { font-weight: 600; }

  .hdr-meta-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 2.5px 10px; border-bottom: 1.5px solid #2c5aa0; font-size: 8px;
    font-weight: 700; flex-shrink: 0; gap: 8px; background: #f0f4ff; color: #2c5aa0;
  }
  .hdr-meta-row span { white-space: nowrap; }

  .tbl-wrap { position: relative; flex: 1; overflow: hidden; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .tbl th {
    background: #2c5aa0; color: #fff; padding: 2.5px 3px; border: 1px solid #2c5aa0; font-size: 7.5px;
    text-align: center; text-transform: uppercase; letter-spacing: 0.2px; font-weight: 700;
  }
  .tbl td { padding: 2px 3px; border: 1px solid #c9d2dc; vertical-align: middle; }
  .tbl .c { text-align: center; }
  .tbl .r { text-align: right; }
  .tbl .l { text-align: left; }
  .tbl .bold { font-weight: 700; }
  .iname { font-weight: 600; }
  .sum-row td { font-weight: 700; background: #f0f4ff; border-top: 1.5px solid #2c5aa0; }

  /* ── Totals row — words-col (amount in words + payment summary) | amt-col (grand total table) ── */
  .totals-wrap { display: flex; align-items: stretch; border-top: 2px solid #2c5aa0; flex-shrink: 0; }

  .words-col { flex: 2; padding: 5px 12px; border-right: 1px solid #2c5aa0; font-size: 8px; display: flex; flex-direction: column; justify-content: center; }
  .words-lbl { font-weight: 700; color: #2c5aa0; margin-bottom: 2px; text-transform: uppercase; font-size: 7.5px; letter-spacing: 0.3px; }
  .words-val { font-size: 9px; font-weight: 600; font-style: italic; }

  .pay-summary { margin-top: 5px; }
  .pay-summary .ps-ttl { font-weight: 700; color: #2c5aa0; font-size: 6.5px; text-transform: uppercase; letter-spacing: 0.2px; margin-bottom: 1px; }
  .pay-summary table { width: 100%; border-collapse: collapse; font-size: 6.5px; }
  .pay-summary th, .pay-summary td { border: 1px solid #c9d2dc; padding: 1.5px 3px; }
  .pay-summary th { background: #f0f4ff; color: #2c5aa0; font-weight: 700; text-transform: uppercase; }
  .pay-summary td.r { text-align: right; }
  .pay-summary td.c { text-align: center; }
  .pay-summary .ps-more { font-size: 6px; color: #777; font-style: italic; margin-top: 1px; text-align: right; }

  .amt-col { width: 165px; flex-shrink: 0; }
  .amt-tbl { width: 100%; border-collapse: collapse; font-size: 8px; }
  .amt-tbl td { padding: 2.5px 6px; border: 1px solid #c9d2dc; }
  .amt-tbl .lbl { font-weight: 600; background: #f8f8f8; }
  .amt-tbl .val { text-align: right; font-weight: 600; }
  .grand .lbl, .grand .val { background: #2c5aa0; color: #fff; font-weight: 700; }
  .pay-red { color: #e53935; }
  .pay-grn { color: #43a047; }

  .footer-block { border-top: 1.5px solid #2c5aa0; flex-shrink: 0; }
  .remarks { font-size: 7.5px; color: #555; padding: 3px 10px; flex-shrink: 0; }

  .continued-note {
    text-align: center; font-size: 7.5px; color: #888; font-style: italic;
    padding: 4px 8px; border-top: 1px solid #eee; flex-shrink: 0;
  }
  .page-footer-text { text-align: center; font-size: 7px; color: #999; font-style: italic; padding: 3px 8px; flex-shrink: 0; }

  .tbl-wrap.cancelled::after {
    content: "CANCELLED"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: clamp(28px, 6vw, 60px); font-weight: 900; letter-spacing: 0.4em; color: rgba(0,0,0,0.07);
    transform: rotate(-28deg); pointer-events: none; z-index: 2; white-space: nowrap;
  }
`;

function buildA5ItemsHTML(pageItems, startIndex, isGstInvoice, isMrpEnabled, isIgst) {
  return pageItems
    .map((item, i) => {
      const index = startIndex + i;
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const unit = item.unit || "PCS";
      const hsn = item.hsn || "—";
      const costPrice = Number(item.costPrice ?? item.rate ?? item.price ?? 0);
      const mrp = Number(item.mrp || 0);
      const taxableValue = Number(item.taxableValue || 0);
      const gstRate = Number(item.gstRate || 0);
      const gstAmount = Number(item.gstAmount || 0);
      const cgstAmount = isIgst ? 0 : gstAmount / 2;
      const sgstAmount = isIgst ? 0 : gstAmount / 2;
      const igstAmount = isIgst ? gstAmount : 0;
      const itemTotal = Number(item.total || 0);

      const perUnitDiscount = getPerUnitDiscountAmount(item);
      const totalDiscountAmt = perUnitDiscount * qty;
      const discountPercent =
        (item.purchaseDiscountType || "amount") === "percentage"
          ? Number(item.purchaseDiscount || 0) > 0
            ? Number(item.purchaseDiscount).toFixed(1)
            : null
          : costPrice > 0 && perUnitDiscount > 0
            ? ((perUnitDiscount / costPrice) * 100).toFixed(1)
            : null;

      return `
        <tr>
          <td class="c">${index + 1}</td>
          <td class="l"><div class="iname">${item.name}</div></td>
          <td class="c">${hsn}</td>
          <td class="c">${qty}</td>
          <td class="c">${unit}</td>
          ${isMrpEnabled ? `<td class="r">₹${mrp.toFixed(2)}</td>` : ""}
          <td class="r">₹${costPrice.toFixed(2)}</td>
          <td class="r">${
            totalDiscountAmt > 0
              ? `₹${totalDiscountAmt.toFixed(2)}${discountPercent ? ` (${discountPercent}%)` : ""}`
              : "—"
          }</td>
          ${
            isGstInvoice
              ? `<td class="r">₹${taxableValue.toFixed(2)}</td>
                 <td class="c">${gstRate}%</td>
                 ${
                   isIgst
                     ? `<td class="r">₹${igstAmount.toFixed(2)}</td>`
                     : `<td class="r">₹${cgstAmount.toFixed(2)}</td><td class="r">₹${sgstAmount.toFixed(2)}</td>`
                 }`
              : ""
          }
          <td class="r bold">₹${itemTotal.toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

function a5TableHeader(isGstInvoice, isMrpEnabled, isIgst) {
  return `<thead>
    <tr>
      <th style="width:18px">#</th>
      <th style="text-align:left">Item</th>
      <th>HSN</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Rate(₹)</th>
      <th>Discount</th>
      ${
        isGstInvoice
          ? `<th>Taxable(₹)</th><th>GST%</th>${
              isIgst ? "<th>IGST(₹)</th>" : "<th>CGST(₹)</th><th>SGST(₹)</th>"
            }`
          : ""
      }
      <th>Amt(₹)</th>
    </tr>
  </thead>`;
}

function generateA5PurchaseHTML({
  preview,
  createdInvoice,
  invoiceData,
  formValues,
  cartItems,
  invoiceCalculations,
  invoiceNumber,
  invoiceDate,
  isGstInvoice,
  isMrpEnabled = false,
  isFreePlan = true,
  appBrand = { name: "AMDAANI", logoUrl: "" },
  payment = { paid: 0, due: 0, status: "unpaid" },
}) {
  const safeDate = parseSafeDate(invoiceDate);
  const isIgst = invoiceData?.isIgst === true;

  let totalQty = 0,
    totalDiscount = 0,
    totalTaxable = 0,
    totalGST = 0,
    totalAmount = 0;

  cartItems.forEach((item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    const perUnitDiscount = getPerUnitDiscountAmount(item);
    totalQty += qty;
    totalDiscount += perUnitDiscount * qty;
    totalTaxable += Number(item.taxableValue || 0);
    totalGST += Number(item.gstAmount || 0);
    totalAmount += Number(item.total || 0);
  });

  const effectiveDiscountTotal = createdInvoice
    ? Number(invoiceData?.discountTotal || 0)
    : Number(invoiceCalculations?.discountTotal || 0);

  const rawGrandTotal = createdInvoice
    ? Number(invoiceData?.grandTotal || 0)
    : invoiceCalculations.grandTotal - effectiveDiscountTotal;

  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOffValue = createdInvoice
    ? Number(invoiceData?.roundOff || 0)
    : Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

  const safeGrandTotal = Number.isFinite(roundedGrandTotal) ? Math.max(roundedGrandTotal, 0) : 0;
  const amountInWords =
    numberToWords.toWords(safeGrandTotal).replace(/\b\w/g, (c) => c.toUpperCase()) + " Rupees Only";

  const hasVendorDetails =
    formValues.contactNumber ||
    formValues.vendorNumber ||
    formValues.customerName ||
    formValues.partyName ||
    formValues.vendorName ||
    formValues.customerAddress ||
    formValues.address ||
    formValues.customerGstNumber ||
    formValues.gstNumber;

  const nonZeroTransactions = (invoiceData?.transactions || [])
    .filter((t) => Number(t.amount || 0) > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const MAX_PAY_SUMMARY_ROWS = 4;
  const visibleTransactions = nonZeroTransactions.slice(0, MAX_PAY_SUMMARY_ROWS);
  const hiddenTransactionCount = nonZeroTransactions.length - visibleTransactions.length;

  const isCancelled = invoiceData?.status?.toLowerCase() === "cancelled";

  const willShowRemarks = Boolean(invoiceData?.remarks);
  const willShowPaymentNote = Boolean(invoiceData?.paymentMethod || invoiceData?.paymentNote);
  const lastPageCapacity = getA5LastPageCapacity({
    hasRemarks: willShowRemarks,
    hasPaymentNote: willShowPaymentNote,
  });
  const pages = paginateA5Items(cartItems, lastPageCapacity);
  const totalPages = pages.length;

  const brandStrip = isFreePlan
    ? `<div class="brand-strip">
        ${
          appBrand?.logoUrl
            ? `<img src="${appBrand.logoUrl}" alt="${appBrand?.name || ""}" onerror="this.style.display='none'">`
            : ""
        }
        <span>Powered by ${appBrand?.name || "AMDAANI"}</span>
      </div>`
    : "";

  // ✅ No logo/company header — title + payment status only (matches A4)
  const titleRow = `<div class="hdr-title-row">
    <div class="hdr-title-center">
      <div class="main-title">${isGstInvoice ? "Purchase Tax Invoice" : "Purchase Invoice"}</div>
      <div class="invoice-rule"></div>
    </div>
    <div class="hdr-status-block">
      <span class="ps-inline ${payment.status?.toLowerCase()}">
        ${payment.status === "paid" ? "Paid" : payment.status === "partial" ? "Partial" : "Unpaid"}
      </span>
    </div>
  </div>`;

  // ✅ Only Vendor ("From") shown — no Store party column (matches A4)
  const partiesRow = `<div class="hdr-parties-row">
    <div class="hdr-party">
      <div class="ttl">From, ${
        hasVendorDetails
          ? formValues.customerName || formValues.partyName || formValues.vendorName || "Vendor"
          : "Walk-in Vendor"
      }</div>
      ${
        formValues.customerAddress || formValues.address
          ? `<div class="p-row"><span class="p-lbl">Address:</span> ${
              formValues.customerAddress || formValues.address
            }${formValues.customerState || formValues.state ? `, ${formValues.customerState || formValues.state}` : ""}</div>`
          : ""
      }
      ${
        formValues.contactNumber || formValues.vendorNumber
          ? `<div class="p-row"><span class="p-lbl">Mobile:</span> ${formValues.contactNumber || formValues.vendorNumber}</div>`
          : ""
      }
      <div class="p-row"><span class="p-lbl">GSTIN No:</span> ${formValues.customerGstNumber || formValues.gstNumber || "NA"}</div>
    </div>
  </div>`;

  const metaRow = (pageNum, pageTotal) => `<div class="hdr-meta-row">
    <span>PUR_NO : ${invoiceNumber}</span>
    <span>Purchase Date : ${format(safeDate, "dd/MM/yyyy")} &nbsp;|&nbsp; ${format(safeDate, "hh:mm a")}</span>
    <span>Page ${pageNum} of ${pageTotal}</span>
  </div>`;

  const headerBlock = (pageNum, pageTotal) => (preview ? "" : `${titleRow}${partiesRow}${metaRow(pageNum, pageTotal)}`);

  const paymentSummaryHTML =
    !preview && visibleTransactions.length > 0
      ? `<div class="pay-summary">
          <div class="ps-ttl">Payment Summary</div>
          <table>
            <thead><tr><th class="l">Date</th><th class="r">Amount</th><th class="c">Method</th></tr></thead>
            <tbody>
              ${visibleTransactions
                .map(
                  (t) => `
                <tr>
                  <td>${format(parseSafeDate(t.createdAt), "dd-MMM-yy hh:mm a")}</td>
                  <td class="r">₹${Number(t.amount || 0).toFixed(2)}</td>
                  <td class="c">${(t.paymentMethod || "").toUpperCase()}</td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          ${
            hiddenTransactionCount > 0
              ? `<div class="ps-more">+${hiddenTransactionCount} more payment${hiddenTransactionCount !== 1 ? "s" : ""}</div>`
              : ""
          }
        </div>`
      : "";

  // ✅ No bank-col / QR — just amount in words (+ payment summary)
  const totalsBlock = `<div class="totals-wrap">
    <div class="words-col">
      <div class="words-lbl">Amount in Words:</div>
      <div class="words-val">${amountInWords}</div>
      ${paymentSummaryHTML}
    </div>
    <div class="amt-col">
      <table class="amt-tbl">
        <tr>
          <td class="lbl">Subtotal</td>
          <td class="val">₹${Number(
            createdInvoice ? (invoiceData?.subTotal ?? invoiceCalculations.subtotal) : invoiceCalculations.subtotal,
          ).toFixed(2)}</td>
        </tr>
        <tr><td class="lbl">Total Tax</td><td class="val">₹${Number(totalGST).toFixed(2)}</td></tr>
        ${
          effectiveDiscountTotal > 0
            ? `<tr>
                <td class="lbl">Extra Disc.</td>
                <td class="val pay-red">−₹${
                  createdInvoice
                    ? Number(invoiceData?.discountTotal).toFixed(2)
                    : Number(invoiceCalculations.discountTotal).toFixed(2)
                }</td>
              </tr>`
            : ""
        }
        ${
          roundOffValue != 0
            ? `<tr>
                <td class="lbl">Round Off</td>
                <td class="val ${Number(roundOffValue) < 0 ? "pay-red" : "pay-grn"}">${
                  createdInvoice
                    ? `${Number(invoiceData?.roundOff) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff).toFixed(2)}`
                    : `${Number(roundOffValue) < 0 ? "−" : "+"}₹${Math.abs(Number(roundOffValue)).toFixed(2)}`
                }</td>
              </tr>`
            : ""
        }
        <tr class="grand">
          <td class="lbl">Net Total</td>
          <td class="val">₹${
            createdInvoice ? Math.round(invoiceData?.grandTotal).toFixed(2) : roundedGrandTotal.toFixed(2)
          }</td>
        </tr>
        ${
          payment.status !== "paid" || payment.due > 0
            ? `<tr><td class="lbl">Paid</td><td class="val">₹${Number(payment.paid || 0).toFixed(2)}</td></tr>
               <tr><td class="lbl">Due</td><td class="val ${payment.due > 0 ? "pay-red" : ""}">₹${Number(payment.due || 0).toFixed(2)}</td></tr>`
            : ""
        }
      </table>
    </div>
  </div>`;

  const paymentMethodRow =
    invoiceData?.paymentMethod || invoiceData?.paymentNote
      ? `<div style="text-align:right; font-size:7.5px; padding: 2px 10px 4px; color:#444;">
          ${invoiceData.paymentMethod ? `<span style="color:#666;">Method:</span> <strong>${invoiceData.paymentMethod.toUpperCase()}</strong>` : ""}
          ${invoiceData.paymentNote ? ` &nbsp;|&nbsp; <span style="color:#666;">Note:</span> ${invoiceData.paymentNote}` : ""}
        </div>`
      : "";

  const remarksRow = invoiceData?.remarks ? `<div class="remarks">Remarks: ${invoiceData.remarks}</div>` : "";

  // ── Build all page HTML blocks ───────────────────────────────────────────
  let itemOffset = 0;
  const pageBlocks = pages.map((pageItems, pageIndex) => {
    const isLastPage = pageIndex === totalPages - 1;
    const pageNum = pageIndex + 1;

    const itemsHTML = buildA5ItemsHTML(pageItems, itemOffset, isGstInvoice, isMrpEnabled, isIgst);
    itemOffset += pageItems.length;

    const pageQty = pageItems.reduce((s, i) => s + Number(i.qty ?? i.quantity ?? 0), 0);
    const pageDiscount = pageItems.reduce(
      (s, i) => s + getPerUnitDiscountAmount(i) * Number(i.qty ?? i.quantity ?? 0),
      0,
    );
    const pageTaxable = pageItems.reduce((s, i) => s + Number(i.taxableValue || 0), 0);
    const pageGST = pageItems.reduce((s, i) => s + Number(i.gstAmount || 0), 0);
    const pageAmount = pageItems.reduce((s, i) => s + Number(i.total || 0), 0);

    const sumGST = isLastPage ? totalGST : pageGST;
    const sumCGST = isIgst ? 0 : sumGST / 2;
    const sumSGST = isIgst ? 0 : sumGST / 2;
    const sumIGST = isIgst ? sumGST : 0;

    const sumRow = `<tr class="sum-row">
      <td></td>
      <td class="l bold">${isLastPage ? "Total" : `Page ${pageNum} Total`}</td>
      <td></td>
      <td class="c bold">${isLastPage ? totalQty : pageQty}</td>
      <td></td>
      ${isMrpEnabled ? "<td></td>" : ""}
      <td></td>
      <td class="r bold">₹${(isLastPage ? totalDiscount : pageDiscount).toFixed(2)}</td>
      ${
        isGstInvoice
          ? `<td class="r bold">₹${(isLastPage ? totalTaxable : pageTaxable).toFixed(2)}</td>
             <td></td>
             ${
               isIgst
                 ? `<td class="r bold">₹${sumIGST.toFixed(2)}</td>`
                 : `<td class="r bold">₹${sumCGST.toFixed(2)}</td><td class="r bold">₹${sumSGST.toFixed(2)}</td>`
             }`
          : ""
      }
      <td class="r bold">₹${(isLastPage ? totalAmount : pageAmount).toFixed(2)}</td>
    </tr>`;

    return `
<div class="page">
<div class="wrap">

  ${brandStrip}

  ${headerBlock(pageNum, totalPages)}

  <div class="tbl-wrap ${isCancelled ? "cancelled" : ""}">
    <table class="tbl">
      ${a5TableHeader(isGstInvoice, isMrpEnabled, isIgst)}
      <tbody>
        ${itemsHTML}
        ${sumRow}
      </tbody>
    </table>
  </div>

  ${
    isLastPage
      ? `<div class="footer-block">
          ${totalsBlock}
          ${paymentMethodRow}
          ${remarksRow}
        </div>`
      : `<div class="continued-note">Continued on next page… (${
          cartItems.length - itemOffset
        } more item${cartItems.length - itemOffset !== 1 ? "s" : ""})</div>`
  }
   <div class="page-footer-text">Purchase invoice generated using AMDAANI billing app</div>
</div>
</div>`;
  });

  return /*html*/ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Purchase Invoice #${invoiceNumber}</title>
  <style>${a5SharedCSS()}</style>
</head>
<body>

${pageBlocks.join("\n")}

<script>
  (function () {
    function scalePages() {
      var screenW = window.innerWidth;
      document.querySelectorAll('.page').forEach(function (page) {
        page.style.transform = 'none';
        var contentW = page.scrollWidth;
        if (contentW > screenW) {
          var scale = screenW / contentW;
          page.style.transformOrigin = '0 0';
          page.style.transform = 'scale(' + scale + ')';
          page.style.marginBottom =
            ((${A5_CONTENT_H_MM * 3.7795275591} * scale) - ${A5_CONTENT_H_MM * 3.7795275591} + 8) + 'px';
        }
      });
    }

    var hasRun = false;
    function runOnce() {
      if (hasRun) return;
      hasRun = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(scalePages);
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      runOnce();
    } else {
      document.addEventListener('DOMContentLoaded', runOnce);
    }

    setTimeout(runOnce, 600);
  })();
</script>

</body>
</html>`;
}

/* ============================================================
   A4 — desktop-style single continuous page.
   Already matches the "no Store details / no Terms / no Bank
   details" rule — unchanged from before.
   ============================================================ */

function generateA4PurchaseHTML({
  preview,
  createdInvoice,
  invoiceData,
  formValues,
  cartItems,
  invoiceCalculations,
  invoiceNumber,
  invoiceDate,
  isGstInvoice,
  isMrpEnabled = true,
  isFreePlan = true,
  appBrand = { name: "AMDAANI", logoUrl: "" },
  payment = { paid: 0, due: 0, status: "unpaid" },
}) {
  const parsedInvoiceDate = invoiceDate ? new Date(invoiceDate) : new Date();
  const safeInvoiceDate = Number.isNaN(parsedInvoiceDate.getTime()) ? new Date() : parsedInvoiceDate;

  const invoiceContainerWidth = "800px";

  let totalQty = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalGST = 0;
  let totalAmount = 0;

  cartItems.forEach((item) => {
    const qty = item.qty || item.quantity || 0;
    const gstAmount = item.gstAmount || 0;
    const total = item.total || 0;
    const perUnitDiscount = getPerUnitDiscountAmount(item);
    const discount = perUnitDiscount * qty;
    const taxableValue = Number(item.taxableValue || 0);

    totalQty += qty;
    totalDiscount += discount;
    totalTaxable += taxableValue;
    totalGST += gstAmount ? gstAmount : 0;
    totalAmount += total;
  });

  const itemsHTML = cartItems
    .map((item, index) => {
      const qty = item.qty || item.quantity || 0;
      const costPrice = Number(item.costPrice ?? item.rate ?? item.price ?? 0);
      const discountType = item.purchaseDiscountType || "amount";
      const rawDiscountInput = Number(item.purchaseDiscount ?? item.discount ?? 0);
      const perUnitDiscountAmount = getPerUnitDiscountAmount(item);
      const gstRate = item.gstRate || 0;
      const gstAmount = item.gstAmount || 0;
      const totalAmt = item.total || 0;
      const taxableValue = Number(item.taxableValue || 0);
      const isTaxInclusive = item.isPurchaseTaxInclusive || false;
      const mrp = item.mrp;
      const totalDiscountAmt = perUnitDiscountAmount * qty;

      const discountPercent =
        discountType === "percentage"
          ? rawDiscountInput > 0
            ? rawDiscountInput.toFixed(2)
            : null
          : costPrice > 0 && perUnitDiscountAmount > 0
            ? ((perUnitDiscountAmount / costPrice) * 100).toFixed(2)
            : null;

      return `
    <tr class="item-row">
      <td class="sr-no">${index + 1}</td>
      <td class="description">
        <div class="item-name">${item.name}</div>
        ${item.hsn ? `<div class="item-code">HSN: ${item.hsn}</div>` : ""}
      </td>
      <td class="qty">${qty}</td>
      <td class="unit">${item.unit || "PCS"}</td>
      ${isMrpEnabled ? `<td class="mrp">&#8377;${mrp ? mrp.toFixed(2) : "&#8212;"}</td>` : ""}
      <td class="rate">&#8377;${costPrice.toFixed(2)}</td>
      <td class="discount">
        ${
          totalDiscountAmt > 0
            ? `&#8377;${totalDiscountAmt.toFixed(2)}${discountPercent ? ` (${discountPercent}%)` : ""}`
            : "&#8377;0.00 (0.00%)"
        }
      </td>
      <td style="text-align:right;">&#8377;${taxableValue.toFixed(2)}</td>
      <td class="gst-amount" style="text-align:right;">
        ${
          gstRate > 0
            ? isTaxInclusive
              ? `<span style="color:#888;">&#8377;${gstAmount.toFixed(2)} (${gstRate}%)</span>`
              : `&#8377;${gstAmount.toFixed(2)} (${gstRate}%)`
            : `&#8212;`
        }
      </td>
      <td class="total-amount">&#8377;${totalAmt.toFixed(2)}</td>
    </tr>
  `;
    })
    .join("");

  let gstTotals = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
  let gstBreakdownHTML = "";
  const isIgst = invoiceData?.isIgst === true;

  const passedGstBreakdown = invoiceCalculations.gstBreakdown || {};
  const hasUsableBreakdown =
    Object.keys(passedGstBreakdown).length > 0 &&
    Object.values(passedGstBreakdown).some((b) => Number(b?.taxableAmount || 0) > 0 || Number(b?.totalGst || 0) > 0);

  let effectiveGstBreakdown = passedGstBreakdown;
  if (!hasUsableBreakdown) {
    const computedGstBreakdown = {};
    cartItems.forEach((item) => {
      const rate = item.gstRate || 0;
      if (rate <= 0) return;
      const itemTaxable = Number(item.taxableValue || 0);
      const itemGstAmount = Number(item.gstAmount || 0);

      if (!computedGstBreakdown[rate]) {
        computedGstBreakdown[rate] = { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalGst: 0 };
      }
      computedGstBreakdown[rate].taxableAmount += itemTaxable;
      computedGstBreakdown[rate].cgstAmount += isIgst ? 0 : itemGstAmount / 2;
      computedGstBreakdown[rate].sgstAmount += isIgst ? 0 : itemGstAmount / 2;
      computedGstBreakdown[rate].igstAmount += isIgst ? itemGstAmount : 0;
      computedGstBreakdown[rate].totalGst += itemGstAmount;
    });
    effectiveGstBreakdown = computedGstBreakdown;
  }

  for (const [rate, breakdown] of Object.entries(effectiveGstBreakdown)) {
    if (parseFloat(rate) === 0) continue;
    const taxable = breakdown.taxableAmount || 0;
    const cgst = isIgst ? 0 : breakdown.cgstAmount || 0;
    const sgst = isIgst ? 0 : breakdown.sgstAmount || 0;
    const igst = isIgst ? breakdown.igstAmount || (breakdown.cgstAmount || 0) + (breakdown.sgstAmount || 0) : 0;

    gstBreakdownHTML += `
      <tr>
        <td>${rate}%</td>
        <td>&#8377;${taxable.toFixed(2)}</td>
        <td>&#8377;${cgst.toFixed(2)}</td>
        <td>&#8377;${sgst.toFixed(2)}</td>
        <td>&#8377;${igst.toFixed(2)}</td>
      </tr>
    `;

    gstTotals.taxableValue += taxable;
    gstTotals.cgst += cgst;
    gstTotals.sgst += sgst;
    gstTotals.igst += igst;
  }

  gstBreakdownHTML += `
    <tr style="font-weight:bold; background:#f8f8f8;">
      <td>Total</td>
      <td>&#8377;${gstTotals.taxableValue.toFixed(2)}</td>
      <td>&#8377;${gstTotals.cgst.toFixed(2)}</td>
      <td>&#8377;${gstTotals.sgst.toFixed(2)}</td>
      <td>&#8377;${gstTotals.igst.toFixed(2)}</td>
    </tr>
  `;

  const effectiveDiscountTotal = createdInvoice
    ? Number(invoiceData?.discountTotal || 0)
    : Number(invoiceCalculations?.discountTotal || 0);

  const effectiveNetTotal = createdInvoice
    ? Number(invoiceData?.grandTotal || 0)
    : invoiceCalculations.grandTotal - effectiveDiscountTotal;

  const effectiveRoundOff = createdInvoice
    ? Number(invoiceData?.roundOff || 0)
    : Number((Math.round(effectiveNetTotal) - effectiveNetTotal).toFixed(2));

  const amountInWords =
    numberToWords.toWords(Math.round(effectiveNetTotal).toFixed(2)).replace(/\b\w/g, (c) => c.toUpperCase()) +
    " Rupees Only";

  const hasVendorDetails =
    formValues.contactNumber ||
    formValues.vendorNumber ||
    formValues.customerName ||
    formValues.partyName ||
    formValues.vendorName ||
    formValues.customerAddress ||
    formValues.address ||
    formValues.customerGstNumber ||
    formValues.gstNumber;

  const rawGrandTotal = createdInvoice ? effectiveNetTotal : invoiceCalculations.netTotal;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOffValue = Number.isFinite(effectiveRoundOff) ? effectiveRoundOff : 0;

  const colspanCount = isMrpEnabled ? 8 : 7;

  const totalsRowCount =
    2 +
    1 +
    (effectiveDiscountTotal > 0 ? 1 : 0) +
    (Number(roundOffValue) !== 0 ? 1 : 0) +
    (payment.status !== "paid" || payment.due > 0 ? 2 : 0);

  return /*html*/ `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.8, user-scalable=yes">
    <title>Purchase Invoice</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.3; color: #000; background: #fff; padding: 8px; }
      .invoice-container { max-width: ${invoiceContainerWidth}; margin: 0 auto; border: 1px solid #000; background: #fff; }
      :root { --brand: #2c5aa0; }

      .brand-strip { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #000; background: #f9fafc; }
      .brand-left { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #555; }
      .brand-app-logo { height: 14px; width: auto; }

      .invoice-info { display: flex; border-bottom: 1px solid #000; }
      .invoice-info-left, .invoice-info-right { flex: 1; padding: 10px; }
      .invoice-info-left { border-right: 1px solid #000; }
      .info-row { display: flex; margin-bottom: 4px; }
      .info-label { min-width: 90px; font-weight: bold; }
      .customer-title { font-weight: bold; font-size: 12px; margin-bottom: 2px; color: #2c5aa0; }

      .items-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .items-table th { background: #2c5aa0; color: white; padding: 8px 4px; border: 1px solid #000; font-size: 9px; }
      .items-table td { padding: 6px 4px; border: 1px solid #000; text-align: center; }
      .description { text-align: left !important; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
      .description .item-name, .description .item-code { text-align: left; display: block; white-space: normal; word-break: break-word; }
      .items-table td.rate, .items-table td.mrp, .items-table td.discount,
      .items-table td.gst-amount, .items-table td.total-amount { text-align: right !important; }

      .gst-breakdown { margin-top: 10px; border-top: 1px solid #000; }
      .gst-breakdown-title { padding: 4px 0; font-size: 12px; text-align: center; color: #2c5aa0; background: #f0f4ff; border: 1px solid #000; border-bottom: none; }
      .gst-table { width: 100%; border-collapse: collapse; font-size: 9px; }
      .gst-table th, .gst-table td { padding: 6px 8px; border: 1px solid #000; text-align: center; }
      .gst-table th { background: #2c5aa0; color: white; }

      .items-table .totals-row td, .items-table .grand-total-row td { border: 1px solid #000; font-size: 10px; padding: 6px 8px; }
      .amount-words-cell { font-size: 10px; background: #fafafa; color: #000; padding: 0 !important; }
      .amount-words-inner { height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 10px; }
      .items-table .label { text-align: left; font-weight: 600; background: #f8f8f8; }
      .items-table .amount { text-align: right; font-weight: 600; }
      .grand-total-row .label, .grand-total-row .amount { background: #2c5aa0; color: #fff; font-weight: bold; }
      .payment-row .label { font-weight: 600; background: #f8f8f8; text-align: left; }
      .payment-row .amount { text-align: right !important; font-weight: 600; }
      .no-break { page-break-inside: avoid; }

      .payment-status-container { text-align: right; margin-top: 4px; margin-right: 8px; }
      .payment-status { display: inline-block; padding: 2px 14px; border-radius: 20px; font-weight: 600; font-size: 8px; text-transform: capitalize; font-style: italic; letter-spacing: 0.5px; color: #fff; }
      .payment-status.paid { background-color: #43a047; }
      .payment-status.partial { background-color: #fb8c00; }
      .payment-status.unpaid { background-color: #e53935; }

      .items-table-wrap { position: relative; }
      .items-table-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2; }
      .items-table-watermark .text { font-family: Arial, sans-serif; font-weight: 800; font-size: clamp(36px, 10vw, 96px); letter-spacing: 0.5em; text-transform: uppercase; color: rgba(0,0,0,0.08); transform: rotate(-28deg); user-select: none; white-space: nowrap; }
      @media (max-width: 380px) { .items-table-watermark .text { font-size: clamp(28px, 12vw, 72px); letter-spacing: 0.35em; } }

      @media print {
        body { margin: 0; padding: 0; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        .brand-strip { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A4; margin: 6mm; }
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <td>
              ${
                isFreePlan
                  ? `
              <div class="brand-strip">
                <div class="brand-left">
                  ${
                    appBrand?.logoUrl
                      ? `<img class="brand-app-logo" src="${appBrand.logoUrl}" alt="${appBrand?.name || "Brand"}" onerror="this.style.display='none'">`
                      : ""
                  }
                  <span>Powered by ${appBrand?.name || "AMDAANI"}</span>
                </div>
                <div></div>
              </div>`
                  : ""
              }

              <div class="invoice-info">
                ${
                  hasVendorDetails
                    ? `
                <div class="invoice-info-right">
                  <div class="customer-title">Vendor Details:</div>
                  ${
                    formValues.contactNumber || formValues.vendorNumber
                      ? `<div>Mobile: ${formValues.contactNumber || formValues.vendorNumber}</div>`
                      : ""
                  }
                  ${
                    formValues.customerName || formValues.partyName || formValues.vendorName
                      ? `<div>Name: ${formValues.customerName || formValues.partyName || formValues.vendorName}</div>`
                      : ""
                  }
                  ${
                    formValues.customerAddress || formValues.address
                      ? `<div>Address: ${formValues.customerAddress || formValues.address}</div>`
                      : ""
                  }
                  ${
                    formValues.customerState || formValues.state
                      ? `<div>State: ${formValues.customerState || formValues.state}${
                          formValues.customerPostalCode ? `, Pin: ${formValues.customerPostalCode}` : ""
                        }</div>`
                      : ""
                  }
                  ${
                    formValues.customerGstNumber || formValues.gstNumber
                      ? `<div>GSTIN: ${formValues.customerGstNumber || formValues.gstNumber}</div>`
                      : ""
                  }
                </div>`
                    : ""
                }
                <div class="invoice-info-left">
                  <div class="info-row"><span class="info-label">Purchase No:</span><span>${invoiceNumber}</span></div>
                  <div class="info-row"><span class="info-label">Purchase Date:</span><span>${format(safeInvoiceDate, "dd-MMM-yyyy")}</span></div>
                </div>
              </div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <div class="items-table-wrap">
                ${
                  invoiceData?.status?.toLowerCase() === "cancelled"
                    ? `<div class="items-table-watermark"><div class="text">CANCELLED</div></div>`
                    : ""
                }

                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Sl. No.</th>
                      <th>Item Description</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      ${isMrpEnabled ? `<th>MRP(&#8377;)</th>` : ""}
                      <th>Rate(&#8377;)</th>
                      <th>Discount(&#8377;)</th>
                      <th>Taxable Value(&#8377;)</th>
                      <th>GST Amt.(%)</th>
                      <th>Amount(&#8377;)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}

                    <tr class="summary-total-row" style="font-weight:bold; background:#f8f8f8;">
                      <td></td>
                      <td style="text-align:left;">Total</td>
                      <td>${totalQty}</td>
                      <td></td>
                      ${isMrpEnabled ? `<td></td>` : ""}
                      <td></td>
                      <td class="discount">&#8377;${totalDiscount.toFixed(2)}</td>
                      <td>&#8377;${totalTaxable.toFixed(2)}</td>
                      <td class="gst-amount">&#8377;${totalGST.toFixed(2)}</td>
                      <td class="total-amount">&#8377;${totalAmount.toFixed(2)}</td>
                    </tr>

                    <tr class="totals-row no-break">
                      <td colspan="${colspanCount}" rowspan="${totalsRowCount}"
                        class="amount-words-cell"
                        style="text-align:left; vertical-align:top; border-right:1px solid #000;">
                        <div class="amount-words-inner">
                        <div style="font-weight:bold; color:#2c5aa0;">Amount in Words:</div>
                        <div style="font-size:11px; font-weight:bold; color:#2c5aa0; margin-top:2px;">${amountInWords}</div>

                        ${
                          invoiceData?.transactions && invoiceData.transactions.length > 0
                            ? `
                        <div style="margin-top:15px;">
                          <div style="font-weight:bold; color:#2c5aa0; padding:4px 0; font-size:12px; text-align:center; background:#f0f4ff;">Payment Summary</div>
                          <table style="width:100%; border-collapse:collapse; font-size:10px;">
                            <thead>
                              <tr style="background-color:#f5f5f5;">
                                <th style="border:1px solid #ddd; padding:6px; text-align:left;">Date</th>
                                <th style="border:1px solid #ddd; padding:6px; text-align:right;">Amount</th>
                                <th style="border:1px solid #ddd; padding:6px; text-align:center;">Payment Method</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${invoiceData.transactions
                                .map(
                                  (transaction) => `
                              <tr>
                                <td style="border:1px solid #ddd; padding:6px; text-align:left;">${format(
                                  new Date(transaction.createdAt),
                                  "dd-MMM-yyyy hh:mm a",
                                )}</td>
                                <td style="border:1px solid #ddd; padding:6px; text-align:right;">&#8377;${transaction.amount.toFixed(2)}</td>
                                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${transaction.paymentMethod.toUpperCase()}</td>
                              </tr>`,
                                )
                                .join("")}
                            </tbody>
                          </table>
                        </div>`
                            : ""
                        }
                        </div>
                      </td>
                      <td class="label">Subtotal</td>
                      <td class="amount">&#8377;${
                        createdInvoice ? Number(invoiceData?.subTotal).toFixed(2) : invoiceCalculations.subtotal.toFixed(2)
                      }</td>
                    </tr>

                    <tr class="totals-row no-break">
                      <td class="label">Total Tax</td>
                      <td class="amount">&#8377;${Number(totalGST).toFixed(2)}</td>
                    </tr>

                    ${
                      effectiveDiscountTotal > 0
                        ? `
                    <tr class="totals-row no-break">
                      <td class="label">Extra Discount</td>
                      <td class="amount" style="color:#e53935;">&minus;&#8377;${
                        createdInvoice
                          ? Number(invoiceData?.discountTotal).toFixed(2)
                          : Number(invoiceCalculations.discountTotal).toFixed(2)
                      }</td>
                    </tr>`
                        : ""
                    }

                    ${
                      roundOffValue != 0
                        ? `
                    <tr class="totals-row no-break">
                      <td class="label">Round Off</td>
                      <td class="amount" style="color:${roundOffValue < 0 ? "#e53935" : "#43a047"};">
                        ${
                          createdInvoice
                            ? `${Number(invoiceData?.roundOff || 0) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff || 0).toFixed(2)}`
                            : `${roundOffValue < 0 ? "&minus;" : "+"}&#8377;${Math.abs(roundOffValue).toFixed(2)}`
                        }
                      </td>
                    </tr>`
                        : ""
                    }

                    <tr class="grand-total-row no-break">
                      <td class="label">Net Total</td>
                      <td class="amount">&#8377;${
                        createdInvoice
                          ? Number(invoiceData?.grandTotal).toFixed(2)
                          : (Number(rawGrandTotal) + Number(invoiceCalculations?.roundOff ?? 0)).toFixed(2)
                      }</td>
                    </tr>

                    ${
                      payment.status !== "paid" || Math.round(payment.due * 100) / 100 > 0.01
                        ? `
                    <tr class="payment-row no-break">
                      <td class="label">Paid Amount</td>
                      <td class="amount">&#8377;${payment.paid.toFixed(2)}</td>
                    </tr>
                    <tr class="payment-row no-break">
                      <td class="label">Due Amount</td>
                      <td class="amount" style="color:${
                        Math.round(payment.due * 100) / 100 > 0.01 ? "#e53935" : "#000"
                      };">&#8377;${payment.due.toFixed(2)}</td>
                    </tr>`
                        : ""
                    }
                  </tbody>
                </table>

                <div class="payment-status-container">
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
                  invoiceData?.paymentMethod || invoiceData?.paymentNote
                    ? `
                <div style="text-align:right; margin-top:4px; margin-right:8px; font-size:9px; line-height:1.6;">
                  ${
                    invoiceData.paymentMethod
                      ? `
                  <div style="margin-bottom:4px;">
                    <span style="color:#666;">Payment Method:</span>
                    <span style="color:#000; font-weight:600; margin-left:6px;">${invoiceData.paymentMethod.toUpperCase()}</span>
                  </div>`
                      : ""
                  }
                  ${
                    invoiceData.paymentNote
                      ? `
                  <div>
                    <span style="color:#666;">Note:</span>
                    <span style="color:#000; margin-left:6px;">${invoiceData.paymentNote}</span>
                  </div>`
                      : ""
                  }
                </div>`
                    : ""
                }
              </div>

              ${
                !preview && Object.keys(effectiveGstBreakdown || {}).some((r) => parseFloat(r) > 0)
                  ? `
              <div class="gst-breakdown">
                <div class="gst-breakdown-title">Tax Summary</div>
                <table class="gst-table">
                  <thead>
                    <tr>
                      <th>GST Rate</th>
                      <th>Taxable Value</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>IGST</th>
                    </tr>
                  </thead>
                  <tbody>${gstBreakdownHTML}</tbody>
                </table>
              </div>`
                  : ""
              }
            </td>
          </tr>
        </tbody>

      </table>
    </div>

    ${
      invoiceData?.paymentNote2 || invoiceData?.remarks
        ? `<pre style="font-size: 8px; color: #666; margin-top: 8px;">Remarks : ${invoiceData.remarks || ""}</pre>`
        : ""
    }

  </body>
  </html>`;
}

/* ============================================================
   Public entry point — unchanged signature.
   ============================================================ */

export const generatePurchaseHTML = (params) => {
  const pageFormat = params?.pageFormat === "a5" ? "a5" : "a4";
  return pageFormat === "a5" ? generateA5PurchaseHTML(params) : generateA4PurchaseHTML(params);
};
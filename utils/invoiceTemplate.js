import { format } from "date-fns";
import numberToWords from "number-to-words";

// ── Per-item discount resolver (amount vs percent) ─────────────────────────
function resolveItemDiscountInRupees(item) {
  const discountType = item.discountType || "amount";
  const rawDiscountInput = Number(item.discount || 0);
  const sellingPriceRaw = Number(
    item.price ?? item.sellingPrice ?? item.baseRate ?? 0,
  );

  return discountType === "percent"
    ? (sellingPriceRaw * rawDiscountInput) / 100
    : rawDiscountInput;
}

function buildItemsHTML(cartItems, isGstInvoice, isMrpEnabled) {
  return cartItems
    .map((item, index) => {
      const qty = item.qty || item.quantity || 0;
      const baseRate = item.baseRate || 0;
      const gstRate = item.gstRate || 0;
      const gstAmount = item.gstAmount || 0;
      const totalAmount = item.total || 0;
      const isTaxInclusive = item.isTaxInclusive || false;
      const taxableValue = gstRate > 0 ? item.taxableValue || 0 : 0;

      let perItemDiscount = resolveItemDiscountInRupees(item);
      if (isTaxInclusive && gstRate > 0) {
        perItemDiscount = perItemDiscount / (1 + gstRate / 100);
      }
      const totalDiscount = perItemDiscount * qty;
      const discountPercent =
        baseRate > 0 && perItemDiscount > 0
          ? ((perItemDiscount / baseRate) * 100).toFixed(1)
          : null;

      return `
        <tr>
          <td class="c">${index + 1}</td>
          <td class="l">
            <div class="iname">${item.name}</div>
            ${item.hsn ? `<div class="isub">HSN: ${item.hsn}</div>` : ""}
          </td>
          <td class="c">${qty}</td>
          <td class="c">${item.unit || "PCS"}</td>
          ${
            isMrpEnabled
              ? `<td class="r">₹${Number(item.mrp || 0).toFixed(2)}</td>`
              : ""
          }
          <td class="r">₹${baseRate.toFixed(2)}</td>
          <td class="r">${
            totalDiscount > 0
              ? `₹${totalDiscount.toFixed(2)}${
                  discountPercent ? ` (${discountPercent}%)` : ""
                }`
              : "—"
          }</td>
          ${
            isGstInvoice
              ? `<td class="r">₹${taxableValue.toFixed(2)}</td>
                 <td class="c">${gstRate > 0 ? `${gstRate}%` : "—"}</td>
                 <td class="r">₹${(gstAmount / 2).toFixed(2)}</td>
                 <td class="r">₹${(gstAmount / 2).toFixed(2)}</td>`
              : ""
          }
          <td class="r bold">₹${totalAmount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

function tableHeader(isGstInvoice, isMrpEnabled) {
  return `<thead>
    <tr>
      <th style="width:24px">#</th>
      <th style="text-align:left">Item</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Rate(₹)</th>
      <th>Discount</th>
      ${
        isGstInvoice
          ? "<th>Taxable(₹)</th><th>GST%</th><th>CGST(₹)</th><th>SGST(₹)</th>"
          : ""
      }
      <th>Amt(₹)</th>
    </tr>
  </thead>`;
}

const sharedCSS = (containerWidth) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eee; font-family: 'Arial', sans-serif; }

  @media screen {
    body { padding: 12px; }
  }

  .page {
    max-width: ${containerWidth};
    margin: 0 auto;
    background: #fff;
  }
  .wrap {
    background: #fff;
    display: flex;
    flex-direction: column;
    font-size: 10px;
    line-height: 1.35;
    color: #1a1a1a;
    border: 1px solid #2c5aa0;
    overflow: hidden;
  }

  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    @page { size: A4; margin: 6mm; }
    .page { max-width: 100% !important; }
    .wrap { border: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }

  .brand-strip {
    display: flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-bottom: 1px solid #ccc;
    background: #f9fafc; font-size: 8.5px; color: #666;
  }
  .brand-strip img { height: 11px; width: auto; }

  /* ── Header ── */
  .hdr-title-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 2px solid #2c5aa0; gap: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
    flex-wrap: wrap;
  }
  .hdr-logo-block { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; }
  .hdr-logo-block .logo { height: 52px; width: auto; max-width: 140px; object-fit: contain; }
  .hdr-company-name { font-size: 17px; font-weight: 800; color: #2c5aa0; text-transform: uppercase; }
  .hdr-company-details { font-size: 9.5px; color: #444; line-height: 1.5; margin-top: 2px; }

  .hdr-title-center { text-align: center; flex-shrink: 0; }
  .hdr-title-center .main-title {
    font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #2c5aa0;
  }
  .hdr-title-center .invoice-rule { width: 90px; height: 2px; background: #2c5aa0; margin: 3px auto 0; }
  .hdr-title-center .ps-inline {
    display: inline-block; margin-top: 6px; padding: 3px 14px; border-radius: 12px;
    font-size: 9px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.4px;
  }
  .ps-inline.paid    { background: #43a047; }
  .ps-inline.partial { background: #fb8c00; }
  .ps-inline.unpaid  { background: #e53935; }

  .hdr-parties-row { display: flex; border-bottom: 1px solid #2c5aa0; font-size: 9.5px; }
  .hdr-party { flex: 1; padding: 8px 16px; min-width: 0; }
  .hdr-party + .hdr-party { border-left: 1px solid #d8dee6; }
  .hdr-party .ttl { font-weight: 700; margin-bottom: 3px; color: #2c5aa0; text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px; }
  .hdr-party .p-row { line-height: 1.5; }
  .hdr-party .p-lbl { font-weight: 600; }

  .hdr-meta-row {
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
    padding: 6px 16px; border-bottom: 1.5px solid #2c5aa0; font-size: 9.5px;
    font-weight: 700; background: #f0f4ff; color: #2c5aa0;
  }

  /* ── Items table ── */
  .tbl-wrap { position: relative; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .tbl th {
    background: #2c5aa0; color: #fff; padding: 6px 5px;
    border: 1px solid #2c5aa0; font-size: 8.5px; text-align: center;
    text-transform: uppercase; letter-spacing: 0.2px; font-weight: 700;
  }
  .tbl td { padding: 5px; border: 1px solid #c9d2dc; vertical-align: middle; }
  .tbl .c { text-align: center; }
  .tbl .r { text-align: right; }
  .tbl .l { text-align: left; }
  .tbl .bold { font-weight: 700; }
  .iname { font-weight: 600; }
  .isub { font-size: 8.5px; color: #555; }
  .sum-row td { font-weight: 700; background: #f0f4ff; border-top: 1.5px solid #2c5aa0; }

  .tbl-wrap.cancelled::after {
    content: "CANCELLED";
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: clamp(28px, 6vw, 70px); font-weight: 900;
    letter-spacing: 0.4em; color: rgba(0,0,0,0.07);
    transform: rotate(-28deg); pointer-events: none; z-index: 2; white-space: nowrap;
  }

  /* ── Tax summary (GST breakdown) ── */
  .gst-breakdown { border-top: 1.5px solid #2c5aa0; padding: 6px 16px; }
  .gst-breakdown .ttl { font-weight: 700; color: #2c5aa0; font-size: 9.5px; text-transform: uppercase; margin-bottom: 4px; }
  .gst-tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .gst-tbl th, .gst-tbl td { border: 1px solid #c9d2dc; padding: 3px 6px; text-align: center; }
  .gst-tbl th { background: #f0f4ff; color: #2c5aa0; }
  .gst-tbl tr.total-row td { font-weight: 700; background: #f8f8f8; }

  /* ── Totals footer row — bank/QR/payment-summary | amount-in-words | grand-total ── */
  .totals-wrap { display: flex; align-items: stretch; border-top: 2px solid #2c5aa0; flex-wrap: wrap; }

  .bank-col {
    flex: 1.3; display: flex; flex-direction: column; gap: 5px;
    padding: 8px 14px; border-right: 1px solid #2c5aa0; background: #f9fbff; min-width: 220px;
  }
  .bank-top-row { display: flex; align-items: center; gap: 10px; }
  .bank-col .qr-info { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .bank-col .qr-info img { width: 62px; height: 62px; border: 1px solid #2c5aa0; padding: 2px; background: #fff; }
  .bank-col .qr-info .qr-cap { font-size: 7.5px; color: #555; text-transform: uppercase; }
  .bank-col .bank-info { flex: 1; min-width: 0; font-size: 9px; color: #333; }
  .bank-col .bank-info .ttl { font-weight: 700; color: #2c5aa0; text-transform: uppercase; margin-bottom: 2px; font-size: 8.5px; }
  .bank-col .bank-info .b-row { line-height: 1.5; }
  .bank-col .bank-info .b-lbl { font-weight: 600; color: #2c5aa0; }

  .pay-summary { margin-top: 4px; }
  .pay-summary .ps-ttl { font-weight: 700; color: #2c5aa0; font-size: 8.5px; text-transform: uppercase; margin-bottom: 2px; }
  .pay-summary table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  .pay-summary th, .pay-summary td { border: 1px solid #c9d2dc; padding: 3px 5px; }
  .pay-summary th { background: #f0f4ff; color: #2c5aa0; font-weight: 700; text-transform: uppercase; }
  .pay-summary td.r { text-align: right; }
  .pay-summary td.c { text-align: center; }
  .pay-summary .ps-more { font-size: 7.5px; color: #777; font-style: italic; margin-top: 2px; text-align: right; }

  .words-col { flex: 1; padding: 10px 16px; border-right: 1px solid #2c5aa0; font-size: 9.5px; display: flex; flex-direction: column; justify-content: center; min-width: 200px; }
  .words-lbl { font-weight: 700; color: #2c5aa0; margin-bottom: 3px; text-transform: uppercase; font-size: 9px; }
  .words-val { font-size: 10.5px; font-weight: 600; font-style: italic; }

  .amt-col { width: 230px; flex-shrink: 0; }
  .amt-tbl { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .amt-tbl td { padding: 5px 10px; border: 1px solid #c9d2dc; }
  .amt-tbl .lbl { font-weight: 600; background: #f8f8f8; }
  .amt-tbl .val { text-align: right; font-weight: 600; }
  .grand .lbl, .grand .val { background: #2c5aa0; color: #fff; font-weight: 700; }
  .pay-red { color: #e53935; }
  .pay-grn { color: #43a047; }

  /* ── Footer block ── */
  .footer-block { border-top: 1.5px solid #2c5aa0; }
  .payment-method-row { text-align: right; font-size: 9px; padding: 5px 16px; color: #444; }
  .ftr { display: flex; justify-content: flex-end; min-height: 55px; }
  .sig-col { width: 200px; padding: 8px 16px; text-align: center; font-size: 9.5px; }
  .sig-line { border-top: 1px solid #2c5aa0; margin-top: 24px; padding-top: 3px; font-weight: 700; font-size: 9px; color: #2c5aa0; }
  .sig-img { max-height: 40px; max-width: 100%; object-fit: contain; }
  .remarks { font-size: 9px; color: #555; padding: 5px 16px; }
  .invoice-terms-content { font-size: 8.5px; color: #666; line-height: 1.5; white-space: pre-line; word-break: break-word; overflow-wrap: anywhere; padding: 6px 16px; }
  .page-footer-text { text-align: center; font-size: 8px; color: #999; font-style: italic; padding: 6px 8px; }

  @media (max-width: 640px) {
    .hdr-title-row { flex-direction: column; align-items: flex-start; }
    .hdr-title-center { align-self: center; }
    .totals-wrap { flex-direction: column; }
    .amt-col { width: 100%; }
    .bank-col, .words-col { border-right: none; border-bottom: 1px solid #2c5aa0; }
  }
`;

export const generateInvoiceHTML = ({
  preview,
  createdInvoice,
  invoiceData,
  formValues,
  cartItems,
  invoiceCalculations,
  invoiceNumber,
  storedata,
  invoiceDate,
  isGstInvoice,
  isMrpEnabled = false,
  isFreePlan = true,
  appBrand = { name: "AMDAANI", logoUrl: "" },
  pageFormat = "a4",
  payment = { paid: 0, due: 0, status: "unpaid" },
}) => {
  // ── Aggregate totals ─────────────────────────────────────────────────────
  let totalQty = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalGST = 0;
  let totalAmount = 0;

  cartItems.forEach((item) => {
    const qty = item.qty || item.quantity || 0;
    const gstRate = item.gstRate || 0;
    const isTaxInclusive = item.isTaxInclusive || false;

    let discount = resolveItemDiscountInRupees(item);
    if (isTaxInclusive && gstRate > 0) discount = discount / (1 + gstRate / 100);
    discount = discount * qty;

    totalQty += qty;
    totalDiscount += discount;
    totalTaxable += gstRate > 0 ? item.taxableValue || 0 : 0;
    totalGST += item.gstAmount || 0;
    totalAmount += item.total || 0;
  });

  const roundedGrandTotal = Math.round(
    invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0),
  );
  const rawGrandTotal =
    invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0);
  const roundOffValue = (roundedGrandTotal - rawGrandTotal).toFixed(2);

  const safeGrandTotal = Number.isFinite(roundedGrandTotal)
    ? Math.max(roundedGrandTotal, 0)
    : 0;
  const amountInWords =
    numberToWords
      .toWords(safeGrandTotal)
      .replace(/\b\w/g, (c) => c.toUpperCase()) + " Rupees Only";

  // ── GST breakdown (Tax Summary) ─────────────────────────────────────────
  const isIgst = invoiceData?.isIgst === true;
  let gstTotals = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
  let gstBreakdownRows = "";

  for (const [rate, breakdown] of Object.entries(
    invoiceCalculations.gstBreakdown || {},
  )) {
    if (parseFloat(rate) === 0) continue;
    const taxable = breakdown.taxableAmount || 0;
    const cgst = isIgst ? 0 : breakdown.cgstAmount || 0;
    const sgst = isIgst ? 0 : breakdown.sgstAmount || 0;
    const igst = isIgst
      ? breakdown.igstAmount || (breakdown.cgstAmount || 0) + (breakdown.sgstAmount || 0)
      : 0;

    gstBreakdownRows += `
      <tr>
        <td>${rate}%</td>
        <td>₹${taxable.toFixed(2)}</td>
        <td>₹${cgst.toFixed(2)}</td>
        <td>₹${sgst.toFixed(2)}</td>
        <td>₹${igst.toFixed(2)}</td>
      </tr>`;

    gstTotals.taxableValue += taxable;
    gstTotals.cgst += cgst;
    gstTotals.sgst += sgst;
    gstTotals.igst += igst;
  }

  const hasAnyGstRows = gstBreakdownRows.length > 0;
  if (hasAnyGstRows) {
    gstBreakdownRows += `
      <tr class="total-row">
        <td>Total</td>
        <td>₹${gstTotals.taxableValue.toFixed(2)}</td>
        <td>₹${gstTotals.cgst.toFixed(2)}</td>
        <td>₹${gstTotals.sgst.toFixed(2)}</td>
        <td>₹${gstTotals.igst.toFixed(2)}</td>
      </tr>`;
  }

  // ── Flags ────────────────────────────────────────────────────────────────
  const hasCustomerDetails =
    formValues.contactNumber ||
    formValues.customerName ||
    formValues.customerAddress ||
    formValues.customerGstNumber;

  const hasBankDetails =
    storedata?.bankDetails &&
    (storedata.bankDetails.bankName ||
      storedata.bankDetails.accountNo ||
      storedata.bankDetails.ifsc ||
      storedata.bankDetails.branch ||
      storedata.bankDetails.upiId);

  const nonZeroTransactions = (invoiceData?.transactions || [])
    .filter((t) => Number(t.amount || 0) > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const MAX_PAY_SUMMARY_ROWS = 5;
  const visibleTransactions = nonZeroTransactions.slice(0, MAX_PAY_SUMMARY_ROWS);
  const hiddenTransactionCount = nonZeroTransactions.length - visibleTransactions.length;

  let qrURL = "";
  if (storedata?.bankDetails?.upiId) {
    const upiString = `upi://pay?pa=${storedata.bankDetails.upiId}&pn=${encodeURIComponent(
      storedata?.name || "Merchant",
    )}&am=${roundedGrandTotal}&cu=INR`;
    qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}`;
  }

  const storeAddressLine = [
    storedata?.address?.street,
    storedata?.address?.city,
    storedata?.address?.postalCode ? `– ${storedata.address.postalCode}` : "",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/,\s*–/, " –");

  const isCancelled = invoiceData?.status?.toLowerCase() === "cancelled";
  const containerWidth = pageFormat === "a5" ? "620px" : "900px";

  // ── Reusable partials ────────────────────────────────────────────────────
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

  const titleRow = `<div class="hdr-title-row">
    <div class="hdr-logo-block">
      ${
        storedata?.logoUrl
          ? `<img class="logo" src="${storedata.logoUrl}" alt="Logo" onerror="this.style.display='none'">`
          : ""
      }
      <div>
        <div class="hdr-company-name">${storedata?.name || "YOUR COMPANY NAME"}</div>
        <div class="hdr-company-details">
          ${storeAddressLine ? `${storeAddressLine}${storedata?.address?.state ? `, ${storedata.address.state}` : ""}<br>` : ""}
          ${storedata?.contactNo || storedata?.phone ? `Contact: ${storedata.contactNo || storedata.phone}${isGstInvoice && storedata?.gstNumber ? ` &nbsp;|&nbsp; GSTIN: ${storedata.gstNumber}` : ""}` : ""}
        </div>
      </div>
    </div>
    <div class="hdr-title-center">
      <div class="main-title">${isGstInvoice ? "Tax Invoice" : "Invoice"}</div>
      <div class="invoice-rule"></div>
      <span class="ps-inline ${payment.status?.toLowerCase()}">
        ${payment.status === "paid" ? "Paid" : payment.status === "partial" ? "Partial" : "Unpaid"}
      </span>
    </div>
  </div>`;

  const partiesRow = `<div class="hdr-parties-row">
    <div class="hdr-party">
      <div class="ttl">From, ${storedata?.name || "YOUR COMPANY NAME"}</div>
    </div>
    <div class="hdr-party">
      <div class="ttl">To, ${
        hasCustomerDetails ? formValues.customerName || formValues.partyName || "Customer" : "Walk-in Customer"
      }</div>
      ${
        formValues.customerAddress || formValues.address
          ? `<div class="p-row"><span class="p-lbl">Address:</span> ${formValues.customerAddress || formValues.address}${
              formValues.customerState || formValues.state ? `, ${formValues.customerState || formValues.state}` : ""
            }</div>`
          : ""
      }
      <div class="p-row"><span class="p-lbl">GSTIN No:</span> ${formValues.customerGstNumber || formValues.gstNumber || "NA"}</div>
      ${formValues.contactNumber ? `<div class="p-row"><span class="p-lbl">Phone No:</span> ${formValues.contactNumber}</div>` : ""}
    </div>
  </div>`;

  const metaRow = `<div class="hdr-meta-row">
    <span>INV_NO : ${invoiceNumber}</span>
    <span>Invoice Date : ${format(invoiceDate, "dd/MM/yyyy")} &nbsp;|&nbsp; ${format(invoiceDate, "hh:mm a")}</span>
  </div>`;

  const headerBlock = preview ? "" : `${titleRow}${partiesRow}${metaRow}`;

  const itemsHTML = buildItemsHTML(cartItems, isGstInvoice, isMrpEnabled);

  const sumRow = `<tr class="sum-row">
    <td></td>
    <td class="l bold">Total</td>
    <td class="c bold">${totalQty}</td>
    <td></td>
    ${isMrpEnabled ? "<td></td>" : ""}
    <td></td>
    <td class="r bold">₹${totalDiscount.toFixed(2)}</td>
    ${
      isGstInvoice
        ? `<td class="r bold">₹${totalTaxable.toFixed(2)}</td>
           <td></td>
           <td class="r bold">₹${(totalGST / 2).toFixed(2)}</td>
           <td class="r bold">₹${(totalGST / 2).toFixed(2)}</td>`
        : ""
    }
    <td class="r bold">₹${totalAmount.toFixed(2)}</td>
  </tr>`;

  const gstBreakdownBlock =
    !preview && isGstInvoice && hasAnyGstRows
      ? `<div class="gst-breakdown">
          <div class="ttl">Tax Summary</div>
          <table class="gst-tbl">
            <thead><tr><th>GST Rate</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
            <tbody>${gstBreakdownRows}</tbody>
          </table>
        </div>`
      : "";

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
                  <td>${format(new Date(t.createdAt), "dd-MMM-yy hh:mm a")}</td>
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

  const bankColHTML =
    !preview && (hasBankDetails || qrURL || paymentSummaryHTML)
      ? `<div class="bank-col">
          <div class="bank-top-row">
            ${
              qrURL
                ? `<div class="qr-info">
                    <img src="${qrURL}" alt="UPI QR" width="62" height="62" onerror="this.closest('.qr-info').style.display='none'">
                    <div class="qr-cap">Scan &amp; Pay</div>
                  </div>`
                : ""
            }
            <div class="bank-info">
              <div class="ttl">Bank Details</div>
              ${storedata?.bankDetails?.bankName ? `<div class="b-row"><span class="b-lbl">Bank:</span> ${storedata.bankDetails.bankName}</div>` : ""}
              ${storedata?.bankDetails?.accountNo ? `<div class="b-row"><span class="b-lbl">A/C No:</span> ${storedata.bankDetails.accountNo}</div>` : ""}
              ${storedata?.bankDetails?.branch ? `<div class="b-row"><span class="b-lbl">Branch:</span> ${storedata.bankDetails.branch}</div>` : ""}
              ${storedata?.bankDetails?.ifsc ? `<div class="b-row"><span class="b-lbl">IFSC:</span> ${storedata.bankDetails.ifsc}</div>` : ""}
              ${storedata?.bankDetails?.upiId ? `<div class="b-row"><span class="b-lbl">UPI ID:</span> ${storedata.bankDetails.upiId}</div>` : ""}
            </div>
          </div>
          ${paymentSummaryHTML}
        </div>`
      : "";

  const totalsBlock = `<div class="totals-wrap">
    ${bankColHTML}
    <div class="words-col">
      <div class="words-lbl">Amount in Words:</div>
      <div class="words-val">${amountInWords}</div>
    </div>
    <div class="amt-col">
      <table class="amt-tbl">
        <tr>
          <td class="lbl">Subtotal</td>
          <td class="val">₹${Number(
            createdInvoice ? invoiceData?.subTotal ?? invoiceCalculations.subtotal : invoiceCalculations.subtotal,
          ).toFixed(2)}</td>
        </tr>
        ${
          isGstInvoice
            ? `<tr><td class="lbl">Total Tax</td><td class="val">₹${Number(totalGST).toFixed(2)}</td></tr>`
            : ""
        }
        ${
          (invoiceCalculations?.discountTotal ?? 0) > 0
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
            createdInvoice
              ? Math.round(invoiceData?.grandTotal).toFixed(2)
              : Math.round(invoiceCalculations.grandTotal - (invoiceCalculations?.discountTotal || 0)).toFixed(2)
          }</td>
        </tr>
        ${
          payment.status !== "paid" || payment.due > 0
            ? `<tr><td class="lbl">Paid</td><td class="val">₹${Number(payment.paid || 0).toFixed(2)}</td></tr>
               <tr><td class="lbl">Due</td><td class="val ${payment.due > 0 ? "pay-red" : ""}">₹${Math.round(payment.due).toFixed(2)}</td></tr>`
            : ""
        }
      </table>
    </div>
  </div>`;

  const paymentMethodRow =
    invoiceData?.paymentMethod || invoiceData?.paymentNote
      ? `<div class="payment-method-row">
          ${invoiceData.paymentMethod ? `<span style="color:#666;">Method:</span> <strong>${invoiceData.paymentMethod.toUpperCase()}</strong>` : ""}
          ${invoiceData.paymentNote ? ` &nbsp;|&nbsp; <span style="color:#666;">Note:</span> ${invoiceData.paymentNote}` : ""}
        </div>`
      : "";

  const footer = preview
    ? ""
    : `<div class="ftr">
        <div class="sig-col" style="margin-left:auto;">
          <div style="font-size:9.5px; font-weight:600; color:#2c5aa0;">For ${storedata?.name || "YOUR COMPANY NAME"}</div>
          ${storedata?.signatureUrl ? `<img class="sig-img" src="${storedata.signatureUrl}"><br>` : ""}
          <div class="sig-line">Authorized Signatory</div>
        </div>
      </div>`;

  const remarksRow = invoiceData?.remarks
    ? `<div class="remarks">Remarks: ${invoiceData.remarks}</div>`
    : "";

  const termsRow =
    !preview && storedata?.settings?.invoiceTerms
      ? `<div class="invoice-terms-content">${storedata.settings.invoiceTerms}</div>`
      : "";

  return /*html*/ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice #${invoiceNumber}</title>
  <style>${sharedCSS(containerWidth)}</style>
</head>
<body>
<div class="page">
<div class="wrap">

  ${brandStrip}

  ${headerBlock}

  <div class="tbl-wrap ${isCancelled ? "cancelled" : ""}">
    <table class="tbl">
      ${tableHeader(isGstInvoice, isMrpEnabled)}
      <tbody>
        ${itemsHTML}
        ${sumRow}
      </tbody>
    </table>
  </div>

  ${gstBreakdownBlock}

  ${
    preview
      ? ""
      : `<div class="footer-block">
          ${totalsBlock}
          ${paymentMethodRow}
          ${footer}
          ${remarksRow}
          ${termsRow}
        </div>`
  }

  ${preview ? "" : `<div class="page-footer-text">Invoice generated using amdaani billing software</div>`}
</div>
</div>
</body>
</html>`;
};
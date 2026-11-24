import { format } from "date-fns";
import numberToWords from "number-to-words";
import { formatQty } from "./qtyFormat";

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

// ════════════════════════════════════════════════════════════════════════
// SHARED CALCULATIONS — used by both the A4 and A5 renderers so the two
// layouts never drift apart on numbers, only on visual structure.
// ════════════════════════════════════════════════════════════════════════
function computeShared({
  cartItems,
  invoiceCalculations,
  invoiceData,
  createdInvoice,
  storedata,
  formValues,
}) {
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
    if (isTaxInclusive && gstRate > 0)
      discount = discount / (1 + gstRate / 100);
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

  // FIX: never show ₹NaN when invoiceData.grandTotal is missing on a
  // createdInvoice record — fall back to the safely computed total.
  const finalGrandTotal = createdInvoice
    ? Number.isFinite(Number(invoiceData?.grandTotal))
      ? Math.round(Number(invoiceData.grandTotal))
      : roundedGrandTotal
    : roundedGrandTotal;

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
      ? breakdown.igstAmount ||
        (breakdown.cgstAmount || 0) + (breakdown.sgstAmount || 0)
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

  return {
    totalQty,
    totalDiscount,
    totalTaxable,
    totalGST,
    totalAmount,
    roundedGrandTotal,
    roundOffValue,
    amountInWords,
    finalGrandTotal,
    gstBreakdownRows,
    hasAnyGstRows,
    hasCustomerDetails,
    hasBankDetails,
    nonZeroTransactions,
    qrURL,
    storeAddressLine,
    isCancelled,
  };
}

// ════════════════════════════════════════════════════════════════════════
// A4 RENDERER
// ════════════════════════════════════════════════════════════════════════
function buildA4Html(args, shared) {
  const {
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
    isMrpEnabled,
    isFreePlan,
    appBrand,
    payment,
  } = args;

  const {
    totalQty,
    totalDiscount,
    totalTaxable,
    totalGST,
    totalAmount,
    roundOffValue,
    amountInWords,
    finalGrandTotal,
    gstBreakdownRows,
    hasAnyGstRows,
    hasCustomerDetails,
    hasBankDetails,
    nonZeroTransactions,
    qrURL,
    roundedGrandTotal,
    isCancelled,
  } = shared;

  const showNetRate =
    isGstInvoice && storedata?.settings?.showGstPerUnit === true;

  const itemsHTML = cartItems
    .map((item, index) => {
      const qty = item.qty || item.quantity || 0;
      const baseRate = item.baseRate || 0;
      const gstRate = item.gstRate || 0;
      const gstAmount = item.gstAmount || 0;
      const total = item.total || 0;
      const isTaxInclusive = item.isTaxInclusive || false;
      const taxableValue = gstRate > 0 ? item.taxableValue || 0 : 0;
      const netRate = qty > 0 ? total / qty : 0;

      let perItemDiscount = resolveItemDiscountInRupees(item);
      if (isTaxInclusive && gstRate > 0) {
        perItemDiscount = perItemDiscount / (1 + gstRate / 100);
      }
      const itemTotalDiscount = perItemDiscount * qty;
      const discountPercent =
        baseRate > 0 && perItemDiscount > 0
          ? ((perItemDiscount / baseRate) * 100).toFixed(2)
          : null;

      return `
      <tr class="item-row">
        <td class="sr-no">${index + 1}</td>
        <td class="description">
          <div class="item-name">${item.name}</div>
          ${item.hsn ? `<div class="item-code">HSN: ${item.hsn}</div>` : ""}
        </td>
        <td class="qty">${formatQty(qty)}</td>
        <td class="unit">${item.unit || "PCS"}</td>
        ${
          isMrpEnabled
            ? `<td class="mrp" style="text-align:right;">₹${Number(item.mrp || 0).toFixed(2)}</td>`
            : ""
        }
        <td class="rate">₹${baseRate.toFixed(2)}</td>
        <td class="discount">
          ${
            itemTotalDiscount > 0
              ? `₹${itemTotalDiscount.toFixed(2)}${discountPercent ? ` (${discountPercent}%)` : ""}`
              : `₹0.00 (0.00%)`
          }
        </td>
        ${
          isGstInvoice
            ? `
          <td style="text-align:right;">₹${taxableValue.toFixed(2)}</td>
          <td class="gst-amount" style="text-align:right;">
            ${gstRate > 0 ? `₹${gstAmount.toFixed(2)} (${gstRate}%)` : `&#8212;`}
          </td>`
            : ""
        }
        ${showNetRate ? `<td class="rate">₹${netRate.toFixed(2)}</td>` : ""}
        <td class="total-amount">₹${total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const colspanCount =
    (isGstInvoice ? 7 : 5) + (isMrpEnabled ? 1 : 0) + (showNetRate ? 1 : 0);
  const totalsRowCount =
    2 +
    (isGstInvoice ? 2 : 1) +
    ((invoiceCalculations?.discountTotal ?? 0) > 0 ? 1 : 0) +
    (Number(roundOffValue) !== 0 ? 1 : 0);

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.3; color: #000; background: #fff; padding: 8px; }
    .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #000; background: #fff; }
    .page-footer-text { text-align: center; font-size: 9px; color: #999; font-style: italic; padding: 6px 8px; margin-top: 8px; }
    .invoice-info { display: flex; border-bottom: 1px solid #000; }
    .invoice-info-left, .invoice-info-right { flex: 1; padding: 10px; }
    .invoice-info-left { border-right: 1px solid #000; }
    .info-row { display: flex; margin-bottom: 4px; }
    .info-label { min-width: 80px; font-weight: bold; }
    .customer-title { font-weight: bold; font-size: 12px; margin-bottom: 2px; color: #2c5aa0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .items-table th { background: #dbe6f7; color: #1f3f73; padding: 8px 4px; border: 1px solid #b9cbe8; font-size: 9px; }
    .items-table td { padding: 6px 4px; border: 0; border-left: 1px solid #b9c2cf; border-right: 1px solid #b9c2cf; text-align: center; }
    .gst-breakdown { margin-top: 10px; border-top: 1px solid #000; }
    .gst-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .gst-table th, .gst-table td { padding: 6px 8px; border: 1px solid #000; text-align: center; }
    .gst-table th { background: #dbe6f7; color: #1f3f73; }
    .description { text-align: left !important; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
    .description .item-name, .description .item-code { text-align: left; display: block; white-space: normal; word-break: break-word; }
    .item-code { font-size: 9px; color: #666; }
    .footer-section { display: flex; border-top: 1px solid #000; margin-top: 10px; min-height: 80px; justify-content: flex-end; }
    .terms-section { flex: 1; padding: 10px; border-right: 1px solid #000; }
    .signature-section { width: 220px; padding: 10px; text-align: center; }
    .signature-image { max-height: 40px; max-width: 100%; object-fit: contain; }
    .section-title { font-weight: bold; margin-bottom: 6px; font-size: 11px; color: #2c5aa0; }
    .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; font-size: 10px; font-weight: bold; }
    .items-table td.rate, .items-table td.discount, .items-table td.gst-amount, .items-table td.total-amount { text-align: right !important; }
    :root { --brand: #2c5aa0; }
    .brand-strip { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #000; background: #f9fafc; }
    .brand-left { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #555; }
    .brand-app-logo { height: 14px; width: auto; }
    .header-grid { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 16px; border-bottom: 1.5px solid #000; background: #ffffff; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; flex-direction: row; align-items: flex-start; gap: 10px; flex: 1; min-width: 220px; }
    .logo-wrap { display: flex; align-items: flex-start; justify-content: center; flex-shrink: 0; }
    .company-logo { height: 60px; width: auto; max-width: 100px; object-fit: contain; margin-right: 8px; }
    .company-block { display: flex; flex-direction: column; text-align: left; align-items: flex-start; flex: 1; }
    .company-name { font-size: 18px; font-weight: 800; color: var(--brand); margin-bottom: 2px; text-transform: uppercase; }
    .company-tagline { font-size: 10.5px; color: #555; margin-bottom: 4px; font-style: italic; }
    .company-details { font-size: 10px; color: #444; line-height: 1.4; white-space: normal !important; overflow-wrap: anywhere; word-break: break-word; text-align: left; }
    .meta-block { display: flex; flex-direction: column; align-items: flex-end; text-align: right; justify-content: center; min-width: 180px; }
    .invoice-badge { font-weight: 700; font-size: 14px; padding: 6px 12px; border-radius: 6px; text-transform: uppercase; background: var(--brand); color: #fff; border: 1px solid #000; letter-spacing: 0.4px; text-align: center; margin-bottom: 4px; }
    .gst-breakdown-title { padding: 4px 0; font-size: 12px; text-align: center; color: #2c5aa0; background: #f0f4ff; border: 1px solid #000; border-bottom: none; }
    .payment-status-container { text-align: right; margin-top: 4px; margin-right: 8px; }
    .payment-status { display: inline-block; padding: 2px 14px; border-radius: 20px; font-weight: 600; font-size: 8px; text-transform: capitalize; font-style: italic; letter-spacing: 0.5px; color: #fff; }
    .payment-status.paid { background-color: #43a047; }
    .payment-status.partial { background-color: #fb8c00; }
    .payment-status.unpaid { background-color: #e53935; }
    .items-table .totals-row td, .items-table .grand-total-row td { border: 1px solid #b9c2cf; font-size: 10px; padding: 6px 8px; }
    .items-table tr.summary-total-row td { border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .amount-words-cell { font-size: 10px; background: #fafafa; color: #000; }
    .items-table .label { text-align: left; font-weight: 600; background: #f8f8f8; }
    .items-table .amount { text-align: right; font-weight: 600; }
    .grand-total-row .label, .grand-total-row .amount { background: #dbe6f7; color: #1f3f73; font-weight: bold; }
    .no-break { page-break-inside: avoid; }
    .payment-row .label { font-weight: 600; background: #f8f8f8; text-align: left; }
    .payment-row .amount { text-align: right !important; font-weight: 600; }
    .items-table-wrap { position: relative; }
    .items-table-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2; }
    .items-table-watermark .text { font-family: Arial, sans-serif; font-weight: 800; font-size: clamp(36px, 10vw, 96px); letter-spacing: 0.5em; text-transform: uppercase; color: rgba(0,0,0,0.08); transform: rotate(-28deg); user-select: none; white-space: nowrap; }

    /* Payment status + method line stays attached to the totals table
       (never ends up alone on the next page). */
    .pay-tail { break-before: avoid; page-break-before: avoid; break-inside: avoid; page-break-inside: avoid; }

    /* END BLOCK = Tax Summary + Bank/Signature + remarks + terms + footer text.
       Kept together and never split. It simply follows the content.
       The header (thead) repeats only on pages that actually have content. */
    #end-block { break-inside: avoid; page-break-inside: avoid; }

    @media (max-width: 600px) {
      .header-grid { flex-direction: row; align-items: flex-start; justify-content: space-between; flex-wrap: nowrap; gap: 8px; }
      .header-left { flex-direction: row; align-items: center; flex: 1; min-width: 0; }
      .company-block { align-items: flex-start; text-align: left; }
      .meta-block { align-items: flex-end; text-align: right; justify-content: flex-start; min-width: fit-content; }
      .invoice-badge { font-size: 12px; padding: 4px 8px; }
    }
    @media print {
      /* Without this, table-header blue backgrounds are NOT printed and the
         white header text becomes invisible. */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 0; }
      thead { display: table-header-group; }
      .no-break { page-break-inside: avoid; }
      @page { size: A4; margin: 6mm; }
    }
  `;

  return /*html*/ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.8, user-scalable=yes">
  <title>Invoice #${invoiceNumber}</title>
  <style>${css}</style>
</head>
<body>
  <div class="invoice-container">
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <td>
            ${
              isFreePlan
                ? `<div class="brand-strip">
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
            ${
              preview
                ? ""
                : `<header class="header-grid">
                    <div class="header-left">
                      ${
                        storedata?.logoUrl
                          ? `<div class="logo-wrap"><img class="company-logo" src="${storedata.logoUrl}" alt="Logo" onerror="this.style.display='none'"></div>`
                          : ""
                      }
                      <div class="company-block">
                        <div class="company-name">${storedata?.name || "YOUR COMPANY NAME"}</div>
                        ${storedata?.tagline ? `<div class="company-tagline">${storedata.tagline}</div>` : ""}
                        <div class="company-details">
                          ${storedata?.address?.street ? `${storedata.address.street}<br>` : ""}
                          ${
                            storedata?.address?.city ||
                            storedata?.address?.postalCode
                              ? `${storedata?.address?.city || ""}${storedata?.address?.city && storedata?.address?.postalCode ? " - " : ""}${storedata?.address?.postalCode || ""}<br>`
                              : ""
                          }
                          ${storedata?.address?.state ? `${storedata.address.state}<br>` : ""}
                          ${storedata?.contactNo ? `<strong>Contact No:</strong> ${storedata.contactNo}<br>` : ""}
                          ${isGstInvoice ? `<strong>GSTIN:</strong> ${storedata?.gstNumber || "N/A"}` : ""}
                        </div>
                      </div>
                    </div>
                    <div class="meta-block">
                      <div class="invoice-badge">${isGstInvoice ? "Tax Invoice" : "Invoice"}</div>
                    </div>
                  </header>`
            }

            <div class="invoice-info">
              ${
                hasCustomerDetails
                  ? `<div class="invoice-info-right">
                      <div class="customer-title">Bill To:</div>
                      <div>Mobile: ${formValues.contactNumber || ""}</div>
                      ${formValues.customerName || formValues.partyName ? `<div>Name: ${formValues.customerName || formValues.partyName}</div>` : ""}
                      ${formValues.customerAddress || formValues.address ? `<div>Address: ${formValues.customerAddress || formValues.address}</div>` : ""}
                      ${
                        formValues.customerState || formValues.state
                          ? `<div>State: ${formValues.customerState || formValues.state}${
                              formValues.customerPostalCode ||
                              formValues.postalCode
                                ? `, Pin: ${formValues.customerPostalCode || formValues.postalCode}`
                                : ""
                            }</div>`
                          : ""
                      }
                      ${formValues.customerGstNumber || formValues.gstNumber ? `<div>GSTIN: ${formValues.customerGstNumber || formValues.gstNumber}</div>` : ""}
                    </div>`
                  : ""
              }
              <div class="invoice-info-left">
                <div class="info-row"><span class="info-label">Invoice No:</span><span>${invoiceNumber}</span></div>
                <div class="info-row"><span class="info-label">Invoice Date:</span><span>${format(invoiceDate, "dd-MMM-yyyy")}</span></div>
                <div class="info-row"><span class="info-label">Invoice Time:</span><span>${format(invoiceDate, "hh:mm a")}</span></div>
              </div>
            </div>
          </td>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>
            <div class="items-table-wrap">
              ${isCancelled ? `<div class="items-table-watermark"><div class="text">CANCELLED</div></div>` : ""}

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Sl. No.</th>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    ${isMrpEnabled ? `<th>MRP(₹)</th>` : ""}
                    <th>Price/Unit(₹)</th>
                    <th>Discount(₹)</th>
                    ${isGstInvoice ? `<th>Taxable Value(₹)</th><th>GST Amt.(%)</th>` : ""}
                    ${showNetRate ? `<th>Net Rate(₹)</th>` : ""}
                    <th>Amount(₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}

                  <tr class="summary-total-row" style="font-weight:bold; background:#f8f8f8;">
                    <td></td>
                    <td style="text-align:left;">Total</td>
                    <td>${formatQty(totalQty)}</td>
                    <td></td>
                    ${isMrpEnabled ? `<td></td>` : ""}
                    <td></td>
                    <td class="discount">₹${totalDiscount.toFixed(2)}</td>
                    ${
                      isGstInvoice
                        ? `<td style="text-align:right;">₹${totalTaxable.toFixed(2)}</td>
                           <td class="gst-amount" style="text-align:right;">₹${totalGST.toFixed(2)}</td>`
                        : ""
                    }
                    ${showNetRate ? `<td></td>` : ""}
                    <td class="total-amount">₹${totalAmount.toFixed(2)}</td>
                  </tr>

                  <tr class="totals-row no-break">
                    <td colspan="${colspanCount}" rowspan="${totalsRowCount}"
                      class="amount-words-cell"
                      style="text-align:left; vertical-align:top; border-right:1px solid #000; padding:10px;">
                      <div style="font-weight:bold; color:#2c5aa0;">Amount in Words:</div>
                      <div style="font-size:11px; font-weight:bold; color:#2c5aa0; margin-top:2px;">${amountInWords}</div>

                      ${
                        nonZeroTransactions.length > 0
                          ? `<div style="margin-top:15px;">
                              <div style="font-weight:bold; color:#2c5aa0; padding:4px 0; font-size:12px; text-align:center; background:#f0f4ff;">Payment Summary</div>
                              <table style="width:100%; border-collapse:collapse; font-size:10px;">
                                <thead>
                                  <tr style="background-color:#f5f5f5;">
                                    <th style="border:1px solid #ddd; padding:6px; text-align:left; background:#f5f5f5; color:#333;">Date</th>
                                    <th style="border:1px solid #ddd; padding:6px; text-align:right; background:#f5f5f5; color:#333;">Amount</th>
                                    <th style="border:1px solid #ddd; padding:6px; text-align:center; background:#f5f5f5; color:#333;">Payment Method</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${nonZeroTransactions
                                    .map(
                                      (t) => `
                                    <tr>
                                      <td style="border:1px solid #ddd; padding:6px; text-align:left;">${format(new Date(t.createdAt), "dd-MMM-yyyy hh:mm a")}</td>
                                      <td style="border:1px solid #ddd; padding:6px; text-align:right;">₹${Number(t.amount).toFixed(2)}</td>
                                      <td style="border:1px solid #ddd; padding:6px; text-align:center;">${(t.paymentMethod || "").toUpperCase()}</td>
                                    </tr>`,
                                    )
                                    .join("")}
                                </tbody>
                              </table>
                            </div>`
                          : ""
                      }
                    </td>
                    <td class="label">Subtotal</td>
                    <td class="amount">₹${Number(
                      createdInvoice
                        ? (invoiceData?.subTotal ??
                            invoiceCalculations.subtotal)
                        : invoiceCalculations.subtotal,
                    ).toFixed(2)}</td>
                  </tr>

                  ${
                    isGstInvoice
                      ? `<tr class="totals-row no-break">
                          <td class="label">Total Tax</td>
                          <td class="amount">₹${Number(totalGST).toFixed(2)}</td>
                        </tr>`
                      : ""
                  }

                  ${
                    (invoiceCalculations?.discountTotal ?? 0) > 0
                      ? `<tr class="totals-row no-break">
                          <td class="label">Extra Discount</td>
                          <td class="amount" style="color:#e53935;">−₹${
                            createdInvoice
                              ? Number(invoiceData?.discountTotal).toFixed(2)
                              : Number(
                                  invoiceCalculations.discountTotal,
                                ).toFixed(2)
                          }</td>
                        </tr>`
                      : ""
                  }

                  ${
                    Number(roundOffValue) !== 0
                      ? `<tr class="totals-row no-break">
                          <td class="label">Round Off</td>
                          <td class="amount" style="color:${Number(roundOffValue) < 0 ? "#e53935" : "#43a047"};">
                            ${
                              createdInvoice
                                ? `${Number(invoiceData?.roundOff || 0) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff || 0).toFixed(2)}`
                                : `${Number(roundOffValue) < 0 ? "−" : "+"}₹${Math.abs(Number(roundOffValue)).toFixed(2)}`
                            }
                          </td>
                        </tr>`
                      : ""
                  }

                  <tr class="grand-total-row no-break">
                    <td class="label">Net Total</td>
                    <td class="amount">₹${finalGrandTotal.toFixed(2)}</td>
                  </tr>

                  ${
                    payment.status !== "paid" || payment.due > 0
                      ? `<tr class="payment-row no-break">
                          <td class="label">Paid Amount</td>
                          <td class="amount">₹${payment.paid.toFixed(2)}</td>
                        </tr>
                        <tr class="payment-row no-break">
                          <td class="label">Due Amount</td>
                          <td class="amount" style="color:${payment.due > 0 ? "#e53935" : "#000"};">₹${Math.round(payment.due).toFixed(2)}</td>
                        </tr>`
                      : ""
                  }
                </tbody>
              </table>

              <div class="pay-tail">
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
                    ? `<div style="text-align:right; margin-top:4px; margin-right:8px; font-size:9px; line-height:1.6;">
                        ${
                          invoiceData.paymentMethod && payment.paid > 0
                            ? `<div style="margin-bottom:4px;"><span style="color:#666;">Payment Method:</span><span style="color:#000; font-weight:600; margin-left:6px;">${invoiceData.paymentMethod.toUpperCase()}</span></div>`
                            : ""
                        }
                        ${
                          invoiceData.paymentNote
                            ? `<div><span style="color:#666;">Note:</span><span style="color:#000; margin-left:6px;">${invoiceData.paymentNote}</span></div>`
                            : ""
                        }
                      </div>`
                    : ""
                }
              </div>
            </div>

            <!-- END BLOCK: Tax Summary + Bank/Signature + remarks + terms.
                 Printed once, right after the content (last page only). -->
            <div id="end-block">
              ${
                !preview && isGstInvoice && hasAnyGstRows
                  ? `<div class="gst-breakdown">
                      <div class="gst-breakdown-title">Tax Summary</div>
                      <table class="gst-table">
                        <thead><tr><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
                        <tbody>${gstBreakdownRows}</tbody>
                      </table>
                    </div>`
                  : ""
              }

              ${
                preview
                  ? ""
                  : `<div class="footer-section">
                      ${
                        hasBankDetails
                          ? `<div class="terms-section" style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                              <div>
                                <div class="section-title" style="font-weight:600; margin-bottom:4px;">Bank Details:</div>
                                ${storedata.bankDetails.bankName ? `Bank: ${storedata.bankDetails.bankName}<br>` : ""}
                                ${storedata.bankDetails.accountNo ? `A/C No: ${storedata.bankDetails.accountNo}<br>` : ""}
                                ${storedata.bankDetails.ifsc ? `IFSC: ${storedata.bankDetails.ifsc}<br>` : ""}
                                ${storedata.bankDetails.upiId ? `UPI: ${storedata.bankDetails.upiId}<br>` : ""}
                              </div>
                              ${
                                storedata?.bankDetails?.upiId
                                  ? `<div style="text-align:center;">
                                      <div style="font-weight:bold; font-size:12px; margin-bottom:4px;">Scan &amp; Pay</div>
                                      <img src="${qrURL}" width="70" height="70" onerror="this.style.display='none'" />
                                      <div style="font-size:10px; margin-top:4px;">UPI ID: ${storedata.bankDetails.upiId}</div>
                                      <div style="font-size:10px;">Amount: ₹${roundedGrandTotal}</div>
                                    </div>`
                                  : ""
                              }
                            </div>`
                          : ""
                      }
                      <div class="signature-section">
                        <div class="section-title">For ${storedata?.name || "YOUR COMPANY NAME"}</div>
                        ${storedata?.signatureUrl ? `<img src="${storedata.signatureUrl}" class="signature-image"><br>` : ""}
                        <div class="signature-line">Authorized Signatory</div>
                      </div>
                    </div>`
              }

              ${
                invoiceData?.remarks
                  ? `<pre style="font-size:8px; color:#666; margin-top:8px; padding:0 10px; white-space:pre-wrap; font-family:inherit;">Remarks : ${invoiceData.remarks}</pre>`
                  : ""
              }
              ${
                !preview && storedata?.settings?.invoiceTerms
                  ? `<div style="font-size:8px; color:#666; margin-top:8px; padding-left:10px; padding-right:10px; text-align:left;">
                      <div style="padding-left:10px; font-size:8px;">${storedata.settings.invoiceTerms}</div>
                    </div>`
                  : ""
              }
              ${preview ? "" : `<div class="page-footer-text">Invoice generated using amdaani billing app</div>`}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════
// A5 RENDERER (landscape)
// ════════════════════════════════════════════════════════════════════════
function buildItemsHTMLA5(
  cartItems,
  isGstInvoice,
  isMrpEnabled,
  showNetRate = false,
) {
  return cartItems
    .map((item, index) => {
      const qty = item.qty || item.quantity || 0;
      const baseRate = item.baseRate || 0;
      const gstRate = item.gstRate || 0;
      const gstAmount = item.gstAmount || 0;
      const totalAmount = item.total || 0;
      const isTaxInclusive = item.isTaxInclusive || false;
      const taxableValue = gstRate > 0 ? item.taxableValue || 0 : 0;
      const hsn = item.hsn || "—";
      const netRate = qty > 0 ? totalAmount / qty : 0;

      let perItemDiscount = resolveItemDiscountInRupees(item);
      if (isTaxInclusive && gstRate > 0) {
        perItemDiscount = perItemDiscount / (1 + gstRate / 100);
      }
      const totalDiscount = perItemDiscount * qty;
      const discountPercent =
        baseRate > 0 && perItemDiscount > 0
          ? ((perItemDiscount / baseRate) * 100).toFixed(1)
          : null;

      // Discount is shown on TWO lines (amount, then small percent) so the
      // column stays narrow instead of stretching for "₹600.00 (5.0%)".
      return `
        <tr class="irow">
          <td class="c">${index + 1}</td>
          <td class="l"><div class="iname">${item.name}</div></td>
          <td class="c">${hsn}</td>
          <td class="c">${formatQty(qty)}</td>
          <td class="c">${item.unit || "PCS"}</td>
          ${isMrpEnabled ? `<td class="r">₹${Number(item.mrp || 0).toFixed(2)}</td>` : ""}
          <td class="r">₹${baseRate.toFixed(2)}</td>
          <td class="r">${
            totalDiscount > 0
              ? `₹${totalDiscount.toFixed(2)}${discountPercent ? `<div class="sub">(${discountPercent}%)</div>` : ""}`
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
          ${showNetRate ? `<td class="r">₹${netRate.toFixed(2)}</td>` : ""}
          <td class="r bold">₹${totalAmount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

// Column-header ROW only (the <thead> wrapper is built in buildA5Html so it
// can hold the big company header row + this column header row together).
function columnHeaderRowA5(isGstInvoice, isMrpEnabled, showNetRate = false) {
  return `<tr class="col-row">
      <th>#</th>
      <th class="l" style="text-align:left">Item</th>
      <th>HSN</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Rate(₹)</th>
      <th>Discount</th>
      ${isGstInvoice ? "<th>Taxable(₹)</th><th>GST%</th><th>CGST(₹)</th><th>SGST(₹)</th>" : ""}
      ${showNetRate ? "<th>Net Rate(₹)</th>" : ""}
      <th>Amt(₹)</th>
    </tr>`;
}

function buildA5Html(args, shared) {
  const {
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
    isMrpEnabled,
    isFreePlan,
    appBrand,
    payment,
  } = args;

  const {
    totalQty,
    totalDiscount,
    totalTaxable,
    totalGST,
    totalAmount,
    roundOffValue,
    amountInWords,
    finalGrandTotal,
    gstBreakdownRows,
    hasAnyGstRows,
    hasCustomerDetails,
    hasBankDetails,
    nonZeroTransactions,
    qrURL,
    storeAddressLine,
    isCancelled,
  } = shared;

  const showNetRate =
    isGstInvoice && storedata?.settings?.showGstPerUnit === true;

  // Number of columns of the single big table (used for colspan).
  const colCount =
    8 + (isMrpEnabled ? 1 : 0) + (isGstInvoice ? 4 : 0) + (showNetRate ? 1 : 0);

  const MAX_PAY_SUMMARY_ROWS = 5;
  const visibleTransactions = nonZeroTransactions.slice(
    0,
    MAX_PAY_SUMMARY_ROWS,
  );
  const hiddenTransactionCount =
    nonZeroTransactions.length - visibleTransactions.length;

  // ──────────────────────────────────────────────────────────────────────
  // STRUCTURE
  //  On screen the invoice is ONE <table class="tbl">:
  //    <thead>  row 1 = big company header, row 2 = items column header
  //    <tbody>  item rows, Total row, CORE footer row (totals/bank/tax/
  //             signature) and an optional LONG notes row (terms/remarks)
  //
  // PRINTING:
  //  The script at the bottom turns the invoice into explicit pages (one
  //  small table per page, each with the full header) so Chrome's own table
  //  page-breaking is never used. It picks the biggest text size that needs
  //  the fewest pages, so the summary stays on the same page as the items
  //  whenever it can. Only a LONG terms/remarks row may move to a next page.
  //  After printing everything is moved back; the screen never changes.
  // ──────────────────────────────────────────────────────────────────────
  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 10.6px; }
    html, body { margin: 0; padding: 0; background: #eee; font-family: 'Arial', sans-serif; }
    body { padding: 12px; }
    .page { max-width: 794px; margin: 0 auto; background: #fff; }

    .wrap {
      background: #fff; display: block;
      font-size: 1.1rem; line-height: 1.35; color: #1a1a1a;
      border: 1px solid #2c5aa0;
    }

    @page { size: A5 landscape; margin: 6mm; }
    @media print {
      /* font-size is also set inline by the fit script (same formula) */
      html { font-size: calc(1.25vw * var(--fit, 1)); }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .page { width: 100%; max-width: none !important; margin: 0 !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }

    /* ── HEADER (compact) ── */
    .brand-strip { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-bottom: 1px solid #ccc; background: #f9fafc; font-size: 0.95rem; color: #666; }
    .brand-strip img { height: 1.2rem; width: auto; }
    .hdr-title-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; border-bottom: 2px solid #2c5aa0; gap: 10px; background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%); }
    .hdr-logo-block { display: flex; align-items: center; flex: 1; min-width: 0; }
    .hdr-logo-block .logo { height: 3.8rem; width: auto; max-width: 10rem; object-fit: contain; }
    .hdr-logo-placeholder { height: 3.8rem; }
    .hdr-title-center { flex: 1.6; text-align: center; flex-shrink: 0; }
    .hdr-title-center .main-title { font-size: 2rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #2c5aa0; }
    .hdr-title-center .invoice-rule { width: 8rem; height: 2px; background: #2c5aa0; margin: 3px auto 0; }
    .hdr-status-block { flex: 1; display: flex; justify-content: flex-end; align-items: center; }
    .hdr-status-block .ps-inline { padding: 3px 14px; border-radius: 12px; font-size: 1.05rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.4px; }
    .ps-inline.paid { background: #43a047; } .ps-inline.partial { background: #fb8c00; } .ps-inline.unpaid { background: #e53935; }
    .hdr-parties-row { display: flex; border-bottom: 1px solid #2c5aa0; font-size: 1.1rem; }
    .hdr-party { flex: 1; padding: 5px 14px; min-width: 0; }
    .hdr-party + .hdr-party { border-left: 1px solid #d8dee6; }
    .hdr-party .ttl { font-weight: 700; margin-bottom: 2px; color: #2c5aa0; text-transform: uppercase; font-size: 1.05rem; letter-spacing: 0.3px; }
    .hdr-party .p-row { line-height: 1.35; overflow-wrap: anywhere; }
    .hdr-party .p-lbl { font-weight: 600; }
    .hdr-meta-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 3px 14px; border-bottom: 1.5px solid #2c5aa0; font-size: 1.05rem; font-weight: 700; background: #f0f4ff; color: #2c5aa0; }
    .hdr-meta-row span { white-space: nowrap; }

    /* ── THE BIG TABLE ──
       All selectors use the child combinator (>) so they only touch the
       items table itself and NOT the small tables (payment summary, tax
       summary, amounts) that live inside the footer cell.
       Only numeric/short cells are nowrap. The Item column can wrap, so the
       table can NEVER become wider than the page. */
    .tbl { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 1.1rem; }
    .tbl > thead { display: table-header-group; }

    .tbl > thead > tr > th { background: #dbe6f7; color: #1f3f73; padding: 4px 3px; border: 1px solid #b9cbe8; font-size: 0.9rem; text-align: center; text-transform: uppercase; letter-spacing: 0; font-weight: 700; white-space: normal; line-height: 1.15; }
    /* the company-header cell: plain container, no table-header styling */
    .tbl > thead > tr > th.hdr-th { background: transparent; color: #1a1a1a; padding: 0; border: 0; font-size: 1.1rem; text-align: left; text-transform: none; font-weight: 400; line-height: 1.35; }

    .tbl > tbody > tr > td { padding: 3px 4px; border: 0; border-left: 1px solid #c9d2dc; border-right: 1px solid #c9d2dc; vertical-align: middle; white-space: nowrap; }
    .tbl > tbody > tr > td.c { text-align: center; }
    .tbl > tbody > tr > td.r { text-align: right; }
    .tbl > tbody > tr > td.bold, .tbl .bold { font-weight: 700; }
    .tbl > thead > tr > th.l, .tbl > tbody > tr > td.l { text-align: left; width: 100%; min-width: 6rem; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
    .tbl .sub { font-size: 0.85rem; color: #555; font-weight: 400; line-height: 1.1; }
    .iname { font-weight: 600; }
    .sum-row > td { font-weight: 700; background: #f0f4ff; border-top: 1.5px solid #2c5aa0; border-bottom: 1px solid #c9d2dc; }
    .sum-row { break-before: avoid; page-break-before: avoid; }

    /* footer / notes cell: plain container (no borders/padding/nowrap) */
    .tbl > tbody > tr > td.full { padding: 0; border: 0; white-space: normal; text-align: left; vertical-align: top; }

    /* rows that must never be cut in the middle (items + total) */
    .tbl > tbody > tr.irow, .tbl > thead > tr { break-inside: avoid; page-break-inside: avoid; }

    /* print-time pages (created by the script only while printing).
       Each page is its own table, header is NOT a repeating header-group,
       so Chrome's table page-breaking is never involved. */
    .wrap.paged { border: 0; }
    .pg-wrap { display: block; box-sizing: border-box; width: 100%; border: 0; background: #fff; position: relative; }
    .pg-wrap::after { content: ""; position: absolute; inset: 0; border: 1.5px solid #2c5aa0; pointer-events: none; }
    .pg-wrap.pg-break { break-after: page; page-break-after: always; }
    .pg-wrap:last-child { break-after: avoid; page-break-after: avoid; }
    .pg-wrap .tbl > thead { display: table-row-group; }

    /* CANCELLED watermark: fixed => repeats centred on every printed page */
    .cancel-mark {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 6rem; font-weight: 900; letter-spacing: 0.4em; color: rgba(0,0,0,0.07);
      transform: rotate(-28deg); pointer-events: none; z-index: 2; white-space: nowrap;
    }

    /* ── END SECTION ── */
    .footer-block { border-top: 2px solid #2c5aa0; }
    .keep { break-inside: avoid; page-break-inside: avoid; }

    /* Row 1: [ bank + QR + payments | words + tax summary | amounts ] */
    .totals-wrap { display: flex; align-items: stretch; flex-wrap: wrap; break-inside: avoid; page-break-inside: avoid; }
    .bank-col { flex: 1 1 17rem; display: flex; flex-direction: column; gap: 4px; padding: 6px 12px; border-right: 1px solid #2c5aa0; background: #f9fbff; min-width: 17rem; }
    .bank-top-row { display: flex; align-items: center; gap: 8px; }
    .bank-col .qr-info { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .bank-col .qr-info img { width: 5.2rem; height: 5.2rem; border: 1px solid #2c5aa0; padding: 2px; background: #fff; }
    .bank-col .qr-info .qr-cap { font-size: 0.8rem; color: #555; text-transform: uppercase; }
    .bank-col .bank-info { flex: 1; min-width: 0; font-size: 1.05rem; color: #222; }
    .bank-col .bank-info .ttl { font-weight: 700; color: #2c5aa0; text-transform: uppercase; margin-bottom: 2px; font-size: 1rem; }
    .bank-col .bank-info .b-row { line-height: 1.35; overflow-wrap: anywhere; }
    .bank-col .bank-info .b-lbl { font-weight: 600; color: #2c5aa0; }
    .pay-summary { margin-top: 3px; }
    .pay-summary .ps-ttl { font-weight: 700; color: #2c5aa0; font-size: 1rem; text-transform: uppercase; margin-bottom: 2px; }
    .pay-summary table { width: 100%; border-collapse: collapse; font-size: 1rem; }
    .pay-summary th, .pay-summary td { border: 1px solid #c9d2dc; padding: 2px 4px; white-space: nowrap; }
    .pay-summary th { background: #dbe6f7; color: #1f3f73; font-weight: 700; text-transform: uppercase; }
    .pay-summary td.r { text-align: right; } .pay-summary td.c { text-align: center; }
    .pay-summary .ps-more { font-size: 0.85rem; color: #777; font-style: italic; margin-top: 2px; text-align: right; }

    .mid-col { flex: 1.5 1 24rem; min-width: 0; display: flex; flex-direction: column; border-right: 1px solid #2c5aa0; }
    .words-box { padding: 6px 12px; font-size: 1.1rem; }
    .words-lbl { font-weight: 700; color: #2c5aa0; margin-bottom: 3px; text-transform: uppercase; font-size: 1rem; }
    .words-val { font-size: 1.2rem; font-weight: 600; font-style: italic; }
    .tax-sum { margin-top: auto; border-top: 1px solid #2c5aa0; }
    .tax-ttl { padding: 2px 0; font-size: 1rem; font-weight: 700; text-align: center; color: #2c5aa0; background: #f0f4ff; text-transform: uppercase; letter-spacing: 0.3px; }
    .tax-tbl { width: 100%; border-collapse: collapse; font-size: 1rem; }
    .tax-tbl th, .tax-tbl td { padding: 2px 5px; border: 1px solid #c9d2dc; text-align: center; white-space: nowrap; }
    .tax-tbl th { background: #dbe6f7; color: #1f3f73; font-size: 0.9rem; text-transform: uppercase; }
    .tax-tbl tr.total-row td { font-weight: 700; background: #f8f8f8; }

    .amt-col { flex: 0 0 17rem; }
    .amt-tbl { width: 100%; border-collapse: collapse; font-size: 1.15rem; }
    .amt-tbl td { padding: 4px 8px; border: 1px solid #c9d2dc; white-space: nowrap; }
    .amt-tbl .lbl { font-weight: 600; background: #f8f8f8; }
    .amt-tbl .val { text-align: right; font-weight: 600; }
    .grand .lbl, .grand .val { background: #dbe6f7; color: #1f3f73; font-weight: 700; }
    .pay-red { color: #e53935; } .pay-grn { color: #43a047; }
    .payment-method-row { text-align: right; font-size: 1.05rem; padding: 3px 14px; color: #444; border-top: 1px solid #c9d2dc; }

    /* LONG remarks/terms: own row that is ALLOWED to move to the next page */
    .notes-block { border-top: 2px solid #2c5aa0; }

    /* Signature row (+ footer text when there is no separate notes row),
       never split. */
    .tail-row { display: flex; align-items: stretch; border-top: 1px solid #2c5aa0; }
    .notes-col { flex: 1; min-width: 0; }
    .sig-col { flex: 0 0 19rem; margin-left: auto; padding: 6px 14px; text-align: center; font-size: 1.1rem; display: flex; flex-direction: column; justify-content: flex-end; border-left: 1px solid #2c5aa0; }
    .sig-line { border-top: 1px solid #2c5aa0; margin-top: 1.6rem; padding-top: 3px; font-weight: 700; font-size: 1.05rem; color: #2c5aa0; }
    .sig-img { max-height: 3.4rem; max-width: 100%; object-fit: contain; }
    .remarks { font-size: 1.05rem; color: #555; padding: 4px 14px; }
    .remarks + .invoice-terms-content { border-top: 1px solid #c9d2dc; }
    .invoice-terms-content { font-size: 0.95rem; color: #555; line-height: 1.45; white-space: pre-line; word-break: break-word; overflow-wrap: anywhere; padding: 4px 14px; orphans: 3; widows: 3; }
    .page-footer-text { text-align: center; font-size: 0.9rem; color: #999; font-style: italic; padding: 4px 8px; border-top: 1px solid #e3e8ef; break-before: avoid; page-break-before: avoid; }

    @media (max-width: 500px) {
      .totals-wrap { flex-direction: column; }
      .amt-col { flex: 1 1 auto; width: 100%; }
      .bank-col, .mid-col { border-right: none; border-bottom: 1px solid #2c5aa0; }
      .tail-row { flex-direction: column; }
      .sig-col { flex: 1 1 auto; width: 100%; border-left: none; border-top: 1px solid #2c5aa0; }
    }

    @media print {
      .tbl > thead { display: table-header-group; }
      .pg-wrap .tbl > thead { display: table-row-group; }
    }
  `;

  // Print script. Runs ONLY when printing (beforeprint / print media), so the
  // screen preview and the PDF-download path are never touched.
  //
  //  - The text scale is applied INLINE (font-size: calc(1.25vw * f)) so it
  //    behaves the same in screen and print media: what we measure is exactly
  //    what Chrome prints.
  //  - For scales 100% .. 75% it measures header / rows / footer, simulates
  //    the page split and keeps the biggest scale needing the FEWEST pages.
  //  - It then builds the real pages and verifies none is taller than the
  //    printable height; if one is, it tries a bigger safety margin and then
  //    a smaller text scale.
  //  - CORE footer (totals/bank/tax/signature) sticks to the last items.
  //    Only the long terms/remarks row may move to the next page.
  //  - afterprint: everything is moved back exactly as it was.
  //
  // NOTE: no backticks / dollar-brace inside here.
  const fitScript = `
    (function () {
      var PAGE_W = 80;                    // printable width in rem at scale 1
      var PAGE_H = PAGE_W * 136 / 198;    // printable height in rem at scale 1 (~54.9)
      var MIN_FIT = 0.75;                 // smallest text scale allowed
      var STEP = 0.02;
       var SAFETY = [0.95, 0.92, 0.89];   // tried in order until REAL pages fit
      var root = document.documentElement;
      var page = document.querySelector('.page');
      if (!page) return;
      var wrapEl = page.querySelector('.wrap');
      var origTable = page.querySelector('table.tbl');
      if (!wrapEl || !origTable) return;
      var state = null;

      function remPx() {
        return parseFloat(window.getComputedStyle(root).fontSize) || 10.6;
      }

      // Same scale in screen AND print: 1rem = 1.25vw * f, page = 80/f rem.
      // 1rem at scale 1 = 198mm / 80 = 9.354px (real print width), so the
      // measurement no longer depends on the browser window size.
      var BASE_PX = 748.3 / PAGE_W;
      function applyScale(f) {
        root.style.fontSize = (BASE_PX * f) + 'px';
        page.style.setProperty('max-width', 'none');
        page.style.setProperty('width', (PAGE_W / f) + 'rem');
      }

      function clearWidth() {
        page.style.removeProperty('width');
        page.style.removeProperty('max-width');
      }

      function undo() {
        if (!state) return;
        var pn = state.thead.querySelector('.pg-no');
        if (pn) pn.textContent = 'Page 1 of 1';
        var tb = origTable.tBodies[0];
        for (var i = 0; i < state.rows.length; i++) tb.appendChild(state.rows[i]);
        origTable.insertBefore(state.thead, tb);
        if (state.container.parentNode) state.container.parentNode.removeChild(state.container);
        wrapEl.classList.remove('paged');
        origTable.style.display = '';
        state = null;
      }

      function hOf(el, rem) { return el.getBoundingClientRect().height / rem; }

      // Measure everything at text scale f (origTable must be in normal state)
      function measure(f) {
        applyScale(f);
        var rem = remPx();
        var thead = origTable.tHead;
        var tbody = origTable.tBodies[0];
        if (!thead || !tbody) return null;

        var allRows = Array.prototype.slice.call(tbody.rows);
        var rows = allRows.slice();
        var notes = null, footer = null;
        if (rows.length && rows[rows.length - 1].classList.contains('notes-row')) notes = rows.pop();
        if (rows.length && rows[rows.length - 1].classList.contains('foot-row')) footer = rows.pop();
        if (!rows.length) return null;

        var colRow = thead.querySelector('tr.col-row');
        var tw = origTable.getBoundingClientRect().width;
        var colWidths = [];
        if (colRow && tw > 0) {
          for (var c = 0; c < colRow.cells.length; c++) {
            colWidths.push(colRow.cells[c].getBoundingClientRect().width / tw * 100);
          }
        }

        // every item row alone, but the LAST item stays together with the Total row
        var units = [];
        for (var i = 0; i < rows.length; i++) units.push({ rows: [rows[i]], h: hOf(rows[i], rem) });
        if (units.length >= 2) {
          var s = units.pop();
          var l = units.pop();
          units.push({ rows: l.rows.concat(s.rows), h: l.h + s.h });
        }

        return {
          thead: thead, allRows: allRows, units: units,
          footer: footer, notes: notes, colWidths: colWidths,
          headH: hOf(thead, rem),
          colH: colRow ? hOf(colRow, rem) : 0,
          footH: footer ? hOf(footer, rem) : 0,
          notesH: notes ? hOf(notes, rem) : 0
        };
      }

      // Decide which rows go on which page
      function plan(m, cap) {
        var pages = [];
        var cur = { units: [], used: m.headH, footer: false, notes: false };
        for (var k = 0; k < m.units.length; k++) {
          var u = m.units[k];
          if (cur.units.length && cur.used + u.h > cap) {
            pages.push(cur);
            cur = { units: [], used: m.headH, footer: false, notes: false };
          }
          cur.units.push(u);
          cur.used += u.h;
        }
        pages.push(cur);

        // CORE footer (totals/bank/tax/signature): sticks to the last items
        if (m.footer) {
          var last = pages[pages.length - 1];
          if (last.used + m.footH <= cap) {
            last.footer = true;
            last.used += m.footH;
          } else {
            var mv = last.units.length > 1 ? last.units[last.units.length - 1] : null;
            if (mv && m.headH + mv.h + m.footH <= cap) {
              last.units.pop();
              last.used -= mv.h;
              pages.push({ units: [mv], used: m.headH + mv.h + m.footH, footer: true, notes: false });
            } else {
              pages.push({ units: [], used: m.headH - m.colH + m.footH, footer: true, notes: false });
            }
          }
        }

        // LONG terms/remarks: only this may move to the next page
        if (m.notes) {
          var l2 = pages[pages.length - 1];
          if (l2.used + m.notesH <= cap) {
            l2.notes = true;
            l2.used += m.notesH;
          } else {
            pages.push({ units: [], used: m.headH - m.colH + m.notesH, footer: false, notes: true });
          }
        }
        return pages;
      }

      function build(m, pages) {
        var container = document.createElement('div');
        container.className = 'pg-container';

        for (var pi = 0; pi < pages.length; pi++) {
          var pg = pages[pi];
          var wrap = document.createElement('div');
          wrap.className = 'pg-wrap' + (pi < pages.length - 1 ? ' pg-break' : '');

          var t = document.createElement('table');
          t.className = 'tbl';
          if (m.colWidths.length) {
            t.style.tableLayout = 'fixed';
            var cg = document.createElement('colgroup');
            for (var w = 0; w < m.colWidths.length; w++) {
              var col = document.createElement('col');
              col.style.width = m.colWidths[w].toFixed(3) + '%';
              cg.appendChild(col);
            }
            t.appendChild(cg);
          }

          // company header + column header on EVERY page
          var th = pi === 0 ? m.thead : m.thead.cloneNode(true);
          if (!pg.units.length) {                // footer/notes-only page: no column header
            var cr = th.querySelector('tr.col-row');
            if (cr && cr.parentNode) cr.parentNode.removeChild(cr);
          }
          t.appendChild(th);

          var pno = th.querySelector('.pg-no');
          if (pno) pno.textContent = 'Page ' + (pi + 1) + ' of ' + pages.length;

          var tb = document.createElement('tbody');
          for (var ui = 0; ui < pg.units.length; ui++) {
            for (var ri = 0; ri < pg.units[ui].rows.length; ri++) tb.appendChild(pg.units[ui].rows[ri]);
          }
          if (pg.footer && m.footer) tb.appendChild(m.footer);
          if (pg.notes && m.notes) tb.appendChild(m.notes);
          t.appendChild(tb);

          wrap.appendChild(t);
          container.appendChild(wrap);
        }

        origTable.parentNode.insertBefore(container, origTable.nextSibling);
        origTable.style.display = 'none';
        wrapEl.classList.add('paged');
        state = { thead: m.thead, rows: m.allRows, container: container };
      }

      // Is any REAL built page taller than the printable page?
      function overflows(f) {
        if (!state) return false;
        var rem = remPx();
        var limit = PAGE_H / f;
        var kids = state.container.children;
        for (var i = 0; i < kids.length; i++) {
          if (kids[i].getBoundingClientRect().height / rem > limit + 0.05) return true;
        }
        return false;
      }

      function fit() {
        undo();
        root.style.removeProperty('font-size');
        clearWidth();
        try {
          // 1) pick the biggest text scale that needs the FEWEST pages
          var best = null;
          for (var f = 1; f >= MIN_FIT - 0.0001; f -= STEP) {
            var m = measure(f);
            if (!m) return;
            var n = plan(m, (PAGE_H / f) * SAFETY[0]).length;
            if (!best || n < best.n) best = { f: f, n: n };
            if (n === 1) break;
          }

          // 2) build real pages and verify; shrink further only if really needed
          for (var ff = best.f; ff >= MIN_FIT - 0.0001; ff -= STEP) {
            for (var s = 0; s < SAFETY.length; s++) {
              undo();
              var m2 = measure(ff);
              if (!m2) return;
              build(m2, plan(m2, (PAGE_H / ff) * SAFETY[s]));
              if (!overflows(ff)) return;
            }
          }
        } finally {
          clearWidth();   // font-size stays set (vw based) so print uses the same scale
        }
      }

      function restore() {
        undo();
        root.style.removeProperty('font-size');
        clearWidth();
      }

      window.addEventListener('beforeprint', fit);
      window.addEventListener('afterprint', restore);

      if (window.matchMedia) {
        var mql = window.matchMedia('print');
        var handler = function (e) { e.matches ? fit() : restore(); };
        if (mql.addEventListener) mql.addEventListener('change', handler);
        else if (mql.addListener) mql.addListener(handler);
      }
    })();
  `;

  const brandStrip = isFreePlan
    ? `<div class="brand-strip">
        ${appBrand?.logoUrl ? `<img src="${appBrand.logoUrl}" alt="${appBrand?.name || ""}" onerror="this.style.display='none'">` : ""}
        <span>Powered by ${appBrand?.name || "AMDAANI"}</span>
      </div>`
    : "";

  const titleRow = `<div class="hdr-title-row">
    <div class="hdr-logo-block">
      ${
        storedata?.logoUrl
          ? `<img class="logo" src="${storedata.logoUrl}" alt="Logo" onerror="this.style.display='none'">`
          : `<div class="hdr-logo-placeholder"></div>`
      }
    </div>
    <div class="hdr-title-center">
      <div class="main-title">${isGstInvoice ? "Tax Invoice" : "Invoice"}</div>
      <div class="invoice-rule"></div>
    </div>
    <div class="hdr-status-block">
      <span class="ps-inline ${payment.status?.toLowerCase()}">
        ${payment.status === "paid" ? "Paid" : payment.status === "partial" ? "Partial" : "Unpaid"}
      </span>
    </div>
  </div>`;

  const partiesRow = `<div class="hdr-parties-row">
    <div class="hdr-party">
      <div class="ttl">From, ${storedata?.name || "YOUR COMPANY NAME"}</div>
      ${
        storeAddressLine
          ? `<div class="p-row">Address: ${storeAddressLine}${storedata?.address?.state ? `, ${storedata.address.state}` : ""}</div>`
          : ""
      }
      ${
        storedata?.contactNo || storedata?.phone
          ? `<div class="p-row"><span class="p-lbl">Contact No -</span> ${storedata.contactNo || storedata.phone}</div>`
          : ""
      }
      ${isGstInvoice && storedata?.gstNumber ? `<div class="p-row"><span class="p-lbl">GSTIN No:</span> ${storedata.gstNumber}</div>` : ""}
    </div>
    <div class="hdr-party">
      <div class="ttl">To, ${hasCustomerDetails ? formValues.customerName || formValues.partyName || "Customer" : "Walk-in Customer"}</div>
      ${
        formValues.customerAddress || formValues.address
          ? `<div class="p-row"><span class="p-lbl">Address:</span> ${formValues.customerAddress || formValues.address}${
              formValues.customerState || formValues.state
                ? `, ${formValues.customerState || formValues.state}`
                : ""
            }</div>`
          : ""
      }
      <div class="p-row"><span class="p-lbl">GSTIN No:</span> ${formValues.customerGstNumber || formValues.gstNumber || "NA"}</div>
      ${formValues.contactNumber ? `<div class="p-row"><span class="p-lbl">Phone No:</span> ${formValues.contactNumber}</div>` : ""}
    </div>
  </div>`;

  // NOTE: no hard-coded "Page 1 of 1" (wrong on multi-page invoices).
  const metaRow = `<div class="hdr-meta-row">
    <span>INV_NO : ${invoiceNumber}</span>
    <span>Invoice Date : ${format(invoiceDate, "dd/MM/yyyy")} &nbsp;|&nbsp; ${format(invoiceDate, "hh:mm a")}</span>
    <span class="pg-no">Page 1 of 1</span>
  </div>`;

  const headerBlock = preview ? "" : `${titleRow}${partiesRow}${metaRow}`;
  const headerCellHTML = `${brandStrip}${headerBlock}`;

  const itemsHTML = buildItemsHTMLA5(
    cartItems,
    isGstInvoice,
    isMrpEnabled,
    showNetRate,
  );

  const sumRow = `<tr class="sum-row irow">
    <td></td><td class="l bold">Total</td><td></td>
    <td class="c bold">${formatQty(totalQty)}</td>
    <td></td>
    ${isMrpEnabled ? "<td></td>" : ""}
    <td></td>
    <td class="r bold">₹${totalDiscount.toFixed(2)}</td>
    ${
      isGstInvoice
        ? `<td class="r bold">₹${totalTaxable.toFixed(2)}</td><td></td>
           <td class="r bold">₹${(totalGST / 2).toFixed(2)}</td>
           <td class="r bold">₹${(totalGST / 2).toFixed(2)}</td>`
        : ""
    }
    ${showNetRate ? "<td></td>" : ""}
    <td class="r bold">₹${totalAmount.toFixed(2)}</td>
  </tr>`;

  const paymentSummaryHTML =
    visibleTransactions.length > 0
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
          ${hiddenTransactionCount > 0 ? `<div class="ps-more">+${hiddenTransactionCount} more payment${hiddenTransactionCount !== 1 ? "s" : ""}</div>` : ""}
        </div>`
      : "";

  const bankColHTML =
    hasBankDetails || qrURL || paymentSummaryHTML
      ? `<div class="bank-col">
          <div class="bank-top-row">
            ${
              qrURL
                ? `<div class="qr-info">
                    <img src="${qrURL}" alt="UPI QR" onerror="this.closest('.qr-info').style.display='none'">
                    <div class="qr-cap">Scan &amp; Pay</div>
                  </div>`
                : ""
            }
            <div class="bank-info">
              <div class="ttl">Bank Details</div>
              ${storedata?.bankDetails?.bankName ? `<div class="b-row"><span class="b-lbl">Bank:</span> ${storedata.bankDetails.bankName}</div>` : ""}
              ${storedata?.bankDetails?.accountNo ? `<div class="b-row"><span class="b-lbl">A/C No:</span> ${storedata.bankDetails.accountNo}</div>` : ""}
              ${storedata?.bankDetails?.ifsc ? `<div class="b-row"><span class="b-lbl">IFSC:</span> ${storedata.bankDetails.ifsc}</div>` : ""}
              ${storedata?.bankDetails?.upiId ? `<div class="b-row"><span class="b-lbl">UPI ID:</span> ${storedata.bankDetails.upiId}</div>` : ""}
            </div>
          </div>
          ${paymentSummaryHTML}
        </div>`
      : "";

  // Tax summary lives INSIDE the totals row (middle column, under the
  // amount in words) instead of being a separate full-width row.
  const taxSummaryHTML =
    !preview && isGstInvoice && hasAnyGstRows
      ? `<div class="tax-sum">
          <div class="tax-ttl">Tax Summary</div>
          <table class="tax-tbl">
            <thead><tr><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th></tr></thead>
            <tbody>${gstBreakdownRows}</tbody>
          </table>
        </div>`
      : "";

  const midColHTML = `<div class="mid-col">
    <div class="words-box">
      <div class="words-lbl">Amount in Words:</div>
      <div class="words-val">${amountInWords}</div>
    </div>
    ${taxSummaryHTML}
  </div>`;

  const totalsBlock = `<div class="totals-wrap">
    ${bankColHTML}
    ${midColHTML}
    <div class="amt-col">
      <table class="amt-tbl">
        <tr><td class="lbl">Subtotal</td><td class="val">₹${Number(
          createdInvoice
            ? (invoiceData?.subTotal ?? invoiceCalculations.subtotal)
            : invoiceCalculations.subtotal,
        ).toFixed(2)}</td></tr>
        ${
          (invoiceCalculations?.discountTotal ?? 0) > 0
            ? `<tr><td class="lbl">Extra Disc.</td><td class="val pay-red">−₹${
                createdInvoice
                  ? Number(invoiceData?.discountTotal).toFixed(2)
                  : Number(invoiceCalculations.discountTotal).toFixed(2)
              }</td></tr>`
            : ""
        }
        ${
          Number(roundOffValue) !== 0
            ? `<tr><td class="lbl">Round Off</td><td class="val ${Number(roundOffValue) < 0 ? "pay-red" : "pay-grn"}">${
                createdInvoice
                  ? `${Number(invoiceData?.roundOff) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff).toFixed(2)}`
                  : `${Number(roundOffValue) < 0 ? "−" : "+"}₹${Math.abs(Number(roundOffValue)).toFixed(2)}`
              }</td></tr>`
            : ""
        }
        <tr class="grand"><td class="lbl">Net Total</td><td class="val">₹${finalGrandTotal.toFixed(2)}</td></tr>
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

  const signatureHTML = `<div class="sig-col">
        <div style="font-weight:600; color:#2c5aa0;">For ${storedata?.name || "YOUR COMPANY NAME"}</div>
        ${storedata?.signatureUrl ? `<img class="sig-img" src="${storedata.signatureUrl}"><br>` : ""}
        <div class="sig-line">Authorized Signatory</div>
      </div>`;

  // ── Remarks / terms ──────────────────────────────────────────────────
  // SHORT notes sit beside the signature (saves height) and are part of the
  // CORE footer. LONG notes get their OWN table row (after the core footer):
  // only that row may move to the next page, the summary never does.
  const remarksText = invoiceData?.remarks ? String(invoiceData.remarks) : "";
  const termsText =
    !preview && storedata?.settings?.invoiceTerms
      ? String(storedata.settings.invoiceTerms)
      : "";
  const lineCount = (s) => (s ? s.split(/\r?\n/).length : 0);
  const longNotes =
    termsText.length > 280 ||
    lineCount(termsText) > 4 ||
    remarksText.length > 200 ||
    lineCount(remarksText) > 3;

  const remarksRow = remarksText
    ? `<div class="remarks">Remarks: ${remarksText}</div>`
    : "";
  const termsRow = termsText
    ? `<div class="invoice-terms-content">${termsText}</div>`
    : "";
  const notesHTML = `${remarksRow}${termsRow}`;

  const hasLongNotesRow = longNotes && !!notesHTML;

  const footerTextHTML = `<div class="page-footer-text">Invoice generated using amdaani billing app</div>`;

  // signature row (+ footer text only when there is no separate notes row)
  const tailBlock = `<div class="keep">
    <div class="tail-row"><div class="notes-col">${longNotes ? "" : notesHTML}</div>${signatureHTML}</div>
    ${hasLongNotesRow ? "" : footerTextHTML}
  </div>`;

  // ── thead: [company header row] + [column header row] ────────────────
  const theadHTML = `<thead>
      ${
        headerCellHTML.trim()
          ? `<tr class="hdr-row"><th class="hdr-th" colspan="${colCount}">${headerCellHTML}</th></tr>`
          : ""
      }
      ${columnHeaderRowA5(isGstInvoice, isMrpEnabled, showNetRate)}
    </thead>`;

  // ── CORE footer row: totals + bank + tax + signature (never split) ───
  const footerRowHTML = preview
    ? ""
    : `<tr class="foot-row">
        <td class="full" colspan="${colCount}">
          <div class="footer-block">
            <div class="keep">
              ${totalsBlock}
              ${paymentMethodRow}
            </div>
            ${tailBlock}
          </div>
        </td>
      </tr>`;

  // ── LONG terms/remarks row: may move to the next page (with header) ──
  const notesRowHTML =
    !preview && hasLongNotesRow
      ? `<tr class="notes-row">
          <td class="full" colspan="${colCount}">
            <div class="notes-block">${notesHTML}</div>
            ${footerTextHTML}
          </td>
        </tr>`
      : "";

  return /*html*/ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice #${invoiceNumber}</title>
  <style>${css}</style>
</head>
<body>
${isCancelled ? `<div class="cancel-mark">CANCELLED</div>` : ""}
<div class="page">
<div class="wrap">
  <!-- On screen: ONE table. When printing, the script splits it into
       explicit pages and every page gets its own copy of this <thead>
       (company header + column header). -->
  <table class="tbl">
    ${theadHTML}
    <tbody>
      ${itemsHTML}
      ${sumRow}
      ${footerRowHTML}
      ${notesRowHTML}
    </tbody>
  </table>
</div>
</div>
<script>${fitScript}</script>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY POINT
// ════════════════════════════════════════════════════════════════════════
export const generateInvoiceHTML = (args) => {
  const {
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
  } = args;

  const isA5 = pageFormat === "a5";

  const shared = computeShared({
    cartItems,
    invoiceCalculations,
    invoiceData,
    createdInvoice,
    storedata,
    formValues,
  });

  const fullArgs = {
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
    isMrpEnabled,
    isFreePlan,
    appBrand,
    payment,
  };

  return isA5 ? buildA5Html(fullArgs, shared) : buildA4Html(fullArgs, shared);
};
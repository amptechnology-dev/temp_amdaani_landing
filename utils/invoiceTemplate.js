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
// A4 RENDERER — matches the "rich" desktop-style invoice: header-grid,
// Bill-To box, Tax Summary block, Amount-in-Words + Payment Summary inside
// the totals cell, bank+signature footer strip. (Matches PDF-12 look.)
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

  const itemsHTML = cartItems
    .map((item, index) => {
      const qty = item.qty || item.quantity || 0;
      const baseRate = item.baseRate || 0;
      const gstRate = item.gstRate || 0;
      const gstAmount = item.gstAmount || 0;
      const total = item.total || 0;
      const isTaxInclusive = item.isTaxInclusive || false;
      const taxableValue = gstRate > 0 ? item.taxableValue || 0 : 0;

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
        <td class="qty">${qty}</td>
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
        <td class="total-amount">₹${total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const colspanCount = (isGstInvoice ? 7 : 5) + (isMrpEnabled ? 1 : 0);
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
    .items-table th { background: #2c5aa0; color: white; padding: 8px 4px; border: 1px solid #000; font-size: 9px; }
    .items-table td { padding: 6px 4px; border: 1px solid #000; text-align: center; }
    .gst-breakdown { margin-top: 10px; border-top: 1px solid #000; }
    .gst-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .gst-table th, .gst-table td { padding: 6px 8px; border: 1px solid #000; text-align: center; }
    .gst-table th { background: #2c5aa0; color: white; }
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
    .items-table .totals-row td, .items-table .grand-total-row td { border: 1px solid #000; font-size: 10px; padding: 6px 8px; }
    .amount-words-cell { font-size: 10px; background: #fafafa; color: #000; }
    .items-table .label { text-align: left; font-weight: 600; background: #f8f8f8; }
    .items-table .amount { text-align: right; font-weight: 600; }
    .grand-total-row .label, .grand-total-row .amount { background: #2c5aa0; color: #fff; font-weight: bold; }
    .no-break { page-break-inside: avoid; }
    .payment-row .label { font-weight: 600; background: #f8f8f8; text-align: left; }
    .payment-row .amount { text-align: right !important; font-weight: 600; }
    .items-table-wrap { position: relative; }
    .items-table-watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2; }
    .items-table-watermark .text { font-family: Arial, sans-serif; font-weight: 800; font-size: clamp(36px, 10vw, 96px); letter-spacing: 0.5em; text-transform: uppercase; color: rgba(0,0,0,0.08); transform: rotate(-28deg); user-select: none; white-space: nowrap; }
    @media (max-width: 600px) {
      .header-grid { flex-direction: row; align-items: flex-start; justify-content: space-between; flex-wrap: nowrap; gap: 8px; }
      .header-left { flex-direction: row; align-items: center; flex: 1; min-width: 0; }
      .company-block { align-items: flex-start; text-align: left; }
      .meta-block { align-items: flex-end; text-align: right; justify-content: flex-start; min-width: fit-content; }
      .invoice-badge { font-size: 12px; padding: 4px 8px; }
    }
    @media print {
      body { margin: 0; padding: 0; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .no-break { page-break-inside: avoid; }
      .brand-strip, .header-grid, .footer-section { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .items-table-watermark .text { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
                            storedata?.address?.city || storedata?.address?.postalCode
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
                              formValues.customerPostalCode || formValues.postalCode ? `, Pin: ${formValues.customerPostalCode || formValues.postalCode}` : ""
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
                    <th>Amount(₹)</th>
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
                    <td class="discount">₹${totalDiscount.toFixed(2)}</td>
                    ${
                      isGstInvoice
                        ? `<td style="text-align:right;">₹${totalTaxable.toFixed(2)}</td>
                           <td class="gst-amount" style="text-align:right;">₹${totalGST.toFixed(2)}</td>`
                        : ""
                    }
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
                                    <th style="border:1px solid #ddd; padding:6px; text-align:left;">Date</th>
                                    <th style="border:1px solid #ddd; padding:6px; text-align:right;">Amount</th>
                                    <th style="border:1px solid #ddd; padding:6px; text-align:center;">Payment Method</th>
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
                      createdInvoice ? invoiceData?.subTotal ?? invoiceCalculations.subtotal : invoiceCalculations.subtotal,
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
                              : Number(invoiceCalculations.discountTotal).toFixed(2)
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
          </td>
        </tr>
      </tbody>

      ${
        preview
          ? ""
          : `<tfoot>
              <tr>
                <td>
                  <div class="footer-section">
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
                  </div>
                </td>
              </tr>
            </tfoot>`
      }
    </table>
  </div>
  ${
    invoiceData?.remarks
      ? `<pre style="font-size:8px; color:#666; margin-top:8px;">Remarks : ${invoiceData.remarks}</pre>`
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
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════
// A5 RENDERER — mirrors the React Native A5 app design exactly: logo-only
// header, FROM/TO party row, INV_NO/date/Page-X-of-Y meta row, HSN column,
// bank+QR+payment-summary column beside amount-in-words + totals.
// (Matches PDF-13 / the RN A5 template's look.)
// ════════════════════════════════════════════════════════════════════════
function buildItemsHTMLA5(cartItems, isGstInvoice, isMrpEnabled) {
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
          <td class="l"><div class="iname">${item.name}</div></td>
          <td class="c">${hsn}</td>
          <td class="c">${qty}</td>
          <td class="c">${item.unit || "PCS"}</td>
          ${isMrpEnabled ? `<td class="r">₹${Number(item.mrp || 0).toFixed(2)}</td>` : ""}
          <td class="r">₹${baseRate.toFixed(2)}</td>
          <td class="r">${
            totalDiscount > 0
              ? `₹${totalDiscount.toFixed(2)}${discountPercent ? ` (${discountPercent}%)` : ""}`
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

function tableHeaderA5(isGstInvoice, isMrpEnabled) {
  return `<thead>
    <tr>
      <th style="width:24px">#</th>
      <th style="text-align:left">Item</th>
      <th>HSN</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Rate(₹)</th>
      <th>Discount</th>
      ${isGstInvoice ? "<th>Taxable(₹)</th><th>GST%</th><th>CGST(₹)</th><th>SGST(₹)</th>" : ""}
      <th>Amt(₹)</th>
    </tr>
  </thead>`;
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
    hasCustomerDetails,
    hasBankDetails,
    nonZeroTransactions,
    qrURL,
    storeAddressLine,
    isCancelled,
  } = shared;

  const MAX_PAY_SUMMARY_ROWS = 5;
  const visibleTransactions = nonZeroTransactions.slice(0, MAX_PAY_SUMMARY_ROWS);
  const hiddenTransactionCount = nonZeroTransactions.length - visibleTransactions.length;

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eee; font-family: 'Arial', sans-serif; }
    body { padding: 12px; }
    .page { max-width: 620px; margin: 0 auto; background: #fff; }
    .wrap {
      background: #fff; display: flex; flex-direction: column;
      font-size: 10px; line-height: 1.35; color: #1a1a1a;
      border: 1px solid #2c5aa0; overflow: hidden;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      @page { size: A5; margin: 6mm; }
      .page { max-width: 100% !important; }
      .wrap { border: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    .brand-strip { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-bottom: 1px solid #ccc; background: #f9fafc; font-size: 8.5px; color: #666; }
    .brand-strip img { height: 11px; width: auto; }
    .hdr-title-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 2px solid #2c5aa0; gap: 10px; background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%); }
    .hdr-logo-block { display: flex; align-items: center; flex: 1; min-width: 0; }
    .hdr-logo-block .logo { height: 44px; width: auto; max-width: 100px; object-fit: contain; }
    .hdr-logo-placeholder { height: 44px; }
    .hdr-title-center { flex: 1.6; text-align: center; flex-shrink: 0; }
    .hdr-title-center .main-title { font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #2c5aa0; }
    .hdr-title-center .invoice-rule { width: 80px; height: 2px; background: #2c5aa0; margin: 3px auto 0; }
    .hdr-status-block { flex: 1; display: flex; justify-content: flex-end; align-items: center; }
    .hdr-status-block .ps-inline { padding: 3px 14px; border-radius: 12px; font-size: 9px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.4px; }
    .ps-inline.paid { background: #43a047; } .ps-inline.partial { background: #fb8c00; } .ps-inline.unpaid { background: #e53935; }
    .hdr-parties-row { display: flex; border-bottom: 1px solid #2c5aa0; font-size: 9px; }
    .hdr-party { flex: 1; padding: 7px 14px; min-width: 0; }
    .hdr-party + .hdr-party { border-left: 1px solid #d8dee6; }
    .hdr-party .ttl { font-weight: 700; margin-bottom: 3px; color: #2c5aa0; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.3px; }
    .hdr-party .p-row { line-height: 1.4; }
    .hdr-party .p-lbl { font-weight: 600; }
    .hdr-meta-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 5px 14px; border-bottom: 1.5px solid #2c5aa0; font-size: 8.5px; font-weight: 700; background: #f0f4ff; color: #2c5aa0; }
    .hdr-meta-row span { white-space: nowrap; }
    .tbl-wrap { position: relative; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    .tbl th { background: #2c5aa0; color: #fff; padding: 5px 4px; border: 1px solid #2c5aa0; font-size: 7.5px; text-align: center; text-transform: uppercase; letter-spacing: 0.2px; font-weight: 700; }
    .tbl td { padding: 4px; border: 1px solid #c9d2dc; vertical-align: middle; }
    .tbl .c { text-align: center; } .tbl .r { text-align: right; } .tbl .l { text-align: left; } .tbl .bold { font-weight: 700; }
    .iname { font-weight: 600; }
    .sum-row td { font-weight: 700; background: #f0f4ff; border-top: 1.5px solid #2c5aa0; }
    .tbl-wrap.cancelled::after {
      content: "CANCELLED"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: clamp(28px, 6vw, 60px); font-weight: 900; letter-spacing: 0.4em; color: rgba(0,0,0,0.07);
      transform: rotate(-28deg); pointer-events: none; z-index: 2; white-space: nowrap;
    }
    .totals-wrap { display: flex; align-items: stretch; border-top: 2px solid #2c5aa0; flex-wrap: wrap; }
    .bank-col { flex: 1.3; display: flex; flex-direction: column; gap: 4px; padding: 7px 12px; border-right: 1px solid #2c5aa0; background: #f9fbff; min-width: 200px; }
    .bank-top-row { display: flex; align-items: center; gap: 8px; }
    .bank-col .qr-info { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .bank-col .qr-info img { width: 52px; height: 52px; border: 1px solid #2c5aa0; padding: 2px; background: #fff; }
    .bank-col .qr-info .qr-cap { font-size: 6.5px; color: #555; text-transform: uppercase; }
    .bank-col .bank-info { flex: 1; min-width: 0; font-size: 8px; color: #333; }
    .bank-col .bank-info .ttl { font-weight: 700; color: #2c5aa0; text-transform: uppercase; margin-bottom: 2px; font-size: 7.5px; }
    .bank-col .bank-info .b-row { line-height: 1.4; }
    .bank-col .bank-info .b-lbl { font-weight: 600; color: #2c5aa0; }
    .pay-summary { margin-top: 3px; }
    .pay-summary .ps-ttl { font-weight: 700; color: #2c5aa0; font-size: 7.5px; text-transform: uppercase; margin-bottom: 2px; }
    .pay-summary table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
    .pay-summary th, .pay-summary td { border: 1px solid #c9d2dc; padding: 2px 4px; }
    .pay-summary th { background: #f0f4ff; color: #2c5aa0; font-weight: 700; text-transform: uppercase; }
    .pay-summary td.r { text-align: right; } .pay-summary td.c { text-align: center; }
    .pay-summary .ps-more { font-size: 7px; color: #777; font-style: italic; margin-top: 2px; text-align: right; }
    .words-col { flex: 1; padding: 8px 14px; border-right: 1px solid #2c5aa0; font-size: 8.5px; display: flex; flex-direction: column; justify-content: center; min-width: 170px; }
    .words-lbl { font-weight: 700; color: #2c5aa0; margin-bottom: 3px; text-transform: uppercase; font-size: 8px; }
    .words-val { font-size: 9.5px; font-weight: 600; font-style: italic; }
    .amt-col { width: 190px; flex-shrink: 0; }
    .amt-tbl { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    .amt-tbl td { padding: 4px 8px; border: 1px solid #c9d2dc; }
    .amt-tbl .lbl { font-weight: 600; background: #f8f8f8; }
    .amt-tbl .val { text-align: right; font-weight: 600; }
    .grand .lbl, .grand .val { background: #2c5aa0; color: #fff; font-weight: 700; }
    .pay-red { color: #e53935; } .pay-grn { color: #43a047; }
    .footer-block { border-top: 1.5px solid #2c5aa0; }
    .payment-method-row { text-align: right; font-size: 8px; padding: 4px 14px; color: #444; }
    .ftr { display: flex; justify-content: flex-end; min-height: 45px; }
    .sig-col { width: 170px; padding: 7px 14px; text-align: center; font-size: 8.5px; }
    .sig-line { border-top: 1px solid #2c5aa0; margin-top: 20px; padding-top: 3px; font-weight: 700; font-size: 8px; color: #2c5aa0; }
    .sig-img { max-height: 32px; max-width: 100%; object-fit: contain; }
    .remarks { font-size: 8px; color: #555; padding: 4px 14px; }
    .invoice-terms-content { font-size: 7.5px; color: #666; line-height: 1.5; white-space: pre-line; word-break: break-word; overflow-wrap: anywhere; padding: 5px 14px; }
    .page-footer-text { text-align: center; font-size: 7.5px; color: #999; font-style: italic; padding: 5px 8px; }
    @media (max-width: 500px) {
      .totals-wrap { flex-direction: column; }
      .amt-col { width: 100%; }
      .bank-col, .words-col { border-right: none; border-bottom: 1px solid #2c5aa0; }
    }
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
    <span>Page 1 of 1</span>
  </div>`;

  const headerBlock = preview ? "" : `${titleRow}${partiesRow}${metaRow}`;
  const itemsHTML = buildItemsHTMLA5(cartItems, isGstInvoice, isMrpEnabled);

  const sumRow = `<tr class="sum-row">
    <td></td><td class="l bold">Total</td><td></td>
    <td class="c bold">${totalQty}</td><td></td>
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
                    <img src="${qrURL}" alt="UPI QR" width="52" height="52" onerror="this.closest('.qr-info').style.display='none'">
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

  const totalsBlock = `<div class="totals-wrap">
    ${bankColHTML}
    <div class="words-col">
      <div class="words-lbl">Amount in Words:</div>
      <div class="words-val">${amountInWords}</div>
    </div>
    <div class="amt-col">
      <table class="amt-tbl">
        <tr><td class="lbl">Subtotal</td><td class="val">₹${Number(
          createdInvoice ? invoiceData?.subTotal ?? invoiceCalculations.subtotal : invoiceCalculations.subtotal,
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

  const footer = preview
    ? ""
    : `<div class="ftr">
        <div class="sig-col" style="margin-left:auto;">
          <div style="font-size:8.5px; font-weight:600; color:#2c5aa0;">For ${storedata?.name || "YOUR COMPANY NAME"}</div>
          ${storedata?.signatureUrl ? `<img class="sig-img" src="${storedata.signatureUrl}"><br>` : ""}
          <div class="sig-line">Authorized Signatory</div>
        </div>
      </div>`;

  const remarksRow = invoiceData?.remarks ? `<div class="remarks">Remarks: ${invoiceData.remarks}</div>` : "";
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
  <style>${css}</style>
</head>
<body>
<div class="page">
<div class="wrap">
  ${brandStrip}
  ${headerBlock}
  <div class="tbl-wrap ${isCancelled ? "cancelled" : ""}">
    <table class="tbl">
      ${tableHeaderA5(isGstInvoice, isMrpEnabled)}
      <tbody>
        ${itemsHTML}
        ${sumRow}
      </tbody>
    </table>
  </div>
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
  ${preview ? "" : `<div class="page-footer-text">Invoice generated using amdaani billing app</div>`}
</div>
</div>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY POINT — dispatches to A4 or A5 based on pageFormat, exactly
// what InvoiceListPage.js and InvoiceSummary.js already call. No changes
// needed in either of those files.
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
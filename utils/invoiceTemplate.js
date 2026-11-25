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
// SHARED CALCULATIONS — used by both A4 and A5
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

  // size=300 → sharper QR, easy to scan
  let qrURL = "";
  if (storedata?.bankDetails?.upiId) {
    const upiString = `upi://pay?pa=${storedata.bankDetails.upiId}&pn=${encodeURIComponent(
      storedata?.name || "Merchant",
    )}&am=${roundedGrandTotal}&cu=INR`;
    qrURL = `https://quickchart.io/qr?text=${encodeURIComponent(upiString)}&size=300&margin=1`;
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
// SMALL HELPERS
// ════════════════════════════════════════════════════════════════════════

// label + (possibly blank) value with a writing line
function fld(label, value) {
  return `<div class="fld"><span class="fld-lbl">${label}</span><span class="fld-val">${value || ""}</span></div>`;
}

function getCustomer(formValues) {
  const pin = formValues.customerPostalCode || formValues.postalCode;
  return {
    name: formValues.customerName || formValues.partyName || "",
    address: [
      formValues.customerAddress || formValues.address,
      formValues.customerState || formValues.state,
      pin ? `Pin: ${pin}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    contact: formValues.contactNumber || "",
    gstin: formValues.customerGstNumber || formValues.gstNumber || "",
  };
}

function customerFieldsHTML(c) {
  return `${fld("Name:", c.name)}${fld("Address:", c.address)}${fld("Contact No:", c.contact)}${fld("GSTIN:", c.gstin)}`;
}

// ── Item rows ───────────────────────────────────────────────────────────
function buildItemsHTMLA4(cartItems, isGstInvoice, isMrpEnabled, showNetRate) {
  return cartItems
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
          : "0.00";

      return `
      <tr class="irow">
        <td class="c">${index + 1}</td>
        <td class="l"><div class="iname">${item.name}</div>${item.hsn ? `<div class="sub">HSN: ${item.hsn}</div>` : ""}</td>
        <td class="c">${formatQty(qty)}</td>
        <td class="c">${item.unit || "PCS"}</td>
        ${isMrpEnabled ? `<td class="r">₹${Number(item.mrp || 0).toFixed(2)}</td>` : ""}
        <td class="r">₹${baseRate.toFixed(2)}</td>
        <td class="r">₹${itemTotalDiscount.toFixed(2)}<span class="sub">(${discountPercent}%)</span></td>
        ${
          isGstInvoice
            ? `<td class="r">₹${taxableValue.toFixed(2)}</td>
               <td class="r">${gstRate > 0 ? `₹${gstAmount.toFixed(2)}<span class="sub">(${gstRate}%)</span>` : "—"}</td>`
            : ""
        }
        ${showNetRate ? `<td class="r">₹${netRate.toFixed(2)}</td>` : ""}
        <td class="r bold">₹${total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");
}

function buildItemsHTMLA5(cartItems, isGstInvoice, isMrpEnabled, showNetRate) {
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
              ? `₹${totalDiscount.toFixed(2)}${discountPercent ? `<span class="sub">(${discountPercent}%)</span>` : ""}`
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

// ── Column header rows (same names in A4 and A5, sentence case) ─────────
function columnHeaderRow(isA4, isGstInvoice, isMrpEnabled, showNetRate) {
  if (isA4) {
    return `<tr class="col-row">
      <th>Sl. No.</th>
      <th class="l" style="text-align:left">Item Description</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Price/Unit(₹)</th>
      <th>Discount(₹)</th>
      ${isGstInvoice ? "<th>Taxable Value(₹)</th><th>GST Amt.(%)</th>" : ""}
      ${showNetRate ? "<th>Net Rate(₹)</th>" : ""}
      <th>Amount(₹)</th>
    </tr>`;
  }
  return `<tr class="col-row">
      <th>Sl. No.</th>
      <th class="l" style="text-align:left">Item Description</th>
      <th>HSN</th>
      <th>Qty</th>
      <th>Unit</th>
      ${isMrpEnabled ? "<th>MRP(₹)</th>" : ""}
      <th>Price/Unit(₹)</th>
      <th>Discount(₹)</th>
      ${isGstInvoice ? "<th>Taxable Value(₹)</th><th>GST(%)</th><th>CGST(₹)</th><th>SGST(₹)</th>" : ""}
      ${showNetRate ? "<th>Net Rate(₹)</th>" : ""}
      <th>Amount(₹)</th>
    </tr>`;
}

// ════════════════════════════════════════════════════════════════════════
// PRINT SCRIPT (shared by A4 and A5)
//
//  Runs ONLY when printing. It builds explicit pages:
//   - every page = its own small table with the FULL header (company header +
//     column header) and the real "Page X of Y"
//   - rows are added one by one and the REAL page height is measured, so a
//     page is filled as much as possible
//   - summary row (foot-row) follows the items, the END row (terms / bank+QR /
//     signature) is pinned to the very bottom of the LAST page
//   - biggest text scale that needs the fewest pages is used (min 75%)
//  afterprint: everything is moved back, the screen never changes.
//
// NOTE: no backticks / dollar-brace inside the script text.
// ════════════════════════════════════════════════════════════════════════
function buildFitScript(pageW, ratio) {
  return `
(function () {
  var PAGE_W = ${pageW};
  var PAGE_H = PAGE_W * ${ratio};
  var MIN_FIT = 0.75;
  var STEP = 0.02;
  var SAFETY = [0.95, 0.92, 0.89];
  var BASE_MM = 198 / PAGE_W;   // 1rem at scale 1, in mm (printable width = 198mm)
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
  function applyScale(f) {
    root.style.fontSize = (BASE_MM * f) + 'mm';
    page.style.setProperty('max-width', 'none');
    page.style.setProperty('width', (PAGE_W / f) + 'rem');
  }
  function clearWidth() {
    page.style.removeProperty('width');
    page.style.removeProperty('max-width');
  }

  function undo() {
    if (!state) return;
    var tb = origTable.tBodies[0];
    for (var i = 0; i < state.rows.length; i++) tb.appendChild(state.rows[i]);
    var pns = state.thead.querySelectorAll('.pg-no');
    for (var j = 0; j < pns.length; j++) pns[j].textContent = 'Page 1 of 1';
    origTable.insertBefore(state.thead, tb);
    if (state.container.parentNode) state.container.parentNode.removeChild(state.container);
    wrapEl.classList.remove('paged');
    origTable.style.display = '';
    state = null;
  }

  function hOf(el, rem) { return el.getBoundingClientRect().height / rem; }

  // measure the untouched table at text scale f
  function measure(f) {
    applyScale(f);
    var rem = remPx();
    var thead = origTable.tHead;
    var tbody = origTable.tBodies[0];
    if (!thead || !tbody) return null;

    var allRows = Array.prototype.slice.call(tbody.rows);
    var rows = allRows.slice();
    var endRow = null, footRow = null;
    if (rows.length && rows[rows.length - 1].classList.contains('end-row')) endRow = rows.pop();
    if (rows.length && rows[rows.length - 1].classList.contains('foot-row')) footRow = rows.pop();
    if (!rows.length) return null;

    var colRow = thead.querySelector('tr.col-row');
    var tw = origTable.getBoundingClientRect().width;
    var colWidths = [];
    if (colRow && tw > 0) {
      for (var c = 0; c < colRow.cells.length; c++) {
        colWidths.push(colRow.cells[c].getBoundingClientRect().width / tw * 100);
      }
    }

    // every item alone, but the LAST item stays together with the Total row
    var units = [];
    for (var i = 0; i < rows.length; i++) units.push({ rows: [rows[i]] });
    if (units.length >= 2) {
      var s = units.pop();
      var l = units.pop();
      units.push({ rows: l.rows.concat(s.rows) });
    }

    return { thead: thead, allRows: allRows, units: units, foot: footRow, end: endRow, colWidths: colWidths };
  }

  // build real pages with real measuring; returns number of pages
  function layout(m, cap, rem, full) {
    var container = document.createElement('div');
    container.className = 'pg-container';
    origTable.parentNode.insertBefore(container, origTable.nextSibling);
    origTable.style.display = 'none';
    wrapEl.classList.add('paged');
    state = { thead: m.thead, rows: m.allRows, container: container };

    var pages = [];

    function newPage() {
      var wrap = document.createElement('div');
      wrap.className = 'pg-wrap';
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
      var th = pages.length === 0 ? m.thead : m.thead.cloneNode(true);
      t.appendChild(th);
      var tb = document.createElement('tbody');
      t.appendChild(tb);
      wrap.appendChild(t);
      container.appendChild(wrap);
      var p = { wrap: wrap, tb: tb, th: th, units: [], pin: null };
      pages.push(p);
      return p;
    }

    function addUnit(p, u) {
      for (var i = 0; i < u.rows.length; i++) p.tb.appendChild(u.rows[i]);
      p.units.push(u);
    }
    function removeUnit(p, u) {
      for (var i = 0; i < u.rows.length; i++) {
        if (u.rows[i].parentNode) u.rows[i].parentNode.removeChild(u.rows[i]);
      }
      p.units.pop();
    }
    function attach(p) {
      if (m.foot) p.tb.appendChild(m.foot);
      if (m.end) {
        var pin = document.createElement('div');
        pin.className = 'pg-pin';
        var pt = document.createElement('table');
        pt.className = 'tbl pin-tbl';
        var pb = document.createElement('tbody');
        pb.appendChild(m.end);
        pt.appendChild(pb);
        pin.appendChild(pt);
        p.wrap.appendChild(pin);
        p.pin = pin;
      }
    }
    function detach(p) {
      if (m.foot && m.foot.parentNode) m.foot.parentNode.removeChild(m.foot);
      if (p.pin) {
        if (p.pin.parentNode) p.pin.parentNode.removeChild(p.pin);
        p.pin = null;
      }
    }
    function dropColRow(p) {
      var cr = p.th.querySelector('tr.col-row');
      if (cr && cr.parentNode) cr.parentNode.removeChild(cr);
    }

    // 1) items: add one by one, move to next page when the REAL page is full
    var cur = newPage();
    for (var k = 0; k < m.units.length; k++) {
      var u = m.units[k];
      addUnit(cur, u);
      if (cur.units.length > 1 && hOf(cur.wrap, rem) > cap) {
        removeUnit(cur, u);
        cur = newPage();
        addUnit(cur, u);
      }
    }

    // 2) summary + end row on the last page
    if (m.foot || m.end) {
      var last = cur;
      attach(last);
      if (hOf(last.wrap, rem) > cap) {
        detach(last);
        var moved = null;
        if (last.units.length > 1) {
          moved = last.units[last.units.length - 1];
          removeUnit(last, moved);
        }
        var np = newPage();
        if (moved) {
          addUnit(np, moved);
          attach(np);
          if (hOf(np.wrap, rem) > cap) {
            detach(np);
            removeUnit(np, moved);
            addUnit(last, moved);
            dropColRow(np);
            attach(np);
          }
        } else {
          dropColRow(np);
          attach(np);
        }
      }
    }

    // 3) finish: page breaks, pin end row to the bottom, page numbers
    var n = pages.length;
    for (var i = 0; i < n; i++) {
      var pn = pages[i].th.querySelectorAll('.pg-no');
      for (var j = 0; j < pn.length; j++) pn[j].textContent = 'Page ' + (i + 1) + ' of ' + n;
      if (i < n - 1) pages[i].wrap.classList.add('pg-break');
    }
    var lp = pages[n - 1];
    if (lp.pin) {
      lp.wrap.classList.add('pg-last');
      lp.wrap.style.minHeight = full + 'rem';
    }
    return n;
  }

  function overflows(f) {
    if (!state) return false;
    var rem = remPx();
    var lim = (PAGE_H / f) * 0.98;
    var kids = state.container.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].getBoundingClientRect().height / rem > lim) return true;
    }
    return false;
  }

  function fit() {
    undo();
    root.style.removeProperty('font-size');
    clearWidth();
    try {
      // 1) biggest text scale that needs the FEWEST pages
      var best = null;
      for (var f = 1; f >= MIN_FIT - 0.0001; f -= STEP) {
        undo();
        var m = measure(f);
        if (!m) return;
        var n = layout(m, (PAGE_H / f) * SAFETY[0], remPx(), (PAGE_H / f) * 0.97);
        if (!best || n < best.n) best = { f: f, n: n };
        if (n === 1) break;
      }
      // 2) final build + verify (shrink only if really needed)
      for (var ff = best.f; ff >= MIN_FIT - 0.0001; ff -= STEP) {
        for (var s = 0; s < SAFETY.length; s++) {
          undo();
          var m2 = measure(ff);
          if (!m2) return;
          layout(m2, (PAGE_H / ff) * SAFETY[s], remPx(), (PAGE_H / ff) * 0.97);
          if (!overflows(ff)) return;
        }
      }
    } finally {
      clearWidth();   // font-size stays so print uses the same scale
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
}

// ════════════════════════════════════════════════════════════════════════
// ONE RENDERER FOR A4 + A5 (same structure, same fonts, same footer)
// ════════════════════════════════════════════════════════════════════════
function buildInvoiceHtml(args, shared, fmt) {
  const isA4 = fmt === "a4";
  const cfg = isA4
    ? { pageW: 70, ratio: 285 / 198, pageSize: "A4" }
    : { pageW: 80, ratio: 136 / 198, pageSize: "A5 landscape" };

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
    hasBankDetails,
    nonZeroTransactions,
    qrURL,
    storeAddressLine,
    isCancelled,
  } = shared;

  const showNetRate =
    isGstInvoice && storedata?.settings?.showGstPerUnit === true;

  const colCount = isA4
    ? 7 + (isMrpEnabled ? 1 : 0) + (isGstInvoice ? 2 : 0) + (showNetRate ? 1 : 0)
    : 8 + (isMrpEnabled ? 1 : 0) + (isGstInvoice ? 4 : 0) + (showNetRate ? 1 : 0);

  const cust = getCustomer(formValues);

  const MAX_PAY_SUMMARY_ROWS = 5;
  const visibleTransactions = nonZeroTransactions.slice(0, MAX_PAY_SUMMARY_ROWS);
  const hiddenTransactionCount =
    nonZeroTransactions.length - visibleTransactions.length;

  // ───────────────────────── CSS ─────────────────────────
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

    @page { size: ${cfg.pageSize}; margin: 6mm; }
    @media print {
      html { font-size: calc(198mm / ${cfg.pageW}); }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      .page { width: 198mm; max-width: none !important; margin: 0 !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }

    /* ── customer fields (A4 + A5) ── */
    .fld { display: flex; align-items: flex-end; gap: 0.4rem; margin-bottom: 0.3rem; }
    .fld-lbl { font-weight: 700; white-space: nowrap; }
    .fld-val { flex: 1; min-width: 0; min-height: 1.25em; border-bottom: 1px dotted #8a97ab; overflow-wrap: anywhere; }

    /* ── brand strip ── */
    .brand-strip { display: flex; align-items: center; gap: 0.6rem; padding: 0.3rem 1rem; background: #f9fafc; font-size: 0.95rem; color: #666; }
    .brand-strip img { height: 1.2rem; width: auto; }

    /* ── A4 header ── */
    .header-grid { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.4rem; border-bottom: 1px solid #2c5aa0; gap: 1rem; background: #fff; }
    .header-left { display: flex; align-items: flex-start; gap: 1rem; flex: 1; min-width: 0; }
    .company-logo { height: 5.6rem; width: auto; max-width: 10rem; object-fit: contain; }
    .company-block { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .company-name { font-size: 1.7rem; font-weight: 800; color: #2c5aa0; text-transform: uppercase; margin-bottom: 0.2rem; }
    .company-tagline { font-size: 1rem; color: #555; font-style: italic; margin-bottom: 0.3rem; }
    .company-details { font-size: 1rem; color: #444; line-height: 1.4; overflow-wrap: anywhere; }
    .meta-block { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 0.4rem; min-width: 14rem; }
    .invoice-badge { font-weight: 700; font-size: 1.4rem; padding: 0.5rem 1.1rem; border-radius: 0.5rem; text-transform: uppercase; background: #2c5aa0; color: #fff; letter-spacing: 0.04em; text-align: center; }
    .pg-no { font-weight: 700; color: #2c5aa0; white-space: nowrap; }
    .invoice-info { display: flex; border-bottom: 1px solid #2c5aa0; }
    .invoice-info-left, .invoice-info-right { flex: 1; padding: 0.8rem 1.2rem; min-width: 0; }
    .invoice-info-left { border-right: 1px solid #d8dee6; }
    .info-row { display: flex; margin-bottom: 0.4rem; }
    .info-label { min-width: 8rem; font-weight: 700; }
    .customer-title { font-weight: 700; color: #2c5aa0; margin-bottom: 0.3rem; }

    /* ── A5 header (compact) ── */
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
    .hdr-party .ttl { font-weight: 700; margin-bottom: 2px; color: #2c5aa0; }
    .hdr-party .p-row { line-height: 1.35; overflow-wrap: anywhere; }
    .hdr-party .p-lbl { font-weight: 700; }
    .hdr-party .fld { margin-bottom: 0.15rem; }
    .hdr-meta-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 3px 14px; border-bottom: 1px solid #2c5aa0; font-size: 1.05rem; font-weight: 700; background: #f0f4ff; color: #2c5aa0; }
    .hdr-meta-row span { white-space: nowrap; }

    /* ── THE BIG TABLE (child combinators only) ── */
    .tbl { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 1.1rem; }
    .tbl > thead { display: table-header-group; }
    .tbl > thead > tr > th { background: #dbe6f7; color: #1f3f73; padding: 4px 3px; border: 1px solid #b9cbe8; font-size: 0.95rem; text-align: center; font-weight: 700; white-space: normal; line-height: 1.15; }
    .tbl > thead > tr > th.hdr-th { background: transparent; color: #1a1a1a; padding: 0; border: 0; font-size: 1.1rem; text-align: left; font-weight: 400; line-height: 1.35; }

    .tbl > tbody > tr > td { padding: 0.45rem 0.7rem; border: 0; border-left: 1px solid #c9d2dc; border-right: 1px solid #c9d2dc; vertical-align: middle; white-space: nowrap; }
    .tbl > tbody > tr > td.c { text-align: center; }
    .tbl > tbody > tr > td.r { text-align: right; }
    .tbl > tbody > tr > td.bold, .tbl .bold { font-weight: 700; }
    .tbl > thead > tr > th.l, .tbl > tbody > tr > td.l { text-align: left; min-width: 11rem; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
    .tbl .sub { display: inline; margin-left: 0.3rem; font-size: 0.85rem; color: #555; font-weight: 400; }
    .tbl td.l .sub { display: block; margin-left: 0; }
    .pay-summary .sub { display: block; margin-left: 0; }
    .iname { font-weight: 600; font-size: 1.2rem; }
    .sum-row > td { font-weight: 700; background: #f0f4ff; border-top: 1px solid #2c5aa0; border-bottom: 1px solid #c9d2dc; }
    .tbl > tbody > tr > td.full { padding: 0; border: 0; white-space: normal; text-align: left; vertical-align: top; }
    .tbl > tbody > tr.irow, .tbl > thead > tr { break-inside: avoid; page-break-inside: avoid; }

    /* ── print-time pages ── */
    .wrap.paged { border: 0; }
    .pg-wrap { display: block; box-sizing: border-box; width: 100%; border: 0; background: #fff; position: relative; }
    .pg-wrap::after { content: ""; position: absolute; inset: 0; border: 1.5px solid #2c5aa0; pointer-events: none; }
    .pg-wrap.pg-break { break-after: page; page-break-after: always; }
    .pg-wrap:last-child { break-after: avoid; page-break-after: avoid; }
    .pg-wrap .tbl > thead { display: table-row-group; }
    .pg-wrap.pg-last { display: flex; flex-direction: column; }
    .pg-wrap.pg-last > .tbl { flex: 0 0 auto; }
    .pg-pin { margin-top: auto; }

    .cancel-mark {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 6rem; font-weight: 900; letter-spacing: 0.4em; color: rgba(0,0,0,0.07);
      transform: rotate(-28deg); pointer-events: none; z-index: 2; white-space: nowrap;
    }

    /* ── SUMMARY ROW: [ payment summary | words + tax summary | totals ] ── */
    .footer-block { border-top: 1px solid #2c5aa0; }
    .totals-wrap { display: flex; align-items: stretch; }
    .pay-col { flex: 0 0 auto; min-width: 18rem; padding: 0.6rem 1rem; border-right: 1px solid #c9d2dc; background: #f9fbff; }
    .pay-summary .ps-ttl { font-weight: 700; color: #2c5aa0; font-size: 1.1rem; margin-bottom: 0.3rem; }
    .pay-summary table { width: 100%; border-collapse: collapse; font-size: 1rem; }
    .pay-summary th, .pay-summary td { border: 1px solid #c9d2dc; padding: 2px 5px; white-space: nowrap; }
    .pay-summary th { background: #dbe6f7; color: #1f3f73; font-weight: 700; }
    .pay-summary td.r { text-align: right; } .pay-summary td.c { text-align: center; }
    .pay-summary .ps-more { font-size: 0.85rem; color: #777; margin-top: 2px; text-align: right; }

    .mid-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; border-right: 1px solid #c9d2dc; }
    .words-box { padding: 0.6rem 1rem; }
    .words-lbl { font-weight: 700; color: #2c5aa0; margin-bottom: 0.3rem; font-size: 1.1rem; }
    .words-val { font-size: 1.2rem; font-weight: 700; color: #1f3f73; }
    .tax-sum { margin-top: auto; border-top: 1px solid #c9d2dc; }
    .tax-ttl { padding: 3px 0; font-size: 1.1rem; font-weight: 700; text-align: center; color: #2c5aa0; background: #f0f4ff; }
    .tax-tbl { width: 100%; border-collapse: collapse; font-size: 1rem; }
    .tax-tbl th, .tax-tbl td { padding: 2px 5px; border: 1px solid #c9d2dc; text-align: center; white-space: nowrap; }
    .tax-tbl th { background: #dbe6f7; color: #1f3f73; font-size: 0.95rem; font-weight: 700; }
    .tax-tbl tr.total-row td { font-weight: 700; background: #f8f8f8; }

    .amt-col { flex: 0 0 17rem; }
    .amt-tbl { width: 100%; border-collapse: collapse; font-size: 1.15rem; }
    .amt-tbl td { padding: 4px 8px; border: 1px solid #c9d2dc; white-space: nowrap; }
    .amt-tbl .lbl { font-weight: 600; background: #f8f8f8; }
    .amt-tbl .val { text-align: right; font-weight: 600; }
    .grand .lbl, .grand .val { background: #dbe6f7; color: #1f3f73; font-weight: 700; }
    .pay-red { color: #e53935; } .pay-grn { color: #43a047; }

    .pay-tail { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; padding: 0.3rem 1.2rem; border-top: 1px solid #c9d2dc; font-size: 1.05rem; color: #444; }
    .pay-pill { padding: 0.15rem 1.2rem; border-radius: 1.2rem; font-weight: 700; font-size: 0.95rem; color: #fff; }
    .pay-pill.paid { background: #43a047; } .pay-pill.partial { background: #fb8c00; } .pay-pill.unpaid { background: #e53935; }

    /* ── END ROW: [ terms | bank + QR | signature ] (pinned to page bottom) ── */
    .end-wrap { display: flex; align-items: stretch; border-top: 1px solid #2c5aa0; }
    .terms-col { flex: 1.2 1 0; min-width: 0; padding: 0.7rem 1.2rem; }
    .bank-col2 { flex: 1.3 1 0; min-width: 0; padding: 0.7rem 1.2rem; border-left: 1px solid #c9d2dc; }
    .sig-col { flex: 0 0 17rem; padding: 0.7rem 1.2rem; border-left: 0; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; font-size: 1.1rem; }
    .end-ttl { font-weight: 700; color: #2c5aa0; margin-bottom: 0.4rem; font-size: 1.15rem; }
    .terms-text { font-size: 1.15rem; color: #333; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; }
    .terms-text + .terms-text { margin-top: 0.4rem; }
    .bank-flex { display: flex; align-items: center; gap: 1rem; }
    .qr-info { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .qr-img { width: 8.5rem; height: 8.5rem; border: 1px solid #2c5aa0; padding: 2px; background: #fff; }
    .fmt-a4 .qr-img { width: 12rem; height: 12rem; }
    .qr-cap { font-size: 0.95rem; color: #555; font-weight: 700; }
    .bank-info { flex: 1; min-width: 0; font-size: 1.1rem; color: #222; }
    .b-row { line-height: 1.55; overflow-wrap: anywhere; }
    .b-lbl { font-weight: 700; color: #2c5aa0; }
    .sig-img { max-height: 4rem; max-width: 100%; object-fit: contain; }
    .sig-line { border-top: 1px solid #2c5aa0; margin-top: 1.6rem; padding-top: 3px; font-weight: 700; font-size: 1.05rem; color: #2c5aa0; }
    .page-footer-text { text-align: center; font-size: 0.9rem; color: #999; font-style: italic; padding: 4px 8px; border-top: 1px solid #e3e8ef; }
  `;

  // ───────────────────────── HEADER ─────────────────────────
  const brandStrip = isFreePlan
    ? `<div class="brand-strip">
        ${appBrand?.logoUrl ? `<img src="${appBrand.logoUrl}" alt="${appBrand?.name || ""}" onerror="this.style.display='none'">` : ""}
        <span>Powered by ${appBrand?.name || "AMDAANI"}</span>
      </div>`
    : "";

  const a4Header = `
    <header class="header-grid">
      <div class="header-left">
        ${storedata?.logoUrl ? `<img class="company-logo" src="${storedata.logoUrl}" alt="Logo" onerror="this.style.display='none'">` : ""}
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
        <div class="pg-no">Page 1 of 1</div>
      </div>
    </header>
    <div class="invoice-info">
      <div class="invoice-info-left">
        <div class="info-row"><span class="info-label">Invoice No:</span><span>${invoiceNumber}</span></div>
        <div class="info-row"><span class="info-label">Invoice Date:</span><span>${format(invoiceDate, "dd-MMM-yyyy")}</span></div>
        <div class="info-row"><span class="info-label">Invoice Time:</span><span>${format(invoiceDate, "hh:mm a")}</span></div>
      </div>
      <div class="invoice-info-right">
        <div class="customer-title">To:</div>
        ${customerFieldsHTML(cust)}
      </div>
    </div>`;

  const a5Header = `
    <div class="hdr-title-row">
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
    </div>
    <div class="hdr-parties-row">
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
        <div class="ttl">To:</div>
        ${customerFieldsHTML(cust)}
      </div>
    </div>
    <div class="hdr-meta-row">
      <span>INV_NO : ${invoiceNumber}</span>
      <span>Invoice Date : ${format(invoiceDate, "dd/MM/yyyy")} &nbsp;|&nbsp; ${format(invoiceDate, "hh:mm a")}</span>
      <span class="pg-no">Page 1 of 1</span>
    </div>`;

  const headerCellHTML = `${brandStrip}${preview ? "" : isA4 ? a4Header : a5Header}`;

  const theadHTML = `<thead>
      ${
        headerCellHTML.trim()
          ? `<tr class="hdr-row"><th class="hdr-th" colspan="${colCount}">${headerCellHTML}</th></tr>`
          : ""
      }
      ${columnHeaderRow(isA4, isGstInvoice, isMrpEnabled, showNetRate)}
    </thead>`;

  // ───────────────────────── ITEMS + TOTAL ROW ─────────────────────────
  const itemsHTML = (isA4 ? buildItemsHTMLA4 : buildItemsHTMLA5)(
    cartItems,
    isGstInvoice,
    isMrpEnabled,
    showNetRate,
  );

  const sumRow = isA4
    ? `<tr class="sum-row irow">
        <td></td><td class="l bold">Total</td>
        <td class="c bold">${formatQty(totalQty)}</td>
        <td></td>
        ${isMrpEnabled ? "<td></td>" : ""}
        <td></td>
        <td class="r bold">₹${totalDiscount.toFixed(2)}</td>
        ${
          isGstInvoice
            ? `<td class="r bold">₹${totalTaxable.toFixed(2)}</td>
               <td class="r bold">₹${totalGST.toFixed(2)}</td>`
            : ""
        }
        ${showNetRate ? "<td></td>" : ""}
        <td class="r bold">₹${totalAmount.toFixed(2)}</td>
      </tr>`
    : `<tr class="sum-row irow">
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

  // ───────────────────────── SUMMARY ROW ─────────────────────────
  const paymentSummaryHTML =
    visibleTransactions.length > 0
      ? `<div class="pay-col"><div class="pay-summary">
          <div class="ps-ttl">Payment Summary</div>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Payment Method</th></tr></thead>
            <tbody>
              ${visibleTransactions
                .map(
                  (t) => `
                <tr>
                  <td>${format(new Date(t.createdAt), "dd-MMM-yy")}<div class="sub">${format(new Date(t.createdAt), "hh:mm a")}</div></td>
                  <td class="r">₹${Number(t.amount || 0).toFixed(2)}</td>
                  <td class="c">${(t.paymentMethod || "").toUpperCase()}</td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          ${hiddenTransactionCount > 0 ? `<div class="ps-more">+${hiddenTransactionCount} more payment${hiddenTransactionCount !== 1 ? "s" : ""}</div>` : ""}
        </div></div>`
      : "";

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

  const totalsBlock = `<div class="totals-wrap">
    ${paymentSummaryHTML}
    <div class="mid-col">
      <div class="words-box">
        <div class="words-lbl">Amount in Words:</div>
        <div class="words-val">${amountInWords}</div>
      </div>
      ${taxSummaryHTML}
    </div>
    <div class="amt-col">
      <table class="amt-tbl">
        <tr><td class="lbl">Subtotal</td><td class="val">₹${Number(
          createdInvoice
            ? (invoiceData?.subTotal ?? invoiceCalculations.subtotal)
            : invoiceCalculations.subtotal,
        ).toFixed(2)}</td></tr>
        ${
          isGstInvoice
            ? `<tr><td class="lbl">Total Tax</td><td class="val">₹${Number(totalGST).toFixed(2)}</td></tr>`
            : ""
        }
        ${
          (invoiceCalculations?.discountTotal ?? 0) > 0
            ? `<tr><td class="lbl">Extra Discount</td><td class="val pay-red">−₹${
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
                  ? `${Number(invoiceData?.roundOff || 0) >= 0 ? "+" : ""}${Number(invoiceData?.roundOff || 0).toFixed(2)}`
                  : `${Number(roundOffValue) < 0 ? "−" : "+"}₹${Math.abs(Number(roundOffValue)).toFixed(2)}`
              }</td></tr>`
            : ""
        }
        <tr class="grand"><td class="lbl">Net Total</td><td class="val">₹${finalGrandTotal.toFixed(2)}</td></tr>
        ${
          payment.status !== "paid" || payment.due > 0
            ? `<tr><td class="lbl">Paid Amount</td><td class="val">₹${Number(payment.paid || 0).toFixed(2)}</td></tr>
               <tr><td class="lbl">Due Amount</td><td class="val ${payment.due > 0 ? "pay-red" : ""}">₹${Math.round(payment.due).toFixed(2)}</td></tr>`
            : ""
        }
      </table>
    </div>
  </div>`;

  const hasMethodInfo = invoiceData?.paymentMethod || invoiceData?.paymentNote;
  const payTail =
    isA4 || hasMethodInfo
      ? `<div class="pay-tail">
          ${
            isA4
              ? `<span class="pay-pill ${payment.status?.toLowerCase()}">${
                  payment.status === "paid"
                    ? "Amount is Fully Paid"
                    : payment.status === "partial"
                      ? "Amount is Partially Paid"
                      : "Amount is Unpaid"
                }</span>`
              : ""
          }
          ${invoiceData?.paymentMethod && Number(payment.paid) > 0 ? `<span><span style="color:#666;">Payment Method:</span> <strong>${invoiceData.paymentMethod.toUpperCase()}</strong></span>` : ""}
          ${invoiceData?.paymentNote ? `<span><span style="color:#666;">Note:</span> ${invoiceData.paymentNote}</span>` : ""}
        </div>`
      : "";

  // A5 preview showed no footer at all, A4 preview showed totals only
  const showSummary = !preview || isA4;
  const footRowHTML = showSummary
    ? `<tr class="foot-row">
        <td class="full" colspan="${colCount}">
          <div class="footer-block">
            ${totalsBlock}
            ${payTail}
          </div>
        </td>
      </tr>`
    : "";

  // ───────────────────────── END ROW (terms | bank+QR | signature) ─────────
  const remarksText = invoiceData?.remarks ? String(invoiceData.remarks) : "";
  const termsText = storedata?.settings?.invoiceTerms
    ? String(storedata.settings.invoiceTerms)
    : "";

  const bankHTML =
    hasBankDetails || qrURL
      ? `<div class="bank-col2">
          <div class="end-ttl">Bank Details:</div>
          <div class="bank-flex">
            ${
              qrURL
                ? `<div class="qr-info">
                    <img class="qr-img" src="${qrURL}" alt="UPI QR" onerror="this.closest('.qr-info').style.display='none'">
                    <div class="qr-cap">Scan &amp; Pay</div>
                  </div>`
                : ""
            }
            <div class="bank-info">
              ${storedata?.bankDetails?.bankName ? `<div class="b-row"><span class="b-lbl">Bank:</span> ${storedata.bankDetails.bankName}</div>` : ""}
              ${storedata?.bankDetails?.accountNo ? `<div class="b-row"><span class="b-lbl">A/C No:</span> ${storedata.bankDetails.accountNo}</div>` : ""}
              ${storedata?.bankDetails?.ifsc ? `<div class="b-row"><span class="b-lbl">IFSC:</span> ${storedata.bankDetails.ifsc}</div>` : ""}
              ${storedata?.bankDetails?.upiId ? `<div class="b-row"><span class="b-lbl">UPI ID:</span> ${storedata.bankDetails.upiId}</div>` : ""}
            </div>
          </div>
        </div>`
      : "";

  const signatureHTML = `<div class="sig-col">
      <div style="font-weight:700; color:#2c5aa0;">For ${storedata?.name || "YOUR COMPANY NAME"}</div>
      ${storedata?.signatureUrl ? `<img class="sig-img" src="${storedata.signatureUrl}"><br>` : ""}
      <div class="sig-line">Authorized Signatory</div>
    </div>`;

  const endRowHTML = preview
    ? ""
    : `<tr class="end-row">
        <td class="full" colspan="${colCount}">
          <div class="end-wrap">
            <div class="terms-col">
              <div class="end-ttl">Terms &amp; Conditions:</div>
              ${remarksText ? `<div class="terms-text"><strong>Remarks:</strong> ${remarksText}</div>` : ""}
              ${termsText ? `<div class="terms-text">${termsText}</div>` : ""}
            </div>
            ${bankHTML}
            ${signatureHTML}
          </div>
          <div class="page-footer-text">Invoice generated using amdaani billing app</div>
        </td>
      </tr>`;

  // ───────────────────────── DOCUMENT ─────────────────────────
  return /*html*/ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice #${invoiceNumber}</title>
  <style>${css}</style>
</head>
<body class="fmt-${fmt}">
${isCancelled ? `<div class="cancel-mark">CANCELLED</div>` : ""}
<div class="page">
<div class="wrap">
  <table class="tbl">
    ${theadHTML}
    <tbody>
      ${itemsHTML}
      ${sumRow}
      ${footRowHTML}
      ${endRowHTML}
    </tbody>
  </table>
</div>
</div>
<script>${buildFitScript(cfg.pageW, cfg.ratio)}</script>
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

  return buildInvoiceHtml(fullArgs, shared, isA5 ? "a5" : "a4");
};
import { format } from "date-fns";
import {
  resolveDotWidth,
  fetchImageAsDataURL,
  escapeHtml,
  FONT_FAMILY,
  scaleFontFromCharWidth,
  scaleSpace,
  scaleImg,
  canvasToRasterBytes,
  rasterToEscPosString,
  INIT,
  CUT,
  feed,
} from "./generateThermalInvoiceESCPOS";

// ─────────────────────────────────────────────────────────────────
// KOT (Kitchen Order Ticket) — mirrors the RN app's generateKOTHTML.js
// design (store header, big "KOT" banner, Invoice/Date/Customer meta,
// Sl.No/Item Name/Qty table, Total Qty row, "KITCHEN ORDER COPY"
// footer), but reuses the web's existing font-scaling / dashed-line /
// ESC/POS raster system so it visually matches the invoice/thermal
// receipt already implemented here.
// ─────────────────────────────────────────────────────────────────

async function buildThermalKOTHTML({
  invoiceData = {},
  formValues = {},
  cartItems = [],
  invoiceNumber,
  invoiceDate,
  storedata = {},
  isGstInvoice = false,
  widthPx = 384,
  paperWidthMM = 58,
}) {
  const items = cartItems?.length ? cartItems : invoiceData?.items || [];

  const logoDataUrl = await fetchImageAsDataURL(storedata?.logoUrl);
  const logoW = scaleImg("logo", widthPx);

  const totalQty = items.reduce(
    (sum, item) => sum + Number(item.qty ?? item.quantity ?? 0),
    0,
  );

  const itemsHTML = items
    .map((item, index) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const note = item.note || item.notes || "";
      return `
        <tr>
          <td class="center nowrap">${index + 1}</td>
          <td class="item-name">
            ${escapeHtml(item.name || "")}
            ${note ? `<br/><span class="note">${escapeHtml(note)}</span>` : ""}
          </td>
          <td class="right nowrap">${qty}</td>
        </tr>`;
    })
    .join("");

  const addr = storedata?.address || {};
  const addrLine = [addr.street, addr.city].filter(Boolean).join(", ");
  const addrLine2 = [addr.state, addr.postalCode].filter(Boolean).join(" ");

  const customerName =
    formValues?.customerName ||
    formValues?.partyName ||
    invoiceData?.customerName ||
    "";

  const fA = scaleFontFromCharWidth("a", widthPx);
  const fB = scaleFontFromCharWidth("b", widthPx);
  const fKotTitle = Math.round(fA * 1.8); // big bold "KOT" banner, RN-style large size

  const sXs = scaleSpace("xs", widthPx);
  const sSm = scaleSpace("sm", widthPx);
  const sMd = scaleSpace("md", widthPx);
  const sLg = scaleSpace("lg", widthPx);

  return /*html*/ `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page {
          size: ${paperWidthMM}mm auto !important;
          margin: 0 !important;
        }
        @media print {
          html, body {
            width: ${paperWidthMM}mm !important;
            min-width: 0 !important;
            max-width: ${paperWidthMM}mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #container { width: 100% !important; overflow-x: visible !important; }
        }
        * { box-sizing: border-box; }
        html, body {
          width: ${widthPx}px;
          margin: 0;
          padding: 0;
          color: #000;
          background: #fff;
          font-family: ${FONT_FAMILY};
          overflow-x: hidden;
        }
        #container { width: 100%; overflow-x: hidden; padding: ${sSm}px 0px ${sMd}px 3px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: bold; }
        .nowrap { white-space: nowrap; }
        .dashed { border-top: 1px dashed #000; margin: ${sLg}px 0; }
        .store-name { font-size: ${fA}px; font-weight: bold; line-height: 1.3; margin-top: ${sXs}px; }
        .tagline { font-size: ${fB}px; line-height: 1.4; margin-top: ${sXs}px; }
        .addr-block { margin-top: ${sXs}px; }
        .addr { font-size: ${fB}px; line-height: 1.4; font-weight: normal; }
        .kot-title {
          text-align: center;
          font-weight: 900;
          font-size: ${fKotTitle}px;
          letter-spacing: 3px;
          margin: ${sSm}px 0 ${sXs}px;
        }
        .meta { font-size: ${fB}px; line-height: 1.5; font-weight: normal; }
        .meta div { margin: 0 0 2px; }
        .meta div:last-child { margin-bottom: 0; }
        table { width: 100%; border-collapse: collapse; }

        /* ✅ FIX: table-layout AUTO (fixed noi) — ekhon Item Name
           column content onujayi tight hoy (choto text = choto
           column), tai Item-Name o Qty-r moddhe onoboroto boro
           blank-gap r thakbe na. Sl.No/Qty column nowrap thakar
           karone tara nijeder content-er shathe tight thake, ar
           baki shob jayga Item Name column pay. */
        .items-table { table-layout: auto; font-size: ${fB}px; margin-top: ${sXs}px; font-weight: normal; }
        .items-table th {
          border-bottom: 1px solid #000;
          text-align: left;
          padding: ${sXs}px 4px;
          font-size: ${fB}px;
          font-weight: bold;
        }
        .items-table td { padding: ${sXs + 1}px 4px; vertical-align: top; }

        /* ✅ FIX: padding-left add kora holo jate Sl.No column-er
           sathe Item Name-er majhe ekta visible gap toiri hoy
           (age eta prai 0 chilo). */
        .items-table .item-name {
          word-wrap: break-word;
          overflow-wrap: break-word;
          padding-left: 8px;
          padding-right: 6px;
          font-weight: normal;
        }
        .items-table th.right, .items-table td.right {
          text-align: right;
          padding-left: 4px; /* ✅ FIX: age 8px chilo, ekhon komiye Qty
                                  number-ke item-name column-er kachhe
                                  niye asha hoyeche */
        }
        .items-table th.center, .items-table td.center { text-align: center; }
        .note { font-size: ${Math.max(11, fB - 3)}px; font-style: italic; color: #333; }
        .total-row td { font-weight: bold; border-top: 1px dashed #000; padding-top: ${sXs}px; font-size: ${fA}px; }
        .footer-text { text-align: center; font-size: ${fB}px; margin-top: ${sSm}px; font-weight: bold; letter-spacing: 0.5px; }
        .logo { margin: ${sSm}px auto ${sXs}px; display: block; }
      </style>
    </head>
    <body>
      <div id="container">
        ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:${logoW}px;" class="logo"/>` : ""}

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

        <div class="kot-title">KOT</div>

        <div class="dashed"></div>

        <div class="meta">
          <div>Invoice: ${escapeHtml(invoiceNumber)}</div>
          <div>Date: ${format(new Date(invoiceDate || new Date()), "dd-MMM-yyyy hh:mm a")}</div>
          ${customerName ? `<div>Customer: ${escapeHtml(customerName)}</div>` : ""}
        </div>

        <div class="dashed"></div>

        <table class="items-table">
          <colgroup>
            <col style="width:13%;" />
            <col />
            <col style="width:20%;" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">Sl.No</th>
              <th class="item-name">Item Name</th>
              <th class="right">Qty</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
          <tfoot>
            <tr class="total-row">
              <td></td>
              <td class="right">Total Qty:</td>
              <td class="right">${totalQty}</td>
            </tr>
          </tfoot>
        </table>

        <div class="dashed"></div>
        <div class="footer-text">** KITCHEN ORDER COPY **</div>
      </div>
    </body>
  </html>`;
}

export async function generateKOTPreviewHTML(params, paperWidthMM = 58) {
  const widthPx = resolveDotWidth(paperWidthMM);
  return buildThermalKOTHTML({ ...params, widthPx, paperWidthMM });
}

export async function generateKOTESCPOS(
  params,
  paperWidthMM = 58,
  forceDotWidth = null,
) {
  const widthPx = forceDotWidth || resolveDotWidth(paperWidthMM);
  const html = await buildThermalKOTHTML({ ...params, widthPx, paperWidthMM });

  const { default: html2canvas } = await import("html2canvas-pro");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = "10px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    const idoc = iframe.contentDocument;
    const iwin = iframe.contentWindow;

    const imgs = Array.from(idoc.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            }),
      ),
    );

    if (idoc.fonts && idoc.fonts.ready) {
      try {
        await idoc.fonts.ready;
      } catch (_) {}
    }

    const container = idoc.getElementById("container") || idoc.body;
    container.style.width = `${widthPx}px`;

    const fullHeight = Math.max(
      container.scrollHeight,
      idoc.body.scrollHeight,
      idoc.documentElement.scrollHeight,
    );
    iframe.style.height = `${fullHeight}px`;

    await new Promise((res) =>
      iwin.requestAnimationFrame(() => iwin.requestAnimationFrame(res)),
    );

    const canvas = await html2canvas(container, {
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: widthPx,
      height: fullHeight,
      windowWidth: widthPx,
      windowHeight: fullHeight,
    });

    const rasterInfo = canvasToRasterBytes(canvas);
    const image = rasterToEscPosString(rasterInfo);

    return INIT + image + feed(3) + CUT;
  } finally {
    document.body.removeChild(iframe);
  }
}
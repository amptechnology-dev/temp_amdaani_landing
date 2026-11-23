import { jsPDF } from "jspdf";

// Paper config. Margin 6mm = same as the @page margin used for print.
const PAPER = {
  a4: { format: "a4", orientation: "portrait", pageW: 210, pageH: 297 },
  a5: { format: "a5", orientation: "landscape", pageW: 210, pageH: 148 },
};
const MARGIN = 6;

// Selectors for each layout (see invoiceTemplate.js).
const LAYOUTS = {
  a4: {
    root: ".invoice-container",
    outerHead: "table > thead",
    itemsHead: ".items-table > thead",
    rows: ".items-table > tbody > tr.item-row",
    tail: (root) => [
      ...root.querySelectorAll(
        ".items-table > tbody > tr:not(.item-row), .pay-tail, #end-block",
      ),
    ],
    zoomFit: false,
  },
  a5: {
    root: ".page",
    outerHead: ".outer > thead",
    itemsHead: ".tbl > thead",
    rows: ".tbl > tbody > tr:not(.sum-row)",
    tail: (root) => {
      const list = [...root.querySelectorAll(".tbl > tbody > tr.sum-row")];
      const end = root.querySelector("#end-block");
      const endRow = end ? end.closest("tr") : null;
      if (endRow) list.push(endRow);
      return list;
    },
    zoomFit: true,
    minZoom: 0.5,
  },
};

// ── image helpers (moved here from InvoiceList / InvoiceSummary) ──────────
const toDataURL = async (url) => {
  try {
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Image fetch failed, keeping original src:", url, err);
    return null;
  }
};

const inlineImagesAsBase64 = async (doc) => {
  const imgs = Array.from(doc.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      const dataUrl = await toDataURL(src);
      if (dataUrl) img.src = dataUrl;
    }),
  );
};

const waitForImagesToLoad = (doc) =>
  Promise.all(
    Array.from(doc.querySelectorAll("img")).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }),
  );

const h = (el) => (el ? el.getBoundingClientRect().height : 0);

// Greedy row packing. Last page must also have room for the tail
// (totals + tax summary + footer); if not, move the last row to a new page
// so the footer never lands alone on a page.
function paginate(rowH, bodyCap, tailH) {
  const pages = [];
  let cur = [];
  let used = 0;
  rowH.forEach((rh, i) => {
    if (cur.length && used + rh > bodyCap) {
      pages.push(cur);
      cur = [];
      used = 0;
    }
    cur.push(i);
    used += rh;
  });
  if (cur.length > 1 && used + tailH > bodyCap) {
    const last = cur.pop();
    pages.push(cur);
    cur = [last];
  }
  pages.push(cur);
  return pages;
}

/**
 * Builds a PDF from the invoice that is rendered inside the preview iframe,
 * paginated like the print version: header on every page, footer only on
 * the last page.
 */
export async function generateInvoicePdfBlob({ idoc, pageFormat = "a4" }) {
  if (!idoc || !idoc.body) throw new Error("Preview not ready yet");

  const key = pageFormat === "a5" ? "a5" : "a4";
  const paper = PAPER[key];
  const layout = LAYOUTS[key];

  const { default: html2canvas } = await import("html2canvas-pro");

  await inlineImagesAsBase64(idoc);
  await waitForImagesToLoad(idoc);
  await new Promise((r) => setTimeout(r, 100));

  const root = idoc.querySelector(layout.root);
  if (!root) throw new Error("Invoice root not found");

  const contentW = paper.pageW - MARGIN * 2; // mm
  const contentH = paper.pageH - MARGIN * 2; // mm

  // ── remember original state so we can restore the preview ──
  const rows = [...root.querySelectorAll(layout.rows)];
  const tail = layout.tail(root);
  const pageNoEl = root.querySelector(".hdr-meta-row span:last-child");
  const saved = {
    bodyPadding: idoc.body.style.padding,
    width: root.style.width,
    maxWidth: root.style.maxWidth,
    pageNoText: pageNoEl ? pageNoEl.textContent : null,
  };

  const restore = () => {
    idoc.body.style.padding = saved.bodyPadding;
    root.style.width = saved.width;
    root.style.maxWidth = saved.maxWidth;
    rows.forEach((r) => (r.style.display = ""));
    tail.forEach((t) => (t.style.display = ""));
    if (pageNoEl && saved.pageNoText !== null)
      pageNoEl.textContent = saved.pageNoText;
  };

  const pdf = new jsPDF({
    unit: "mm",
    format: paper.format,
    orientation: paper.orientation,
  });

  try {
    idoc.body.style.padding = "0";

    const W = root.getBoundingClientRect().width;
    const pagePx = (W * contentH) / contentW; // printable page height in px
    const total = h(root);

    let pages;

    // A5: try to fit everything on ONE page by zooming (same as print).
    let singlePage = false;
    if (layout.zoomFit && total > pagePx) {
      const z = pagePx / total;
      if (z >= layout.minZoom) {
        root.style.maxWidth = "none";
        root.style.width = `${W / z}px`; // reflow wider => shorter, like zoom
        singlePage = true;
      }
    } else if (layout.zoomFit) {
      singlePage = true;
    }

    if (singlePage) {
      pages = [rows.map((_, i) => i)];
    } else {
      const headH = h(root.querySelector(layout.outerHead));
      const itemsHeadH = h(root.querySelector(layout.itemsHead));
      const rowH = rows.map(h);
      const tailH = Math.max(
        0,
        total - headH - itemsHeadH - rowH.reduce((a, b) => a + b, 0),
      );
      const bodyCap = pagePx - headH - itemsHeadH;
      pages = paginate(rowH, bodyCap, tailH);
    }

    for (let p = 0; p < pages.length; p++) {
      const visible = new Set(pages[p]);
      const isLast = p === pages.length - 1;

      rows.forEach((r, i) => (r.style.display = visible.has(i) ? "" : "none"));
      tail.forEach((t) => (t.style.display = isLast ? "" : "none"));
      if (pageNoEl && saved.pageNoText !== null)
        pageNoEl.textContent = `Page ${p + 1} of ${pages.length}`;

      await new Promise((r) => setTimeout(r, 30));

      const canvas = await html2canvas(root, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        windowWidth: idoc.documentElement.scrollWidth,
        windowHeight: idoc.documentElement.scrollHeight,
      });

      let imgW = contentW;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > contentH) {
        const k = contentH / imgH;
        imgW *= k;
        imgH = contentH;
      }
      const x = MARGIN + (contentW - imgW) / 2;

      if (p > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        x,
        MARGIN,
        imgW,
        imgH,
      );
    }
  } finally {
    restore();
  }

  return pdf.output("blob");
}
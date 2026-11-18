"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  MessageCircle,
  Star,
  X,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";

const PRODUCTS_API_URL = process.env.NEXT_PUBLIC_PRODUCTS_API_URL;
const PRODUCTS_STORE_ID = process.env.NEXT_PUBLIC_PRODUCTS_STORE_ID;
const WHATSAPP_NUMBER = "918697972001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// null / undefined / "" ke 0 banabe na (Number(null) === 0 bug avoid)
const toNum = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatINR = (n) => `₹${toNum(n).toLocaleString("en-IN")}`;
const isVideo = (url = "") => /\.(mp4|webm|mov)(\?|$)/i.test(url);

// ─── API + normalize ──────────────────────────────────────────────────────────

// API response -> UI shape. Response change hole shudhu ekhane edit korbe.
const normalizeProduct = (p) => {
  // 1) Sob variant / size-variant ke ek flat list e ana
  const flat = [];
  (p.variants || []).forEach((v, vi) => {
    if (v?.isActive === false) return;
    const vImage = v.images?.[0] || "";
    if (Array.isArray(v.sizeVariants) && v.sizeVariants.length > 0) {
      v.sizeVariants.forEach((sv, si) => {
        if (sv?.isActive === false) return;
        flat.push({
          key: sv._id || `${vi}-${si}`,
          label: [v.color, sv.size, sv.weight && `${sv.weight}`]
            .filter(Boolean)
            .join(" · "),
          image: vImage,
          mrp: toNum(sv.mrp),
          price: toNum(sv.offerPrice) || toNum(sv.mrp),
          stock: toNum(sv.currentStock ?? sv.stock),
        });
      });
    } else {
      flat.push({
        key: v._id || String(vi),
        label: [v.color, v.size, v.weight && `${v.weight}`]
          .filter(Boolean)
          .join(" · "),
        image: vImage,
        mrp: toNum(v.mrp),
        price: toNum(v.offerPrice) || toNum(v.mrp),
        stock: toNum(v.currentStock ?? v.stock),
      });
    }
  });

  // 2) Price: base price + variant price, sob theke kom ta
  const candidates = [];
  const baseOffer = toNum(p.offerPrice);
  const baseMrp = toNum(p.mrp);
  if (baseOffer > 0 || baseMrp > 0) {
    candidates.push({ price: baseOffer || baseMrp, mrp: baseMrp });
  }
  flat.forEach((v) => {
    if (v.price > 0) candidates.push({ price: v.price, mrp: v.mrp });
  });
  candidates.sort((a, b) => a.price - b.price);

  let price = candidates[0]?.price || 0;
  let mrp = candidates[0]?.mrp || 0;
  const hasRange = new Set(candidates.map((c) => c.price)).size > 1;

  const tiers = Array.isArray(p.priceTiers)
    ? p.priceTiers.filter((t) => toNum(t.price) > 0)
    : [];

  if (price <= 0 && toNum(p.minOfferPrice) > 0) price = toNum(p.minOfferPrice);
  if (price <= 0 && toNum(p.minTierPrice) > 0) price = toNum(p.minTierPrice);

  const priceOnRequest = Boolean(p.priceOnRequest) || price <= 0;
  if (mrp <= price) mrp = 0; // discount shudhu real hole

  // 3) Media (product + variant images), duplicate bad
  const media = Array.from(
    new Set(
      [...(p.images || []), ...flat.map((v) => v.image)].filter(Boolean),
    ),
  );
  const cover = media.find((m) => !isVideo(m)) || media[0] || "";

  // 4) Stock (shudhu jokhon stock management on + variant ache)
  const stockTracked = Boolean(p.hasStockManagement) && flat.length > 0;
  const totalStock = stockTracked
    ? flat.reduce((sum, v) => sum + v.stock, 0)
    : null;

  return {
    id: String(p._id ?? p.id),
    name: p.name || "Unnamed product",
    description: p.description || "",
    category: p.category?.name || "",
    unit: p.unit || "",
    productCode: p.productCode || "",
    price,
    mrp,
    hasRange,
    priceOnRequest,
    tiers,
    variants: flat,
    media,
    cover,
    totalStock,
    rating: toNum(p.averageRating),
    reviews: toNum(p.totalReviews),
  };
};

const fetchProducts = async (signal) => {
  if (!PRODUCTS_API_URL || !PRODUCTS_STORE_ID) {
    throw new Error("Products API is not configured.");
  }
  // plain axios: nijer project er token external server e jabe na
  const res = await axios.get(
    `${PRODUCTS_API_URL}/api/product/store/${encodeURIComponent(
      PRODUCTS_STORE_ID,
    )}/products`,
    { timeout: 10000, signal },
  );
  const data = res.data;
  const list = Array.isArray(data) ? data : data?.products || data?.data || [];
  return list.map(normalizeProduct);
};

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function Media({ src, alt, name, className = "", controls = false }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <span className="text-5xl font-black text-blue-200">
          {name?.charAt(0).toUpperCase() || "P"}
        </span>
      </div>
    );
  }

  if (isVideo(src)) {
    return (
      <video
        src={src}
        className={className}
        controls={controls}
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function PriceBlock({ item, large = false }) {
  const discount =
    item.mrp > item.price
      ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
      : 0;

  if (item.priceOnRequest) {
    return (
      <span
        className={`font-bold text-slate-700 ${large ? "text-xl" : "text-[15px]"}`}
      >
        Price on request
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {item.hasRange && (
        <span className="text-[11px] font-semibold uppercase text-slate-400">
          From
        </span>
      )}
      <span
        className={`font-extrabold tracking-tight text-blue-600 ${large ? "text-3xl" : "text-[22px]"}`}
      >
        {formatINR(item.price)}
      </span>
      {item.mrp > 0 && (
        <span className="text-[13px] text-slate-400 line-through">
          {formatINR(item.mrp)}
        </span>
      )}
      {discount > 0 && (
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
          {discount}% OFF
        </span>
      )}
    </div>
  );
}

function StockBadge({ stock }) {
  if (stock === null) return null;
  const out = stock <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
        out ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${out ? "bg-red-500" : "bg-emerald-500"}`}
      />
      {out ? "Out of stock" : "In stock"}
    </span>
  );
}

function Rating({ rating, reviews }) {
  if (rating <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="text-[12.5px] font-semibold text-slate-700">
        {rating.toFixed(1)}
      </span>
      {reviews > 0 && (
        <span className="text-[11.5px] text-slate-400">({reviews})</span>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ProductCard({ item, onOpen, onBuy }) {
  const cover = item.cover;

  return (
    <div
      onClick={() => onOpen(item)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-50">
        <Media
          src={cover}
          alt={item.name}
          name={item.name}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
        />
        {isVideo(cover) && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Play size={10} /> Video
          </span>
        )}
        {item.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-sm">
            {item.category}
          </span>
        )}
        {item.tiers.length > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            Bulk price
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="line-clamp-1 text-[16px] font-bold leading-tight text-slate-900">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Rating rating={item.rating} reviews={item.reviews} />
          <StockBadge stock={item.totalStock} />
          {item.variants.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-500">
              <Layers size={12} />
              {item.variants.length} option{item.variants.length > 1 ? "s" : ""}
            </span>
          )}
          {item.unit && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-500">
              <Package size={12} />
              {item.unit}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <PriceBlock item={item} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy(item);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700"
          >
            <MessageCircle size={15} />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function ProductModal({ item, onClose, onBuy }) {
  const [index, setIndex] = useState(0);
  const media = item.media.length > 0 ? item.media : [""];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % media.length);
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, media.length]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow transition hover:text-slate-900"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Gallery */}
        <div className="shrink-0 bg-slate-50 md:w-[45%]">
          <div className="relative h-64 w-full md:h-80">
            <Media
              key={media[index]}
              src={media[index]}
              alt={item.name}
              name={item.name}
              controls
              className="h-full w-full object-contain"
            />
            {media.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setIndex((i) => (i - 1 + media.length) % media.length)
                  }
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % media.length)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
          {media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {media.map((m, i) => (
                <button
                  key={m + i}
                  onClick={() => setIndex(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                    i === index ? "border-blue-500" : "border-transparent"
                  }`}
                >
                  {isVideo(m) ? (
                    <span className="flex h-full w-full items-center justify-center bg-slate-800 text-white">
                      <Play size={14} />
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 pr-12">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {item.category && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {item.category}
                  </span>
                )}
                {item.productCode && (
                  <span className="text-[11px] font-medium text-slate-400">
                    {item.productCode}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black leading-tight text-slate-900">
                {item.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Rating rating={item.rating} reviews={item.reviews} />
                <StockBadge stock={item.totalStock} />
                {item.unit && (
                  <span className="text-[12px] text-slate-500">
                    Unit: {item.unit}
                  </span>
                )}
              </div>
            </div>

            <PriceBlock item={item} large />

            {item.description && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Description
                </p>
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>
            )}

            {/* Variants */}
            {item.variants.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Available options
                </p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {item.variants.map((v) => (
                    <div
                      key={v.key}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {v.image && !isVideo(v.image) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.image}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-md border border-slate-100 object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-800">
                            {v.label || "Standard"}
                          </p>
                          {item.totalStock !== null && (
                            <p
                              className={`text-[11px] font-medium ${
                                v.stock > 0 ? "text-emerald-600" : "text-red-500"
                              }`}
                            >
                              {v.stock > 0
                                ? `${v.stock} in stock`
                                : "Out of stock"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {v.price > 0 ? (
                          <>
                            <p className="text-[14px] font-extrabold text-blue-600">
                              {formatINR(v.price)}
                            </p>
                            {v.mrp > v.price && (
                              <p className="text-[11px] text-slate-400 line-through">
                                {formatINR(v.mrp)}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[12px] font-semibold text-slate-500">
                            On request
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk tiers */}
            {item.tiers.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Bulk pricing
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Quantity</th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Price / unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.tiers.map((t, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">
                            {t.maxQty
                              ? `${t.minQty} – ${t.maxQty}`
                              : `${t.minQty}+`}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {formatINR(t.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              onClick={() => onBuy(item)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <MessageCircle size={16} />
              {item.priceOnRequest ? "Ask for price on WhatsApp" : "Buy Now on WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="h-48 w-full bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded-full bg-slate-100" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
        <div className="flex items-center justify-between pt-3">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-9 w-24 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OurProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setProducts(await fetchProducts(controller.signal));
      } catch (err) {
        if (axios.isCancel(err) || err?.code === "ERR_CANCELED") return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load products. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reloadKey]);

  const openWhatsApp = (item) => {
    const priceText = item.priceOnRequest
      ? "Please share the price."
      : `Price: ${item.hasRange ? "from " : ""}${formatINR(item.price)}.`;
    const message = `Hello! I am interested in *${item.name}*${
      item.productCode ? ` (${item.productCode})` : ""
    }. ${priceText} Please share more details.`;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
          <p className="font-bold text-slate-900">Could not load products</p>
          <p className="mt-1 text-[13px] text-slate-600">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="py-20 text-center text-[13.5px] text-slate-400">
          No products available right now.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onOpen={setSelected}
            onBuy={openWhatsApp}
          />
        ))}
      </div>
    );
  }, [loading, error, products]);

  return (
    <div className="px-5 py-6 md:px-7">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
          Our Products
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          Explore hardware and accessories offered by our team
          {!loading && !error && products.length > 0 && (
            <span className="ml-1 font-semibold text-slate-700">
              · {products.length} products
            </span>
          )}
        </p>
      </div>

      {content}

      {selected && (
        <ProductModal
          item={selected}
          onClose={() => setSelected(null)}
          onBuy={openWhatsApp}
        />
      )}
    </div>
  );
}
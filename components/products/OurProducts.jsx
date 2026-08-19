"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Star } from "lucide-react";

const products = [
  {
    id: "1",
    name: "AMP Thermal Printer",
    subtitle: "58mm Bluetooth",
    description:
      "High-speed thermal printer compatible with Android, iOS & Windows.",
    price: 1799,
    originalPrice: 1799,
    image:
      "https://cdn.amptechnology.in/0199dcb9-7d78-7000-8be8-56c84c67ba61.webp",
    badge: "BESTSELLER",
    rating: 4.8,
    reviews: 120,
  },
  {
    id: "2",
    name: "Thermal Paper Roll",
    subtitle: "58mm × 10m",
    description: "Premium quality thermal rolls with long-lasting prints.",
    price: 20,
    originalPrice: 20,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDxCrG8KPWXoAf9bFDEVjYJsDUg_iRxQJt4pCd_636p5rHG8nzJvaR-eUumDox0cxnqpc&usqp=CAU",
    badge: "POPULAR",
    rating: 4.6,
    reviews: 89,
  },
];

function ProductCard({ item, highlighted, onBuyPress }) {
  const discount = item.originalPrice
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : 0;

  return (
    <div
      className={`group rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        highlighted
          ? "bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-200"
          : "bg-white border-slate-200/80 shadow-sm"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 w-full bg-slate-100">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized
        />

        {item.badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide shadow-sm">
            {item.badge}
          </span>
        )}

        {discount > 0 && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm">
            -{discount}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="mb-1.5">
          <h3 className="font-bold text-[16px] text-slate-900 leading-tight truncate">
            {item.name}
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">{item.subtitle}</p>
        </div>

        {item.rating && (
          <div className="flex items-center gap-1 mb-2.5">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="text-[12.5px] font-semibold text-slate-700">
              {item.rating}
            </span>
            <span className="text-[11.5px] text-slate-400">
              ({item.reviews} reviews)
            </span>
          </div>
        )}

        <p className="text-[13px] text-slate-500 leading-relaxed mb-4 line-clamp-2">
          {item.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[21px] font-extrabold text-blue-600 tracking-tight">
              ₹{item.price.toLocaleString("en-IN")}
            </span>
            {item.originalPrice > item.price && (
              <span className="text-[13px] text-slate-400 line-through">
                ₹{item.originalPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <button
            onClick={() => onBuyPress(item)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold transition-colors shadow-sm shadow-blue-200"
          >
            <MessageCircle size={15} />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OurProducts() {
  const [highlightedId] = useState(null);

  const openWhatsApp = (item) => {
    const phoneNumber = "918697972001";
    const message = `Hello! I am interested in buying *${item.name}* (₹${item.price}). Please share more details.`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="px-5 md:px-7 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
          Our Products
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1">
          Explore hardware and accessories offered by our team
        </p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            highlighted={highlightedId === item.id}
            onBuyPress={openWhatsApp}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-[13.5px]">
          No products available right now.
        </div>
      )}
    </div>
  );
}
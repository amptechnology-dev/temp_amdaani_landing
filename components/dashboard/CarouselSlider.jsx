"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../utils/api";

// Fallback ads shown if API fails or returns nothing — keeps the slot from looking broken
const fallbackAds = [
  {
    id: "product-1",
    title: "AMP Thermal Printer",
    subtitle: "58mm Bluetooth — print invoices instantly",
    image:
      "https://cdn.amptechnology.in/0199dcb9-7d78-7000-8be8-56c84c67ba61.webp",
    ctaLabel: "Shop Now",
    ctaUrl: "/dashboard/products",
    bgColor: "#0F766E",
  },
  {
    id: "product-2",
    title: "Thermal Paper Roll",
    subtitle: "58mm × 10m — premium long-lasting prints",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDxCrG8KPWXoAf9bFDEVjYJsDUg_iRxQJt4pCd_636p5rHG8nzJvaR-eUumDox0cxnqpc&usqp=CAU",
    ctaLabel: "Shop Now",
    ctaUrl: "/dashboard/products",
    bgColor: "#1D4ED8",
  },
];

const AUTOPLAY_DELAY = 4500;

export default function CarouselSlider() {
  const [slides, setSlides] = useState(fallbackAds);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Fetch active promo banners from backend; fall back silently on error
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/banners/active");
        if (
          mounted &&
          res?.success &&
          Array.isArray(res.data) &&
          res.data.length > 0
        ) {
          setSlides(
            res.data.map((b, i) => ({
              id: b._id || `banner-${i}`,
              title: b.title,
              subtitle: b.subtitle || b.description,
              image: b.imageUrl,
              ctaLabel: b.ctaLabel || "Learn More",
              ctaUrl: b.ctaUrl || "#",
              bgColor: b.bgColor || "#1D4ED8",
            })),
          );
        }
      } catch (err) {
        // Silent fallback — ads are non-critical, never block the dashboard
        console.warn("Falling back to default ads:", err.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const goTo = useCallback(
    (index) => {
      setActiveIndex(((index % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Autoplay
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setInterval(goNext, AUTOPLAY_DELAY);
    return () => clearInterval(timerRef.current);
  }, [isPaused, goNext, slides.length]);

  if (!slides.length) return null;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 h-56 md:h-72 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <a
            key={slide.id}
            href={slide.ctaUrl}
            className="relative min-w-full h-full flex items-center px-6 md:px-10"
            style={{ backgroundColor: slide.bgColor }}
          >
            {/* Background image (optional, sits behind gradient) */}
            {slide.image && (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-contain opacity-40"
                sizes="100vw"
                unoptimized
                priority
              />
            )}

            {/* Gradient overlay for text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${slide.bgColor} 35%, transparent 100%)`,
              }}
            />

            {/* Content */}
            <div className="relative z-10 max-w-md">
              <h3 className="text-white font-bold text-[18px] md:text-[22px] leading-tight">
                {slide.title}
              </h3>
              {slide.subtitle && (
                <p className="text-white/85 text-[12.5px] md:text-[13.5px] mt-1.5 line-clamp-2">
                  {slide.subtitle}
                </p>
              )}
              {slide.ctaLabel && (
                <span className="inline-block mt-3.5 px-4 py-1.5 rounded-lg bg-white text-slate-900 text-[12.5px] font-semibold hover:bg-slate-100 transition-colors">
                  {slide.ctaLabel}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Prev / Next arrows — visible on hover */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

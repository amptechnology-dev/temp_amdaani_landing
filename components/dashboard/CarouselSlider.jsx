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
  },
  {
    id: "product-2",
    title: "Thermal Paper Roll",
    subtitle: "58mm × 10m — premium long-lasting prints",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDxCrG8KPWXoAf9bFDEVjYJsDUg_iRxQJt4pCd_636p5rHG8nzJvaR-eUumDox0cxnqpc&usqp=CAU",
    ctaLabel: "Shop Now",
    ctaUrl: "/dashboard/products",
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
      className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 h-40 md:h-48 bg-slate-100 group"
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
            className="relative min-w-full h-full flex items-center justify-center bg-slate-100"
          >
            {/* Full image, no crop — fills the slot as much as possible without cutting */}
            {slide.image && (
              <div className="relative w-full h-full">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-contain"
                  style={{ objectPosition: "center" }}
                  sizes="100vw"
                  unoptimized
                  priority
                />
              </div>
            )}

            {/* Bottom-only dark scrim for caption readability */}
            {(slide.title || slide.subtitle || slide.ctaLabel) && (
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            )}

            <div className="absolute left-4 bottom-2.5 right-4 z-10">
              {slide.title && (
                <h3 className="text-white font-bold text-[14px] md:text-[16px] leading-tight drop-shadow">
                  {slide.title}
                </h3>
              )}
              {slide.subtitle && (
                <p className="text-white/90 text-[11px] md:text-[12px] mt-0.5 line-clamp-1 drop-shadow">
                  {slide.subtitle}
                </p>
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
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
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

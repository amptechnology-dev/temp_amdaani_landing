"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles } from "lucide-react";
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
      className="relative w-full group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full rounded-2xl bg-slate-100/70 border border-slate-200/70 overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: "transform 0.65s cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        >
          {slides.map((slide, idx) => (
            <div key={slide.id} className="min-w-full p-3 md:p-4">
              <a
                href={slide.ctaUrl}
                className={`carousel-card relative flex items-center gap-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden px-5 py-4 md:px-7 md:py-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  idx === activeIndex ? "carousel-card-active" : ""
                }`}
              >
                {/* Image — fixed square thumbnail, gentle pop-in + float animation */}
                {slide.image && (
                  <div className="carousel-img-wrap relative w-20 h-20 md:w-24 md:h-24 shrink-0 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-2">
                    <div className="relative w-full h-full carousel-img-float">
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        className="object-contain"
                        sizes="96px"
                        unoptimized
                        priority
                      />
                    </div>
                  </div>
                )}

                {/* Text — staggered fade-up entrance */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  {slide.title && (
                    <h3 className="carousel-text-in carousel-delay-1 text-slate-900 font-bold text-[15px] md:text-[17px] leading-tight truncate">
                      {slide.title}
                    </h3>
                  )}
                  {slide.subtitle && (
                    <p className="carousel-text-in carousel-delay-2 text-slate-500 text-[12px] md:text-[13px] leading-snug line-clamp-2">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.ctaLabel && (
                    <span className="carousel-text-in carousel-delay-3 mt-1.5 inline-flex items-center gap-1 text-blue-600 text-[12px] font-semibold w-fit group/cta">
                      {slide.ctaLabel}
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                    </span>
                  )}
                </div>

                {/* Right-side accent — gentle pulse so it draws the eye without being loud */}
                <div className="hidden sm:flex shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-blue-50 items-center justify-center carousel-accent-pulse">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
                </div>
              </a>
            </div>
          ))}
        </div>

        {/* Prev / Next arrows — visible on hover */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goNext}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-20"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Dots — active dot fills like a progress bar synced with autoplay */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 ${
                i === activeIndex
                  ? "w-8 bg-slate-200"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            >
              {i === activeIndex && !isPaused && (
                <span
                  key={`${activeIndex}-${isPaused}`}
                  className="absolute inset-y-0 left-0 bg-blue-600 rounded-full carousel-progress"
                  style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }}
                />
              )}
              {i === activeIndex && isPaused && (
                <span className="absolute inset-y-0 left-0 right-0 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes carouselProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        .carousel-progress {
          animation-name: carouselProgress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }

        @keyframes carouselFadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .carousel-text-in {
          animation: carouselFadeUp 0.5s ease-out both;
        }
        .carousel-delay-1 {
          animation-delay: 0.05s;
        }
        .carousel-delay-2 {
          animation-delay: 0.12s;
        }
        .carousel-delay-3 {
          animation-delay: 0.19s;
        }

        @keyframes carouselImgFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .carousel-img-float {
          animation: carouselImgFloat 3.2s ease-in-out infinite;
        }

        @keyframes carouselImgPop {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .carousel-img-wrap {
          animation: carouselImgPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes carouselAccentPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.25);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
          }
        }
        .carousel-accent-pulse {
          animation: carouselAccentPulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
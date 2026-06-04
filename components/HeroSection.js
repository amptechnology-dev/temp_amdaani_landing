"use client";

import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";

const HERO_SECTIONS_ENDPOINT =
  `${process.env.NEXT_PUBLIC_API_URL}/hero/list-hero-sections`;

const normalizeSlides = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => ({
    id: item?._id || index,
    title: item?.title || "Amdaani",
    subtitle: item?.subtitle || "Billing Solution",
    phoneImage: item?.phoneImage || "/images/dashboard.jpg",
  }));
};

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const fetchHeroSections = async () => {
      try {
        const response = await fetch(HERO_SECTIONS_ENDPOINT);
        const result = await response.json();

        if (
          response.ok &&
          result?.success &&
          Array.isArray(result?.data)
        ) {
          const mappedSlides = normalizeSlides(result.data);

          if (mappedSlides.length > 0) {
            setSlides(mappedSlides);
          }
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeroSections();
  }, []);

  return (
    <section
      className={`relative overflow-hidden ${currentTheme.background}`}
    >
      {/* Hero wrapper */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-white md:h-[calc(100vh-120px)] md:aspect-auto">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
              <p className="text-sm font-medium tracking-[0.3em] text-slate-300 uppercase">
                Loading hero
              </p>
            </div>
          </div>
        ) : slides.length > 0 ? (
          slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentSlide
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <img
                src={slide.phoneImage}
                alt={`${slide.title} ${slide.subtitle}`}
                loading={index === 0 ? "eager" : "lazy"}
                className="h-full w-full object-contain object-center md:object-fill"
              />
            </div>
          ))
        ) : null}
      </div>
    </section>
  );
}
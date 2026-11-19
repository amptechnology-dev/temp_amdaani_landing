"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";

const HERO_SECTIONS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/hero/list-hero-sections`;
const HEADING_TEXT = "India's Smart Billing & Inventory App for Retail Shops";

// tabletImage / desktopImage are optional fields from your API.
// If they are missing, the phone image is used so nothing is blank.
const normalizeSlides = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => ({
    id: item?._id || index,
    title: item?.title || "Amdaani",
    subtitle: item?.subtitle || "Billing Solution",
    phoneImage: item?.phoneImage || "/images/dashboard.jpg",
    tabletImage: item?.tabletImage || item?.phoneImage || "/images/dashboard.jpg",
    desktopImage: item?.desktopImage || item?.phoneImage || "/images/dashboard.jpg",
  }));
};

const rand = (min, max) =>
  Math.round((min + Math.random() * (max - min)) * 100) / 100;

const generateStars = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(1, 3),
    duration: rand(6, 16),
    delay: rand(0, 6),
    dx: rand(-60, 60),
    dy: rand(-60, 60),
  }));

const generateLightDots = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(4, 9),
    duration: rand(10, 20),
    delay: rand(0, 6),
    dx: rand(-90, 90),
    dy: rand(-60, 60),
  }));

function useTypewriterLoop(
  text,
  { typeSpeed = 45, eraseSpeed = 28, holdAfterType = 1800, holdAfterErase = 500 } = {},
) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let charIndex = 0;
    let timeoutId;
    let cancelled = false;

    const typeStep = () => {
      if (cancelled) return;
      charIndex += 1;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex < text.length) {
        timeoutId = setTimeout(typeStep, typeSpeed);
      } else {
        timeoutId = setTimeout(eraseStep, holdAfterType);
      }
    };

    const eraseStep = () => {
      if (cancelled) return;
      charIndex -= 1;
      setDisplayedText(text.slice(0, Math.max(charIndex, 0)));

      if (charIndex > 0) {
        timeoutId = setTimeout(eraseStep, eraseSpeed);
      } else {
        timeoutId = setTimeout(typeStep, holdAfterErase);
      }
    };

    timeoutId = setTimeout(typeStep, typeSpeed);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [text, typeSpeed, eraseSpeed, holdAfterType, holdAfterErase]);

  return displayedText;
}

function AnimatedBackground({ theme }) {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState([]);
  const [lightDots, setLightDots] = useState([]);

  useEffect(() => {
    setStars(generateStars(60));
    setLightDots(generateLightDots(24));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-40 animate-[heroMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.07)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.07)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.06)_0%,transparent_60%)] bg-[length:200%_200%]" />

        <div className="absolute -top-20 -left-10 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl animate-[heroFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-[-60px] h-[26rem] w-[26rem] rounded-full bg-cyan-400/10 blur-3xl animate-[heroFloatB_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-80px] left-1/3 h-80 w-80 rounded-full bg-indigo-300/10 blur-3xl animate-[heroFloatA_16s_ease-in-out_infinite_reverse]" />

        <div className="absolute inset-0 opacity-25 animate-[heroSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.06)_50%,transparent_70%)]" />

        {mounted &&
          lightDots.map((dot) => (
            <span
              key={dot.id}
              className="absolute rounded-full bg-[#2563eb]/20 blur-[1.5px] animate-[heroDrift_var(--dur)_ease-in-out_infinite]"
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                "--dur": `${dot.duration}s`,
                "--dx": `${dot.dx}px`,
                "--dy": `${dot.dy}px`,
                animationDelay: `${dot.delay}s`,
              }}
            />
          ))}

        <style jsx>{`
          @keyframes heroMeshShift {
            0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%; }
            50% { background-position: 20% 20%, 80% 10%, 40% 90%; }
          }
          @keyframes heroFloatA {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(40px, -35px) scale(1.12); }
          }
          @keyframes heroFloatB {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-35px, 30px) scale(1.1); }
          }
          @keyframes heroSweep {
            0%, 100% { transform: translateX(-10%); }
            50% { transform: translateX(10%); }
          }
          @keyframes heroDrift {
            0% { transform: translate(0, 0); opacity: 0.15; }
            50% { transform: translate(var(--dx), var(--dy)); opacity: 0.55; }
            100% { transform: translate(0, 0); opacity: 0.15; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute top-16 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[heroStarDrift_var(--dur)_ease-in-out_infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "--dur": `${star.duration}s`,
              "--dx": `${star.dx}px`,
              "--dy": `${star.dy}px`,
              animationDelay: `${star.delay}s`,
              boxShadow: "0 0 4px rgba(255,255,255,0.7)",
            }}
          />
        ))}

      <span className="absolute top-[15%] left-[-10%] h-[1.5px] w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-[heroShootingStar_7s_linear_infinite]" />
      <span className="absolute top-[55%] left-[-10%] h-[1.5px] w-20 rounded-full bg-gradient-to-r from-transparent via-blue-200 to-transparent animate-[heroShootingStar_9s_linear_infinite_2.5s]" />

      <style jsx>{`
        @keyframes heroStarDrift {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
          50% { transform: translate(var(--dx), var(--dy)) scale(1.4); opacity: 1; }
          100% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
        }
        @keyframes heroShootingStar {
          0% { transform: translateX(0) translateY(0); opacity: 0; }
          5% { opacity: 1; }
          20% { transform: translateX(140vw) translateY(60px); opacity: 0; }
          100% { transform: translateX(140vw) translateY(60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// The screen content inside any device frame.
// `field` is which image to show: "phoneImage" | "tabletImage" | "desktopImage".
function DeviceScreen({ slides, currentSlide, field, isLoading }) {
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
          <p className="text-[0.65rem] font-medium tracking-[0.3em] text-slate-300 uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  // Fallback so a failed/empty API never shows a plain white screen.
  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
    );
  }

  return slides.map((slide, index) => (
    <div
      key={slide.id}
      className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
        index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <img
        src={slide[field]}
        alt={`${slide.title} ${slide.subtitle}`}
        draggable={false}
        loading={index === 0 ? "eager" : "lazy"}
        className={`h-full w-full object-cover object-top select-none ${
          index === currentSlide
            ? "animate-[phoneScreenScroll_8s_ease-in-out_infinite]"
            : ""
        }`}
      />
    </div>
  ));
}

function ArrowButton({ direction, onClick, theme }) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isNext ? "Show desktop view" : "Show phone and tablet view"}
      className={`absolute top-1/2 z-20 -translate-y-1/2 ${
        isNext ? "right-0" : "left-0"
      } flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        theme === "light"
          ? "bg-white/70 border-white/80 text-slate-700 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white"
          : "bg-white/10 border-white/15 text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] hover:bg-white/20"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isNext ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
      </svg>
    </button>
  );
}

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 0 = phone + tablet, 1 = desktop
  const [view, setView] = useState(0);
  const dragStartX = useRef(null);

  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const isLight = theme === "light";

  const displayedText = useTypewriterLoop(HEADING_TEXT, {
    typeSpeed: 45,
    eraseSpeed: 28,
    holdAfterType: 1800,
    holdAfterErase: 500,
  });

  // Auto-rotate the screenshots shown inside the devices
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

        if (response.ok && result?.success && Array.isArray(result?.data)) {
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

  // Swipe / drag support (touch + mouse)
  const handlePointerDown = (e) => {
    dragStartX.current = e.clientX;
  };
  const handlePointerUp = (e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (delta < -50) setView(1); // swipe left -> desktop
    if (delta > 50) setView(0); // swipe right -> phone + tablet
  };

  const frameBorder = isLight ? "border-slate-950" : "border-white";
  const standNeck = isLight
    ? "from-slate-700 to-slate-900"
    : "from-slate-300 to-slate-400";
  const standBase = isLight ? "bg-slate-900" : "bg-slate-300";

  const screenProps = { slides, currentSlide, isLoading };

  return (
    <section
      className={`relative overflow-hidden py-14 md:py-20 ${
        isLight ? "bg-[#F5F7FA]" : "bg-[#0E0F11]"
      }`}
    >
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 max-w-[1200px] mx-auto px-5 text-center">
        <h1
          className={`text-[2rem] md:text-[2.8rem] font-extrabold leading-[1.2] mb-5 min-h-[2.4em] md:min-h-[2.4em] ${
            isLight ? "text-slate-900" : "text-white"
          }`}
        >
          {displayedText}
          <span
            aria-hidden="true"
            className={`inline-block w-[3px] md:w-[4px] ml-1 -mb-1 h-[1.9rem] md:h-[2.6rem] align-middle animate-[heroCursorBlink_0.9s_step-end_infinite] ${
              isLight ? "bg-slate-900" : "bg-white"
            }`}
          />
        </h1>

        <p
          className={`text-[1.05rem] md:text-[1.2rem] max-w-[700px] mx-auto mb-8 ${
            isLight ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Create Bills, Manage Stock, Track Sales &amp; GST Reports in Minutes.
          Fast, simple, and 100% secure.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 mb-8 text-[0.9rem] md:text-[0.95rem] font-semibold">
          {[
            { icon: "👥", label: "5,000+ Businesses" },
            { icon: "★★★★★", label: "4.9 Rating", star: true },
            { icon: "🇮🇳", label: "Made in India" },
            { icon: "🔒", label: "100% Secure Backup" },
          ].map((badge, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border backdrop-blur-sm ${
                isLight
                  ? "bg-white/80 border-slate-200 text-slate-700"
                  : "bg-slate-900/70 border-slate-700 text-slate-200"
              }`}
            >
              <span className={badge.star ? "text-amber-500" : ""}>
                {badge.icon}
              </span>
              {badge.label}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a
            href="#download"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors text-[1.05rem]"
          >
            📲 Download Free App
          </a>
          <a
            href="#demo"
            className={`inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg font-semibold transition-colors text-[1.05rem] ${
              isLight
                ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            ▶ Watch 1-Min Demo
          </a>
        </div>

        {/* Device showcase: phone + tablet  <->  desktop */}
        <div className="relative max-w-[960px] mx-auto">
          {view === 0 ? (
            <ArrowButton direction="next" onClick={() => setView(1)} theme={theme} />
          ) : (
            <ArrowButton direction="prev" onClick={() => setView(0)} theme={theme} />
          )}

          <div
            className="overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => (dragStartX.current = null)}
          >
            <div
              className="flex items-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{ transform: `translateX(-${view * 100}%)` }}
            >
              {/* Screen 1: phone (left) + tablet (centre) */}
              <div
                aria-hidden={view !== 0}
                className="flex w-full shrink-0 items-center justify-center gap-4 md:gap-8 px-12 md:px-16 py-6"
              >
                {/* Phone */}
                <div className="w-[26%] max-w-[190px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] animate-[phoneFloat_6s_ease-in-out_infinite]">
                  <div
                    className={`relative aspect-[9/18] w-full rounded-[22px] md:rounded-[28px] border-[6px] md:border-[8px] overflow-hidden bg-white ${frameBorder}`}
                  >
                    <DeviceScreen {...screenProps} field="phoneImage" />
                  </div>
                </div>

                {/* Tablet (landscape) */}
                <div className="w-[64%] max-w-[520px] drop-shadow-[0_24px_36px_rgba(0,0,0,0.22)] animate-[phoneFloat_6s_ease-in-out_infinite] [animation-delay:0.6s]">
                  <div
                    className={`relative aspect-[4/3] w-full rounded-[18px] md:rounded-[24px] border-[6px] md:border-[9px] overflow-hidden bg-white ${frameBorder}`}
                  >
                    <DeviceScreen {...screenProps} field="tabletImage" />
                  </div>
                </div>
              </div>

              {/* Screen 2: desktop monitor */}
              <div
                aria-hidden={view !== 1}
                className="flex w-full shrink-0 items-center justify-center px-12 md:px-16 py-6"
              >
                <div className="w-full max-w-[780px] drop-shadow-[0_24px_36px_rgba(0,0,0,0.22)] animate-[phoneFloat_6s_ease-in-out_infinite]">
                  <div
                    className={`relative aspect-[16/10] w-full rounded-xl border-[7px] md:border-[10px] overflow-hidden bg-white ${frameBorder}`}
                  >
                    <DeviceScreen {...screenProps} field="desktopImage" />
                  </div>
                  {/* Stand */}
                  <div
                    className={`mx-auto h-5 md:h-8 w-14 md:w-24 bg-gradient-to-b ${standNeck}`}
                  />
                  <div
                    className={`mx-auto h-2 md:h-2.5 w-28 md:w-48 rounded-full ${standBase}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Position dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={i === 0 ? "Phone and tablet view" : "Desktop view"}
                onClick={() => setView(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  view === i
                    ? `w-6 ${isLight ? "bg-blue-500" : "bg-blue-400"}`
                    : `w-2 ${isLight ? "bg-slate-300" : "bg-slate-600"}`
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes phoneScreenScroll {
          0%, 15% { transform: translateY(0); }
          50% { transform: translateY(-6%); }
          85%, 100% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
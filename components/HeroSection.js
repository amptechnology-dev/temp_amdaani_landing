"use client";

import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";

const HERO_SECTIONS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/hero/list-hero-sections`;
const HEADING_TEXT = "India's Smart Billing & Inventory App for Retail Shops";

const normalizeSlides = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => ({
    id: item?._id || index,
    title: item?.title || "Amdaani",
    subtitle: item?.subtitle || "Billing Solution",
    phoneImage: item?.phoneImage || "/images/dashboard.jpg",
  }));
};

// Deterministic-ish random, only ever called on the client (after mount),
// so there is no server/client value mismatch to worry about.
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

// Loops: type the full text out -> hold -> erase it -> hold briefly -> repeat.
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

  // Generate particle data ONLY on the client, after mount, so the server
  // render and the first client render both start with an empty array —
  // this avoids any hydration mismatch.
  useEffect(() => {
    setStars(generateStars(60));
    setLightDots(generateLightDots(24));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Animated mesh-gradient wash — softer, lighter */}
        <div className="absolute inset-0 opacity-40 animate-[heroMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.07)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.07)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.06)_0%,transparent_60%)] bg-[length:200%_200%]" />

        {/* Large drifting glow orbs — lighter */}
        <div className="absolute -top-20 -left-10 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl animate-[heroFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-[-60px] h-[26rem] w-[26rem] rounded-full bg-cyan-400/10 blur-3xl animate-[heroFloatB_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-80px] left-1/3 h-80 w-80 rounded-full bg-indigo-300/10 blur-3xl animate-[heroFloatA_16s_ease-in-out_infinite_reverse]" />

        {/* Soft sweeping light beam / shimmer — lighter */}
        <div className="absolute inset-0 opacity-25 animate-[heroSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.06)_50%,transparent_70%)]" />

        {/* Gently drifting glowing particles */}
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
            0%,
            100% {
              background-position:
                0% 0%,
                100% 0%,
                50% 100%;
            }
            50% {
              background-position:
                20% 20%,
                80% 10%,
                40% 90%;
            }
          }
          @keyframes heroFloatA {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(40px, -35px) scale(1.12);
            }
          }
          @keyframes heroFloatB {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(-35px, 30px) scale(1.1);
            }
          }
          @keyframes heroSweep {
            0%,
            100% {
              transform: translateX(-10%);
            }
            50% {
              transform: translateX(10%);
            }
          }
          @keyframes heroDrift {
            0% {
              transform: translate(0, 0);
              opacity: 0.15;
            }
            50% {
              transform: translate(var(--dx), var(--dy));
              opacity: 0.55;
            }
            100% {
              transform: translate(0, 0);
              opacity: 0.15;
            }
          }
        `}</style>
      </div>
    );
  }

  // Dark mode — drifting + twinkling starfield
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

      {/* Shooting star streaks */}
      <span className="absolute top-[15%] left-[-10%] h-[1.5px] w-24 rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-[heroShootingStar_7s_linear_infinite]" />
      <span className="absolute top-[55%] left-[-10%] h-[1.5px] w-20 rounded-full bg-gradient-to-r from-transparent via-blue-200 to-transparent animate-[heroShootingStar_9s_linear_infinite_2.5s]" />

      <style jsx>{`
        @keyframes heroStarDrift {
          0% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
          50% {
            transform: translate(var(--dx), var(--dy)) scale(1.4);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
        }
        @keyframes heroShootingStar {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          20% {
            transform: translateX(140vw) translateY(60px);
            opacity: 0;
          }
          100% {
            transform: translateX(140vw) translateY(60px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  // Typewriter loop for the heading — types out, holds, erases, repeats
  const displayedText = useTypewriterLoop(HEADING_TEXT, {
    typeSpeed: 45,
    eraseSpeed: 28,
    holdAfterType: 1800,
    holdAfterErase: 500,
  });

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

  return (
    <section
      className={`relative overflow-hidden py-14 md:py-20 ${
        theme === "light" ? "bg-[#F5F7FA]" : "bg-[#0E0F11]"
      }`}
    >
      {/* Animated background */}
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 max-w-[1200px] mx-auto px-5 text-center">
        {/* Heading — typewriter loop animation (type -> hold -> erase -> repeat) */}
        <h1
          className={`text-[2rem] md:text-[2.8rem] font-extrabold leading-[1.2] mb-5 min-h-[2.4em] md:min-h-[2.4em] ${
            theme === "light" ? "text-slate-900" : "text-white"
          }`}
        >
          {displayedText}
          <span
            aria-hidden="true"
            className={`inline-block w-[3px] md:w-[4px] ml-1 -mb-1 h-[1.9rem] md:h-[2.6rem] align-middle animate-[heroCursorBlink_0.9s_step-end_infinite] ${
              theme === "light" ? "bg-slate-900" : "bg-white"
            }`}
          />
        </h1>

        {/* Static Subtitle */}
        <p
          className={`text-[1.05rem] md:text-[1.2rem] max-w-[700px] mx-auto mb-8 ${
            theme === "light" ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Create Bills, Manage Stock, Track Sales &amp; GST Reports in Minutes.
          Fast, simple, and 100% secure.
        </p>

        {/* Static Trust Badges */}
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
                theme === "light"
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

        {/* Static CTAs */}
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
              theme === "light"
                ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            ▶ Watch 1-Min Demo
          </a>
        </div>

        {/* Phone Mockup — floating frame + subtle "scrolling" screenshot animation */}
        <div className="relative max-w-[300px] mx-auto drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] animate-[phoneFloat_6s_ease-in-out_infinite]">
          <div
            className={`relative aspect-[9/18] w-full rounded-[28px] border-[8px] overflow-hidden bg-white ${
              theme === "light" ? "border-slate-950" : "border-white"
            }`}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
                  <p className="text-xs font-medium tracking-[0.3em] text-slate-300 uppercase">
                    Loading
                  </p>
                </div>
              </div>
            ) : slides.length > 0 ? (
              slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
                    index === currentSlide
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={slide.phoneImage}
                    alt={`${slide.title} ${slide.subtitle}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    className={`h-full w-full object-cover object-top ${
                      index === currentSlide
                        ? "animate-[phoneScreenScroll_8s_ease-in-out_infinite]"
                        : ""
                    }`}
                  />
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heroCursorBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        @keyframes phoneFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes phoneScreenScroll {
          0%,
          15% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6%);
          }
          85%,
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
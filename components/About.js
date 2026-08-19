"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useInView } from "react-intersection-observer";
import { useEffect, useMemo, useState } from "react";

const ABOUT_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/about/public-about`;

const FALLBACK_STATS = [
  { number: "10,000+", label: "App Downloads" },
  { number: "5,000+", label: "Active Shops" },
  { number: "₹50 Cr+", label: "Bills Generated" },
  { number: "24×7", label: "Customer Support" },
];

const normalizeStats = (statsInput) => {
  if (!Array.isArray(statsInput)) return [];

  return statsInput
    .map((stat) => {
      const number = String(stat?.number ?? "").trim();
      const label = String(stat?.label ?? "").trim();
      return { number, label };
    })
    .filter((stat) => {
      if (!stat.number || !stat.label) return false;
      const numericPart = stat.number.replace(/[^0-9.]/g, "");
      const isZeroValue = numericPart !== "" && Number(numericPart) === 0;
      return !isZeroValue;
    });
};

// Parses "10,000+" -> { prefix: "", value: 10000, suffix: "+", hasComma: true }
// Parses "₹50 Cr+" -> { prefix: "₹", value: 50, suffix: " Cr+", hasComma: false }
// Parses "24×7" -> { prefix: "", value: 24, suffix: "×7", hasComma: false }
// Parses "99.9%" -> { prefix: "", value: 99.9, suffix: "%", hasComma: false }
const parseStatNumber = (raw) => {
  const str = String(raw || "").trim();
  const match = str.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);

  if (!match)
    return { prefix: "", value: 0, suffix: str, hasComma: false, decimals: 0 };

  const [, prefix, numPart, suffix] = match;
  const hasComma = numPart.includes(",");
  const decimalMatch = numPart.match(/\.(\d+)$/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;
  const value = parseFloat(numPart.replace(/,/g, "")) || 0;

  return { prefix, value, suffix, hasComma, decimals };
};

const formatCount = (num, { hasComma, decimals }) => {
  const fixed =
    decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();

  if (!hasComma) return fixed;

  const [intPart, decPart] = fixed.split(".");
  const withCommas = Number(intPart).toLocaleString("en-IN");
  return decPart ? `${withCommas}.${decPart}` : withCommas;
};

function AnimatedStatNumber({ rawNumber, inView, duration = 1600, delay = 0 }) {
  const parsed = useMemo(() => parseStatNumber(rawNumber), [rawNumber]);
  const [displayValue, setDisplayValue] = useState(0);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    if (!inView) return;

    let rafId;
    let startTime;
    const timer = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplayValue(parsed.value * eased);

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplayValue(parsed.value);
          // Small "pop" once the count finishes, so it doesn't just abruptly stop.
          setJustFinished(true);
          setTimeout(() => setJustFinished(false), 260);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [inView, parsed.value, duration, delay]);

  return (
    <span
      className={`inline-block transition-transform duration-300 ease-out ${
        justFinished ? "scale-110" : "scale-100"
      }`}
    >
      {parsed.prefix}
      {formatCount(displayValue, parsed)}
      {parsed.suffix}
    </span>
  );
}

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

function AnimatedBackground({ theme }) {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState([]);
  const [lightDots, setLightDots] = useState([]);

  // Generate particle data ONLY on the client, after mount, so the server
  // render and the first client render both start with an empty array —
  // this avoids any hydration mismatch.
  useEffect(() => {
    setStars(generateStars(40));
    setLightDots(generateLightDots(18));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-35 animate-[aboutMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.06)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.06)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.05)_0%,transparent_60%)] bg-[length:200%_200%]" />

        <div className="absolute -top-16 -left-10 h-72 w-72 rounded-full bg-blue-400/8 blur-3xl animate-[aboutFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-[-40px] h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl animate-[aboutFloatB_18s_ease-in-out_infinite]" />

        <div className="absolute inset-0 opacity-20 animate-[aboutSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.05)_50%,transparent_70%)]" />

        {mounted &&
          lightDots.map((dot) => (
            <span
              key={dot.id}
              className="absolute rounded-full bg-[#2563eb]/15 blur-[1.5px] animate-[aboutDrift_var(--dur)_ease-in-out_infinite]"
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
          @keyframes aboutMeshShift {
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
          @keyframes aboutFloatA {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(35px, -30px) scale(1.1);
            }
          }
          @keyframes aboutFloatB {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(-30px, 25px) scale(1.08);
            }
          }
          @keyframes aboutSweep {
            0%,
            100% {
              transform: translateX(-10%);
            }
            50% {
              transform: translateX(10%);
            }
          }
          @keyframes aboutDrift {
            0% {
              transform: translate(0, 0);
              opacity: 0.12;
            }
            50% {
              transform: translate(var(--dx), var(--dy));
              opacity: 0.5;
            }
            100% {
              transform: translate(0, 0);
              opacity: 0.12;
            }
          }
        `}</style>
      </div>
    );
  }

  // Dark mode — drifting + twinkling starfield
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[aboutStarDrift_var(--dur)_ease-in-out_infinite]"
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

      <style jsx>{`
        @keyframes aboutStarDrift {
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
      `}</style>
    </div>
  );
}

export default function AboutSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [stats, setStats] = useState(FALLBACK_STATS);

  // triggerOnce: counter shudhu ekbar count hobe (scroll up/down korle abar restart hobe na)
  // threshold kome anlam + rootMargin diye ektu age (user scroll kore section er kachakachi
  // ashtei) trigger hobe, jate onek deri na hoy
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.15,
    rootMargin: "0px 0px -80px 0px",
  });

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const response = await fetch(ABOUT_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
          return;
        }

        const activeItem =
          result.data.find((item) => item?.isActive) || result.data[0];
        if (!activeItem) return;

        const normalized = normalizeStats(activeItem?.stats);
        setStats(normalized.length ? normalized : FALLBACK_STATS);
      } catch {
        setStats(FALLBACK_STATS);
      }
    };

    fetchAbout();
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      className={`relative overflow-hidden py-14 ${
        theme === "light" ? "bg-[#F5F7FA]" : "bg-[#0E0F11]"
      }`}
    >
      {/* Animated background */}
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 max-w-6xl mx-auto px-5">
        <div className="flex flex-wrap justify-around gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <div className="text-[1.8rem] font-extrabold text-[#2563eb] mb-1 tabular-nums">
                <AnimatedStatNumber
                  rawNumber={stat.number}
                  inView={inView}
                  delay={index * 120}
                />
              </div>
              <div
                className={`text-sm ${
                  theme === "light" ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
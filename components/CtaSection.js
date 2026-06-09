"use client";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useState } from "react";
import {
  Play,
  Clock,
  Shield,
  Smartphone,
  Star,
  BadgeCheck,
} from "lucide-react";

const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;
const LANDING_APP_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/app-version/landing-apk`;
const PLAY_STORE_FALLBACK_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps";

export default function CTASection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [isVisible, setIsVisible] = useState(false);
  const [heroButton, setHeroButton] = useState(null);
  const [latestRelease, setLatestRelease] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchHeroButton = async () => {
      try {
        const response = await fetch(HERO_BUTTON_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
          setHeroButton(null);
          return;
        }

        const activeButton = result.data.find((item) => item?.isActive);
        if (!activeButton?.name || !activeButton?.link) {
          setHeroButton(null);
          return;
        }

        setHeroButton(activeButton);
      } catch {
        setHeroButton(null);
      }
    };

    fetchHeroButton();
  }, []);

  useEffect(() => {
    const fetchLatestRelease = async () => {
      try {
        setLoading(true);
        const response = await fetch(LANDING_APP_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !result?.data) {
          setLatestRelease(null);
          return;
        }

        setLatestRelease(result.data);
      } catch {
        setLatestRelease(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestRelease();
  }, []);

  const handlePlayStoreOpen = () => {
    const targetUrl =
      heroButton?.link ||
      latestRelease?.playStoreUrl ||
      PLAY_STORE_FALLBACK_URL;
    const hasProtocol = /^https?:\/\//i.test(targetUrl);
    const href = hasProtocol ? targetUrl : `https://${targetUrl}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className={`py-20 px-5 sm:px-8 lg:px-12 ${currentTheme.background}`}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            {/* <motion.div
              initial={{ scale: 0 }}
              animate={isVisible ? { scale: 1 } : {}}
              transition={{ delay: 0.2, type: "spring" }}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${currentTheme.accentLight} ${currentTheme.accent.replace("bg-", "text-")}`}
            >
              <Clock className="w-4 h-4 mr-2" />
              {loading
                ? "Loading Play Store link..."
                : latestRelease?.version
                  ? `Latest version v${latestRelease.version}`
                  : "Available on Google Play"}
            </motion.div> */}

            <h2
              className={`text-4xl md:text-5xl font-bold mb-6 leading-[1.25] ${currentTheme.text}`}
            >
              Get Amdaani Now
              <span
                className={`block pb-2 bg-gradient-to-r ${
                  theme === "light"
                    ? "from-[#1A73E8] to-[#03DAC5]"
                    : "from-[#8AB4F8] to-[#66FFF9]"
                } bg-clip-text text-transparent`}
              >
                On Google Play
              </span>
            </h2>

            <p className={`text-xl mb-8 ${currentTheme.textSecondary}`}>
              Open the Google Play listing to install Amdaani from the official
              store and start managing your billing today.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-6 mb-8 items-start"
            >
              <div className="flex flex-col items-start gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayStoreOpen}
                  className="p-0 bg-transparent border-0 inline-flex items-center"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge className="h-12 sm:h-14 md:h-16 w-auto" />
                </motion.button>
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  Or tap the button above
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-2xl border-2 ${currentTheme.outline} ${currentTheme.surfaceVariant} bg-white shadow-md`}>
                  <img
                    src="/images/PlayScanner.png"
                    alt="QR Code Scanner"
                    className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                  />
                </div>
                <p className={`text-sm font-medium ${currentTheme.text} text-center`}>
                  Scan to Download
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={`p-4 rounded-xl border ${currentTheme.surfaceVariant} ${currentTheme.outline} mb-6`}
            >
              <div className="flex items-start space-x-3">
                <Shield className={`w-5 h-5 mt-0.5 ${currentTheme.success}`} />
                <div>
                  <h4 className={`font-semibold mb-1 ${currentTheme.text}`}>
                    {heroButton?.name || "Official Link"}
                  </h4>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>
                    Use the button above to open the official link and continue.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              <div className="w-full max-w-[320px] sm:max-w-[360px] h-[560px] sm:h-[600px] rounded-[3rem] border-[14px] border-slate-900 bg-slate-900 shadow-2xl mx-auto lg:mx-0">
                <div className="h-full rounded-[2rem] overflow-hidden bg-white">
                  <div className="h-12 flex items-center justify-between px-6 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <div className="w-1 h-4 rounded-full bg-slate-300" />
                      <div className="w-1 h-4 rounded-full bg-slate-400" />
                      <div className="w-1 h-4 rounded-full bg-slate-300" />
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-1 flex-shrink-0"
                      >
                        {/* Logo (UNCHANGED) */}
                        <div className="w-18 h-18 rounded-xl overflow-hidden">
                          <img
                            src="/images/Tapplogo.png"
                            alt="Amdaani Logo"
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                          />
                        </div>

                        {/* TEXT BLOCK */}
                        <div className="flex flex-col ml-[-8px]">
                          <span
                            style={{
                              fontFamily: "'Hit and Run', sans-serif",
                              color: "#255e97",
                            }}
                            className="text-lg font-extrabold tracking-tight leading-none"
                          >
                            AMDAANI
                          </span>

                          {/* 👇 FIXED SPACING HERE */}
                          <span
                            className={`text-[11px] mt-[2px] tracking-[0.14em] font-bold ${currentTheme.textTertiary} hidden sm:block`}
                          >
                            Smart Business Solutions
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 mb-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-1">
                            Google Play
                          </p>
                          <h4 className="text-xl font-black tracking-tight text-slate-900">
                            Play Store Listing
                          </h4>
                        </div>
                        {/* <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-sm border border-slate-200">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-bold text-slate-700">
                            4.9
                          </span>
                        </div> */}
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#34A853] flex items-center justify-center shadow-md">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            Official App
                          </p>
                          <p className="font-bold text-slate-900">
                            Install from Play Store
                          </p>
                        </div>
                      </div>

                      <div className="w-full">
                        <button
                          type="button"
                          onClick={handlePlayStoreOpen}
                          className="p-0 bg-transparent border-0 inline-flex items-center justify-center w-full"
                          aria-label="Get it on Google Play"
                        >
                          <PlayStoreBadge className="h-12 sm:h-14 w-auto" />
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-3 py-3 border-t border-slate-200">
                        <p className={`text-xs font-semibold text-slate-500`}>
                          Or scan:
                        </p>
                        <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
                          <img
                            src="/images/PlayScanner.png"
                            alt="QR Code"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Invoices", icon: "🧾" },
                        { name: "Customers", icon: "👥" },
                        { name: "Products", icon: "📦" },
                        { name: "Reports", icon: "📊" },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm"
                        >
                          <div className="text-lg mb-1">{item.icon}</div>
                          <span className="text-xs font-medium text-slate-500">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute -top-4 -right-4 w-20 h-20 rounded-2xl ${currentTheme.accentLight} flex items-center justify-center shadow-lg`}
              >
                <Smartphone
                  className={`w-8 h-8 ${currentTheme.accent.replace("bg-", "text-")}`}
                />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-[#34A853] flex items-center justify-center shadow-lg"
              >
                <Play className="w-6 h-6 text-white fill-white" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroButtonIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient
          id="playGradientHero"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#34A853" />
          <stop offset="40%" stopColor="#4285F4" />
          <stop offset="70%" stopColor="#FBBC05" />
          <stop offset="100%" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <path
        d="M3 2 L21 12 L3 22 Z"
        fill="url(#playGradientHero)"
        stroke="none"
      />
      <path d="M4.2 3.2 L18.5 12 L4.2 20.8 Z" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
}

function PlayStoreBadge({ className = "h-8 w-auto" }) {
  // Use the same raster badge as elsewhere so it displays consistently
  // and doesn't render a white rounded rect behind the image.
  return (
    <img
      src="/images/play.jpeg"
      alt="Get it on Google Play"
      className={`${className} object-contain block`}
      loading="lazy"
      draggable={false}
    />
  );
}

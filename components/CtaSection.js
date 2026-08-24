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
              className="inline-flex flex-row items-center gap-5 mb-8"
            >
              {/* Play Store Badge */}
              <div className="flex flex-col items-start gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayStoreOpen}
                  className="p-0 bg-transparent border-0 inline-flex items-center"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge className="h-12 sm:h-14 w-auto" />
                </motion.button>
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  Or tap the button above
                </p>
              </div>

              {/* QR Code — right side এ, same row এ */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`p-2 rounded-xl border-2 ${currentTheme.outline} bg-white shadow-md`}
                >
                  <img
                    src="/images/PlayScanner.PNG"
                    alt="QR Code Scanner"
                    className="w-25 h-25 object-contain"
                  />
                </div>
                <p
                  className={`text-xs font-medium ${currentTheme.textSecondary} text-center`}
                >
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
              <div className="w-full max-w-[300px] sm:max-w-[320px] h-[480px] sm:h-[520px] rounded-[3rem] border-[12px] border-slate-900 bg-slate-900 shadow-2xl mx-auto lg:mx-0">
                <div className="h-full rounded-[2.2rem] overflow-hidden bg-white relative">
                  {/* Play Store Screenshot with animation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={
                      isVisible ? { opacity: 1, scale: 1, y: [0, -8, 0] } : {}
                    }
                    transition={{
                      opacity: { duration: 0.6, delay: 0.5 },
                      scale: { duration: 0.6, delay: 0.5 },
                      y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.1,
                      },
                    }}
                    className="w-full h-full flex items-center justify-center bg-white"
                  >
                    <img
                      src="/images/amdaaniplaystore.png"
                      alt="Amdaani on Google Play"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Green Play badge */}
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

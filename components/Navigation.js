"use client";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const GoogleTranslate = dynamic(() => import("./GoogleTranslate"), {
  ssr: false,
});

const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;

function TranslateWidget() {
  return (
    <div
      suppressHydrationWarning
      className="flex items-center gap-1.5 px-2.5 h-9 rounded-full border border-gray-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md shadow-sm overflow-visible min-w-[140px]"
    >
      <span className="text-[12px] leading-none flex-shrink-0">🌐</span>
      <div className="translate-mini flex-1 min-w-0">
        <GoogleTranslate />
      </div>
    </div>
  );
}

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconAbout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function IconTestimonial() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPricing() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M7 15h2M15 15h2" />
    </svg>
  );
}

function IconFaq() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="0" />
    </svg>
  );
}

function IconContact() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.9 19.79 19.79 0 0 1 1.07 3.27 2 2 0 0 1 3.05 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  );
}

// ✅ Compact badge — mobile এ ছোট, desktop এ বড়
function PlayStoreBadge({ compact = false }) {
  if (compact) {
    // Mobile header — just icon + small text
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        borderRadius: "10px",
        padding: "5px 10px 5px 8px",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}>
        <svg width="18" height="18" viewBox="0 0 26 26" fill="none" style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id="c_tl" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00E5FF" /><stop offset="1" stopColor="#2979FF" /></linearGradient>
            <linearGradient id="c_bl" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#00E676" /><stop offset="1" stopColor="#76FF03" /></linearGradient>
            <linearGradient id="c_tr" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#FF6D00" /><stop offset="1" stopColor="#FFAB00" /></linearGradient>
            <linearGradient id="c_br" x1="1" y1="1" x2="0" y2="0"><stop stopColor="#FF1744" /><stop offset="1" stopColor="#FF6D00" /></linearGradient>
          </defs>
          <path d="M3 3L13.5 13L3 13V3Z" fill="url(#c_tl)" />
          <path d="M3 23L13.5 13L3 13V23Z" fill="url(#c_bl)" />
          <path d="M3 3L13.5 13L20 9.5L3 3Z" fill="url(#c_tr)" />
          <path d="M3 23L13.5 13L20 16.5L3 23Z" fill="url(#c_br)" />
          <path d="M20 9.5L13.5 13L20 16.5L23 13L20 9.5Z" fill="#FFD740" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "7px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>GET IT ON</span>
          <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>Google Play</span>
        </div>
      </div>
    );
  }

  // Desktop — full size
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      borderRadius: "14px",
      padding: "8px 16px 8px 12px",
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="ps_tl" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00E5FF" /><stop offset="1" stopColor="#2979FF" /></linearGradient>
          <linearGradient id="ps_bl" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#00E676" /><stop offset="1" stopColor="#76FF03" /></linearGradient>
          <linearGradient id="ps_tr" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#FF6D00" /><stop offset="1" stopColor="#FFAB00" /></linearGradient>
          <linearGradient id="ps_br" x1="1" y1="1" x2="0" y2="0"><stop stopColor="#FF1744" /><stop offset="1" stopColor="#FF6D00" /></linearGradient>
        </defs>
        <path d="M3 3L13.5 13L3 13V3Z" fill="url(#ps_tl)" />
        <path d="M3 23L13.5 13L3 13V23Z" fill="url(#ps_bl)" />
        <path d="M3 3L13.5 13L20 9.5L3 3Z" fill="url(#ps_tr)" />
        <path d="M3 23L13.5 13L20 16.5L3 23Z" fill="url(#ps_br)" />
        <path d="M20 9.5L13.5 13L20 16.5L23 13L20 9.5Z" fill="#FFD740" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px" }}>GET IT ON</span>
        <span style={{ color: "#ffffff", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em" }}>Google Play</span>
      </div>
    </div>
  );
}

const NAV_KEY_MAP = {
  home: "home",
  "about us": "about",
  about: "about",
  testimonial: "testimonials",
  testimonials: "testimonials",
  pricing: "pricing",
  "contact us": "contact",
  contact: "contact",
  faq: "faq",
};

const normalizeKey = (name) =>
  NAV_KEY_MAP[String(name || "").toLowerCase().trim()] ||
  String(name || "").toLowerCase().trim();

export default function Navigation({
  featuresRef,
  pricingRef,
  aboutRef,
  testimonialsRef,
  faqRef,
  heroRef,
  footerRef,
  scrollToSection,
  activeSection = "home",
  noLanding = false,
}) {
  const { theme, toggleTheme } = useTheme();
  const [localActive, setLocalActive] = useState(activeSection);
  const [userClicked, setUserClicked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroButton, setHeroButton] = useState(null);
  const [heroButtonLoading, setHeroButtonLoading] = useState(true);
  const dropdownRef = useRef(null);
  const currentTheme = themeConfig[theme];
  const clickLockTimer = useRef(null);

  useEffect(() => {
    const fetchHeroButton = async () => {
      try {
        setHeroButtonLoading(true);
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
      } finally {
        setHeroButtonLoading(false);
      }
    };
    fetchHeroButton();
  }, []);

  const navigationItems = [
    { name: "Home", ref: heroRef, Icon: IconHome },
    { name: "About Us", ref: aboutRef, Icon: IconAbout },
    { name: "Testimonial", ref: testimonialsRef, Icon: IconTestimonial },
    { name: "Pricing", ref: pricingRef, Icon: IconPricing },
    { name: "FAQ", ref: faqRef, Icon: IconFaq },
    { name: "Contact Us", ref: footerRef, Icon: IconContact },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!userClicked) setLocalActive(activeSection);
  }, [activeSection, userClicked]);

  const handleNavigationClick = (itemRef, itemName) => {
    const key = normalizeKey(itemName);
    setLocalActive(key);
    setUserClicked(true);
    setIsMobileMenuOpen(false);

    if (clickLockTimer.current) clearTimeout(clickLockTimer.current);
    clickLockTimer.current = setTimeout(() => setUserClicked(false), 900);

    setTimeout(() => {
      if (itemRef?.current) {
        itemRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (key === "home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          const el = document.getElementById(key);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 300);
  };

  const isItemActive = (itemName) => normalizeKey(itemName) === localActive;

  useEffect(() => {
    return () => {
      if (clickLockTimer.current) clearTimeout(clickLockTimer.current);
    };
  }, []);

  const handleHeroButtonClick = () => {
    if (!heroButton?.link) return;
    const hasProtocol = /^https?:\/\//i.test(heroButton.link);
    const href = hasProtocol ? heroButton.link : `https://${heroButton.link}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const navBg =
    theme === "light"
      ? isScrolled ? "bg-white/95 shadow-md" : "bg-white/95"
      : isScrolled
        ? "bg-slate-950/90 shadow-[0_4px_24px_rgba(2,6,23,0.5)]"
        : "bg-slate-950/85";

  const getItemClass = (active) =>
    [
      "relative px-3.5 py-2 rounded-lg font-semibold text-[14px] transition-all duration-200",
      "flex items-center gap-2",
      active
        ? theme === "light" ? "text-blue-600 bg-blue-50" : "text-blue-400 bg-blue-950/40"
        : theme === "light"
          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          : "text-slate-400 hover:text-white hover:bg-slate-800",
    ].join(" ");

  const getIconClass = (active) =>
    active
      ? theme === "light" ? "text-blue-500" : "text-blue-400"
      : theme === "light" ? "text-slate-400" : "text-slate-500";

  return (
    <div className="sticky top-0 z-50">
      <nav
        className={`w-full backdrop-blur-xl transition-all duration-300 ${navBg} ${
          isScrolled ? "py-2" : "py-3"
        }`}
      >
        {/* ✅ max-w + overflow hidden শুধু nav এ, sticky wrapper এ না */}
        <div className="w-full px-3 sm:px-6 lg:px-8 overflow-hidden">
          <div className="flex items-center justify-between gap-2">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1 flex-shrink-0 cursor-pointer min-w-0"
              onClick={() => handleNavigationClick(heroRef, "Home")}
            >
              <div className="w-18 h-18 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
              <div className="flex flex-col ml-[-4px] min-w-0">
                <span
                  style={{ fontFamily: "'Hit and Run', sans-serif", color: "#255e97" }}
                  className="text-base font-extrabold tracking-tight leading-none whitespace-nowrap"
                >
                  AMDAANI
                </span>
                <span className={`text-[10px] mt-[2px] tracking-[0.12em] font-bold ${currentTheme.textTertiary} hidden sm:block whitespace-nowrap`}>
                  Smart Business Solutions
                </span>
              </div>
            </motion.div>

            {/* Desktop Nav — center */}
            {!noLanding && (
              <div
                className="hidden lg:flex items-center gap-0.5 flex-shrink-0"
                ref={dropdownRef}
              >
                {navigationItems.map((item) => {
                  const active = isItemActive(item.name);
                  const { Icon } = item;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigationClick(item.ref, item.name)}
                      className={getItemClass(active)}
                    >
                      <span className={`flex-shrink-0 transition-colors duration-200 ${getIconClass(active)}`}>
                        <Icon />
                      </span>
                      <span>{item.name}</span>
                      {active && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <TranslateWidget />
              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge compact={false} />
                </button>
              )}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-200 border flex-shrink-0 ${
                  theme === "light"
                    ? "bg-white border-gray-200 hover:bg-slate-100 text-slate-700"
                    : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                }`}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>

            {/* ✅ Mobile Right — compact layout */}
            <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0">
              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex flex-shrink-0"
                  aria-label="Get it on Google Play"
                >
                  {/* ✅ Mobile এ compact badge */}
                  <PlayStoreBadge compact={true} />
                </button>
              )}

              {!noLanding && (
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border flex-shrink-0 transition-all duration-200 ${
                    theme === "light"
                      ? "bg-white border-gray-200 hover:bg-slate-100 text-slate-700"
                      : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                  }`}
                  aria-label="Toggle theme"
                >
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              )}

              {!noLanding && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border flex-shrink-0 transition-all duration-200 ${
                    theme === "light"
                      ? "bg-white border-gray-200 hover:bg-slate-100 text-slate-700"
                      : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                  }`}
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* ✅ Mobile Dropdown Menu */}
          {!noLanding && (
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`lg:hidden border mt-2 rounded-2xl overflow-hidden backdrop-blur-xl ${
                    theme === "light"
                      ? "bg-white border-gray-200"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col gap-1 p-2">
                    {navigationItems.map((item) => {
                      const active = isItemActive(item.name);
                      const { Icon } = item;
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleNavigationClick(item.ref, item.name)}
                          className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 ${
                            active
                              ? theme === "light"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-blue-950/40 text-blue-400"
                              : theme === "light"
                                ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span className={`flex-shrink-0 ${getIconClass(active)}`}>
                            <Icon />
                          </span>
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </nav>
    </div>
  );
}
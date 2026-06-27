"use client";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { Sun, Moon, Menu, X, ChevronDown } from "lucide-react";
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

// ✅ Custom SVG icons — each unique and on-brand
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
      <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5" strokeLinecap="round"/>
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
      <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="0"/>
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
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
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

  // ✅ Each nav item has its own unique icon
  const navigationItems = [
    { name: "Home",       ref: heroRef,       Icon: IconHome },
    { name: "About Us",   ref: aboutRef,      Icon: IconAbout },
    { name: "Testimonial",ref: testimonialsRef,Icon: IconTestimonial },
    { name: "Pricing",    ref: pricingRef,     Icon: IconPricing },
    { name: "FAQ",        ref: faqRef,         Icon: IconFaq },
    { name: "Contact Us", ref: footerRef,      Icon: IconContact },
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
        setIsSolutionsOpen(false);
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

    if (clickLockTimer.current) clearTimeout(clickLockTimer.current);
    clickLockTimer.current = setTimeout(() => setUserClicked(false), 900);

    if (itemRef?.current) {
      try {
        scrollToSection(itemRef);
      } catch {
        itemRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      if (key === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(key);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMobileMenuOpen(false);
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
      : isScrolled ? "bg-slate-950/90 shadow-[0_4px_24px_rgba(2,6,23,0.5)]" : "bg-slate-950/85";

  // ✅ Icon + label styling — active shows colored icon + blue underline dot
  const getItemClass = (active) =>
    [
      "relative px-3.5 py-2 rounded-lg font-semibold text-[14px] transition-all duration-200",
      "flex items-center gap-2",
      active
        ? theme === "light"
          ? "text-blue-600 bg-blue-50"
          : "text-blue-400 bg-blue-950/40"
        : theme === "light"
        ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        : "text-slate-400 hover:text-white hover:bg-slate-800",
    ].join(" ");

  const getIconClass = (active) =>
    active
      ? theme === "light" ? "text-blue-500" : "text-blue-400"
      : theme === "light" ? "text-slate-400" : "text-slate-500";

  return (
    <div className="sticky top-0 z-50 overflow-x-hidden">
      <nav
        className={`w-full backdrop-blur-xl transition-all duration-300 ${navBg} ${
          isScrolled ? "py-2" : "py-3"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-3 px-0 sm:px-1 py-1">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-1 flex-shrink-0 cursor-pointer"
              onClick={() => handleNavigationClick(heroRef, "Home")}
            >
              <div className="w-18 h-18 rounded-xl overflow-hidden">
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
              <div className="flex flex-col ml-[-8px]">
                <span
                  style={{ fontFamily: "'Hit and Run', sans-serif", color: "#255e97" }}
                  className="text-lg font-extrabold tracking-tight leading-none"
                >
                  AMDAANI
                </span>
                <span className={`text-[11px] mt-[2px] tracking-[0.14em] font-bold ${currentTheme.textTertiary} hidden sm:block`}>
                  Smart Business Solutions
                </span>
              </div>
            </motion.div>

            {/* Desktop Nav */}
            {!noLanding && (
              <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0" ref={dropdownRef}>
                {navigationItems.map((item) => {
                  const active = isItemActive(item.name);
                  const { Icon } = item;

                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigationClick(item.ref, item.name)}
                      className={getItemClass(active)}
                    >
                      {/* ✅ Icon with its own color class */}
                      <span className={`flex-shrink-0 transition-colors duration-200 ${getIconClass(active)}`}>
                        <Icon />
                      </span>
                      <span>{item.name}</span>

                      {/* ✅ Active underline dot */}
                      {active && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
              <TranslateWidget />
              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex items-center"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge className="h-9 w-auto" />
                </button>
              )}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-200 border ${
                  theme === "light"
                    ? "bg-white border-gray-200 hover:bg-slate-100 text-slate-700"
                    : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                }`}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile Right */}
            <div className="flex lg:hidden items-center space-x-2 flex-shrink-0">
              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex items-center"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge className="h-8 w-auto" />
                </button>
              )}
              {!noLanding && (
                <button
                  onClick={toggleTheme}
                  className={`p-2.5 rounded-xl transition-all duration-200 border ${
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
                  className={`p-2.5 rounded-xl transition-all duration-200 border ${
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

          {/* Mobile Menu */}
          {!noLanding && (
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`lg:hidden border mt-3 rounded-2xl overflow-hidden backdrop-blur-xl ${
                    theme === "light"
                      ? "bg-white border-gray-200"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col space-y-1 p-3 w-full">
                    {!heroButtonLoading && heroButton?.isActive && (
                      <div className="w-full mb-2 flex items-center justify-center">
                        <button
                          onClick={handleHeroButtonClick}
                          className="p-0 bg-transparent border-0 inline-flex items-center"
                          aria-label="Get it on Google Play"
                        >
                          <PlayStoreBadge className="h-10 w-auto block" />
                        </button>
                      </div>
                    )}

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

function PlayStoreBadge({ className = "h-8 w-auto" }) {
  return (
    <img
      src="/images/play.jpeg"
      alt="Get it on Google Play"
      className={`${className} object-contain block rounded-lg [mix-blend-mode:multiply] dark:[mix-blend-mode:screen]`}
      loading="lazy"
      draggable={false}
    />
  );
}
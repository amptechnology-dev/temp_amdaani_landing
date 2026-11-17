"use client";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { Sun, Moon, Menu, X, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const GoogleTranslate = dynamic(() => import("./GoogleTranslate"), {
  ssr: false,
});

const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;
const START_BILLING_ROUTE = "/auth";

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

// Play Store badge — slim, professional. size: "md" (desktop) | "sm" (mobile)
function PlayStoreBadge({ size = "md" }) {
  const uid = useId().replace(/:/g, "");
  const isSmall = size === "sm";

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-slate-900 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 transition-colors duration-200 cursor-pointer whitespace-nowrap ${
        isSmall ? "h-9 gap-1.5 px-2.5" : "h-10 gap-2 px-3"
      }`}
    >
      <svg
        width={isSmall ? 16 : 20}
        height={isSmall ? 16 : 20}
        viewBox="0 0 26 26"
        fill="none"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={`${uid}tl`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00E5FF" /><stop offset="1" stopColor="#2979FF" /></linearGradient>
          <linearGradient id={`${uid}bl`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#00E676" /><stop offset="1" stopColor="#76FF03" /></linearGradient>
          <linearGradient id={`${uid}tr`} x1="1" y1="0" x2="0" y2="1"><stop stopColor="#FF6D00" /><stop offset="1" stopColor="#FFAB00" /></linearGradient>
          <linearGradient id={`${uid}br`} x1="1" y1="1" x2="0" y2="0"><stop stopColor="#FF1744" /><stop offset="1" stopColor="#FF6D00" /></linearGradient>
        </defs>
        <path d="M3 3L13.5 13L3 13V3Z" fill={`url(#${uid}tl)`} />
        <path d="M3 23L13.5 13L3 13V23Z" fill={`url(#${uid}bl)`} />
        <path d="M3 3L13.5 13L20 9.5L3 3Z" fill={`url(#${uid}tr)`} />
        <path d="M3 23L13.5 13L20 16.5L3 23Z" fill={`url(#${uid}br)`} />
        <path d="M20 9.5L13.5 13L20 16.5L23 13L20 9.5Z" fill="#FFD740" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`text-white/60 font-semibold uppercase tracking-[0.1em] ${
            isSmall ? "text-[6.5px]" : "text-[8px]"
          }`}
        >
          Get it on
        </span>
        <span
          className={`text-white font-bold tracking-tight ${
            isSmall ? "text-[11px] mt-[2px]" : "text-[13px] mt-[3px]"
          }`}
        >
          Google Play
        </span>
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
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [localActive, setLocalActive] = useState(activeSection);
  const [userClicked, setUserClicked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [heroButton, setHeroButton] = useState(null);
  const [heroButtonLoading, setHeroButtonLoading] = useState(true);
  const navContainerRef = useRef(null);
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
    // { name: "About Us", ref: aboutRef, Icon: IconAbout },
    { name: "Testimonial", ref: testimonialsRef, Icon: IconTestimonial },
    { name: "Pricing", ref: pricingRef, Icon: IconPricing },
    { name: "FAQ", ref: faqRef, Icon: IconFaq },
    { name: "Contact Us", ref: footerRef, Icon: IconContact },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target)
      ) {
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

  const handleStartBillingClick = () => {
    setIsMobileMenuOpen(false);
    router.push(START_BILLING_ROUTE);
  };

  const navBg =
    theme === "light"
      ? isScrolled
        ? "bg-white/90 backdrop-blur-md shadow-[0_2px_16px_rgba(15,23,42,0.07)] border-b border-gray-200"
        : "bg-white border-b border-gray-100"
      : isScrolled
        ? "bg-slate-950/90 backdrop-blur-md shadow-[0_2px_16px_rgba(2,6,23,0.55)] border-b border-slate-800"
        : "bg-slate-950 border-b border-slate-900";

  const getItemClass = (active) =>
    [
      "relative px-3 py-2 rounded-md font-semibold text-[14px] transition-colors duration-200",
      "flex items-center gap-2 whitespace-nowrap",
      active
        ? "text-[#2563eb]"
        : theme === "light"
          ? "text-slate-600 hover:text-[#2563eb]"
          : "text-slate-300 hover:text-[#3b82f6]",
    ].join(" ");

  const getIconClass = (active) =>
    active
      ? "text-[#2563eb]"
      : theme === "light" ? "text-slate-400" : "text-slate-500";

  const iconBtnClass =
    theme === "light"
      ? "bg-white border-gray-200 hover:bg-slate-50 text-slate-700"
      : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300";

  return (
    <div className="sticky top-0 z-50">
      <nav
        className={`w-full transition-all duration-300 ${navBg} ${
          isScrolled ? "py-2" : "py-3"
        }`}
      >
        <div
          ref={navContainerRef}
          className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-8"
        >
          <div className="flex items-center justify-between gap-3">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer min-w-0"
              onClick={() => handleNavigationClick(heroRef, "Home")}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-[#2563eb]/15 bg-white shadow-sm">
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[21px] font-extrabold tracking-tight leading-none text-[#2563eb] whitespace-nowrap">
                  Amdaani
                </span>
                <span className={`text-[9.5px] mt-[3px] tracking-[0.12em] font-semibold uppercase ${currentTheme.textTertiary} hidden sm:block whitespace-nowrap`}>
                  Smart Business Solutions
                </span>
              </div>
            </motion.div>

            {/* Desktop Nav (xl+) */}
            {!noLanding && (
              <div className="hidden xl:flex items-center gap-0.5 flex-shrink-0">
                {navigationItems.map((item) => {
                  const active = isItemActive(item.name);
                  const { Icon } = item;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigationClick(item.ref, item.name)}
                      className={getItemClass(active)}
                    >
                      <span className={`hidden 2xl:inline-flex flex-shrink-0 transition-colors duration-200 ${getIconClass(active)}`}>
                        <Icon />
                      </span>
                      <span>{item.name}</span>
                      {active && (
                        <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-[#2563eb]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop Right (xl+) */}
            <div className="hidden xl:flex items-center gap-2.5 flex-shrink-0">
              <GoogleTranslate theme={theme} />

              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge size="md" />
                </button>
              )}

              <span
                className={`w-px h-6 mx-1 ${
                  theme === "light" ? "bg-gray-200" : "bg-slate-700"
                }`}
              />

              <button
                onClick={handleStartBillingClick}
                className="group inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[14px] font-semibold shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
                aria-label="Start Billing"
              >
                <span>Start Billing</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={toggleTheme}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 border flex-shrink-0 ${iconBtnClass}`}
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile / Tablet Right (below xl) */}
            <div className="flex xl:hidden items-center gap-1.5 flex-shrink-0">
              {!heroButtonLoading && heroButton?.isActive && (
                <button
                  onClick={handleHeroButtonClick}
                  className="p-0 bg-transparent border-0 inline-flex flex-shrink-0"
                  aria-label="Get it on Google Play"
                >
                  <PlayStoreBadge size="sm" />
                </button>
              )}

              {!noLanding && (
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border flex-shrink-0 transition-all duration-200 ${iconBtnClass}`}
                  aria-label="Toggle theme"
                >
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              )}

              {!noLanding && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border flex-shrink-0 transition-all duration-200 ${
                    theme === "light"
                      ? "bg-[#2563eb] border-[#2563eb] text-white hover:bg-[#1d4ed8]"
                      : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                  }`}
                  aria-label="Toggle menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {!noLanding && (
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`xl:hidden border mt-2 rounded-xl overflow-hidden shadow-lg ${
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
                          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3 ${
                            active
                              ? theme === "light"
                                ? "bg-blue-50 text-[#2563eb]"
                                : "bg-blue-950/40 text-blue-400"
                              : theme === "light"
                                ? "text-slate-700 hover:bg-slate-50 hover:text-[#2563eb]"
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

                    {/* Start Billing CTA (Mobile) */}
                    <button
                      onClick={handleStartBillingClick}
                      className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold transition-colors duration-200"
                      aria-label="Start Billing"
                    >
                      <span>Start Billing</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
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
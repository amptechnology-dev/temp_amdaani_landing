"use client";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import {
  Sun,
  Moon,
  Menu,
  X,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  ChevronDown,
  Building,
  Users,
  Rocket,
  Briefcase,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
const GoogleTranslate = dynamic(() => import("./GoogleTranslate"), {
  ssr: false,
});

const HELPLINE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/helpline`;
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

const DEFAULT_HELPLINE = {
  phone: "",
  email: "",
  socialLinks: {
    facebook: "",
    twitter: "",
    linkedin: "",
    instagram: "",
    youtube: "",
  },
};

const SOCIAL_BASE_URLS = {
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  twitter: "https://twitter.com",
  linkedin: "https://linkedin.com",
};

const buildSocialUrl = (platform, rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "#";
  }

  const value = rawUrl.trim();
  if (!value) {
    return "#";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^https?:/i.test(value)) {
    const protocolFixed = value.replace(/^https?:/i, (match) => `${match}//`);
    if (/^https?:\/\//i.test(protocolFixed)) {
      try {
        const parsed = new URL(protocolFixed);
        if (parsed.hostname.includes(".")) {
          return protocolFixed;
        }
      } catch {
        // Continue to platform-specific normalization.
      }
    }
  }

  const compact = value
    .toLowerCase()
    .replace(/^https?:/i, "")
    .replace(/[^a-z0-9]/g, "");

  const baseUrl = SOCIAL_BASE_URLS[platform] || "#";
  const marker = `${platform}com`;

  if (compact.includes(marker)) {
    let suffix = compact.split(marker)[1] || "";

    if (platform === "linkedin" && suffix.startsWith("company")) {
      suffix = suffix.replace(/^company/, "");
      return suffix ? `${baseUrl}/company/${suffix}` : `${baseUrl}/company`;
    }

    return suffix ? `${baseUrl}/${suffix}` : baseUrl;
  }

  return baseUrl;
};

const isValidLinkRaw = (raw) => {
  if (!raw || typeof raw !== "string") return false;
  const v = raw.trim();
  if (!v) return false;
  if (v === "#") return false;
  if (/^(n\/?a|na)$/i.test(v)) return false;
  return true;
};

export default function Navigation({
  featuresRef,
  pricingRef,
  aboutRef,
  testimonialsRef,
  faqRef,
  scrollToSection,
  activeSection = "home",
  noLanding = false,
}) {
  const { theme, toggleTheme } = useTheme();
  const [localActive, setLocalActive] = useState(activeSection);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [helpline, setHelpline] = useState(DEFAULT_HELPLINE);
  const [heroButton, setHeroButton] = useState(null);
  const [heroButtonLoading, setHeroButtonLoading] = useState(true);
  const dropdownRef = useRef(null);
  const currentTheme = themeConfig[theme];

  useEffect(() => {
    const fetchHelpline = async () => {
      try {
        const response = await fetch(HELPLINE_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !result?.data) {
          return;
        }

        setHelpline({
          phone: result?.data?.phone || DEFAULT_HELPLINE.phone,
          email: result?.data?.email || DEFAULT_HELPLINE.email,
          socialLinks: {
            facebook:
              result?.data?.socialLinks?.facebook ||
              result?.data?.socialLinks?.fb ||
              DEFAULT_HELPLINE.socialLinks.facebook,
            twitter:
              result?.data?.socialLinks?.twitter ||
              DEFAULT_HELPLINE.socialLinks.twitter,
            linkedin:
              result?.data?.socialLinks?.linkedin ||
              DEFAULT_HELPLINE.socialLinks.linkedin,
            instagram:
              result?.data?.socialLinks?.instagram ||
              DEFAULT_HELPLINE.socialLinks.instagram,
            youtube:
              result?.data?.socialLinks?.youtube ||
              DEFAULT_HELPLINE.socialLinks.youtube,
          },
        });
      } catch {
        setHelpline(DEFAULT_HELPLINE);
      }
    };

    fetchHelpline();
  }, []);

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
    { name: "Pricing", ref: pricingRef },
    { name: "About", ref: aboutRef },
    { name: "Testimonial", ref: testimonialsRef },
    { name: "FAQ", ref: faqRef },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSolutionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigationClick = (itemRef, itemName) => {
    // set active immediately so clicked item highlights
    try {
      let key = String(itemName || "").toLowerCase();
      if (key === "testimonial") key = "testimonials";
      if (key === "testimonials") key = "testimonials";
      if (key === "pricing") key = "pricing";
      if (key === "about") key = "about";
      if (key === "faq") key = "faq";
      if (key) setLocalActive(key);
    } catch (e) {
      // ignore
    }

    if (itemRef) {
      // prefer parent provided scroll helper
      try {
        scrollToSection(itemRef);
      } catch {
        if (itemRef.current) itemRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // fallback to id-based scrolling
      const id = String(itemName || "").toLowerCase();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setIsMobileMenuOpen(false);
  };

  const topBarClass =
    theme === "light"
      ? `${currentTheme.surfaceVariant} border-[#E8EAED] ${currentTheme.textSecondary}`
      : `${currentTheme.surfaceVariant} border-[#2C2C2E] ${currentTheme.textSecondary}`;

  const navClass =
    theme === "light"
      ? `${currentTheme.surface} border-[#E8EAED] shadow-[0_10px_30px_rgba(15,23,42,0.08)]`
      : `${currentTheme.surface} border-[#2C2C2E] shadow-[0_12px_34px_rgba(2,6,23,0.45)]`;

  const isItemActive = (itemName) => {
    const normalizedName = String(itemName || "").toLowerCase();

    // map some display names to section keys
    if (normalizedName === "testimonial") return localActive === "testimonials";
    if (normalizedName === "contact") return localActive === "contact";
    if (normalizedName === "faq") return localActive === "faq";

    return localActive === normalizedName || activeSection === normalizedName;
  };

  // Keep localActive in sync when parent changes activeSection
  useEffect(() => setLocalActive(activeSection), [activeSection]);

  const activeNavClass =
    theme === "light"
      ? "bg-slate-900 text-white shadow-md"
      : "bg-white text-slate-950 shadow-md";

  const hasPhone = Boolean((helpline?.phone || "").trim());
  const hasEmail = Boolean((helpline?.email || "").trim());

  const handleHeroButtonClick = () => {
    if (!heroButton?.link) return;

    const hasProtocol = /^https?:\/\//i.test(heroButton.link);
    const href = hasProtocol ? heroButton.link : `https://${heroButton.link}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const heroButtonClass =
    "group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,99,235,0.30)]";

  const heroIconWrapClass =
    "flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white";

  return (
    <div className="sticky top-0 z-50 overflow-x-hidden">
      {/* Top Header Bar - Hidden on mobile */}
      <div
        className={`hidden md:block w-full transition-all duration-300 border-b backdrop-blur ${topBarClass}`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2.5">
            {/* Contact Info */}
            <div className="flex items-center space-x-3 lg:space-x-4 text-xs lg:text-sm">
              {hasPhone && (
                <div
                  className={`flex items-center space-x-2 rounded-full px-3 py-1 ${currentTheme.surface}`}
                >
                  <Phone className="w-3 h-3" />
                  <a
                    href={`tel:${(helpline?.phone || "").replace(/[^\d+]/g, "")}`}
                    className="whitespace-nowrap font-medium transition-opacity duration-200 hover:opacity-80"
                  >
                    {helpline.phone}
                  </a>
                </div>
              )}
              {hasEmail && (
                <div
                  className={`flex items-center space-x-2 rounded-full px-3 py-1 ${currentTheme.surface}`}
                >
                  <Mail className="w-3 h-3" />
                  <a
                    href={`mailto:${helpline.email}`}
                    className="whitespace-nowrap font-medium transition-opacity duration-200 hover:opacity-80"
                  >
                    {helpline.email}
                  </a>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              {isValidLinkRaw(helpline?.socialLinks?.facebook) && (
                <a
                  href={buildSocialUrl(
                    "facebook",
                    helpline?.socialLinks?.facebook,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
                >
                  <Facebook className="w-3 h-3 lg:w-4 lg:h-4" />
                </a>
              )}

              {isValidLinkRaw(helpline?.socialLinks?.instagram) && (
                <a
                  href={buildSocialUrl(
                    "instagram",
                    helpline?.socialLinks?.instagram,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
                >
                  <Instagram className="w-3 h-3 lg:w-4 lg:h-4" />
                </a>
              )}

              {isValidLinkRaw(helpline?.socialLinks?.youtube) && (
                <a
                  href={buildSocialUrl(
                    "youtube",
                    helpline?.socialLinks?.youtube,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
                >
                  <Youtube className="w-3 h-3 lg:w-4 lg:h-4" />
                </a>
              )}

              {isValidLinkRaw(helpline?.socialLinks?.twitter) && (
                <a
                  href={buildSocialUrl(
                    "twitter",
                    helpline?.socialLinks?.twitter,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
                >
                  <Twitter className="w-3 h-3 lg:w-4 lg:h-4" />
                </a>
              )}

              {isValidLinkRaw(helpline?.socialLinks?.linkedin) && (
                <a
                  href={buildSocialUrl(
                    "linkedin",
                    helpline?.socialLinks?.linkedin,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
                >
                  <Linkedin className="w-3 h-3 lg:w-4 lg:h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}

      <nav
        className={`w-full border-b backdrop-blur-xl duration-300 ${
          theme === "light"
            ? "bg-white/95 border-[#E8EAED]"
            : "bg-slate-950/85 border-[#2C2C2E]"
        } ${isScrolled ? "py-2" : "py-3"}`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div
            className={`flex justify-between items-center gap-3 px-0 sm:px-1 py-1 ${navClass}`}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 flex-shrink-0"
            >
              <div className="w-18 h-18 rounded-xl overflow-hidden">
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
              <div className="flex flex-col">
                <span
                  style={{
                    fontFamily: "'Hit and Run', sans-serif",
                    color: "#255e97",
                  }}
                  className="text-lg font-extrabold tracking-tight"
                >
                  AMDAANI
                </span>
                <span
                  className={`text-[11px] tracking-[0.16em] font-bold ${currentTheme.textTertiary} hidden sm:block`}
                >
                  Smart Business Solutions
                </span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            {!noLanding && (
              <div
                className="hidden lg:flex items-center space-x-1 flex-shrink-0"
                ref={dropdownRef}
              >
                {navigationItems.map((item) => (
                  <div key={item.name} className="relative">
                    {item.type === "dropdown" ? (
                      <div
                        onMouseEnter={() => setIsSolutionsOpen(true)}
                        onMouseLeave={() => setIsSolutionsOpen(false)}
                        className="relative"
                      >
                        <button
                          className={`px-4 py-2.5 rounded-xl font-semibold text-[15px] transition-all duration-200 flex items-center space-x-2 group ${
                            theme === "light"
                              ? `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                              : `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                          }`}
                        >
                          <span>{item.name}</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isSolutionsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isSolutionsOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.18 }}
                              className={`absolute top-full left-0 mt-2 w-[22rem] rounded-2xl shadow-2xl border backdrop-blur-xl ${
                                theme === "light"
                                  ? `${currentTheme.surface} border-[#E8EAED]`
                                  : `${currentTheme.surface} border-[#2C2C2E]`
                              }`}
                            >
                              <div className="p-2.5">
                                <div
                                  className={`px-3 pb-2 text-[11px] uppercase tracking-[0.14em] ${currentTheme.textTertiary}`}
                                >
                                  Tailored Solutions
                                </div>
                                {item.items.map((subItem) => {
                                  const IconComponent = subItem.icon;
                                  return (
                                    <button
                                      key={subItem.name}
                                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 group border border-transparent ${
                                        theme === "light"
                                          ? `hover:${currentTheme.surfaceVariant} hover:border-[#E5E7EB]`
                                          : `hover:${currentTheme.surfaceVariant} hover:border-[#2C2C2E]`
                                      }`}
                                    >
                                      <div className="flex items-start space-x-3">
                                        <div
                                          className={`p-2 rounded-lg shadow-sm ${currentTheme.accentLight}`}
                                        >
                                          <IconComponent
                                            className={`w-4 h-4 ${currentTheme.accent.replace(
                                              "bg-",
                                              "text-",
                                            )}`}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <div
                                            className={`font-semibold ${currentTheme.text}`}
                                          >
                                            {subItem.name}
                                          </div>
                                          <div
                                            className={`text-sm mt-1 ${currentTheme.textTertiary}`}
                                          >
                                            {subItem.description}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNavigationClick(item.ref, item.name)}
                        className={`px-4 py-2.5 rounded-xl font-semibold text-[15px] transition-all duration-200 ${
                          theme === "light"
                            ? `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                            : `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                        } ${isItemActive(item.name) ? activeNavClass : ""}`}
                      >
                        {item.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Desktop Theme Toggle & CTA */}

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

              {/* Theme toggle always shown */}
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-200 border ${
                  theme === "light"
                    ? `${currentTheme.surface} border-[#E8EAED] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                    : `${currentTheme.surface} border-[#2C2C2E] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                }`}
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
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
                      ? `${currentTheme.surface} border-[#E8EAED] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                      : `${currentTheme.surface} border-[#2C2C2E] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                  }`}
                  aria-label="Toggle theme"
                >
                  {theme === "light" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2.5 rounded-xl transition-all duration-200 border ${
                  theme === "light"
                    ? `${currentTheme.surface} border-[#E8EAED] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                    : `${currentTheme.surface} border-[#2C2C2E] hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                }`}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
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
                      ? `${currentTheme.surface} border-[#E8EAED]`
                      : `${currentTheme.surface} border-[#2C2C2E]`
                  }`}
                >
                  <div className="flex flex-col space-y-1 p-3 w-full">
                    {!heroButtonLoading && heroButton?.isActive && (
                      <div className="w-full mb-2 flex items-center justify-center">
                        <button
                          onClick={handleHeroButtonClick}
                          className={`p-0 bg-transparent border-0 inline-flex items-center transition-all duration-200`}
                          aria-label="Get it on Google Play"
                        >
                          <PlayStoreBadge className="h-10 w-auto block" />
                        </button>
                      </div>
                    )}

                    {navigationItems.map((item) => (
                      <div key={item.name} className="w-full">
                        {item.type === "dropdown" ? (
                          <div className="space-y-1.5 w-full">
                            <div
                              className={`px-3 py-2 text-xs uppercase tracking-[0.14em] font-semibold ${currentTheme.textTertiary}`}
                            >
                              {item.name}
                            </div>
                            <div className="space-y-1 w-full">
                              {item.items.map((subItem) => {
                                const IconComponent = subItem.icon;
                                return (
                                  <button
                                    key={subItem.name}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 border border-transparent ${
                                      theme === "light"
                                        ? `hover:${currentTheme.surfaceVariant} hover:border-[#E5E7EB] ${currentTheme.textSecondary}`
                                        : `hover:${currentTheme.surfaceVariant} hover:border-[#2C2C2E] ${currentTheme.textSecondary}`
                                    }`}
                                  >
                                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">
                                      {subItem.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleNavigationClick(item.ref, item.name)}
                            className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                              theme === "light"
                                ? `hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                                : `hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                            } ${isItemActive(item.name) ? activeNavClass : ""}`}
                          >
                            {item.name}
                          </button>
                        )}
                      </div>
                    ))}
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
      className={`${className} object-contain block rounded-lg
                  [mix-blend-mode:multiply]
                  dark:[mix-blend-mode:screen]`}
      loading="lazy"
      draggable={false}
    />
  );
}

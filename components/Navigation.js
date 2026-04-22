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
  ChevronDown,
  Building,
  Users,
  Rocket,
  Briefcase,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const HELPLINE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/helpline`;

const DEFAULT_HELPLINE = {
  phone: "+1 (555) 123-4567",
  email: "hello@amdaani.com",
  socialLinks: {
    facebook: "#",
    twitter: "#",
    linkedin: "#",
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [helpline, setHelpline] = useState(DEFAULT_HELPLINE);
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
              DEFAULT_HELPLINE.socialLinks.facebook,
            twitter:
              result?.data?.socialLinks?.twitter ||
              DEFAULT_HELPLINE.socialLinks.twitter,
            linkedin:
              result?.data?.socialLinks?.linkedin ||
              DEFAULT_HELPLINE.socialLinks.linkedin,
          },
        });
      } catch {
        setHelpline(DEFAULT_HELPLINE);
      }
    };

    fetchHelpline();
  }, []);

  const navigationItems = [
    {
      name: "Solutions",
      type: "dropdown",
      items: [
        {
          name: "Small Business",
          ref: null,
          icon: Building,
          description: "Perfect for growing businesses",
        },
        {
          name: "Enterprise",
          ref: null,
          icon: Users,
          description: "Scalable solutions for large organizations",
        },
        {
          name: "Freelancers",
          ref: null,
          icon: Briefcase,
          description: "Tools for independent professionals",
        },
        {
          name: "Startups",
          ref: null,
          icon: Rocket,
          description: "Built for rapid growth",
        },
      ],
    },
    { name: "Pricing", ref: pricingRef },
    { name: "About", ref: aboutRef },
    { name: "Testimonial", ref: testimonialsRef },
    { name: "Contact", ref: faqRef },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
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

  const handleNavigationClick = (itemRef) => {
    if (itemRef) {
      scrollToSection(itemRef);
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

    if (normalizedName === "testimonial") {
      return activeSection === "testimonials";
    }

    if (normalizedName === "contact") {
      return activeSection === "contact";
    }

    return activeSection === normalizedName;
  };

  const activeNavClass =
    theme === "light"
      ? "bg-slate-900 text-white shadow-md"
      : "bg-white text-slate-950 shadow-md";

  return (
    <div className="fixed inset-x-0 top-0 z-50 overflow-x-hidden">
      {/* Top Header Bar - Hidden on mobile */}
      <div
        className={`hidden md:block w-full transition-all duration-300 border-b backdrop-blur ${topBarClass}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2.5">
            {/* Contact Info */}
            <div className="flex items-center space-x-3 lg:space-x-4 text-xs lg:text-sm">
              <div className={`flex items-center space-x-2 rounded-full px-3 py-1 ${currentTheme.surface}`}>
                <Phone className="w-3 h-3" />
                <a
                  href={`tel:${(helpline?.phone || "").replace(/[^\d+]/g, "")}`}
                  className="whitespace-nowrap font-medium transition-opacity duration-200 hover:opacity-80"
                >
                  {helpline.phone}
                </a>
              </div>
              <div className={`flex items-center space-x-2 rounded-full px-3 py-1 ${currentTheme.surface}`}>
                <Mail className="w-3 h-3" />
                <a
                  href={`mailto:${helpline.email}`}
                  className="whitespace-nowrap font-medium transition-opacity duration-200 hover:opacity-80"
                >
                  {helpline.email}
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              <a
                href={buildSocialUrl("facebook", helpline?.socialLinks?.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
              >
                <Facebook className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
              <a
                href={buildSocialUrl("twitter", helpline?.socialLinks?.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
              >
                <Twitter className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
              <a
                href={buildSocialUrl("linkedin", helpline?.socialLinks?.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full transition-all duration-200 ${currentTheme.surface} ${currentTheme.textSecondary} hover:scale-105 hover:${currentTheme.text}`}
              >
                <Linkedin className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}

      <nav
        className={`fixed left-0 w-full duration-300 ${
          isScrolled ? "py-2" : "py-3"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center border backdrop-blur-xl rounded-2xl px-3 sm:px-5 py-2 ${navClass}`}>
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 flex-shrink-0"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ring-1 ring-black/5 ${currentTheme.surfaceVariant}`}
              >
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-lg font-extrabold tracking-tight ${currentTheme.text}`}>
                  Amdaani
                </span>
                <span
                  className={`text-[11px] uppercase tracking-[0.16em] ${currentTheme.textTertiary} hidden sm:block`}
                >
                  Smart Billing
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
                                <div className={`px-3 pb-2 text-[11px] uppercase tracking-[0.14em] ${currentTheme.textTertiary}`}>
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
                                              "text-"
                                            )}`}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <div className={`font-semibold ${currentTheme.text}`}>
                                            {subItem.name}
                                          </div>
                                          <div className={`text-sm mt-1 ${currentTheme.textTertiary}`}>
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
                        onClick={() => handleNavigationClick(item.ref)}
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
                            onClick={() => handleNavigationClick(item.ref)}
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

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
import { useRouter } from "next/navigation";

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
  noLanding = false,
}) {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [helpline, setHelpline] = useState(DEFAULT_HELPLINE);
  const dropdownRef = useRef(null);
  const currentTheme = themeConfig[theme];

  const router = useRouter();

  const handleGetStartClick = () => {
    router.push("/auth");
  };

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
    { name: "Contact", ref: null },
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

  return (
    <div className="fixed w-full z-50 overflow-x-hidden">
      {/* Top Header Bar - Hidden on mobile */}
      <div
        className={`hidden md:block w-full transition-all duration-300 border-b ${
          theme === "light"
            ? `${currentTheme.surfaceVariant} border-[#E8EAED] ${currentTheme.textSecondary}`
            : `${currentTheme.surfaceVariant} border-[#2C2C2E] ${currentTheme.textSecondary}`
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            {/* Contact Info */}
            <div className="flex items-center space-x-4 lg:space-x-6 text-xs lg:text-sm">
              <div className="flex items-center space-x-1 lg:space-x-2">
                <Phone className="w-3 h-3" />
                <a href={`tel:${(helpline?.phone || "").replace(/[^\d+]/g, "")}`} className="whitespace-nowrap">
                  {helpline.phone}
                </a>
              </div>
              <div className="flex items-center space-x-1 lg:space-x-2">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${helpline.email}`} className="whitespace-nowrap">
                  {helpline.email}
                </a>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              <a
                href={buildSocialUrl("facebook", helpline?.socialLinks?.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 hover:${currentTheme.text}`}
              >
                <Facebook className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
              <a
                href={buildSocialUrl("twitter", helpline?.socialLinks?.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 hover:${currentTheme.text}`}
              >
                <Twitter className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
              <a
                href={buildSocialUrl("linkedin", helpline?.socialLinks?.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                className={`transition-colors duration-200 hover:${currentTheme.text}`}
              >
                <Linkedin className="w-3 h-3 lg:w-4 lg:h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}

      <nav
        className={`fixed left-0 w-full duration-300 backdrop-blur-lg border-b ${
          isScrolled ? "py-2" : "py-3"
        } ${
          theme === "light"
            ? `${currentTheme.surface} border-[#E8EAED] shadow-sm`
            : `${currentTheme.surface} border-[#2C2C2E] shadow-lg`
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 flex-shrink-0"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${currentTheme.surfaceVariant}`}
              >
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full rounded-lg object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-lg font-bold ${currentTheme.text}`}>
                  Amdaani
                </span>
                <span
                  className={`text-xs ${currentTheme.textTertiary} hidden sm:block`}
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
                          className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 group ${
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
                              transition={{ duration: 0.2 }}
                              className={`absolute top-full left-0 mt-1 w-80 rounded-xl shadow-xl border backdrop-blur-lg ${
                                theme === "light"
                                  ? `${currentTheme.surface} border-[#E8EAED]`
                                  : `${currentTheme.surface} border-[#2C2C2E]`
                              }`}
                            >
                              <div className="p-2">
                                {item.items.map((subItem) => {
                                  const IconComponent = subItem.icon;
                                  return (
                                    <button
                                      key={subItem.name}
                                      className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                                        theme === "light"
                                          ? `hover:${currentTheme.surfaceVariant}`
                                          : `hover:${currentTheme.surfaceVariant}`
                                      }`}
                                    >
                                      <div className="flex items-start space-x-3">
                                        <div
                                          className={`p-2 rounded-lg ${currentTheme.accentLight}`}
                                        >
                                          <IconComponent
                                            className={`w-4 h-4 ${currentTheme.accent.replace(
                                              "bg-",
                                              "text-"
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
                        onClick={() => handleNavigationClick(item.ref)}
                        className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                          theme === "light"
                            ? `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                            : `${currentTheme.text} hover:${currentTheme.surfaceVariant}`
                        }`}
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
                className={`p-3 rounded-lg transition-all duration-200 border ${
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

              {/* Hide Get Started when noLanding */}
              {/* {!noLanding && (
                <button
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${currentTheme.buttonPrimary} shadow-sm hover:shadow-md`}
                  onClick={handleGetStartClick}
                >
                  Get Started
                </button>
              )} */}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center space-x-2 flex-shrink-0">
              {!noLanding && (
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-all duration-200 border ${
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
                className={`p-2 rounded-lg transition-all duration-200 border ${
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
                  className={`lg:hidden border-t mt-3 overflow-hidden ${
                    theme === "light" ? "border-[#E8EAED]" : "border-[#2C2C2E]"
                  }`}
                >
                  <div className="flex flex-col space-y-1 py-4 w-full">
                    {navigationItems.map((item) => (
                      <div key={item.name} className="w-full">
                        {item.type === "dropdown" ? (
                          <div className="space-y-1 w-full">
                            <div
                              className={`px-4 py-3 font-semibold ${currentTheme.text}`}
                            >
                              {item.name}
                            </div>
                            <div className="space-y-1 w-full">
                              {item.items.map((subItem) => {
                                const IconComponent = subItem.icon;
                                return (
                                  <button
                                    key={subItem.name}
                                    className={`w-full text-left px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                                      theme === "light"
                                        ? `hover:${currentTheme.surfaceVariant} ${currentTheme.textSecondary}`
                                        : `hover:${currentTheme.surfaceVariant} ${currentTheme.textSecondary}`
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
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                              theme === "light"
                                ? `hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                                : `hover:${currentTheme.surfaceVariant} ${currentTheme.text}`
                            }`}
                          >
                            {item.name}
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className={`px-4 py-3 rounded-lg font-semibold transition-all duration-200 mt-4 w-full ${currentTheme.buttonPrimary}`}
                    >
                      Get Started
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

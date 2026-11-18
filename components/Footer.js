"use client";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ArrowUp } from "lucide-react";
import {
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { useState, useEffect } from "react";

const HELPLINE_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/helpline`;

const DEFAULT_HELPLINE = {
  phone: "",
  email: "",
  location: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    youtube: "",
    linkedin: "",
  },
};

const SOCIAL_BASE_URLS = {
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  linkedin: "https://linkedin.com",
};

// Soft orange + brown palette for the footer
const footerPalette = {
  light: {
    bg: "linear-gradient(180deg, #FFF8F1 0%, #FBEBDC 100%)",
    border: "#EBD3BD",
    heading: "#5A3A28",
    text: "#7A5A47",
    muted: "#A07C63",
    accent: "#D9925A", // mild orange
    brand: "#8A4B1F",
    iconBg: "#F6E1CC",
    iconText: "#8B5E3C",
    linkHover: "hover:text-[#B8661F]",
    iconHover: "hover:bg-[#EFCFB0] hover:text-[#8A4B1F]",
    topBtn:
      "bg-[#FFF3E6] text-[#8B5E3C] hover:bg-[#F6E1CC] border border-[#EBD3BD]",
  },
  dark: {
    bg: "linear-gradient(180deg, #2B211B 0%, #3A2B21 100%)",
    border: "#5A4333",
    heading: "#F4E4D3",
    text: "#CDB6A1",
    muted: "#A88F7A",
    accent: "#D9925A",
    brand: "#E8B27E",
    iconBg: "#4A372A",
    iconText: "#D8BBA0",
    linkHover: "hover:text-[#F0B98A]",
    iconHover: "hover:bg-[#5A4333] hover:text-[#F0B98A]",
    topBtn:
      "bg-[#3A2B21] text-[#E8B27E] hover:bg-[#4A372A] border border-[#5A4333]",
  },
};

const isValidLinkRaw = (raw) => {
  if (!raw || typeof raw !== "string") return false;
  const v = raw.trim();
  if (!v) return false;
  if (v === "#") return false;
  if (/^(n\/?a|na)$/i.test(v)) return false;
  return true;
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

export default function Footer() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const p = footerPalette[theme === "light" ? "light" : "dark"];
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [helpline, setHelpline] = useState(DEFAULT_HELPLINE);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
          location: result?.data?.location || DEFAULT_HELPLINE.location,
          socialLinks: {
            facebook:
              result?.data?.socialLinks?.facebook ||
              DEFAULT_HELPLINE.socialLinks.facebook,
            instagram:
              result?.data?.socialLinks?.instagram ||
              DEFAULT_HELPLINE.socialLinks.instagram,
            youtube:
              result?.data?.socialLinks?.youtube ||
              DEFAULT_HELPLINE.socialLinks.youtube,
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

  const normalizedPhone = (helpline?.phone || "").replace(/[^\d+]/g, "");
  const hasPhone = Boolean(normalizedPhone);
  const hasEmail = Boolean((helpline?.email || "").trim());

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerSections = [
    {
      title: "Quick Links",
      links: [
        // { name: "About Us", href: "#about" },
        { name: "Testimonial", href: "#testimonials" },
        { name: "Pricing", href: "#pricing" },
        { name: "Contact Us", href: "#contact" },
        { name: "FAQs", href: "#faq" },
      ],
    },
  ];

  const socialLinks = [
    {
      name: "Facebook",
      icon: FaFacebook,
      raw: helpline?.socialLinks?.facebook,
      href: buildSocialUrl("facebook", helpline?.socialLinks?.facebook),
    },
    {
      name: "Instagram",
      icon: FaInstagram,
      raw: helpline?.socialLinks?.instagram,
      href: buildSocialUrl("instagram", helpline?.socialLinks?.instagram),
    },
    {
      name: "YouTube",
      icon: FaYoutube,
      raw: helpline?.socialLinks?.youtube,
      href: buildSocialUrl("youtube", helpline?.socialLinks?.youtube),
    },
    {
      name: "LinkedIn",
      icon: FaLinkedin,
      raw: helpline?.socialLinks?.linkedin,
      href: buildSocialUrl("linkedin", helpline?.socialLinks?.linkedin),
    },
  ];

  return (
    <footer
      className="relative border-t"
      style={{ background: p.bg, borderColor: p.border }}
    >
      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0,
        }}
        onClick={scrollToTop}
        className={`fixed bottom-24 right-8 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${p.topBtn}`}
      >
        <ArrowUp className="w-5 h-5" />
      </motion.button>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="xl:col-span-2"
          >
            {/* Logo */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <div className="w-18 h-18 rounded-xl overflow-hidden">
                <img
                  src="/images/Tapplogo.png"
                  alt="Amdaani Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
              <div className="flex flex-col ml-[-8px]">
                <span
                  style={{
                    fontFamily: "'Hit and Run', sans-serif",
                    color: p.brand,
                  }}
                  className="text-lg font-extrabold tracking-tight leading-none"
                >
                  AMDAANI
                </span>
                <span
                  style={{ color: p.muted }}
                  className="text-[11px] mt-[2px] tracking-[0.14em] font-bold hidden sm:block"
                >
                  Smart Business Solutions
                </span>
              </div>
            </div>

            <p className="text-lg mb-6 max-w-md" style={{ color: p.text }}>
              Reliable billing software designed for Indian businesses. Create
              professional invoices, manage customer records, and support your
              business growth effortlessly
            </p>

            {/* Contact Info */}
            {/* <div className="space-y-3 mb-6">
              {hasPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4" style={{ color: p.accent }} />
                  <a href={`tel:${normalizedPhone}`} style={{ color: p.text }}>
                    {helpline.phone}
                  </a>
                </div>
              )}
              {hasEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4" style={{ color: p.accent }} />
                  <a href={`mailto:${helpline.email}`} style={{ color: p.text }}>
                    {helpline.email}
                  </a>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4" style={{ color: p.accent }} />
                <span style={{ color: p.text }}>{helpline.location}</span>
              </div>
            </div> */}
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="xl:col-span-1"
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: p.heading }}
            >
              {footerSections[0].title}
            </h3>
            <ul className="space-y-3">
              {footerSections[0].links.map((link) => (
                <li key={link.name} className="flex items-center space-x-3">
                  <span
                    className="w-2 h-2 rounded-full inline-block mt-1"
                    style={{ backgroundColor: p.accent }}
                  />
                  <a
                    href={link.href}
                    style={{ color: p.text }}
                    className={`text-sm transition-colors duration-200 ${p.linkHover}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="xl:col-span-1"
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: p.heading }}
            >
              Contact
            </h3>

            <div className="space-y-3 mb-4">
              {/* {hasPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4" style={{ color: p.accent }} />
                  <a
                    href={`tel:${normalizedPhone}`}
                    className="text-sm"
                    style={{ color: p.text }}
                  >
                    {helpline.phone}
                  </a>
                </div>
              )} */}

              {hasEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4" style={{ color: p.accent }} />
                  <a
                    href={`mailto:${helpline.email}`}
                    className={`text-sm transition-colors duration-200 ${p.linkHover}`}
                    style={{ color: p.text }}
                  >
                    {helpline.email}
                  </a>
                </div>
              )}

              {/* <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4" style={{ color: p.accent }} />
                <span className="text-sm" style={{ color: p.text }}>
                  {helpline.location}
                </span>
              </div> */}
            </div>

            <div className="flex items-center space-x-3">
              {socialLinks.map((social) => {
                if (!isValidLinkRaw(social.raw)) return null;
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${p.iconHover}`}
                    style={{ backgroundColor: p.iconBg, color: p.iconText }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
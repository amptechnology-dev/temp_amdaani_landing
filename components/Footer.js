"use client";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";
import { motion } from "framer-motion";
import {
  Smartphone,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  ArrowUp,
  Play,
  Download,
  Shield,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Footer() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "Download APK", href: "#download" },
        { name: "Mobile App", href: "#mobile" },
        { name: "Updates", href: "#updates" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { name: "Small Business", href: "#small-business" },
        { name: "Enterprise", href: "#enterprise" },
        { name: "Freelancers", href: "#freelancers" },
        { name: "Startups", href: "#startups" },
        { name: "Retail Stores", href: "#retail" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "#docs" },
        { name: "Help Center", href: "#help" },
        { name: "Blog", href: "#blog" },
        { name: "Tutorials", href: "#tutorials" },
        { name: "Community", href: "#community" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "#about" },
        { name: "Careers", href: "#careers" },
        { name: "Contact", href: "#contact" },
        { name: "Partners", href: "#partners" },
        { name: "Press Kit", href: "#press" },
      ],
    },
  ];

  const socialLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      href: "#",
      color: "hover:text-blue-600",
    },
    { name: "Twitter", icon: Twitter, href: "#", color: "hover:text-blue-400" },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: "#",
      color: "hover:text-blue-700",
    },
    {
      name: "Instagram",
      icon: Instagram,
      href: "#",
      color: "hover:text-pink-600",
    },
    { name: "YouTube", icon: Youtube, href: "#", color: "hover:text-red-600" },
  ];

  return (
    <footer
      className={`relative ${currentTheme.background} border-t ${currentTheme.outline}`}
    >
      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0,
        }}
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          theme === "light"
            ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            : "bg-[#1C1C1E] text-gray-300 hover:bg-[#2C2C2E] border border-gray-700"
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </motion.button>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-8">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="xl:col-span-2"
          >
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#1A73E8] to-[#03DAC5] flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <span className={`text-2xl font-bold ${currentTheme.text}`}>
                  Amdaani
                </span>
                <span
                  className={`block text-sm ${currentTheme.textTertiary} font-medium`}
                >
                  Smart Billing
                </span>
              </div>
            </div>

            <p
              className={`text-lg mb-6 ${currentTheme.textSecondary} max-w-md`}
            >
              The fastest and cheapest billing solution for Indian businesses.
              Create invoices, manage customers, and grow your business
              effortlessly.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <Phone className={`w-4 h-4 ${currentTheme.textTertiary}`} />
                <span className={currentTheme.text}>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className={`w-4 h-4 ${currentTheme.textTertiary}`} />
                <span className={currentTheme.text}>hello@Amdaani.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className={`w-4 h-4 ${currentTheme.textTertiary}`} />
                <span className={currentTheme.text}>Mumbai, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-10 h-10 rounded-lg ${currentTheme.surfaceVariant} flex items-center justify-center transition-colors duration-200 ${currentTheme.textTertiary} ${social.color}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Links Sections */}
          {footerSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
            >
              <h3 className={`text-lg font-semibold mb-4 ${currentTheme.text}`}>
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className={`text-sm transition-colors duration-200 hover:${currentTheme.text} ${currentTheme.textSecondary}`}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </footer>
  );
}

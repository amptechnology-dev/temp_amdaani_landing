"use client";
import { useTheme } from "../../context/ThemeContext";
import { useEffect, useRef, useState } from "react";
import { themeConfig } from "../../utils/ThemeConfig";

// Import Components
import Navigation from "../../components/Navigation";
import HeroSection from "../../components/HeroSection";
import PricingSection from "../../components/PricingSection";
import CTASection from "../../components/CtaSection";
import Footer from "../../components/Footer";
import AboutSection from "../../components/About";
import TestimonialSection from "../../components/Testimonial";
import ChatBotWidget from "../../components/ChatBotWidget";

export default function Home() {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
  const aboutRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let hideTimer;

    const hideLoader = () => {
      hideTimer = window.setTimeout(() => {
        setIsPageLoading(false);
      }, 700);
    };

    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", hideLoader);
    }

    return () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
      window.removeEventListener("load", hideLoader);
    };
  }, []);

  useEffect(() => {
    const sections = [
      { id: "about", ref: aboutRef },
      { id: "testimonials", ref: testimonialsRef },
      { id: "pricing", ref: pricingRef },
      { id: "contact", ref: footerRef },
    ];

    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 160;
      let currentSection = "home";

      sections.forEach(({ id, ref }) => {
        if (!ref.current) return;

        const sectionTop =
          ref.current.getBoundingClientRect().top + window.scrollY;
        if (scrollPosition >= sectionTop) {
          currentSection = id;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection);
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const currentTheme = themeConfig[theme];

  const scrollToSection = (ref) => {
    if (!ref?.current) {
      return;
    }

    const headerOffset = 120;
    const elementTop =
      ref.current.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({
      top: Math.max(elementTop - headerOffset, 0),
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ${currentTheme.background} ${isPageLoading ? "overflow-hidden" : ""}`}
      aria-busy={isPageLoading}
    >
      {isPageLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/95 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.12),_transparent_35%)]" />
          <div className="relative flex flex-col items-center gap-6 px-6 text-center">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 bg-white/5 shadow-[0_0_60px_rgba(34,211,238,0.25)]" />
              <div className="absolute inset-3 rounded-full border border-white/15 border-t-cyan-300 animate-spin" />
              <div className="absolute inset-7 rounded-full bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 shadow-[0_0_40px_rgba(56,189,248,0.45)] animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/80">
                Loading Amdaani
              </p>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Please wait a moment while the page finishes loading.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
              <span>Optimizing assets</span>
              <span className="h-2 w-2 rounded-full bg-sky-300 animate-pulse [animation-delay:150ms]" />
            </div>
          </div>
        </div>
      )}
      <Navigation
        pricingRef={pricingRef}
        aboutRef={aboutRef}
        testimonialsRef={testimonialsRef}
        faqRef={footerRef}
        scrollToSection={scrollToSection}
        activeSection={activeSection}
      />
      <HeroSection featuresRef={pricingRef} scrollToSection={scrollToSection} />

      <section ref={aboutRef}>
        <AboutSection />
      </section>

      <section ref={testimonialsRef}>
        <TestimonialSection />
      </section>

      <section ref={pricingRef}>
        <PricingSection pricingRef={pricingRef} />
      </section>

      <CTASection />
      <section ref={footerRef}>
        <Footer />
      </section>
      {/* <ChatBotWidget /> */}
    </div>
  );
}

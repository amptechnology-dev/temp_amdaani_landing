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
import FaqSection from "../../components/FaqSection";

export default function Home() {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
  const aboutRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  const faqRef = useRef(null);
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
      { id: "faq", ref: faqRef },
      { id: "contact", ref: footerRef },
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -55% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    };

    const handleIntersect = (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length > 0) {
        const activeId = visibleEntries[0].target.id || "home";
        setActiveSection(activeId);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    sections.forEach(({ ref }) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-white">
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 to-white/95" />
          <div className="relative flex flex-col items-center gap-6 px-6 text-center">
            {/* Logo spins and pulses — the logo itself is the loader */}
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg border ${currentTheme.surfaceVariant} relative`}
              >
                {/* Rotating ring outside the logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-full h-full rounded-2xl border border-transparent border-t-4 border-t-emerald-400/75 animate-[spin_1.6s_linear_infinite] motion-safe:animate-[spin_1.6s_linear_infinite]"
                    style={{ boxShadow: "0 18px 50px rgba(37,99,235,0.12)" }}
                  />
                </div>

                {/* Logo: not rounded so it's shown clearly */}
                <div className="relative z-10 flex items-center justify-center w-20 h-20 bg-white">
                  <img
                    src="/images/Tapplogo.png"
                    alt="Amdaani Logo"
                    className="w-30 h-30 object-contain"
                  />
                </div>

                {/* subtle background glow */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-30"
                  style={{ boxShadow: "0 18px 50px rgba(37,99,235,0.08)" }}
                />
              </div>

              <div className="text-center">
                <div
                  style={{
                    fontFamily: "'Hit and Run', sans-serif",
                    color: "#255e97",
                  }}
                  className="text-lg font-extrabold tracking-tight"
                >
                  AMDAANI
                </div>
                <div className={`text-[11px] tracking-[0.16em] font-bold ${currentTheme.textTertiary} hidden sm:block`}>
                  Smart Business Solutions
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-slate-600">
                Loading Amdaani
              </p>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                Please wait a moment while the page finishes loading.
              </p>
            </div>
          </div>

          {/* Using Tailwind arbitrary animation to avoid styled-jsx hydration issues */}
        </div>
      )}
      <Navigation
        pricingRef={pricingRef}
        aboutRef={aboutRef}
        testimonialsRef={testimonialsRef}
        faqRef={faqRef}
        scrollToSection={scrollToSection}
        activeSection={activeSection}
      />
      <HeroSection featuresRef={pricingRef} scrollToSection={scrollToSection} />

      <section ref={aboutRef} id="about">
        <AboutSection />
      </section>

      <section ref={testimonialsRef} id="testimonials">
        <TestimonialSection />
      </section>

      <section ref={pricingRef} id="pricing">
        <PricingSection pricingRef={pricingRef} />
      </section>

      <section ref={faqRef} id="faq">
        <FaqSection />
      </section>

      <CTASection />
      <section ref={footerRef}>
        <Footer />
      </section>
      {/* <ChatBotWidget /> */}
    </div>
  );
}

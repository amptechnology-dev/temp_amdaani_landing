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

export default function Home() {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const aboutRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
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

        const sectionTop = ref.current.getBoundingClientRect().top + window.scrollY;
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
    const elementTop = ref.current.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({
      top: Math.max(elementTop - headerOffset, 0),
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${currentTheme.background}`}
    >
      <Navigation
        pricingRef={pricingRef}
        aboutRef={aboutRef}
        testimonialsRef={testimonialsRef}
        faqRef={footerRef}
        scrollToSection={scrollToSection}
        activeSection={activeSection}
      />
      <HeroSection
        featuresRef={pricingRef}
        scrollToSection={scrollToSection}
      />

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
    </div>
  );
}

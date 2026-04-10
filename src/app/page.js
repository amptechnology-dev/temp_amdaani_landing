"use client";
import { useTheme } from "../../context/ThemeContext";
import { useEffect, useRef, useState } from "react";
import { themeConfig } from "../../utils/ThemeConfig";

// Import Components
import Navigation from "../../components/Navigation";
import HeroSection from "../../components/HeroSection";
import FeaturesSection from "../../components/FeaturesSection";
import PricingSection from "../../components/PricingSection";
import CTASection from "../../components/CtaSection";
import Footer from "../../components/Footer";
import AboutSection from "../../components/About";

export default function Home() {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef(null);
  const pricingRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const currentTheme = themeConfig[theme];

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${currentTheme.background}`}
    >
      <Navigation />
      <HeroSection
        featuresRef={featuresRef}
        scrollToSection={scrollToSection}
      />

      <AboutSection />

      <PricingSection pricingRef={pricingRef} />

      <CTASection />
      <Footer />
    </div>
  );
}

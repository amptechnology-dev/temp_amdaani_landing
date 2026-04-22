"use client";
import { useState, useEffect } from "react";
import {
  Zap,
  Users,
  Package,
  Printer,
  TrendingUp,
  Shield,
  Bell,
  Clock3,
  Rocket,
  Star,
  Sparkles,
  CheckCircle2,
  Lock,
  Heart,
  Globe,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";

const LANDING_APK_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/app-version/landing-apk`;
const HERO_SECTIONS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/hero/list-hero-sections`;
const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;

const ICON_MAP = {
  Zap,
  Users,
  Package,
  Printer,
  TrendingUp,
  Shield,
  Bell,
  Clock3,
  Rocket,
  Star,
  Sparkles,
  CheckCircle2,
  Lock,
  Heart,
  Globe,
};

const FALLBACK_SLIDES = [
  {
    id: 1,
    title: "India's Fastest",
    subtitle: "Billing Solution",
    description:
      "Transform your business with lightning-fast invoicing at unbeatable prices.",
    gradient: "from-blue-600 via-purple-600 to-pink-600",
    features: [
      { icon: Zap, text: "Lightning Fast" },
      { icon: Shield, text: "Secure & Reliable" },
      { icon: TrendingUp, text: "Grow Your Business" },
    ],
    phoneImage: "/images/dashboard.jpg",
  },
  {
    id: 2,
    title: "Complete Business",
    subtitle: "Management",
    description: "Manage customers, products, and invoices all in one place.",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    features: [
      { icon: Users, text: "Customer Management" },
      { icon: Package, text: "Product Inventory" },
    ],
    phoneImage: "/images/transactions.jpg",
  },
  {
    id: 3,
    title: "Print Anywhere,",
    subtitle: "Any Format",
    description:
      "Support for A4 printers, POS thermal printers, and more. Print on the go.",
    gradient: "from-orange-600 via-red-600 to-rose-600",
    features: [
      { icon: Printer, text: "A4 & Thermal Printing" },
      { icon: Zap, text: "Instant Printing" },
    ],
    phoneImage: "/images/invoice.jpg",
  },
];

const mapFeatures = (features = []) => {
  if (!Array.isArray(features) || features.length === 0) return [];

  return features.map((feature) => ({
    icon: ICON_MAP[feature?.icon] || Zap,
    text: feature?.text || "Feature",
  }));
};

const normalizeSlides = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const sortedItems = [...items].sort((a, b) => {
    const aPriority = Number.isFinite(a?.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
    const bPriority = Number.isFinite(b?.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });

  return sortedItems.map((item, index) => ({
    id: item?._id || `${item?.title || "slide"}-${index}`,
    title: item?.title || "Amdaani",
    subtitle: item?.subtitle || "Billing Solution",
    description: item?.description || "Manage your business faster with smart billing.",
    gradient: item?.gradient || "from-blue-600 via-purple-600 to-pink-600",
    features: mapFeatures(item?.features),
    phoneImage: item?.phoneImage || "/images/dashboard.jpg",
  }));
};

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [heroButton, setHeroButton] = useState(null);
  const [heroButtonLoading, setHeroButtonLoading] = useState(true);
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setCurrentSlide((prev) => (prev >= slides.length ? 0 : prev));
  }, [slides.length]);

  useEffect(() => {
    const fetchHeroSections = async () => {
      try {
        const response = await fetch(HERO_SECTIONS_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
          return;
        }

        const mappedSlides = normalizeSlides(result.data);
        if (mappedSlides.length > 0) {
          setSlides(mappedSlides);
        }
      } catch {
        // Keep fallback slides when API is unavailable.
      }
    };

    fetchHeroSections();
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

  const handleHeroButtonClick = () => {
    if (!heroButton?.link) return;

    const hasProtocol = /^https?:\/\//i.test(heroButton.link);
    const href = hasProtocol ? heroButton.link : `https://${heroButton.link}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`relative overflow-hidden ${currentTheme.background} z-0`}
    >
      {/* Carousel Container */}
      <div className="relative pt-20 sm:pt-24 lg:pt-28 pb-6 sm:pb-8 lg:pb-10">
        <div className="relative mx-auto w-full max-w-[1920px] overflow-hidden md:rounded-2xl lg:rounded-3xl md:border md:border-white/20 md:shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="relative aspect-[2/1] sm:aspect-[16/9] lg:aspect-[12/5]">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === currentSlide
                    ? "opacity-100 translate-x-0"
                    : index < currentSlide
                    ? "opacity-0 -translate-x-full"
                    : "opacity-0 translate-x-full"
                }`}
              >
                <div className="absolute inset-0">
                  <img
                    src={slide.phoneImage}
                    alt={`${slide.title} ${slide.subtitle}`}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                <div className="relative flex h-full items-end">
                  <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 pb-5 sm:pb-7 lg:pb-9">
                    {!heroButtonLoading && heroButton?.isActive && (
                      <button
                        onClick={handleHeroButtonClick}
                        className={`w-full sm:w-auto px-4 py-2.5 xs:px-6 xs:py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm xs:text-base sm:text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 justify-center ${currentTheme.buttonPrimary}`}
                      >
                        <svg
                          className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8453 7.8508 12 7.8508s-3.5902.3931-5.1699 1.0787L4.8078 5.4267a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.8345 11.5987 1 14.5693 1 17.9508c0 .2591.2109.47.47.47h21.06c.2591 0 .47-.2109.47-.47 0-3.3815-1.8345-6.3521-4.5665-7.6294" />
                        </svg>
                        {heroButton.name}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

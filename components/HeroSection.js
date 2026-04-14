"use client";
import { useState, useEffect } from "react";
import {
  Zap,
  Users,
  Package,
  Printer,
  TrendingUp,
  Shield,
  PlayCircle,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { themeConfig } from "../utils/ThemeConfig";

const LANDING_APK_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/app-version/landing-apk`;

const slides = [
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

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [latestApk, setLatestApk] = useState(null);
  const [apkLoading, setApkLoading] = useState(true);
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchLatestApk = async () => {
      try {
        setApkLoading(true);
        const response = await fetch(LANDING_APK_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !result?.data?.apkKey) {
          setLatestApk(null);
          return;
        }

        setLatestApk(result.data);
      } catch {
        setLatestApk(null);
      } finally {
        setApkLoading(false);
      }
    };

    fetchLatestApk();
  }, []);

  const handleDownloadApk = () => {
    if (!latestApk?.apkKey) return;
    window.open(latestApk.apkKey, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`min-h-screen ${currentTheme.background} z-0 relative overflow-hidden`}
    >
      {/* Carousel Container */}
      <div className="relative h-screen lg:mt-16">
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
            {/* Gradient Background */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-10`}
            />

            {/* Animated Background Shapes - Smaller on mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className={`absolute top-10 left-4 w-48 h-48 sm:top-20 sm:left-10 sm:w-72 sm:h-72 bg-gradient-to-br ${slide.gradient} rounded-full opacity-20 blur-2xl sm:blur-3xl animate-pulse`}
              />
              <div
                className={`absolute bottom-10 right-4 w-56 h-56 sm:bottom-20 sm:right-10 sm:w-96 sm:h-96 bg-gradient-to-br ${slide.gradient} rounded-full opacity-20 blur-2xl sm:blur-3xl animate-pulse`}
                style={{ animationDelay: "1s" }}
              />
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-24">
              <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
                {/* Mobile Phone Mockup - Optimized for mobile */}
                <div className="lg:hidden flex justify-center items-center mb-4 sm:mb-6 py-2 order-1">
                  <div className="relative">
                    {/* Phone Frame - Smaller on very small screens */}
                    <div
                      className={`relative w-[140px] h-[280px] xs:w-[160px] xs:h-[320px] sm:w-[180px] sm:h-[360px] rounded-[1.25rem] xs:rounded-[1.5rem] overflow-hidden shadow-lg ${
                        currentTheme.card
                      } p-1 xs:p-1.5 border-2 xs:border-4 ${
                        theme === "light"
                          ? "border-gray-800"
                          : "border-gray-700"
                      }`}
                    >
                      {/* Notch */}
                      <div
                        className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 xs:w-16 xs:h-2 sm:w-20 sm:h-3 ${
                          theme === "light" ? "bg-gray-800" : "bg-gray-700"
                        } rounded-b-md xs:rounded-b-lg sm:rounded-b-xl z-10`}
                      />

                      {/* Screen Content */}
                      <div className="relative h-full w-full rounded-[1rem] xs:rounded-[1.25rem] sm:rounded-[1.5rem] overflow-hidden">
                        <img
                          src={slide.phoneImage}
                          alt="Amdaani App"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Decorative Blur Elements - Smaller on mobile */}
                    <div
                      className={`absolute -bottom-2 -left-2 w-8 h-8 xs:w-12 xs:h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${slide.gradient} rounded-full opacity-30 blur-lg xs:blur-xl`}
                    />
                    <div
                      className={`absolute -top-3 -right-3 w-10 h-10 xs:w-16 xs:h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${slide.gradient} rounded-full opacity-20 blur-lg xs:blur-xl`}
                    />
                  </div>
                </div>

                {/* Text Content - Improved mobile spacing */}
                <div className="space-y-4 sm:space-y-6 lg:space-y-8 text-center lg:text-left order-2 lg:order-1">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 rounded-full ${
                      theme === "light"
                        ? "bg-[#E8F0FE] text-[#1967D2]"
                        : "bg-[#1F1F1F] text-[#8AB4F8]"
                    } text-xs sm:text-sm font-semibold`}
                  >
                    {apkLoading
                      ? "Loading latest APK..."
                      : latestApk?.version
                      ? `Latest APK v${latestApk.version}`
                      : "Coming Soon on Play Store"}
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h1
                      className={`text-1xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold ${currentTheme.text} leading-tight`}
                    >
                      {slide.title}
                      <span
                        className={`block bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent pb-1 leading-tight`}
                      >
                        {slide.subtitle}
                      </span>
                    </h1>
                    <p
                      className={`text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl ${currentTheme.textSecondary} leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 xs:px-0`}
                    >
                      {slide.description}
                    </p>
                  </div>

                  {/* Feature Pills - Better mobile wrapping */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start px-2 xs:px-0">
                    {slide.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 xs:px-3 xs:py-1.5 sm:px-4 sm:py-2 rounded-full ${
                          theme === "light"
                            ? "bg-white shadow-md"
                            : "bg-[#2C2C2E]"
                        } ${
                          currentTheme.text
                        } text-xs xs:text-sm sm:text-base flex-shrink-0`}
                      >
                        <feature.icon className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
                        <span className="font-medium whitespace-nowrap">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Buttons - Better mobile sizing and spacing */}
                  <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-2 xs:px-0">
                    <button
                      onClick={handleDownloadApk}
                      disabled={apkLoading || !latestApk?.apkKey}
                      className={`px-4 py-2.5 xs:px-6 xs:py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm xs:text-base sm:text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 justify-center ${currentTheme.buttonPrimary}`}
                    >
                      <svg
                        className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8453 7.8508 12 7.8508s-3.5902.3931-5.1699 1.0787L4.8078 5.4267a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.8345 11.5987 1 14.5693 1 17.9508c0 .2591.2109.47.47.47h21.06c.2591 0 .47-.2109.47-.47 0-3.3815-1.8345-6.3521-4.5665-7.6294" />
                      </svg>
                      {apkLoading
                        ? "Loading APK..."
                        : latestApk?.version
                        ? `Download v${latestApk.version}`
                        : "Download Now"}
                    </button>
                    <button
                      className={`px-4 py-2.5 xs:px-6 xs:py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm xs:text-base sm:text-lg transition-all hover:scale-105 flex items-center gap-2 justify-center ${currentTheme.buttonSecondary}`}
                    >
                      <PlayCircle className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
                      Watch Demo
                    </button>
                  </div>

                  {latestApk?.description && (
                    <p className={`text-xs sm:text-sm ${currentTheme.textSecondary}`}>
                      {latestApk.description}
                    </p>
                  )}
                </div>

                {/* Desktop Phone Mockup */}
                <div className="hidden lg:flex justify-center items-center mt-8 lg:mt-12 py-1 mb-16 order-2">
                  <div className="relative">
                    <div
                      className={`relative w-[280px] h-[560px] xl:w-[300px] xl:h-[600px] rounded-[3rem] overflow-hidden shadow-2xl ${
                        currentTheme.card
                      } p-3 border-8 ${
                        theme === "light"
                          ? "border-gray-800"
                          : "border-gray-700"
                      }`}
                    >
                      <div
                        className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 xl:w-36 xl:h-6 ${
                          theme === "light" ? "bg-gray-800" : "bg-gray-700"
                        } rounded-b-3xl z-10`}
                      />
                      <div className="relative h-full w-full rounded-[2.5rem] overflow-hidden">
                        <img
                          src={slide.phoneImage}
                          alt="Amdaani App"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div
                      className={`absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br ${slide.gradient} rounded-full opacity-30 blur-3xl`}
                    />
                    <div
                      className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${slide.gradient} rounded-full opacity-20 blur-3xl`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

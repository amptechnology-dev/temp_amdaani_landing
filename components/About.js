"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useInView } from "react-intersection-observer";
import {
  Target,
  Zap,
  Shield,
  Users,
  TrendingUp,
  Globe,
  Award,
  CheckCircle,
  CheckCircle2,
  Play,
  Star,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ABOUT_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/about/public-about`;

const ICON_MAP = {
  Target,
  Zap,
  Shield,
  Users,
  TrendingUp,
  Globe,
  Award,
  Rocket,
  Star,
  Sparkles,
  CheckCircle2,
  IndianRupee,
};

const normalizeIconKey = (value) =>
  String(value || "")
    .trim()
    .replace(/icon$/i, "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const NORMALIZED_ICON_MAP = Object.entries(ICON_MAP).reduce((acc, [key, Icon]) => {
  acc[normalizeIconKey(key)] = Icon;
  return acc;
}, {});

const FALLBACK_ABOUT = {
  badgeTitle: "About Amdaani",
  heading: "Revolutionizing Business Management",
  highlightText: "Made in India",
  description:
    "Amdaani is the fastest and most affordable billing solution built specifically for Indian businesses. We empower entrepreneurs with smart tools to grow their business efficiently.",
  stats: [
    { number: "10K+", label: "Businesses Served", icon: "Users" },
    { number: "50M+", label: "Invoices Generated", icon: "TrendingUp" },
    { number: "99.9%", label: "Uptime Reliability", icon: "Shield" },
    { number: "15+", label: "Cities Across India", icon: "Globe" },
  ],
  missionTitle: "Our Mission",
  missionDescription:
    "To democratize business management tools for every Indian entrepreneur, making professional billing and customer management accessible and affordable.",
  missionPoints: [
    "Built specifically for Indian business needs",
    "Instant Billing",
    "Support for all printer types (A4, POS, Thermal)",
    "GST-compliant invoices and reports",
  ],
  values: [
    {
      icon: "Zap",
      title: "Lightning Fast",
      description:
        "Process invoices 3x faster than traditional software with our optimized workflow and intuitive interface.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: "IndianRupee",
      title: "Cost Effective",
      description:
        "Save up to 70% on billing software costs with our affordable pricing and no hidden charges.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: "Shield",
      title: "Secure & Reliable",
      description:
        "Bank-grade security with automatic backups and 99.9% uptime guarantee for your business.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: "Users",
      title: "Customer First",
      description:
        "Dedicated support and continuous improvements based on real user feedback from Indian businesses.",
      color: "from-orange-500 to-red-500",
    },
  ],
};

const getIconComponent = (iconName, fallback = Zap) => {
  if (!iconName) return fallback;

  const rawIconName =
    typeof iconName === "string"
      ? iconName
      : typeof iconName === "object" && iconName !== null
      ? iconName.name || iconName.icon || ""
      : "";

  if (!rawIconName) return fallback;

  const normalizedIconName = normalizeIconKey(rawIconName);

  // Handle legacy/alias keys from older payloads.
  const ICON_ALIASES = {
    checkcircle: "checkcircle2",
    checkcircleicon: "checkcircle2",
    sparkle: "sparkles",
  };

  const finalKey = ICON_ALIASES[normalizedIconName] || normalizedIconName;
  return NORMALIZED_ICON_MAP[finalKey] || fallback;
};

const normalizeStats = (statsInput) => {
  if (!Array.isArray(statsInput)) return [];

  return statsInput
    .map((stat) => {
      const number = String(stat?.number ?? "").trim();
      const label = String(stat?.label ?? "").trim();
      const icon = stat?.icon;

      return { number, label, icon };
    })
    .filter((stat) => {
      if (!stat.number || !stat.label) return false;

      const numericPart = stat.number.replace(/[^0-9.]/g, "");
      const isZeroValue = numericPart !== "" && Number(numericPart) === 0;

      return !isZeroValue;
    });
};

export default function AboutSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [aboutData, setAboutData] = useState(FALLBACK_ABOUT);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const response = await fetch(ABOUT_ENDPOINT, { method: "GET" });
        const result = await response.json();

        if (!response.ok || !result?.success || !Array.isArray(result?.data)) {
          return;
        }

        const activeItem = result.data.find((item) => item?.isActive) || result.data[0];
        if (!activeItem) return;

        setAboutData({
          badgeTitle: activeItem?.badgeTitle || FALLBACK_ABOUT.badgeTitle,
          heading: activeItem?.heading || FALLBACK_ABOUT.heading,
          highlightText: activeItem?.highlightText || FALLBACK_ABOUT.highlightText,
          description: activeItem?.description || FALLBACK_ABOUT.description,
          stats: normalizeStats(activeItem?.stats),
          missionTitle: activeItem?.missionTitle || FALLBACK_ABOUT.missionTitle,
          missionDescription:
            activeItem?.missionDescription || FALLBACK_ABOUT.missionDescription,
          missionPoints:
            Array.isArray(activeItem?.missionPoints) && activeItem.missionPoints.length
              ? activeItem.missionPoints
              : FALLBACK_ABOUT.missionPoints,
          values:
            Array.isArray(activeItem?.values) && activeItem.values.length
              ? activeItem.values
              : FALLBACK_ABOUT.values,
        });
      } catch {
        setAboutData(FALLBACK_ABOUT);
      }
    };

    fetchAbout();
  }, []);

  const stats = useMemo(
    () =>
      normalizeStats(aboutData?.stats).map((stat) => ({
        number: stat?.number || "0",
        label: stat?.label || "Metric",
        icon: getIconComponent(stat?.icon, Users),
      })),
    [aboutData?.stats]
  );

  const values = useMemo(
    () =>
      (Array.isArray(aboutData?.values) ? aboutData.values : []).map((value) => ({
        icon: getIconComponent(value?.icon, Zap),
        title: value?.title || "Value",
        description: value?.description || "",
        color: value?.color || "from-blue-500 to-cyan-500",
      })),
    [aboutData?.values]
  );

  return (
    <section
      id="about"
      className={`relative overflow-hidden py-12 sm:py-14 lg:py-20 px-5 sm:px-8 xl:px-12 ${currentTheme.background}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-2 sm:px-4 lg:px-6">
        {/* Header Section */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative mx-auto mb-16 max-w-4xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring" }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold mb-4 ${currentTheme.accentLight} ${currentTheme.accent.replace("bg-", "text-")}`}
          >
            <Target className="w-4 h-4 mr-2" />
            {aboutData?.badgeTitle || FALLBACK_ABOUT.badgeTitle}
          </motion.div>

          <h2
            className={`text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl mb-4 ${currentTheme.text}`}
          >
            {aboutData?.heading || FALLBACK_ABOUT.heading}
            <span
              className={`block bg-gradient-to-r ${
                theme === "light"
                  ? "from-[#1A73E8] to-[#03DAC5]"
                  : "from-[#8AB4F8] to-[#66FFF9]"
              } bg-clip-text text-transparent`}
            >
                {aboutData?.highlightText || FALLBACK_ABOUT.highlightText}
            </span>
          </h2>

          <p
              className={`text-base leading-7 sm:text-lg max-w-3xl mx-auto ${currentTheme.textSecondary}`}
          >
            {aboutData?.description || FALLBACK_ABOUT.description}
          </p>
        </motion.div>

        {/* Stats Section */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className={`group rounded-3xl border p-6 text-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${currentTheme.surface} ${currentTheme.outline}`}
                >
                  <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${currentTheme.accentLight}`}
                  >
                    <IconComponent
                      className={`w-6 h-6 ${currentTheme.accent.replace(
                        "bg-",
                        "text-"
                      )}`}
                    />
                  </div>
                  <div
                    className={`text-3xl font-black tracking-tight mb-2 ${currentTheme.text}`}
                  >
                    {stat.number}
                  </div>
                  <div
                    className={`text-sm font-medium uppercase tracking-[0.12em] ${currentTheme.textTertiary}`}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Mission & Values */}
        <div className="mb-20 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className={`rounded-[2rem] border p-6 sm:p-8 shadow-xl backdrop-blur-xl ${currentTheme.surface} ${currentTheme.outline}`}
          >
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${currentTheme.accentLight} ${currentTheme.accent.replace("bg-", "text-")}`}>
              Mission
            </div>
            <h3 className={`text-2xl font-black tracking-tight mb-4 ${currentTheme.text}`}>{aboutData?.missionTitle || FALLBACK_ABOUT.missionTitle}</h3>
            <p className={`text-base leading-7 mb-6 ${currentTheme.textSecondary}`}>
              {aboutData?.missionDescription || FALLBACK_ABOUT.missionDescription}
            </p>

            <div className="space-y-3">
              {(Array.isArray(aboutData?.missionPoints)
                ? aboutData.missionPoints
                : FALLBACK_ABOUT.missionPoints
              ).map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-2.5 ${theme === "light" ? "border-slate-200/70 bg-white/70" : "border-white/10 bg-white/5"}`}
                >
                  <CheckCircle className={`mt-0.5 w-5 h-5 flex-shrink-0 ${currentTheme.success}`} />
                  <span className={`font-medium leading-7 ${currentTheme.text}`}>
                    {feature}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl backdrop-blur-xl ${currentTheme.surface} ${currentTheme.outline}`}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div
              className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${currentTheme.accentLight}`}
            >
              <Award
                className={`w-8 h-8 ${currentTheme.accent.replace(
                  "bg-",
                  "text-"
                )}`}
              />
            </div>
            <h4 className={`text-xl font-black tracking-tight mb-3 ${currentTheme.text}`}>
              Why Choose Amdaani?
            </h4>
            <div className="space-y-3">
              <div className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${theme === "light" ? "border-slate-200 bg-white/70" : "border-white/10 bg-white/5"}`}>
                <span className={`font-semibold ${currentTheme.text}`}>
                  Speed
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
              </div>
              <div className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${theme === "light" ? "border-slate-200 bg-white/70" : "border-white/10 bg-white/5"}`}>
                <span className={`font-semibold ${currentTheme.text}`}>
                  Affordability
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
              </div>
              <div className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${theme === "light" ? "border-slate-200 bg-white/70" : "border-white/10 bg-white/5"}`}>
                <span className={`font-semibold ${currentTheme.text}`}>
                  Ease of Use
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <h3
            className={`text-center text-2xl sm:text-3xl font-black tracking-tight mb-8 ${currentTheme.text}`}
          >
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className={`group rounded-[1.75rem] border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${currentTheme.surface} ${currentTheme.outline}`}
                >
                  <div
                    className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r ${value.color}`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className={`text-lg font-black tracking-tight mb-2 ${currentTheme.text}`}>
                    {value.title}
                  </h4>
                  <p className={`text-sm leading-6 ${currentTheme.textSecondary}`}>
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// IndianRupee icon component since it's not in lucide-react
function IndianRupee(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12h12" />
      <path d="M6 16h12" />
      <path d="M6 8h12" />
      <path d="M15 6l-3-3-3 3" />
      <path d="M9 18l3 3 3-3" />
    </svg>
  );
}

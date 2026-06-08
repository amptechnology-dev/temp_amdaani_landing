"use client";
import { useTheme } from "../context/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useMemo, useState } from "react";
import { Check, Users, CreditCard, Crown, Sparkles, ArrowRight, RefreshCw } from "lucide-react";

// Motion variants for pricing animations
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      when: "beforeChildren",
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.08 },
  }),
  hover: {
    scale: 1.03,
    y: -6,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

const LANDING_PLANS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/plan/landing-plans`;
const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;



const planCardStyles = [
  { color: "from-blue-500 to-cyan-500", icon: Users },
  { color: "from-purple-500 to-pink-500", icon: Crown },
  { color: "from-orange-500 to-red-500", icon: Building },
];

export default function PricingSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  // removed billing toggle state — show all plans
  const [isVisible, setIsVisible] = useState(false);
  const [heroButton, setHeroButton] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState("");
  

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchHeroButton = async () => {
      try {
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
      }
    };

    fetchHeroButton();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    setPlansError("");

    try {
      const response = await fetch(LANDING_PLANS_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load plans");
      }

      const activePlans = (
        Array.isArray(result?.data) ? result.data : []
      ).filter((plan) => plan?.isActive);

      activePlans.sort((a, b) => {
        if ((a?.price ?? 0) !== (b?.price ?? 0)) {
          return (a?.price ?? 0) - (b?.price ?? 0);
        }
        return (a?.durationDays ?? 0) - (b?.durationDays ?? 0);
      });

      setPlans(activePlans);
    } catch (error) {
      setPlansError(error?.message || "Failed to load plans");
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  

  const formatCurrency = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getDurationLabel = (durationDays = 0) => {
    if (durationDays >= 365) return "year";
    if (durationDays >= 30) return "month";
    return `${durationDays} days`;
  };

  // Show all active plans (no monthly/annual filter)
  const displayPlans = useMemo(() => plans, [plans]);

  const comparisonRows = useMemo(
    () => [
      {
        key: "price",
        label: "Price",
        value: (plan) =>
          formatCurrency(plan?.price ?? 0, plan?.currency || "INR"),
      },
      {
        key: "billing",
        label: "Billing cycle",
        value: (plan) => `Per ${getDurationLabel(plan?.durationDays ?? 0)}`,
      },
      {
        key: "invoice",
        label: "Invoice limit",
        value: (plan) =>
          plan?.usageLimits?.unlimited
            ? "Unlimited"
            : plan?.usageLimits?.invoices != null
              ? `${plan.usageLimits.invoices}`
              : "N/A",
      },
      {
        key: "features",
        label: "Features",
        value: (plan) =>
          `${Array.isArray(plan?.features) ? plan.features.length : 0} included`,
      },
    ],
    [],
  );

  const getFeatureLines = (plan) => {
    const parsed = (Array.isArray(plan?.features) ? plan.features : [])
      .map((feature, index) => {
        if (typeof feature === "string") return feature;
        if (feature?.name) return feature.name;
        if (feature?.title) return feature.title;
        if (feature?.label) return feature.label;
        if (feature?.description) return feature.description;
        return `Feature ${index + 1}`;
      })
      .slice(0, 6);

    const invoiceLine = plan?.usageLimits?.unlimited
      ? "Unlimited invoices"
      : plan?.usageLimits?.invoices != null
        ? `Up to ${plan.usageLimits.invoices} invoices`
        : null;

    const durationLine = plan?.durationDays
      ? `Validity: ${plan.durationDays} days`
      : null;

    return [invoiceLine, durationLine, ...parsed].filter(Boolean);
  };

  const getIsPopular = (plan) => {
    const name = (plan?.name || "").toLowerCase();
    if (name.includes("premium") || name.includes("pro")) return true;
    return false;
  };

  const handleHeroButtonClick = () => {
    const targetUrl = heroButton?.link;
    if (!targetUrl) return;

    const hasProtocol = /^https?:\/\//i.test(targetUrl);
    const href = hasProtocol ? targetUrl : `https://${targetUrl}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      id="pricing"
      className={`py-20 px-4 sm:px-6 lg:px-8 ${currentTheme.background}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={isVisible ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring" }}
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              currentTheme.accentLight
            } ${currentTheme.accent.replace("bg-", "text-")}`}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Simple, Transparent Pricing
          </motion.div>

          <h2
            className={`text-4xl md:text-5xl font-bold mb-6 ${currentTheme.text}`}
          >
            Pricing That Grows
            <span
              className={`block bg-gradient-to-r ${
                theme === "light"
                  ? "from-[#1A73E8] to-[#03DAC5]"
                  : "from-[#8AB4F8] to-[#66FFF9]"
              } bg-clip-text text-transparent`}
            >
              With Your Business
            </span>
          </h2>

          <p
            className={`text-xl max-w-3xl mx-auto mb-8 ${currentTheme.textSecondary}`}
          >
            Start free, upgrade as you grow. No hidden fees, no surprise
            charges.
          </p>

          {/* Billing toggle removed — showing all plans */}

          {plansError && (
            <div className="mb-12 flex flex-col items-center gap-3">
              <p className={`text-sm ${currentTheme.error}`}>{plansError}</p>
              <button
                onClick={fetchPlans}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${currentTheme.buttonSecondary}`}
              >
                <RefreshCw className="h-4 w-4" />
                Retry Plans
              </button>
            </div>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 px-4 md:px-8 lg:px-16"
        >
          {loadingPlans
            ? [0, 1, 2].map((idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className={`rounded-2xl border p-8 animate-pulse ${currentTheme.outline} ${currentTheme.surface}`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-gray-300/40 mb-5" />
                  <div className="h-5 w-32 bg-gray-300/40 rounded mb-2" />
                  <div className="h-4 w-44 bg-gray-300/40 rounded mb-8" />
                  <div className="h-10 w-28 bg-gray-300/40 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-300/40 rounded mb-8" />
                  <div className="space-y-3 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-4 w-full bg-gray-300/40 rounded"
                      />
                    ))}
                  </div>
                  <div className="h-11 w-full bg-gray-300/40 rounded-xl" />
                </div>
              ))
            : displayPlans.map((plan, index) => {
                const style = planCardStyles[index % planCardStyles.length];
                const IconComponent = style.icon;
                const isFree = (plan?.price ?? 0) === 0;
                const isPopular = getIsPopular(plan);
                const planFeatures = getFeatureLines(plan);

                const accentColors = [
                  {
                    iconBg: "bg-[#E1F5EE]",
                    iconText: "text-[#0F6E56]",
                    checkBg: "bg-[#E1F5EE]",
                    checkText: "text-[#0F6E56]",
                  },
                  {
                    iconBg: "bg-[#E6F1FB]",
                    iconText: "text-[#185FA5]",
                    checkBg: "bg-[#E6F1FB]",
                    checkText: "text-[#185FA5]",
                  },
                  {
                    iconBg: "bg-[#FAEEDA]",
                    iconText: "text-[#854F0B]",
                    checkBg: "bg-[#FAEEDA]",
                    checkText: "text-[#854F0B]",
                  },
                ];
                const accent = accentColors[index % accentColors.length];

                return (
                  <motion.div
                    key={plan._id || plan.name}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate={isVisible ? "visible" : "hidden"}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className={`relative flex flex-col rounded-2xl transition-all duration-300 p-8 ${
                      isPopular
                        ? theme === "light"
                          ? "border-2 border-[#1A73E8] bg-white shadow-2xl shadow-blue-100"
                          : "border-2 border-[#8AB4F8] bg-slate-900 shadow-2xl shadow-blue-900/30"
                        : theme === "light"
                          ? "border border-gray-200 bg-white shadow-sm hover:shadow-md"
                          : "border border-slate-800 bg-slate-900 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Popular Badge */}
                    {/* {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <motion.div
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#1A73E8] to-[#0D47A1] flex items-center gap-1.5 shadow-lg whitespace-nowrap"
                          animate={{ scale: [1, 1.03, 1] }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Sparkles className="w-3 h-3" />
                          MOST POPULAR
                        </motion.div>
                      </div>
                    )} */}

                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${accent.iconBg}`}
                    >
                      <IconComponent className={`w-5 h-5 ${accent.iconText}`} />
                    </div>

                    {/* Plan Name & Description */}
                    <h3
                      className={`text-xl font-bold mb-1.5 ${currentTheme.text}`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed mb-5 ${currentTheme.textSecondary}`}
                    >
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span
                        className={`text-4xl font-extrabold tracking-tight ${currentTheme.text}`}
                      >
                        {formatCurrency(
                          plan?.price ?? 0,
                          plan?.currency || "INR",
                        )}
                      </span>
                      {!isFree && (
                        <span
                          className={`text-base ${currentTheme.textTertiary}`}
                        >
                          /{getDurationLabel(plan?.durationDays ?? 0)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mb-5 ${currentTheme.textTertiary}`}>
                      {plan?.durationDays ?? 0} days validity
                    </p>

                    {/* Divider */}
                    <div
                      className={`h-px mb-5 ${
                        theme === "light" ? "bg-gray-100" : "bg-slate-800"
                      }`}
                    />

                    {/* Features */}
                    <ul className="flex flex-col gap-3 mb-7 flex-1">
                      {planFeatures.map((feature, featureIndex) => (
                        <motion.li
                          key={`${plan._id || plan.name}-${featureIndex}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={isVisible ? { opacity: 1, x: 0 } : {}}
                          transition={{
                            duration: 0.35,
                            delay: 0.6 + featureIndex * 0.06,
                          }}
                          className="flex items-center gap-3"
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${accent.checkBg}`}
                          >
                            <Check className={`w-3 h-3 ${accent.checkText}`} />
                          </span>
                          <span className={`text-sm ${currentTheme.text}`}>
                            {feature}
                          </span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleHeroButtonClick}
                      disabled={!heroButton?.link}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        isPopular
                          ? "bg-[#1A73E8] hover:bg-[#1558B0] text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                          : theme === "light"
                            ? "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                            : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                      } ${!heroButton?.link ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <HeroButtonIcon />
                      {heroButton?.name ||
                        (isFree ? "Get Started Free" : "Get Started")}
                    </motion.button>
                  </motion.div>
                );
              })}

          {!loadingPlans && !displayPlans.length && !plansError && (
            <div
              className={`md:col-span-3 text-center py-16 ${currentTheme.textSecondary}`}
            >
              No active plans available right now.
            </div>
          )}
        </motion.div>

        {/* Feature Comparison */}
        {/* <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-20"
        >
          <h3
            className={`text-3xl font-bold text-center mb-12 ${currentTheme.text}`}
          >
            Compare Features
          </h3>
          <div
            className={`rounded-2xl border ${currentTheme.outline} ${currentTheme.surface} overflow-hidden`}
          >
            <table className="w-full">
              <thead>
                <tr className={`border-b ${currentTheme.outline}`}>
                  <th className={`p-6 text-left ${currentTheme.text}`}>
                    Features
                  </th>
                  {displayPlans.map((plan) => (
                    <th
                      key={`head-${plan._id || plan.name}`}
                      className={`p-6 text-center ${currentTheme.text}`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPlans ? (
                  <tr>
                    <td
                      colSpan={Math.max(displayPlans.length + 1, 2)}
                      className={`p-6 text-center ${currentTheme.textSecondary}`}
                    >
                      Loading plan comparison...
                    </td>
                  </tr>
                ) : (
                  comparisonRows.map((row, index) => (
                    <tr
                      key={row.key}
                      className={`border-b ${currentTheme.outline} ${
                        index % 2 === 0 ? currentTheme.surfaceVariant : ""
                      }`}
                    >
                      <td className={`p-4 font-medium ${currentTheme.text}`}>
                        {row.label}
                      </td>
                      {displayPlans.map((plan) => (
                        <td
                          key={`${row.key}-${plan._id || plan.name}`}
                          className={`p-4 text-center ${currentTheme.textSecondary}`}
                        >
                          {row.value(plan)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div> */}

        {/* FAQ moved to components/FaqSection.js */}
      </div>
    </section>
  );
}

function HeroButtonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient
          id="pricingHeroButtonGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00C853" />
          <stop offset="45%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
      <path
        d="M4.5 3.9c0-.8.9-1.3 1.6-.9l13.1 7.5c.7.4.7 1.4 0 1.8l-13.1 7.5c-.7.4-1.6-.1-1.6-.9V3.9z"
        fill="url(#pricingHeroButtonGradient)"
      />
      <path
        d="M4.5 3.9l8.3 8.1-8.3 8.1"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Building icon component
function Building(props) {
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
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

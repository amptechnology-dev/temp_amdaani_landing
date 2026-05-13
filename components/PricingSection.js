"use client";
import { useTheme } from "../context/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Users,
  CreditCard,
  Crown,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  MessageCircleQuestion,
} from "lucide-react";

const LANDING_PLANS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/plan/landing-plans`;
const FAQ_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/faq`;
const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;

const FALLBACK_FAQS = [
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No, there are no setup fees or hidden charges. You only pay the monthly or annual subscription fee.",
  },
  {
    question: "Do you offer discounts for startups?",
    answer:
      "Yes, we offer special discounts for registered startups and small businesses. Contact our sales team for details.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, UPI, net banking, and offer EMI options for annual plans.",
  },
];

const planCardStyles = [
  { color: "from-blue-500 to-cyan-500", icon: Users },
  { color: "from-purple-500 to-pink-500", icon: Crown },
  { color: "from-orange-500 to-red-500", icon: Building },
];

export default function PricingSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [isAnnual, setIsAnnual] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [heroButton, setHeroButton] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [faqs, setFaqs] = useState(FALLBACK_FAQS);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

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

      const activePlans = (Array.isArray(result?.data) ? result.data : []).filter(
        (plan) => plan?.isActive
      );

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

  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    setFaqError("");

    try {
      const response = await fetch(FAQ_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load FAQs");
      }

      const apiFaqs = (Array.isArray(result?.data) ? result.data : [])
        .map((item) => ({
          question: item?.question || "",
          answer: item?.answer || "",
        }))
        .filter((item) => item.question && item.answer);

      setFaqs(apiFaqs.length ? apiFaqs : FALLBACK_FAQS);
    } catch (error) {
      setFaqError(error?.message || "Failed to load FAQs");
      setFaqs(FALLBACK_FAQS);
    } finally {
      setLoadingFaqs(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  useEffect(() => {
    if (!faqs.length) {
      setOpenFaqIndex(-1);
      return;
    }

    setOpenFaqIndex((prev) => {
      if (prev < 0 || prev >= faqs.length) return 0;
      return prev;
    });
  }, [faqs]);

  const visibleFaqs = useMemo(() => faqs.slice(0, 6), [faqs]);

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

  const hasAnnualPlans = useMemo(
    () => plans.some((plan) => (plan?.durationDays ?? 0) >= 365 && (plan?.price ?? 0) > 0),
    [plans]
  );

  const displayPlans = useMemo(() => {
    return plans.filter((plan) => {
      if ((plan?.price ?? 0) === 0) return true;
      if (!hasAnnualPlans) return true;

      const isYearlyPlan = (plan?.durationDays ?? 0) >= 365;
      return isAnnual ? isYearlyPlan : !isYearlyPlan;
    });
  }, [hasAnnualPlans, isAnnual, plans]);

  const comparisonRows = useMemo(
    () => [
      {
        key: "price",
        label: "Price",
        value: (plan) => formatCurrency(plan?.price ?? 0, plan?.currency || "INR"),
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
        value: (plan) => `${Array.isArray(plan?.features) ? plan.features.length : 0} included`,
      },
    ],
    []
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

          {/* Billing Toggle */}
          {hasAnnualPlans && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center justify-center space-x-4 mb-12"
            >
              <span
                className={`font-medium ${currentTheme.text} ${
                  !isAnnual ? "opacity-100" : "opacity-60"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
                  isAnnual
                    ? currentTheme.accent
                    : theme === "light"
                    ? "bg-gray-300"
                    : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    isAnnual ? "transform translate-x-7" : ""
                  }`}
                />
              </button>
              <span
                className={`font-medium ${currentTheme.text} ${
                  isAnnual ? "opacity-100" : "opacity-60"
                }`}
              >
                Annual
              </span>
            </motion.div>
          )}

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
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {loadingPlans
            ? [0, 1, 2].map((idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className={`rounded-2xl border-2 p-8 animate-pulse ${currentTheme.outline} ${currentTheme.surface}`}
                >
                  <div className="h-12 w-12 rounded-xl bg-gray-300/40 mx-auto mb-4" />
                  <div className="h-6 w-32 bg-gray-300/40 rounded mx-auto mb-3" />
                  <div className="h-4 w-44 bg-gray-300/40 rounded mx-auto mb-8" />
                  <div className="h-10 w-28 bg-gray-300/40 rounded mx-auto mb-8" />
                  <div className="space-y-3 mb-8">
                    <div className="h-4 w-full bg-gray-300/40 rounded" />
                    <div className="h-4 w-full bg-gray-300/40 rounded" />
                    <div className="h-4 w-4/5 bg-gray-300/40 rounded" />
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

                return (
                  <motion.div
                    key={plan._id || plan.name}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className={`relative rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      isPopular
                        ? `${
                            theme === "light"
                              ? "border-[#1A73E8] shadow-2xl"
                              : "border-[#8AB4F8] shadow-2xl"
                          } transform scale-105`
                        : `${currentTheme.outline} ${currentTheme.surface}`
                    } ${currentTheme.surface}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r ${style.color} flex items-center space-x-1`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>MOST POPULAR</span>
                        </div>
                      </div>
                    )}

                    <div className="p-8">
                      <div className="text-center mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-r ${style.color} flex items-center justify-center mx-auto mb-4`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h3
                          className={`text-2xl font-bold mb-2 ${currentTheme.text}`}
                        >
                          {plan.name}
                        </h3>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center space-x-1">
                          <span
                            className={`text-4xl font-bold ${currentTheme.text}`}
                          >
                            {formatCurrency(plan?.price ?? 0, plan?.currency || "INR")}
                          </span>
                          {!isFree && (
                            <span
                              className={`text-lg ${currentTheme.textTertiary}`}
                            >
                              /{getDurationLabel(plan?.durationDays ?? 0)}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${currentTheme.textSecondary} mt-2`}>
                          {plan?.durationDays ?? 0} days validity
                        </div>
                      </div>

                      <div className="space-y-3 mb-8">
                        {planFeatures.map((feature, featureIndex) => (
                          <motion.div
                            key={`${plan._id || plan.name}-${featureIndex}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={isVisible ? { opacity: 1, x: 0 } : {}}
                            transition={{
                              duration: 0.4,
                              delay: 0.7 + featureIndex * 0.05,
                            }}
                            className="flex items-center space-x-3"
                          >
                            <Check className={`w-5 h-5 ${currentTheme.success}`} />
                            <span className={`text-sm ${currentTheme.text}`}>
                              {feature}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleHeroButtonClick}
                        disabled={!heroButton?.link}
                        className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                          isPopular
                            ? `${currentTheme.buttonPrimary} shadow-lg`
                            : `${currentTheme.buttonSecondary}`
                        }} ${!heroButton?.link ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <HeroButtonIcon />
                          {heroButton?.name || (isFree ? "Get Started Free" : "Get Started")}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}

          {!loadingPlans && !displayPlans.length && !plansError && (
            <div className={`md:col-span-3 text-center ${currentTheme.textSecondary}`}>
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

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <div className="text-center mb-10">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-5 ${
                currentTheme.accentLight
              } ${currentTheme.accent.replace("bg-", "text-")}`}
            >
              <MessageCircleQuestion className="h-4 w-4" />
              FAQs
            </div>
            <h3 className={`text-3xl md:text-4xl font-bold mb-3 ${currentTheme.text}`}>
              Frequently Asked Questions
            </h3>
            <p className={`max-w-2xl mx-auto text-base ${currentTheme.textSecondary}`}>
              Answers update automatically from your admin panel. Expand any
              question to learn more.
            </p>
          </div>

          {faqError && (
            <div className="mb-8 flex flex-col items-center gap-3">
              <p className={`text-sm ${currentTheme.error}`}>{faqError}</p>
              <button
                onClick={fetchFaqs}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${currentTheme.buttonSecondary}`}
              >
                <RefreshCw className="h-4 w-4" />
                Retry FAQs
              </button>
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            {loadingFaqs ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={`faq-skeleton-${idx}`}
                    className={`p-6 rounded-2xl border animate-pulse ${currentTheme.surface} ${currentTheme.outline}`}
                  >
                    <div className="h-5 w-3/4 bg-gray-300/40 rounded mb-4" />
                    <div className="h-4 w-full bg-gray-300/40 rounded mb-2" />
                    <div className="h-4 w-5/6 bg-gray-300/40 rounded" />
                  </div>
                ))}
              </div>
            ) : !faqs.length ? (
              <div
                className={`rounded-2xl border p-8 text-center ${currentTheme.surface} ${currentTheme.outline} ${currentTheme.textSecondary}`}
              >
                No FAQs available right now.
              </div>
            ) : (
              <div className="space-y-4">
                {visibleFaqs.map((faq, index) => {
                  const isOpen = index === openFaqIndex;

                  return (
                    <div
                      key={`faq-row-${faq.question}-${index}`}
                      className={`rounded-2xl border overflow-hidden ${currentTheme.surface} ${currentTheme.outline}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqIndex((prev) => (prev === index ? -1 : index))
                        }
                        className={`w-full px-5 py-4 flex items-center justify-between gap-4 text-left ${
                          isOpen ? currentTheme.surfaceVariant : ""
                        }`}
                        aria-expanded={isOpen}
                      >
                        <span className={`text-base md:text-lg font-semibold ${currentTheme.text}`}>
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 transition-transform ${
                            isOpen ? "rotate-180" : "rotate-0"
                          } ${currentTheme.textSecondary}`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key={`faq-answer-${index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className={`px-5 pb-5 border-t ${currentTheme.outline}`}>
                              <p className={`pt-4 text-sm md:text-base leading-relaxed ${currentTheme.textSecondary}`}>
                                {faq.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroButtonIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="pricingHeroButtonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

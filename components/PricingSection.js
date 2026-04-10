"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useState, useEffect } from "react";
import {
  Check,
  Star,
  Zap,
  Shield,
  Users,
  CreditCard,
  Badge,
  Crown,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function PricingSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [isAnnual, setIsAnnual] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses & freelancers",
      monthlyPrice: "₹0",
      annualPrice: "₹0",
      popular: false,
      icon: Users,
      features: [
        "Up to 50 invoices/month",
        "Basic customer management",
        "A4 printer support",
        "GST-compliant invoices",
        "Email support",
        "1GB storage",
      ],
      cta: "Get Started Free",
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Professional",
      description: "Everything you need to grow your business",
      monthlyPrice: "₹499",
      annualPrice: "₹4,790",
      popular: true,
      icon: Crown,
      features: [
        "Unlimited invoices",
        "Advanced customer management",
        "A4 & POS printer support",
        "Product catalog management",
        "Priority email & chat support",
        "10GB storage",
        "Advanced analytics",
        "Multi-user access (3 users)",
      ],
      cta: "Start Free Trial",
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "Enterprise",
      description: "For growing businesses with advanced needs",
      monthlyPrice: "₹1,299",
      annualPrice: "₹12,990",
      popular: false,
      icon: Building,
      features: [
        "Everything in Professional",
        "Unlimited users",
        "Custom workflows",
        "API access",
        "Dedicated account manager",
        "100GB storage",
        "Custom reporting",
        "White-label solutions",
        "Onboarding assistance",
      ],
      cta: "Contact Sales",
      color: "from-orange-500 to-red-500",
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process invoices 3x faster than traditional software",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Bank-grade security with 99.9% uptime guarantee",
    },
    {
      icon: CreditCard,
      title: "Flexible Payments",
      description: "Pay monthly or annually with multiple payment options",
    },
    {
      icon: Badge,
      title: "GST Compliant",
      description: "Automatically updated with latest tax regulations",
    },
  ];

  const faqs = [
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

  const calculateAnnualSavings = (monthlyPrice) => {
    const monthly = parseInt(monthlyPrice.replace("₹", "").replace(",", ""));
    const annual = parseInt(
      plans
        .find((p) => p.name === "Professional")
        .annualPrice.replace("₹", "")
        .replace(",", "")
    );
    return Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100);
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
            <div className="flex items-center space-x-2">
              <span
                className={`font-medium ${currentTheme.text} ${
                  isAnnual ? "opacity-100" : "opacity-60"
                }`}
              >
                Annual
              </span>
              {isAnnual && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${currentTheme.success} bg-green-50 dark:bg-green-900/20`}
                >
                  Save 20%
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const isFree = price === "₹0";

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className={`relative rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  plan.popular
                    ? `${
                        theme === "light"
                          ? "border-[#1A73E8] shadow-2xl"
                          : "border-[#8AB4F8] shadow-2xl"
                      } transform scale-105`
                    : `${currentTheme.outline} ${currentTheme.surface}`
                } ${currentTheme.surface}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r ${plan.color} flex items-center space-x-1`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>MOST POPULAR</span>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center mx-auto mb-4`}
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

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center space-x-1">
                      <span
                        className={`text-4xl font-bold ${currentTheme.text}`}
                      >
                        {isAnnual && !isFree ? `${plan.annualPrice}` : price}
                      </span>
                      {!isFree && (
                        <span
                          className={`text-lg ${currentTheme.textTertiary}`}
                        >
                          {isAnnual ? "/year" : "/month"}
                        </span>
                      )}
                    </div>
                    {isAnnual && !isFree && (
                      <div
                        className={`text-sm ${currentTheme.textSecondary} mt-2`}
                      >
                        <s>
                          ₹{parseInt(plan.monthlyPrice.replace("₹", "")) * 12}
                        </s>
                        <span
                          className={`ml-2 ${currentTheme.success} font-semibold`}
                        >
                          Save {calculateAnnualSavings(plan.monthlyPrice)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div
                        key={feature}
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

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                      plan.popular
                        ? `${currentTheme.buttonPrimary} shadow-lg`
                        : `${currentTheme.buttonSecondary}`
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Feature Comparison */}
        <motion.div
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
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={`p-6 text-center ${currentTheme.text}`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  "Invoices per month",
                  "Customer management",
                  "Printer support",
                  "Storage",
                  "Users",
                  "Support",
                  "Analytics",
                ].map((feature, index) => (
                  <tr
                    key={feature}
                    className={`border-b ${currentTheme.outline} ${
                      index % 2 === 0 ? currentTheme.surfaceVariant : ""
                    }`}
                  >
                    <td className={`p-4 font-medium ${currentTheme.text}`}>
                      {feature}
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.name} className="p-4 text-center">
                        <Check
                          className={`w-5 h-5 mx-auto ${currentTheme.success}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <h3
            className={`text-3xl font-bold text-center mb-12 ${currentTheme.text}`}
          >
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 1.1 + index * 0.1 }}
                className={`p-6 rounded-2xl border ${currentTheme.surface} ${currentTheme.outline}`}
              >
                <h4 className={`text-lg font-bold mb-3 ${currentTheme.text}`}>
                  {faq.question}
                </h4>
                <p className={`text-sm ${currentTheme.textSecondary}`}>
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
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

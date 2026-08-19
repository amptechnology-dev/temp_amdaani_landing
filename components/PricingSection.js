"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, RefreshCw } from "lucide-react";

const LANDING_PLANS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/plan/landing-plans`;
const HERO_BUTTON_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/herobutton/public-hero-button`;

// Deterministic-ish random, only ever called on the client (after mount),
// so there is no server/client value mismatch to worry about.
const rand = (min, max) =>
  Math.round((min + Math.random() * (max - min)) * 100) / 100;

const generateStars = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(1, 3),
    duration: rand(6, 16),
    delay: rand(0, 6),
    dx: rand(-60, 60),
    dy: rand(-60, 60),
  }));

const generateLightDots = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    top: rand(0, 100),
    left: rand(0, 100),
    size: rand(4, 9),
    duration: rand(10, 20),
    delay: rand(0, 6),
    dx: rand(-90, 90),
    dy: rand(-60, 60),
  }));

function AnimatedBackground({ theme }) {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState([]);
  const [lightDots, setLightDots] = useState([]);

  // Generate particle data ONLY on the client, after mount, so the server
  // render and the first client render both start with an empty array —
  // this avoids any hydration mismatch.
  useEffect(() => {
    setStars(generateStars(50));
    setLightDots(generateLightDots(20));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-35 animate-[priceMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.06)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.06)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.05)_0%,transparent_60%)] bg-[length:200%_200%]" />

        <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-400/8 blur-3xl animate-[priceFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-[-40px] h-96 w-96 rounded-full bg-cyan-400/8 blur-3xl animate-[priceFloatB_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-60px] left-1/3 h-72 w-72 rounded-full bg-indigo-300/8 blur-3xl animate-[priceFloatA_16s_ease-in-out_infinite_reverse]" />

        <div className="absolute inset-0 opacity-20 animate-[priceSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.05)_50%,transparent_70%)]" />

        {mounted &&
          lightDots.map((dot) => (
            <span
              key={dot.id}
              className="absolute rounded-full bg-[#2563eb]/15 blur-[1.5px] animate-[priceDrift_var(--dur)_ease-in-out_infinite]"
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                "--dur": `${dot.duration}s`,
                "--dx": `${dot.dx}px`,
                "--dy": `${dot.dy}px`,
                animationDelay: `${dot.delay}s`,
              }}
            />
          ))}

        <style jsx>{`
          @keyframes priceMeshShift {
            0%,
            100% {
              background-position:
                0% 0%,
                100% 0%,
                50% 100%;
            }
            50% {
              background-position:
                20% 20%,
                80% 10%,
                40% 90%;
            }
          }
          @keyframes priceFloatA {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(35px, -30px) scale(1.1);
            }
          }
          @keyframes priceFloatB {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            50% {
              transform: translate(-30px, 25px) scale(1.08);
            }
          }
          @keyframes priceSweep {
            0%,
            100% {
              transform: translateX(-10%);
            }
            50% {
              transform: translateX(10%);
            }
          }
          @keyframes priceDrift {
            0% {
              transform: translate(0, 0);
              opacity: 0.12;
            }
            50% {
              transform: translate(var(--dx), var(--dy));
              opacity: 0.5;
            }
            100% {
              transform: translate(0, 0);
              opacity: 0.12;
            }
          }
        `}</style>
      </div>
    );
  }

  // Dark mode — drifting + twinkling starfield
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute top-10 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[priceStarDrift_var(--dur)_ease-in-out_infinite]"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "--dur": `${star.duration}s`,
              "--dx": `${star.dx}px`,
              "--dy": `${star.dy}px`,
              animationDelay: `${star.delay}s`,
              boxShadow: "0 0 4px rgba(255,255,255,0.7)",
            }}
          />
        ))}

      <style jsx>{`
        @keyframes priceStarDrift {
          0% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
          50% {
            transform: translate(var(--dx), var(--dy)) scale(1.4);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}

// One pricing card. Uses its own whileInView so it animates in the moment
// it scrolls into the viewport, and whileHover for the interactive lift.
function PricingCard({
  plan,
  index,
  theme,
  isPopular,
  isFree,
  planFeatures,
  formatCurrency,
  getDurationLabel,
  heroButton,
  handleHeroButtonClick,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -60px 0px" }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.1,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative flex flex-col rounded-xl p-9 text-center backdrop-blur-sm transition-colors duration-300 cursor-default ${
        isPopular
          ? "border-2 border-[#2563eb]"
          : theme === "light"
            ? "border border-slate-200 hover:border-[#2563eb]/40"
            : "border border-slate-800 hover:border-[#3b82f6]/50"
      } ${theme === "light" ? "bg-white/90" : "bg-slate-900/90"}`}
      style={{
        boxShadow: isPopular
          ? "0 10px 30px rgba(37,99,235,0.1)"
          : theme === "light"
            ? "0 1px 2px rgba(15, 23, 42, 0.04)"
            : "0 1px 2px rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Hover glow */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          theme === "light"
            ? "shadow-[0_16px_36px_-10px_rgba(37,99,235,0.28)]"
            : "shadow-[0_16px_36px_-10px_rgba(59,130,246,0.4)]"
        }`}
      />

      {/* Popular tag — demo .popular-tag */}
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563eb] text-white text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </span>
      )}

      {/* Plan Name */}
      <h3
        className={`relative text-lg font-bold mb-3 transition-colors duration-300 ${
          theme === "light"
            ? "text-slate-900 group-hover:text-[#2563eb]"
            : "text-white group-hover:text-[#8ab4f8]"
        }`}
      >
        {plan.name}
      </h3>

      {/* Price — demo .amount */}
      <div
        className={`relative text-[2.4rem] font-extrabold mb-1 ${
          theme === "light" ? "text-slate-900" : "text-white"
        }`}
      >
        {formatCurrency(plan?.price ?? 0, plan?.currency || "INR")}
        {!isFree && (
          <span
            className={`text-base font-medium ${
              theme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            /{getDurationLabel(plan?.durationDays ?? 0)}
          </span>
        )}
      </div>

      <p
        className={`relative text-sm mb-6 ${
          theme === "light" ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {plan.description || `${plan?.durationDays ?? 0} days validity`}
      </p>

      {/* Features — demo plain checklist */}
      <ul className="relative text-left flex flex-col gap-2.5 mb-8 flex-1 text-[0.95rem]">
        {planFeatures.map((feature, featureIndex) => (
          <li
            key={`${plan._id || plan.name}-${featureIndex}`}
            className={`flex items-start gap-2 ${
              theme === "light" ? "text-slate-700" : "text-slate-300"
            } ${feature.available ? "" : "line-through opacity-60"}`}
          >
            <Check className="w-4 h-4 mt-0.5 text-[#2563eb] flex-shrink-0" />
            {feature.label}
          </li>
        ))}
      </ul>

      {/* CTA Button — demo .btn-outline / .btn-primary */}
      <button
        onClick={handleHeroButtonClick}
        disabled={!heroButton?.link}
        className={`relative w-full py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
          isPopular
            ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            : theme === "light"
              ? "border-2 border-[#2563eb] text-[#2563eb] hover:bg-blue-50"
              : "border-2 border-[#3b82f6] text-[#3b82f6] hover:bg-slate-800"
        } ${!heroButton?.link ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {heroButton?.name || (isFree ? "Start Free Trial" : "Buy Now")}
      </button>
    </motion.div>
  );
}

export default function PricingSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [heroButton, setHeroButton] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState("");

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
      ).filter(
        (plan) =>
          plan?.isActive && !plan?.name?.toLowerCase().startsWith("topup"),
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

  const displayPlans = useMemo(() => plans, [plans]);

  const getFeatureLines = (plan) => {
    const parsed = (Array.isArray(plan?.features) ? plan.features : [])
      .map((feature, index) => {
        if (typeof feature === "string") {
          return { label: feature, available: true };
        }
        const label =
          feature?.name ||
          feature?.title ||
          feature?.label ||
          feature?.description ||
          `Feature ${index + 1}`;
        return { label, available: feature?.available !== false };
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

    const extraLines = [invoiceLine, durationLine]
      .filter(Boolean)
      .map((label) => ({ label, available: true }));

    return [...extraLines, ...parsed];
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
      className={`relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 ${
        theme === "light" ? "bg-[#F5F7FA]" : "bg-[#0E0F11]"
      }`}
    >
      {/* Animated background */}
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header — demo .section-title style, animates in on scroll */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2
            className={`text-[2.2rem] font-extrabold mb-3 ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            Pricing
          </h2>
          <p
            className={`text-[1.05rem] max-w-2xl mx-auto ${
              theme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            No hidden charges. Choose the plan that fits your shop needs.
          </p>

          {plansError && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-sm text-red-500">{plansError}</p>
              <button
                onClick={fetchPlans}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Plans
              </button>
            </div>
          )}
        </motion.div>

        {/* Pricing Cards — each card animates in on its own as it scrolls into view */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingPlans
            ? [0, 1, 2].map((idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className={`rounded-xl border p-9 animate-pulse ${
                    theme === "light"
                      ? "border-slate-200 bg-white"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div className="h-5 w-32 bg-gray-300/40 rounded mb-4" />
                  <div className="h-10 w-28 bg-gray-300/40 rounded mb-4" />
                  <div className="h-4 w-40 bg-gray-300/30 rounded mb-8" />
                  <div className="space-y-3 mb-8">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-4 w-full bg-gray-300/30 rounded"
                      />
                    ))}
                  </div>
                  <div className="h-11 w-full bg-gray-300/40 rounded-lg" />
                </div>
              ))
            : displayPlans.map((plan, index) => {
                const isFree = (plan?.price ?? 0) === 0;
                const isPopular = getIsPopular(plan);
                const planFeatures = getFeatureLines(plan);

                return (
                  <PricingCard
                    key={plan._id || plan.name}
                    plan={plan}
                    index={index}
                    theme={theme}
                    isPopular={isPopular}
                    isFree={isFree}
                    planFeatures={planFeatures}
                    formatCurrency={formatCurrency}
                    getDurationLabel={getDurationLabel}
                    heroButton={heroButton}
                    handleHeroButtonClick={handleHeroButtonClick}
                  />
                );
              })}

          {!loadingPlans && !displayPlans.length && !plansError && (
            <div
              className={`md:col-span-2 lg:col-span-3 text-center py-16 ${
                theme === "light" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              No active plans available right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
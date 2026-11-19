"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const FEATURES = [
  { title: "1. Direct Sales Invoicing", description: "Open App > Click Create > Issue professional GST/Non-GST invoices in under 10 seconds." },
  { title: "2. Instant Item Creation", description: "Create or modify item names directly while generating a sales invoice without switching screens." },
  { title: "3. Party Management on Billing", description: "Add new customer or vendor details instantly during invoice creation." },
  { title: "4. Easy Purchase Entries", description: "Record stock purchases easily to keep purchase records and input tax credits organized." },
  { title: "5. Real-Time Stock Summary", description: "Track current stock levels automatically as sales and purchases occur." },
  { title: "6. Expense Management", description: "Log shop rent, electricity, tea, staff salaries, and other daily operating expenses." },
  { title: "7. Item, Customer & Vendor Master", description: "Separate masters to create and manage full directory lists of products and contacts." },
  { title: "8. Master Item Directory", description: "View complete catalog of all products with prices, stock status, and HSN codes." },
  { title: "9. Vendor Dues List", description: "View all vendors along with pending payable amounts to plan payments smoothly." },
  { title: "10. Customer Dues Tracker", description: "Complete list of customers and pending balance receivables with single-click payment reminders." },
  { title: "11. Unpaid/Partial Invoices", description: "Track all fully unpaid or partially settled bills to recover dues 3x faster." },
  { title: "12. Daily Cash Collection", description: "View day-wise cash, UPI, and bank collections at a single glance every evening." },
  { title: "13. Periodical Sales Glance", description: "Compare annual, monthly, weekly, and today's sales instantly on the dashboard." },
  { title: "14. Due & Received Summary", description: "Get aggregate metrics on overall customer balance dues vs. total money received." },
  { title: "15. Top 5 Customers List", description: "Identify your most valuable buyers to offer them special discounts or loyalty perks." },
  { title: "16. Top 5 Selling Products", description: "Know your highest selling items to maintain adequate inventory and avoid stock-outs." },
  { title: "17. Recent Invoice Activity", description: "Live feed of recent billing operations to keep track of store cashier activities." },
  { title: "18. Detailed Sales Report", description: "Export in-depth sales analytics in PDF or Excel for accounting and auditing." },
  { title: "19. Item-wise Sales Report", description: "Analyze how specific individual products or brands are performing month over month." },
  { title: "20. All Expenses Report", description: "Categorized breakdown of all store expenses to identify where you can save money." },
  { title: "21. Stock Register & GST Reports", description: "Auto-maintained stock registers and GST filing-ready files." },
];

// One muted colour per grid column (desktop has 3 columns).
// Full class strings so Tailwind can see them.
const COLUMN_COLORS = [
  {
    // column 1: blue
    accentBar: "bg-blue-400/80",
    topLine: "from-blue-400/0 via-blue-400/70 to-blue-400/0",
    glowLight: "bg-blue-300/35",
    glowDark: "bg-blue-400/15",
    tintLight: "from-blue-50/85 via-white/55 to-white/30",
    tintDark: "from-blue-400/[0.10] via-white/[0.04] to-white/[0.02]",
    titleHoverLight: "group-hover:text-blue-700",
    titleHoverDark: "group-hover:text-blue-300",
    ringLight: "hover:border-blue-300/80",
    ringDark: "hover:border-blue-400/40",
    shadowLight: "rgba(59,130,246,0.20)",
  },
  {
    // column 2: teal
    accentBar: "bg-teal-400/80",
    topLine: "from-teal-400/0 via-teal-400/70 to-teal-400/0",
    glowLight: "bg-teal-300/35",
    glowDark: "bg-teal-400/15",
    tintLight: "from-teal-50/85 via-white/55 to-white/30",
    tintDark: "from-teal-400/[0.10] via-white/[0.04] to-white/[0.02]",
    titleHoverLight: "group-hover:text-teal-700",
    titleHoverDark: "group-hover:text-teal-300",
    ringLight: "hover:border-teal-300/80",
    ringDark: "hover:border-teal-400/40",
    shadowLight: "rgba(20,184,166,0.20)",
  },
  {
    // column 3: violet
    accentBar: "bg-violet-400/80",
    topLine: "from-violet-400/0 via-violet-400/70 to-violet-400/0",
    glowLight: "bg-violet-300/35",
    glowDark: "bg-violet-400/15",
    tintLight: "from-violet-50/85 via-white/55 to-white/30",
    tintDark: "from-violet-400/[0.10] via-white/[0.04] to-white/[0.02]",
    titleHoverLight: "group-hover:text-violet-700",
    titleHoverDark: "group-hover:text-violet-300",
    ringLight: "hover:border-violet-300/80",
    ringDark: "hover:border-violet-400/40",
    shadowLight: "rgba(139,92,246,0.20)",
  },
];

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

  useEffect(() => {
    setStars(generateStars(50));
    setLightDots(generateLightDots(20));
    setMounted(true);
  }, []);

  if (theme === "light") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-60 animate-[featMeshShift_16s_ease-in-out_infinite] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(37,99,235,0.10)_0%,transparent_60%),radial-gradient(55%_55%_at_85%_15%,rgba(6,182,212,0.10)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,rgba(99,102,241,0.09)_0%,transparent_60%)] bg-[length:200%_200%]" />

        <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl animate-[featFloatA_14s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-[-40px] h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl animate-[featFloatB_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-60px] left-1/3 h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl animate-[featFloatA_16s_ease-in-out_infinite_reverse]" />

        <div className="absolute inset-0 opacity-20 animate-[featSweep_9s_ease-in-out_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(37,99,235,0.05)_50%,transparent_70%)]" />

        {mounted &&
          lightDots.map((dot) => (
            <span
              key={dot.id}
              className="absolute rounded-full bg-[#2563eb]/15 blur-[1.5px] animate-[featDrift_var(--dur)_ease-in-out_infinite]"
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
          @keyframes featMeshShift {
            0%, 100% { background-position: 0% 0%, 100% 0%, 50% 100%; }
            50% { background-position: 20% 20%, 80% 10%, 40% 90%; }
          }
          @keyframes featFloatA {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(35px, -30px) scale(1.1); }
          }
          @keyframes featFloatB {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-30px, 25px) scale(1.08); }
          }
          @keyframes featSweep {
            0%, 100% { transform: translateX(-10%); }
            50% { transform: translateX(10%); }
          }
          @keyframes featDrift {
            0% { transform: translate(0, 0); opacity: 0.12; }
            50% { transform: translate(var(--dx), var(--dy)); opacity: 0.5; }
            100% { transform: translate(0, 0); opacity: 0.12; }
          }
        `}</style>
      </div>
    );
  }

  // Dark mode: drifting + twinkling starfield
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-[-60px] left-1/3 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

      {mounted &&
        stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white animate-[featStarDrift_var(--dur)_ease-in-out_infinite]"
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
        @keyframes featStarDrift {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
          50% { transform: translate(var(--dx), var(--dy)) scale(1.4); opacity: 1; }
          100% { transform: translate(0, 0) scale(0.8); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ feature, index, theme }) {
  const isLight = theme === "light";
  // index % 3 matches the 3 desktop columns, so each column gets one colour.
  const c = COLUMN_COLORS[index % 3];

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -60px 0px" }}
      transition={{
        duration: 0.45,
        delay: (index % 3) * 0.08,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      whileHover={{ y: -5 }}
      // h-full + flex-col: every card fills its grid cell, so rows line up.
      className={`group relative flex h-full flex-col items-start overflow-hidden rounded-2xl border p-6 text-left backdrop-blur-xl cursor-default transition-[border-color,box-shadow] duration-300 bg-gradient-to-br ${
        isLight
          ? `${c.tintLight} border-white/70 ${c.ringLight}`
          : `${c.tintDark} border-white/10 ${c.ringDark}`
      }`}
      style={{
        boxShadow: isLight
          ? `0 1px 1px rgba(15,23,42,0.04), 0 4px 10px -2px rgba(15,23,42,0.05), 0 18px 34px -14px ${c.shadowLight}, inset 0 1px 0 rgba(255,255,255,0.9)`
          : "0 1px 1px rgba(0,0,0,0.3), 0 10px 24px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Corner glow */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-100 ${
          isLight ? c.glowLight : c.glowDark
        }`}
      />

      {/* Top accent line on hover */}
      <div
        className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${c.topLine}`}
      />

      {/* Small accent bar: same spot on every card */}
      <span
        className={`relative mb-4 block h-[3px] w-8 rounded-full transition-all duration-300 group-hover:w-12 ${c.accentBar}`}
      />

      <h3
        className={`relative mb-2 text-[1.05rem] font-bold leading-snug transition-colors duration-300 ${
          isLight
            ? `text-slate-800 ${c.titleHoverLight}`
            : `text-slate-100 ${c.titleHoverDark}`
        }`}
      >
        {feature.title}
      </h3>
      <p
        className={`relative text-sm leading-relaxed ${
          isLight ? "text-slate-600" : "text-slate-400"
        }`}
      >
        {feature.description}
      </p>
    </motion.article>
  );
}

export default function FeaturesSection() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <section
      id="features"
      className={`relative overflow-hidden py-20 px-5 sm:px-8 lg:px-12 ${
        isLight
          ? "bg-gradient-to-b from-[#EEF2FA] via-[#E9EEF8] to-[#EDF1F9]"
          : "bg-[#0E0F11]"
      }`}
    >
      <AnimatedBackground theme={theme} />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2
            className={`text-[2.2rem] font-extrabold mb-3 ${
              isLight ? "text-slate-800" : "text-white"
            }`}
          >
            Everything You Need to Run &amp; Scale Your Business
          </h2>
          <p
            className={`text-[1.05rem] max-w-2xl mx-auto ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Power-packed features tailored specifically for Indian retailers and
            wholesalers.
          </p>
        </motion.div>

        {/* auto-rows-fr makes every row the same height */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch gap-6">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
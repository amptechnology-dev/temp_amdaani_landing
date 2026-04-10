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
  Play,
  Star,
} from "lucide-react";

export default function AboutSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const stats = [
    { number: "10K+", label: "Businesses Served", icon: Users },
    { number: "50M+", label: "Invoices Generated", icon: TrendingUp },
    { number: "99.9%", label: "Uptime Reliability", icon: Shield },
    { number: "15+", label: "Cities Across India", icon: Globe },
  ];

  const values = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Process invoices 3x faster than traditional software with our optimized workflow and intuitive interface.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: IndianRupee,
      title: "Cost Effective",
      description:
        "Save up to 70% on billing software costs with our affordable pricing and no hidden charges.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description:
        "Bank-grade security with automatic backups and 99.9% uptime guarantee for your business.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Users,
      title: "Customer First",
      description:
        "Dedicated support and continuous improvements based on real user feedback from Indian businesses.",
      color: "from-orange-500 to-red-500",
    },
  ];

  const team = [
    {
      name: "Aarav Sharma",
      role: "Founder & CEO",
      image: "/images/team-aarav.jpg",
      description:
        "Former product lead at leading fintech company with 8+ years experience.",
    },
    {
      name: "Priya Patel",
      role: "CTO",
      image: "/images/team-priya.jpg",
      description:
        "Expert in scalable architecture and cloud technologies with 10+ years experience.",
    },
    {
      name: "Rohan Kumar",
      role: "Head of Product",
      image: "/images/team-rohan.jpg",
      description:
        "Product management specialist focused on user experience and business growth.",
    },
  ];

  return (
    <section
      id="about"
      className={`py-20 px-4 sm:px-6 lg:px-8 ${currentTheme.background}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring" }}
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              currentTheme.accentLight
            } ${currentTheme.accent.replace("bg-", "text-")}`}
          >
            <Target className="w-4 h-4 mr-2" />
            About Amdaani
          </motion.div>

          <h2
            className={`text-4xl md:text-5xl font-bold mb-6 ${currentTheme.text}`}
          >
            Revolutionizing Business Management
            <span
              className={`block bg-gradient-to-r ${
                theme === "light"
                  ? "from-[#1A73E8] to-[#03DAC5]"
                  : "from-[#8AB4F8] to-[#66FFF9]"
              } bg-clip-text text-transparent`}
            >
              Made in India
            </span>
          </h2>

          <p
            className={`text-xl max-w-3xl mx-auto ${currentTheme.textSecondary}`}
          >
            Amdaani is the fastest and most affordable billing solution built
            specifically for Indian businesses. We empower entrepreneurs with
            smart tools to grow their business efficiently.
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
        >
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className={`p-6 rounded-2xl text-center backdrop-blur-sm border ${currentTheme.surface} ${currentTheme.outline}`}
              >
                <div
                  className={`w-12 h-12 rounded-lg ${currentTheme.accentLight} flex items-center justify-center mx-auto mb-4`}
                >
                  <IconComponent
                    className={`w-6 h-6 ${currentTheme.accent.replace(
                      "bg-",
                      "text-"
                    )}`}
                  />
                </div>
                <div
                  className={`text-2xl md:text-3xl font-bold mb-2 ${currentTheme.text}`}
                >
                  {stat.number}
                </div>
                <div
                  className={`text-sm font-medium ${currentTheme.textTertiary}`}
                >
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mission & Values */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className={`text-3xl font-bold mb-6 ${currentTheme.text}`}>
              Our Mission
            </h3>
            <p className={`text-lg mb-6 ${currentTheme.textSecondary}`}>
              To democratize business management tools for every Indian
              entrepreneur, making professional billing and customer management
              accessible and affordable.
            </p>

            <div className="space-y-4">
              {[
                "Built specifically for Indian business needs",
                "Instant Billing",
                "Support for all printer types (A4, POS, Thermal)",
                "GST-compliant invoices and reports",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <CheckCircle className={`w-5 h-5 ${currentTheme.success}`} />
                  <span className={`font-medium ${currentTheme.text}`}>
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
            className={`p-8 rounded-2xl ${currentTheme.surface} ${currentTheme.outline} border`}
          >
            <div
              className={`w-16 h-16 rounded-2xl ${currentTheme.accentLight} flex items-center justify-center mb-6`}
            >
              <Award
                className={`w-8 h-8 ${currentTheme.accent.replace(
                  "bg-",
                  "text-"
                )}`}
              />
            </div>
            <h4 className={`text-2xl font-bold mb-4 ${currentTheme.text}`}>
              Why Choose Amdaani?
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${currentTheme.text}`}>
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
              <div className="flex items-center justify-between">
                <span className={`font-medium ${currentTheme.text}`}>
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
              <div className="flex items-center justify-between">
                <span className={`font-medium ${currentTheme.text}`}>
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
          className="mb-20"
        >
          <h3
            className={`text-3xl font-bold text-center mb-12 ${currentTheme.text}`}
          >
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className={`p-6 rounded-2xl border ${currentTheme.surface} ${currentTheme.outline} hover:shadow-lg transition-all duration-300`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${value.color} flex items-center justify-center mb-4`}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className={`text-xl font-bold mb-3 ${currentTheme.text}`}>
                    {value.title}
                  </h4>
                  <p className={`text-sm ${currentTheme.textSecondary}`}>
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

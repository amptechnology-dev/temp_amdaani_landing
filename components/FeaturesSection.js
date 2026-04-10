"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";

export default function FeaturesSection({ featuresRef }) {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const features = [
    {
      title: "Lightning Fast Billing",
      description:
        "Create professional invoices in seconds with our intuitive interface",
      icon: "⚡",
    },
    {
      title: "Customer Management",
      description:
        "Easily manage your customer database and track payment history",
      icon: "👥",
    },
    {
      title: "Product Catalog",
      description: "Organize your products and services for quick access",
      icon: "📦",
    },
    {
      title: "Flexible Printing",
      description: "Print invoices in A4 format or POS billing in any size",
      icon: "🖨️",
    },
  ];

  return (
    <section ref={featuresRef} className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className={`text-4xl md:text-5xl font-bold mb-4 ${currentTheme.text}`}
          >
            Everything You Need
          </h2>
          <p
            className={`text-xl max-w-2xl mx-auto ${currentTheme.textSecondary}`}
          >
            Powerful features designed to streamline your billing process and
            boost productivity
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`p-6 rounded-2xl transition-all duration-300 shadow-lg ${currentTheme.card}`}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className={`text-xl font-bold mb-3 ${currentTheme.text}`}>
                {feature.title}
              </h3>
              <p className={currentTheme.textSecondary}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

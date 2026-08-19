"use client";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

const FAQ_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/faq/web`;

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

export default function FaqSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const [faqs, setFaqs] = useState(FALLBACK_FAQS);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [faqLimit, setFaqLimit] = useState(5);

  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    setFaqError("");

    try {
      const response = await fetch(FAQ_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success)
        throw new Error(result?.message || "Failed to load FAQs");

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

  const visibleFaqs = useMemo(() => faqs.slice(0, faqLimit), [faqs, faqLimit]);

  return (
    <section
      id="faq"
      className={`py-20 px-4 sm:px-6 lg:px-8 ${
        theme === "light" ? "bg-slate-50" : "bg-slate-950"
      }`}
    >
      {/* Header — demo .section-title style */}
      <div className="text-center mb-12">
        <h3
          className={`text-[2.2rem] font-extrabold mb-3 ${
            theme === "light" ? "text-slate-900" : "text-white"
          }`}
        >
          Frequently Asked Questions
        </h3>
        <p
          className={`max-w-2xl mx-auto text-[1.05rem] ${
            theme === "light" ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Got questions? We&apos;ve got answers.
        </p>
      </div>

      {faqError && (
        <div className="mb-8 flex flex-col items-center gap-3">
          <p className="text-sm text-red-500">{faqError}</p>
          <button
            onClick={fetchFaqs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry FAQs
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {loadingFaqs ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={`faq-skeleton-${idx}`}
                className={`p-5 rounded-xl border animate-pulse ${
                  theme === "light"
                    ? "border-slate-200 bg-white/90"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="h-5 w-3/4 bg-gray-300/40 rounded mb-3" />
                <div className="h-4 w-full bg-gray-300/40 rounded mb-2" />
                <div className="h-4 w-5/6 bg-gray-300/40 rounded" />
              </div>
            ))}
          </div>
        ) : !faqs.length ? (
          <div
            className={`rounded-xl border p-8 text-center ${
              theme === "light"
                ? "border-slate-200 bg-white/90 text-slate-500"
                : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            No FAQs available right now.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleFaqs.map((faq, index) => (
              <motion.div
                key={`faq-row-${faq.question}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className={`rounded-xl border p-5 ${
                  theme === "light"
                    ? "border-slate-200 bg-white/90"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <h4
                  className={`text-[1.05rem] font-semibold mb-2 ${
                    theme === "light" ? "text-slate-900" : "text-white"
                  }`}
                >
                  Q. {faq.question}
                </h4>
                <p
                  className={`leading-7 text-sm md:text-base ${
                    theme === "light" ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {faq.answer}
                </p>
              </motion.div>
            ))}

            {faqs.length > faqLimit && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setFaqLimit((p) => p + 5)}
                  className={`inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    theme === "light"
                      ? "border-2 border-[#2563eb] text-[#2563eb] hover:bg-blue-50"
                      : "border-2 border-[#3b82f6] text-[#3b82f6] hover:bg-slate-800"
                  }`}
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

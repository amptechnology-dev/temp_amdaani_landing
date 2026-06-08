"use client";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { themeConfig } from "../utils/ThemeConfig";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronDown, Plus, Minus, MessageCircleQuestion } from "lucide-react";

const FAQ_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/faq/web`;

const FALLBACK_FAQS = [
  { question: "Can I change plans anytime?", answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately." },
  { question: "Is there a setup fee?", answer: "No, there are no setup fees or hidden charges. You only pay the monthly or annual subscription fee." },
  { question: "Do you offer discounts for startups?", answer: "Yes, we offer special discounts for registered startups and small businesses. Contact our sales team for details." },
  { question: "What payment methods do you accept?", answer: "We accept all major credit cards, UPI, net banking, and offer EMI options for annual plans." },
];

export default function FaqSection() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const [faqs, setFaqs] = useState(FALLBACK_FAQS);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqError, setFaqError] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [faqLimit, setFaqLimit] = useState(5);

  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    setFaqError("");

    try {
      const response = await fetch(FAQ_ENDPOINT, { method: "GET" });
      const result = await response.json();

      if (!response.ok || !result?.success) throw new Error(result?.message || "Failed to load FAQs");

      const apiFaqs = (Array.isArray(result?.data) ? result.data : []).map((item) => ({ question: item?.question || "", answer: item?.answer || "" })).filter((item) => item.question && item.answer);

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

  const visibleFaqs = useMemo(() => faqs.slice(0, faqLimit), [faqs, faqLimit]);

  return (
    <motion.div id="faq" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <div className="text-center mb-10">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-5 ${currentTheme.accentLight} ${currentTheme.accent.replace("bg-", "text-")}`}>
          <MessageCircleQuestion className="h-4 w-4" />
          FAQs
        </div>
        <h3 className={`text-3xl md:text-4xl font-bold mb-3 ${currentTheme.text}`}>Frequently Asked Questions</h3>
        <p className={`max-w-2xl mx-auto text-base ${currentTheme.textSecondary}`}>Answers update automatically from your admin panel. Expand any question to learn more.</p>
      </div>

      {faqError && (
        <div className="mb-8 flex flex-col items-center gap-3">
          <p className={`text-sm ${currentTheme.error}`}>{faqError}</p>
          <button onClick={fetchFaqs} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${currentTheme.buttonSecondary}`}>
            <RefreshCw className="h-4 w-4" />
            Retry FAQs
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {loadingFaqs ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={`faq-skeleton-${idx}`} className={`p-6 rounded-2xl border animate-pulse ${currentTheme.surface} ${currentTheme.outline}`}>
                <div className="h-5 w-3/4 bg-gray-300/40 rounded mb-4" />
                <div className="h-4 w-full bg-gray-300/40 rounded mb-2" />
                <div className="h-4 w-5/6 bg-gray-300/40 rounded" />
              </div>
            ))}
          </div>
        ) : !faqs.length ? (
          <div className={`rounded-2xl border p-8 text-center ${currentTheme.surface} ${currentTheme.outline} ${currentTheme.textSecondary}`}>No FAQs available right now.</div>
        ) : (
          <div className="space-y-5">
            {visibleFaqs.map((faq, index) => {
              const isOpen = index === openFaqIndex;
              return (
                <motion.div key={`faq-row-${faq.question}-${index}`} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className={`relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-300 ${isOpen ? (theme === "light" ? "border-blue-200 bg-white shadow-[0_25px_60px_rgba(26,115,232,0.15)]" : "border-blue-400/30 bg-white/5 shadow-[0_25px_60px_rgba(138,180,248,0.15)]") : `${currentTheme.surface} ${currentTheme.outline}`}`}>
                  {isOpen && (
                    <>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
                      <motion.div animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent" />
                    </>
                  )}

                  <button type="button" onClick={() => setOpenFaqIndex((prev) => (prev === index ? -1 : index))} className="relative z-10 flex w-full items-center justify-between gap-5 px-6 py-5 text-left">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOpen ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : theme === "light" ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"}`}>
                        {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                      </div>
                      <h4 className={`text-base md:text-lg font-bold ${currentTheme.text}`}>{faq.question}</h4>
                    </div>

                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <ChevronDown className={`h-5 w-5 ${currentTheme.textSecondary}`} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden">
                        <div className={`px-6 pb-6 pt-2 border-t ${currentTheme.outline}`}>
                          <p className={`leading-8 text-sm md:text-base ${currentTheme.textSecondary}`}>{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {faqs.length > faqLimit && (
              <div className="text-center mt-6">
                <button type="button" onClick={() => setFaqLimit((p) => p + 5)} className={`inline-flex items-center px-4 py-2 rounded-full ${currentTheme.buttonSecondary} text-sm font-medium`}>Load more</button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

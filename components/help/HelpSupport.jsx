"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Mail, Phone, MessageCircle, RefreshCw } from "lucide-react";
import api from "../../utils/api";

export default function HelpSupport() {
  const [expanded, setExpanded] = useState(null);

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [helplines, setHelplines] = useState([]);
  const [helplineLoading, setHelplineLoading] = useState(true);
  const [helplineError, setHelplineError] = useState(false);

  const toggleExpand = (index) => {
    setExpanded((prev) => (prev === index ? null : index));
  };

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await api.get("/faq");
      const data = response?.data?.data || response?.data || [];
      setFaqs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("FAQ API Error:", err?.response?.data || err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchHelpLine = async () => {
    try {
      setHelplineLoading(true);
      setHelplineError(false);

      let response;
      try {
        response = await api.get("/helpline");
      } catch {
        response = await api.get("/all-helpline");
      }

      const raw = response?.data;
      let resolved = null;

      if (raw?.data) {
        resolved = raw.data;
      } else if (Array.isArray(raw)) {
        resolved = raw;
      } else if (raw && typeof raw === "object") {
        resolved = raw;
      }

      if (!resolved) {
        setHelplines([]);
        return;
      }

      if (Array.isArray(resolved)) {
        const sorted = [...resolved].sort(
          (a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
        );
        setHelplines(sorted);
      } else if (typeof resolved === "object") {
        if (resolved.phone || resolved.email) {
          setHelplines([resolved]);
        } else {
          setHelplines([]);
        }
      } else {
        setHelplines([]);
      }
    } catch (err) {
      console.log("Helpline fetch error:", err?.response?.data || err?.message);
      setHelplineError(true);
      setHelplines([]);
    } finally {
      setHelplineLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
    fetchHelpLine();
  }, []);

  return (
    <div className="px-5 md:px-7 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Help & Support</h1>
        <p className="text-[13.5px] text-slate-500 mt-1">Find answers or reach out to us</p>
      </div>

      {/* ── FAQ Section ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[15px] text-slate-900">FAQs</h2>
        </div>

        <div className="px-2 py-2">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-8">
              <p className="text-red-600 text-[13px] mb-3">Failed to load FAQs.</p>
              <button
                onClick={fetchFaqs}
                className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && faqs.length === 0 && (
            <p className="text-slate-400 text-[13px] px-3 py-6">No FAQs available</p>
          )}

          {!loading &&
            !error &&
            faqs.map((item, index) => (
              <div key={item._id || index} className={index < faqs.length - 1 ? "border-b border-slate-100" : ""}>
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3.5 text-left hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="text-[13.5px] font-medium text-slate-800">
                    {item.question || item.q || "No Question"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      expanded === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded === index && (
                  <div className="px-3 pb-4">
                    <p className="text-[13px] text-slate-500 leading-relaxed">
                      {item.answer || item.a || "No Answer"}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* ── Contact Section ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[15px] text-slate-900">Contact Us</h2>
        </div>

        <div className="px-2 py-2">
          {helplineLoading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!helplineLoading && helplineError && (
            <div className="flex flex-col items-center py-8">
              <p className="text-red-600 text-[13px] mb-3">Failed to load contact info.</p>
              <button
                onClick={fetchHelpLine}
                className="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12.5px] font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!helplineLoading && !helplineError && helplines.length === 0 && (
            <p className="text-slate-400 text-[13px] px-3 py-6">No contact information available</p>
          )}

          {!helplineLoading &&
            !helplineError &&
            helplines.map((item, index) => (
              <div key={item._id || index}>
                {!!item.email && (
                  <a
                    href={`mailto:${item.email}`}
                    className="flex items-center gap-3 px-3 py-3.5 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium text-slate-800">Email Support</p>
                      <p className="text-[12.5px] text-slate-500">{item.email}</p>
                    </div>
                  </a>
                )}

                {!!item.phone && (
                  <>
                    <a
                      href={`https://wa.me/91${item.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-3.5 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <MessageCircle size={16} className="text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-slate-800">WhatsApp</p>
                        <p className="text-[12.5px] text-slate-500">+91 {item.phone}</p>
                      </div>
                    </a>

                    <a
                      href={`tel:+91${item.phone}`}
                      className={`flex items-center gap-3 px-3 py-3.5 hover:bg-slate-50 rounded-lg transition-colors ${
                        index < helplines.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Phone size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-slate-800">Call Us</p>
                        <p className="text-[12.5px] text-slate-500">+91 {item.phone}</p>
                      </div>
                    </a>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      <p className="text-center text-[12.5px] text-slate-400">
        We usually reply within 24 hours
      </p>
    </div>
  );
}
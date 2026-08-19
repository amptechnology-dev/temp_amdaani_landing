"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import api from "../../utils/api";

const feedbackTypes = [
  { label: "General", value: "general" },
  { label: "Bug Report", value: "bug" },
  { label: "Feature Request", value: "feature" },
  { label: "Other", value: "other" },
];

export default function Feedback() {
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!message.trim()) newErrors.message = "Message is required";
    if (message.trim().length > 1000)
      newErrors.message = "Message must be less than 1000 characters";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        message: message.trim(),
        type,
        feedbackMode: "text",
        metadata: {
          appVersion: "web",
          deviceInfo: navigator.userAgent,
          os: navigator.platform,
        },
      };

      const response = await api.post("/feedback", payload);

      if (response.success) {
        showToast("success", "Thank you for your feedback!");
        setMessage("");
        setType("general");
      }
    } catch (error) {
      showToast(
        "error",
        error?.response?.data?.message || "Failed to submit feedback"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = feedbackTypes.find((t) => t.value === type)?.label;

  return (
    <div className="px-5 md:px-7 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Feedback</h1>
        <p className="text-[13.5px] text-slate-500 mt-1">
          Help us improve AMDAANI by sharing your thoughts
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6">
        {/* Feedback Type dropdown */}
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-slate-700 mb-2">
            Feedback Type
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={`w-full h-12 px-3.5 rounded-xl border text-left flex items-center justify-between text-[14px] transition-colors ${
                dropdownOpen
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300"
              } bg-white text-slate-800`}
            >
              {selectedLabel}
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg py-1.5">
                {feedbackTypes.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setType(item.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-[13.5px] transition-colors ${
                      item.value === type
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-slate-700 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setErrors((prev) => ({ ...prev, message: null }));
            }}
            maxLength={1000}
            rows={6}
            placeholder="Tell us what you think..."
            className={`w-full rounded-xl border px-3.5 py-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 resize-none transition-colors focus:outline-none ${
              errors.message
                ? "border-red-400 focus:ring-2 focus:ring-red-400/20"
                : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            }`}
          />
          <div className="flex items-center justify-between mt-1.5">
            {errors.message ? (
              <span className="text-[12px] text-red-600">{errors.message}</span>
            ) : (
              <span />
            )}
            <span className="text-[12px] text-slate-400">{message.length}/1000</span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-white text-[13px] font-medium z-50 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
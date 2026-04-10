"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import Navigation from "../Navigation";

/**
 * /auth/register/page.jsx
 *
 * 2-step simplified registration:
 *  - Step 1: Personal info (fullName*, phone*, email?)
 *  - Step 2: Business info (businessName*, businessType*, street*, city*, state*, pincode*)
 *  - GST toggle: If "Yes", gstNumber becomes required
 *
 * Uses themeConfig[theme] (same pattern as your other pages)
 */

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromQuery = searchParams?.get("phone") || "";

  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const { completeRegistration, authState } = useAuth();

  // form state
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMap, setErrorMap] = useState({});
  const [globalError, setGlobalError] = useState("");

  // Personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(phoneFromQuery || "");
  const [email, setEmail] = useState("");

  // Business
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  // GST toggle
  const [hasGst, setHasGst] = useState(false);
  const [gstNumber, setGstNumber] = useState("");

  // Basic list for business types and states (can be extended)
  const businessTypes = [
    "Grocery / Retail",
    "Restaurant / Café",
    "Salon / Beauty",
    "Service Provider",
    "Wholesale",
    "Others",
  ];

  const states = [
    "Andhra Pradesh",
    "Assam",
    "Bihar",
    "Gujarat",
    "Karnataka",
    "Maharashtra",
    "Tamil Nadu",
    "West Bengal",
    "Delhi",
    "Other",
  ];

  // Prefill phone if authState has something (temp flow)
  useEffect(() => {
    // some flows may set phone in authState.tempPhone — support that if available
    if (!phone && authState?.tempPhone) {
      setPhone(authState.tempPhone);
    }
  }, [authState, phone]);

  // Validation helpers
  const validators = {
    fullName: (v) =>
      typeof v === "string" && v.trim().length >= 3 && /^[a-zA-Z\s]+$/.test(v),
    phone: (v) => /^[6-9]\d{9}$/.test(v),
    email: (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    businessName: (v) => typeof v === "string" && v.trim().length >= 2,
    businessType: (v) => typeof v === "string" && v.trim().length > 0,
    street: (v) => typeof v === "string" && v.trim().length > 0,
    city: (v) => typeof v === "string" && v.trim().length > 0,
    stateVal: (v) => typeof v === "string" && v.trim().length > 0,
    pincode: (v) => /^\d{6}$/.test(v),
    gstNumber: (v) =>
      !hasGst ||
      (typeof v === "string" &&
        v.trim().length > 0 &&
        // lightweight GST pattern check (22AAAAA0000A1Z5) — not overly strict
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          v.toUpperCase()
        )),
  };

  const validateStep1 = () => {
    const e = {};
    if (!validators.fullName(fullName)) {
      e.fullName =
        "Full name must be at least 3 letters and contain only alphabets.";
    }
    if (!validators.phone(phone))
      e.phone = "Enter a valid 10-digit Indian mobile.";
    if (!validators.email(email))
      e.email = "Enter a valid email or leave blank.";
    setErrorMap(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!validators.businessName(businessName))
      e.businessName = "Business name is required.";
    if (!validators.businessType(businessType))
      e.businessType = "Select a business type.";
    if (!validators.street(street)) e.street = "Street is required.";
    if (!validators.city(city)) e.city = "City is required.";
    if (!validators.stateVal(stateVal)) e.stateVal = "State is required.";
    if (!validators.pincode(pincode)) e.pincode = "Pincode must be 6 digits.";
    if (!validators.gstNumber(gstNumber))
      e.gstNumber = "Invalid GST number format.";
    setErrorMap(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    setGlobalError("");
    if (step === 1) {
      if (validateStep1()) setStep(2);
    }
  };

  const goBack = () => {
    setGlobalError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setGlobalError("");
    if (!validateStep2()) {
      return;
    }

    // Build FormData like RN did — backend expects 'storeData[...]' and 'userData[...]'
    const formData = new FormData();

    // storeData
    formData.append("storeData[name]", businessName);
    formData.append("storeData[type]", businessType);
    formData.append("storeData[address][street]", street);
    formData.append("storeData[address][city]", city);
    formData.append("storeData[address][state]", stateVal);
    formData.append("storeData[address][postalCode]", pincode);
    formData.append("storeData[address][country]", "IN");

    // GST (conditional)
    if (hasGst && gstNumber) {
      formData.append("storeData[gstNumber]", gstNumber.toUpperCase());
    }

    // userData
    formData.append("userData[phone]", phone);
    formData.append("userData[name]", fullName);
    if (email) formData.append("userData[email]", email);

    // Call completeRegistration from AuthContext (it expects multipart/form-data)
    setIsLoading(true);
    try {
      const res = await completeRegistration(formData);

      // show server message in console for debugging
      console.log("Register response:", res);

      if (res?.success) {
        // completeRegistration inside AuthContext should update auth state & redirect;
        // but if not, we redirect to dashboard
        router.push("/dashboard");
      } else {
        setGlobalError(res?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setGlobalError(err?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Small UI helpers
  const fieldClass =
    "w-full px-3 py-2 rounded-lg border focus:outline-none transition-all";
  const labelClass = `text-sm font-medium mb-1 ${currentTheme.text}`;

  return (
    <>
      <Navigation noLanding={true} />

      <div
        className={`${currentTheme.background} min-h-screen py-12  items-center flex align-center justify-center`}
      >
        <div className="max-w-3xl w-full mx-auto px-4">
          <div
            className={`w-full rounded-2xl p-8 ${currentTheme.surface} border ${currentTheme.outline} shadow-md`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background:
                      theme === "light"
                        ? "linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)"
                        : "linear-gradient(135deg, #8AB4F8 0%, #669DF6 100%)",
                  }}
                >
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${currentTheme.text}`}>
                    Create your account
                  </h1>
                  <p className={`text-xs ${currentTheme.textSecondary}`}>
                    {step === 1
                      ? "Step 1 of 2 — Personal"
                      : "Step 2 of 2 — Business"}
                  </p>
                </div>
              </div>

              <div>
                <div className="text-right text-xs text-muted">
                  <span className={`${currentTheme.textSecondary}`}>
                    Secure & encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* Steps content */}
            <AnimatePresence mode="wait" initial={false}>
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Step 1 - Personal */}
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Full name *</label>
                      <input
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                      />
                      {errorMap.fullName && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Phone number *</label>
                      <input
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        maxLength={10}
                        placeholder="9876543210"
                        // If phone came from query we keep it readonly to avoid accidental change
                        readOnly={!!phoneFromQuery}
                      />
                      {errorMap.phone && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Email (optional)</label>
                      <input
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        type="email"
                      />
                      {errorMap.email && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.email}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-4">
                      <div>{/* nothing */}</div>

                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => router.push("/auth")}
                          className="px-4 py-2"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={goNext}
                          className={`px-4 py-2 ${currentTheme.buttonPrimary}`}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Step 2 - Business */}
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Business name *</label>
                      <input
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. FreshMart Pvt Ltd"
                      />
                      {errorMap.businessName && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.businessName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Business type *</label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                      >
                        <option value="">Select business type</option>
                        {businessTypes.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      {errorMap.businessType && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.businessType}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Street *</label>
                      <input
                        className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Street address"
                      />
                      {errorMap.street && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorMap.street}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>City *</label>
                        <input
                          className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                        />
                        {errorMap.city && (
                          <p className="text-sm text-red-500 mt-1">
                            {errorMap.city}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>State *</label>
                        <select
                          value={stateVal}
                          onChange={(e) => setStateVal(e.target.value)}
                          className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                        >
                          <option value="">Select state</option>
                          {states.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {errorMap.stateVal && (
                          <p className="text-sm text-red-500 mt-1">
                            {errorMap.stateVal}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Pincode *</label>
                        <input
                          className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                          value={pincode}
                          onChange={(e) =>
                            setPincode(e.target.value.replace(/\D/g, ""))
                          }
                          maxLength={6}
                          placeholder="6-digit pincode"
                        />
                        {errorMap.pincode && (
                          <p className="text-sm text-red-500 mt-1">
                            {errorMap.pincode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* GST toggle */}
                    <div className="flex items-center gap-3 mt-2">
                      <label className={`${currentTheme.text} font-medium`}>
                        Do you have GST?
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHasGst(true)}
                          className={`px-3 py-1 rounded ${
                            hasGst ? "ring-2 ring-offset-1" : "opacity-60"
                          }`}
                          aria-pressed={hasGst}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => {
                            setHasGst(false);
                            setGstNumber("");
                          }}
                          className={`px-3 py-1 rounded ${
                            !hasGst ? "ring-2 ring-offset-1" : "opacity-60"
                          }`}
                          aria-pressed={!hasGst}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {hasGst && (
                      <div>
                        <label className={labelClass}>GST Number *</label>
                        <input
                          className={`${fieldClass} ${currentTheme.surface} ${currentTheme.text}`}
                          value={gstNumber}
                          onChange={(e) =>
                            setGstNumber(e.target.value.toUpperCase())
                          }
                          placeholder="22AAAAA0000A1Z5"
                        />
                        {errorMap.gstNumber && (
                          <p className="text-sm text-red-500 mt-1">
                            {errorMap.gstNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {globalError && (
                      <p className="text-sm text-red-500 mt-2">{globalError}</p>
                    )}

                    <div className="flex items-center justify-between gap-3 mt-6">
                      <div className="flex gap-3">
                        <Button
                          onClick={goBack}
                          className="px-4 py-2"
                          variant="ghost"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                          </div>
                        </Button>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => router.push("/auth")}
                          className="px-4 py-2"
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={handleSubmit}
                          className={`px-4 py-2 ${currentTheme.buttonPrimary} flex items-center gap-2`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            "Register"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p
            className={`text-center text-xs mt-4 ${currentTheme.textSecondary}`}
          >
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}

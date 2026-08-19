"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Search,
  X,
  Check,
  ChevronDown,
  FileCheck2,
  Hash,
} from "lucide-react";
import Navigation from "../Navigation";

/* ---------------- static data ---------------- */
const BUSINESS_TYPES = [
  "Grocery / Retail",
  "Restaurant / Café",
  "Salon / Beauty",
  "Service Provider",
  "Wholesale / Distributor",
  "Pharmacy",
  "Electronics",
  "Clothing / Fashion",
  "Hardware Store",
  "Bakery",
  "Others",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const STEPS = [
  { key: "personal", label: "Personal", icon: User },
  { key: "business", label: "Business", icon: Building2 },
];

/* ---------------- small building blocks ---------------- */
function Field({ label, required, error, icon: Icon, children }) {
  return (
    <div className="w-full">
      <label className="flex items-center gap-1.5 text-sm font-semibold mb-1.5">
        {Icon && <Icon className="w-4 h-4 opacity-60" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5 ml-0.5">{error}</p>}
    </div>
  );
}

function TextField({ value, onChange, placeholder, error, icon: Icon, theme, ...rest }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-45 pointer-events-none" />
      )}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-11 ${Icon ? "pl-10" : "pl-4"} pr-4 rounded-xl border text-[15px]
          bg-black/[.015] dark:bg-white/5 ${theme.text}
          ${error ? "border-red-500 focus:ring-red-500/30" : `${theme.outline} focus:ring-blue-500/30`}
          focus:outline-none focus:ring-4 focus:border-blue-500 transition-all placeholder:opacity-40`}
        {...rest}
      />
    </div>
  );
}

function PickerButton({ value, placeholder, icon: Icon, error, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-11 pl-10 pr-4 rounded-xl border text-left text-[15px] relative flex items-center cursor-pointer
        bg-black/[.015] dark:bg-white/5 ${theme.text}
        ${error ? "border-red-500" : theme.outline}
        hover:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all`}
    >
      <Icon className="absolute left-3.5 w-4.5 h-4.5 opacity-45" />
      <span className={value ? "" : "opacity-40"}>{value || placeholder}</span>
      <ChevronDown className="absolute right-3.5 w-4 h-4 opacity-40" />
    </button>
  );
}

function PickerModal({ open, onClose, title, items, value, onSelect, searchPlaceholder }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const filtered = items.filter((i) => i.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[92vw] max-w-md max-h-[75vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="font-bold text-lg">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                />
              </div>
            </div>
            <div className="overflow-y-auto px-2 pb-4">
              {filtered.length === 0 ? (
                <p className="text-center text-sm opacity-50 py-8">No results found</p>
              ) : (
                filtered.map((item) => {
                  const selected = item === value;
                  return (
                    <button
                      key={item}
                      onClick={() => { onSelect(item); onClose(); }}
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between text-sm transition-colors cursor-pointer ${
                        selected
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                          : "hover:bg-black/[.03] dark:hover:bg-white/5"
                      }`}
                    >
                      {item}
                      {selected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TermsModal({ open, onClose, onAccept }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[92vw] max-w-lg max-h-[80vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-500" /> Terms &amp; Conditions
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-3 text-sm leading-relaxed opacity-80">
              <p>AMDAANI is a billing, invoicing and inventory management platform provided by AMP Technology. By registering, you agree to enter accurate business data and take full responsibility for invoices, GST entries and reports generated using your data.</p>
              <p>The app does not act as a chartered accountant, tax consultant or legal advisor. All generated reports must be independently verified before official or tax use.</p>
              <p>Your business, contact and address information is used solely to operate billing, invoicing and reporting features, and may be shared with hosting, SMS/email and payment infrastructure partners strictly for operational purposes.</p>
              <p>
                Read the full policy at{" "}
                <a href="/terms" target="_blank" className="text-blue-500 underline cursor-pointer">amdaani.com/terms</a>.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-black/5 dark:border-white/10">
              <button
                onClick={onAccept}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4.5 h-4.5" /> I Accept Terms &amp; Conditions
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ==================================================================== */

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromQuery = searchParams?.get("phone") || "";

  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { completeRegistration, authState } = useAuth();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMap, setErrorMap] = useState({});
  const [globalError, setGlobalError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(phoneFromQuery || "");
  const [email, setEmail] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  const [hasGst, setHasGst] = useState(false);
  const [gstNumber, setGstNumber] = useState("");

  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!phone && authState?.tempPhone) setPhone(authState.tempPhone);
  }, [authState, phone]);

  const validators = {
    fullName: (v) => typeof v === "string" && v.trim().length >= 3 && /^[a-zA-Z\s]+$/.test(v),
    phone: (v) => /^[6-9]\d{9}$/.test(v),
    email: (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
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
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase())),
  };

  const validateStep1 = () => {
    const e = {};
    if (!validators.fullName(fullName)) e.fullName = "Full name must be at least 3 letters (alphabets only).";
    if (!validators.phone(phone)) e.phone = "Enter a valid 10-digit Indian mobile.";
    if (!validators.email(email)) e.email = "Email is required and must be valid.";
    setErrorMap(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!validators.businessName(businessName)) e.businessName = "Business name is required.";
    if (!validators.businessType(businessType)) e.businessType = "Select a business type.";
    if (!validators.street(street)) e.street = "Street is required.";
    if (!validators.city(city)) e.city = "City is required.";
    if (!validators.stateVal(stateVal)) e.stateVal = "State is required.";
    if (!validators.pincode(pincode)) e.pincode = "Pincode must be 6 digits.";
    if (!validators.gstNumber(gstNumber)) e.gstNumber = "Invalid GST number format.";
    setErrorMap(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    setGlobalError("");
    if (step === 0 && validateStep1()) setStep(1);
  };
  const goBack = () => { setGlobalError(""); setStep((s) => Math.max(0, s - 1)); };

  const handleAcceptTerms = () => { setTermsAccepted(true); setTermsOpen(false); };

  const handleSubmit = async () => {
    setGlobalError("");
    if (!validateStep2()) return;
    if (!termsAccepted) { setTermsOpen(true); return; }

    const formData = new FormData();
    formData.append("storeData[name]", businessName);
    formData.append("storeData[type]", businessType);
    formData.append("storeData[email]", email);
    formData.append("storeData[address][street]", street);
    formData.append("storeData[address][city]", city);
    formData.append("storeData[address][state]", stateVal);
    formData.append("storeData[address][postalCode]", pincode);
    formData.append("storeData[address][country]", "IN");
    if (hasGst && gstNumber) formData.append("storeData[gstNumber]", gstNumber.toUpperCase());

    formData.append("userData[phone]", phone);
    formData.append("userData[name]", fullName);
    formData.append("userData[email]", email);

    setIsLoading(true);
    try {
      const res = await completeRegistration(formData);
      if (res?.success) {
        router.push("/dashboard");
      } else {
        setGlobalError(res?.message || "Registration failed");
      }
    } catch (err) {
      setGlobalError(err?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navigation noLanding={true} />

      <div className={`${currentTheme.background} min-h-[calc(100vh-64px)] py-6 px-4 flex items-center justify-center`}>
        <div className="w-full max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-lg shadow-blue-500/20 bg-white ring-1 ring-slate-200/70 overflow-hidden relative">
              <Image
                src="/images/Tapplogo.png"
                alt="AMDAANI logo"
                fill
                className="object-contain p-2"
                sizes="56px"
                priority
              />
            </div>
            <h1 className={`text-xl md:text-2xl font-extrabold ${currentTheme.text}`}>Create your business account</h1>
            <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>
              Set up AMDAANI — fast, secure and professional billing
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        done
                          ? "bg-blue-500 text-white"
                          : active
                          ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                          : `${currentTheme.surfaceVariant} ${currentTheme.textSecondary}`
                      }`}
                    >
                      {done ? <Check className="w-4.5 h-4.5" /> : <Icon className="w-4.5 h-4.5" />}
                    </div>
                    <span className={`text-xs font-medium ${active ? currentTheme.text : currentTheme.textSecondary}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-16 md:w-24 h-1 rounded-full ${done ? "bg-blue-500" : currentTheme.surfaceVariant}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className={`rounded-3xl p-5 md:p-7 ${currentTheme.surface} border ${currentTheme.outline} shadow-xl`}>
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <Field label="Full Name" required error={errorMap.fullName} icon={User}>
                    <TextField theme={currentTheme} value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma" icon={User} error={errorMap.fullName} />
                  </Field>

                  <Field label="Phone Number" required error={errorMap.phone} icon={Phone}>
                    <TextField theme={currentTheme} value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      maxLength={10} placeholder="9876543210" icon={Phone} error={errorMap.phone}
                      readOnly={!!phoneFromQuery} />
                  </Field>

                  <Field label="Email Address" required error={errorMap.email} icon={Mail}>
                    <TextField theme={currentTheme} value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" type="email" icon={Mail} error={errorMap.email} />
                  </Field>

                  {globalError && <p className="text-sm text-red-500">{globalError}</p>}

                  <div className="flex justify-end gap-3 pt-1">
                    <Button variant="ghost" onClick={() => router.push("/auth")} className="h-11 px-5 rounded-xl cursor-pointer">
                      Cancel
                    </Button>
                    <Button
                      onClick={goNext}
                      className={`h-11 px-7 rounded-xl text-base font-semibold cursor-pointer ${currentTheme.buttonPrimary} flex items-center gap-2`}
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <Field label="Business Name" required error={errorMap.businessName} icon={Building2}>
                    <TextField theme={currentTheme} value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. FreshMart Pvt Ltd" icon={Building2} error={errorMap.businessName} />
                  </Field>

                  <Field label="Business Type" required error={errorMap.businessType} icon={Building2}>
                    <PickerButton theme={currentTheme} icon={Building2} value={businessType}
                      placeholder="Select business type" error={errorMap.businessType}
                      onClick={() => setBusinessTypeOpen(true)} />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Street Address" required error={errorMap.street} icon={MapPin}>
                      <TextField theme={currentTheme} value={street} onChange={(e) => setStreet(e.target.value)}
                        placeholder="123 MG Road" icon={MapPin} error={errorMap.street} />
                    </Field>
                    <Field label="City" required error={errorMap.city} icon={MapPin}>
                      <TextField theme={currentTheme} value={city} onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai" icon={MapPin} error={errorMap.city} />
                    </Field>
                    <Field label="State" required error={errorMap.stateVal} icon={MapPin}>
                      <PickerButton theme={currentTheme} icon={MapPin} value={stateVal}
                        placeholder="Select state" error={errorMap.stateVal}
                        onClick={() => setStateOpen(true)} />
                    </Field>
                    <Field label="Pincode" required error={errorMap.pincode} icon={Hash}>
                      <TextField theme={currentTheme} value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                        maxLength={6} placeholder="400001" icon={Hash} error={errorMap.pincode} />
                    </Field>
                  </div>

                  {/* GSTIN toggle */}
                  <div className={`rounded-2xl border ${currentTheme.outline} p-3.5`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${currentTheme.text}`}>Do you have a GSTIN?</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setHasGst(true)}
                          className={`px-5 h-8 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                            hasGst ? "bg-blue-500 text-white" : `${currentTheme.surfaceVariant} ${currentTheme.textSecondary}`
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => { setHasGst(false); setGstNumber(""); }}
                          className={`px-5 h-8 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                            !hasGst ? "bg-blue-500 text-white" : `${currentTheme.surfaceVariant} ${currentTheme.textSecondary}`
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {hasGst && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3"
                        >
                          <TextField theme={currentTheme} value={gstNumber}
                            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                            placeholder="22AAAAA0000A1Z5" error={errorMap.gstNumber} maxLength={15} />
                          {errorMap.gstNumber && <p className="text-xs text-red-500 mt-1.5">{errorMap.gstNumber}</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Terms row */}
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className={`w-full flex items-center justify-between rounded-2xl border ${currentTheme.outline} p-3.5 text-left hover:border-blue-500/50 transition-colors cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border-2 ${
                        termsAccepted ? "bg-blue-500 border-blue-500" : `${currentTheme.outline}`
                      }`}>
                        {termsAccepted && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${currentTheme.text}`}>
                        I agree to the Terms &amp; Conditions
                      </span>
                    </div>
                    <span className="text-xs text-blue-500 font-semibold">Read</span>
                  </button>

                  {globalError && <p className="text-sm text-red-500">{globalError}</p>}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button variant="ghost" onClick={goBack} className="h-11 px-5 rounded-xl flex items-center gap-2 cursor-pointer">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className={`h-11 px-7 rounded-xl text-base font-semibold cursor-pointer ${currentTheme.buttonPrimary} flex items-center gap-2`}
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className={`text-center text-xs mt-4 ${currentTheme.textSecondary}`}>
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline cursor-pointer">Terms</a> and{" "}
            <a href="/privacy" className="underline cursor-pointer">Privacy Policy</a>.
          </p>
        </div>
      </div>

      <PickerModal
        open={businessTypeOpen}
        onClose={() => setBusinessTypeOpen(false)}
        title="Select Business Type"
        items={BUSINESS_TYPES}
        value={businessType}
        onSelect={setBusinessType}
        searchPlaceholder="Search business types..."
      />
      <PickerModal
        open={stateOpen}
        onClose={() => setStateOpen(false)}
        title="Select State"
        items={INDIAN_STATES}
        value={stateVal}
        onSelect={setStateVal}
        searchPlaceholder="Search states..."
      />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} onAccept={handleAcceptTerms} />
    </>
  );
}
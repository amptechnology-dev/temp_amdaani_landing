"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sun,
  Moon,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Users,
  History,
  Repeat,
  Check,
  Plus,
  Loader2,
  X,
  ArrowLeft,
  Store as StoreIcon,
  Building2,
  MapPin,
  Hash,
  Search,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getPageInfo } from "../../src/lib/navigation";

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

const VIEW_LIST = "LIST";
const VIEW_CREATE = "CREATE";

/* ---------------- small building blocks (same style as registration page) ---------------- */
function Field({ label, required, error, icon: Icon, children }) {
  return (
    <div className="w-full">
      <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 opacity-60" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1 ml-0.5">{error}</p>}
    </div>
  );
}

function TextField({ value, onChange, placeholder, error, icon: Icon, theme, ...rest }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-45 pointer-events-none" />
      )}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-10 ${Icon ? "pl-9" : "pl-3.5"} pr-3.5 rounded-xl border text-sm
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
      className={`w-full h-10 pl-9 pr-3.5 rounded-xl border text-left text-sm relative flex items-center cursor-pointer
        bg-black/[.015] dark:bg-white/5 ${theme.text}
        ${error ? "border-red-500" : theme.outline}
        hover:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all`}
    >
      <Icon className="absolute left-3 w-4 h-4 opacity-45" />
      <span className={`truncate ${value ? "" : "opacity-40"}`}>{value || placeholder}</span>
      <ChevronDown className="absolute right-3 w-4 h-4 opacity-40" />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[92vw] max-w-md max-h-[75vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden"
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

/* ---------------- Store Switch / Create Modal ---------------- */
function StoreSwitchModal({ open, onClose, theme }) {
  const { getMyStores, switchStore, createStore } = useAuth();

  const [view, setView] = useState(VIEW_LIST);
  const [stores, setStores] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState("");

  // create-store form state
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [hasGst, setHasGst] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);

  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [errorMap, setErrorMap] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setView(VIEW_LIST);
      setError("");
      fetchStores();
    }
  }, [open]);

  const fetchStores = async () => {
    setLoadingList(true);
    setError("");
    try {
      const res = await getMyStores();
      if (res.success) {
        setStores(res.data || []);
      } else {
        setError(res.message || "Failed to load stores");
      }
    } catch (err) {
      setError(err.message || "Failed to load stores");
    }
    setLoadingList(false);
  };

  const handleSwitch = async (storeId) => {
    setSwitchingId(storeId);
    setError("");
    try {
      const res = await switchStore(storeId);
      if (res.success) {
        onClose();
        window.location.reload();
      } else {
        setError(res.message || "Failed to switch store");
      }
    } catch (err) {
      setError(err.message || "Failed to switch store");
    }
    setSwitchingId(null);
  };

  const resetCreateForm = () => {
    setBusinessName("");
    setBusinessType("");
    setStreet("");
    setCity("");
    setStateVal("");
    setPincode("");
    setReferralCode("");
    setHasGst(false);
    setGstNumber("");
    setLogoFile(null);
    setSignatureFile(null);
    setErrorMap({});
  };

  const validateCreateForm = () => {
    const e = {};
    if (!businessName.trim() || businessName.trim().length < 2) e.businessName = "Business name is required.";
    if (!businessType.trim()) e.businessType = "Select a business type.";
    if (!street.trim()) e.street = "Street is required.";
    if (!city.trim()) e.city = "City is required.";
    if (!stateVal.trim()) e.stateVal = "State is required.";
    if (!/^\d{6}$/.test(pincode)) e.pincode = "Pincode must be 6 digits.";
    if (hasGst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.toUpperCase())) {
      e.gstNumber = "Invalid GST number format.";
    }
    setErrorMap(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateStore = async () => {
    if (!validateCreateForm()) return;

    setCreating(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", businessName);
      fd.append("type", businessType);
      fd.append("address[street]", street);
      fd.append("address[city]", city);
      fd.append("address[state]", stateVal);
      fd.append("address[postalCode]", pincode);
      if (referralCode) fd.append("usedReferralCode", referralCode);
      if (hasGst && gstNumber) fd.append("gstNumber", gstNumber.toUpperCase());
      if (logoFile) fd.append("logo", logoFile);
      if (signatureFile) fd.append("signature", signatureFile);

      const res = await createStore(fd);

      if (res.success) {
        resetCreateForm();
        setView(VIEW_LIST);
        fetchStores();
      } else {
        setError(res.message || "Failed to create store");
      }
    } catch (err) {
      setError(err.message || "Failed to create store");
    }
    setCreating(false);
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] cursor-pointer"
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-[92vw] max-w-lg max-h-[85vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.outline}`}>
          <div className="flex items-center gap-2">
            {view === VIEW_CREATE && (
              <button
                onClick={() => { setView(VIEW_LIST); resetCreateForm(); setError(""); }}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <ArrowLeft size={18} className={theme.text} />
              </button>
            )}
            <h3 className={`font-bold text-[15px] ${theme.text}`}>
              {view === VIEW_LIST ? "Switch Store" : "Create New Store"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X size={18} className={theme.text} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {view === VIEW_LIST && (
            <>
              {loadingList ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                </div>
              ) : (
                <div className="space-y-2">
                  {stores.map((store) => (
                    <div
                      key={store.storeId}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${theme.outline} ${theme.surface}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                        {store.logoUrl ? (
                          <Image src={store.logoUrl} alt={store.name} fill className="object-contain" />
                        ) : (
                          <StoreIcon size={18} className="opacity-40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${theme.text}`}>{store.name}</p>
                          {store.isDefault && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className={`text-xs capitalize truncate ${theme.textSecondary}`}>
                          {store.type} • {store.role}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSwitch(store.storeId)}
                        disabled={switchingId === store.storeId}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {switchingId === store.storeId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Switch"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}

              <button
                onClick={() => setView(VIEW_CREATE)}
                className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed ${theme.outline} ${theme.textSecondary} hover:${theme.text} transition-colors cursor-pointer text-sm font-semibold`}
              >
                <Plus size={16} /> Create New Store
              </button>
            </>
          )}

          {view === VIEW_CREATE && (
            <div className="space-y-3.5">
              <Field label="Business Name" required error={errorMap.businessName} icon={Building2}>
                <TextField theme={theme} value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. FreshMart Pvt Ltd" icon={Building2} error={errorMap.businessName} />
              </Field>

              <Field label="Business Type" required error={errorMap.businessType} icon={Building2}>
                <PickerButton theme={theme} icon={Building2} value={businessType}
                  placeholder="Select business type" error={errorMap.businessType}
                  onClick={() => setBusinessTypeOpen(true)} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Street Address" required error={errorMap.street} icon={MapPin}>
                  <TextField theme={theme} value={street} onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 MG Road" icon={MapPin} error={errorMap.street} />
                </Field>
                <Field label="City" required error={errorMap.city} icon={MapPin}>
                  <TextField theme={theme} value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai" icon={MapPin} error={errorMap.city} />
                </Field>
                <Field label="State" required error={errorMap.stateVal} icon={MapPin}>
                  <PickerButton theme={theme} icon={MapPin} value={stateVal}
                    placeholder="Select state" error={errorMap.stateVal}
                    onClick={() => setStateOpen(true)} />
                </Field>
                <Field label="Pincode" required error={errorMap.pincode} icon={Hash}>
                  <TextField theme={theme} value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    maxLength={6} placeholder="400001" icon={Hash} error={errorMap.pincode} />
                </Field>
              </div>

              <Field label="Referral Code">
                <TextField theme={theme} value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Optional" />
              </Field>

              {/* GSTIN toggle */}
              <div className={`rounded-2xl border ${theme.outline} p-3.5`}>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${theme.text}`}>Do you have a GSTIN?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHasGst(true)}
                      className={`px-5 h-8 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                        hasGst ? "bg-blue-500 text-white" : `${theme.surfaceVariant} ${theme.textSecondary}`
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => { setHasGst(false); setGstNumber(""); }}
                      className={`px-5 h-8 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                        !hasGst ? "bg-blue-500 text-white" : `${theme.surfaceVariant} ${theme.textSecondary}`
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
                      <TextField theme={theme} value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        placeholder="22AAAAA0000A1Z5" error={errorMap.gstNumber} maxLength={15} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${theme.text}`}>Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className={`mt-1 w-full text-xs ${theme.textSecondary}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${theme.text}`}>Signature</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                    className={`mt-1 w-full text-xs ${theme.textSecondary}`}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                onClick={handleCreateStore}
                disabled={creating}
                className={`w-full h-11 text-sm font-semibold rounded-xl cursor-pointer ${theme.buttonPrimary} ${creating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {creating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>) : "Create Store"}
              </Button>
            </div>
          )}
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
    </>
  );
}

/* ==================================================================== */

export default function Topbar({ theme, pageTitle }) {
  const { theme: currentTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Resolve title/parent dynamically from the current route.
  // If a `pageTitle` prop is explicitly passed, it takes priority (manual override).
  const { title: derivedTitle, parent } = getPageInfo(pathname);
  const activeTitle = pageTitle || derivedTitle;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showStoreSwitch, setShowStoreSwitch] = useState(false);

  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setShowUserMenu(false);
    router.push("/dashboard/profile");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setShowUserMenu(false);
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 ${theme.surface} border-b ${theme.outline}`}
    >
      <div className="px-5 md:px-7 h-16 flex items-center justify-between gap-4">
        {/* Left: sidebar trigger + breadcrumb / page title */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger
            className={`${theme.buttonTertiary} p-2 rounded-lg border ${theme.outline} shrink-0 cursor-pointer`}
          />

          <div className="hidden md:block h-6 w-px bg-slate-200 mx-1" />

          <div className="hidden md:flex flex-col justify-center min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/dashboard"
                    className={`text-[12px] font-medium ${theme.textSecondary} hover:${theme.text} transition-colors cursor-pointer`}
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>

                {/* Optional middle crumb, e.g. "Reports" for report sub-pages */}
                {parent && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <span
                        className={`text-[12px] font-medium ${theme.textSecondary}`}
                      >
                        {parent}
                      </span>
                    </BreadcrumbItem>
                  </>
                )}

                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <span
                    className={`text-[12px] font-medium ${theme.textSecondary}`}
                  >
                    {activeTitle}
                  </span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1
              className={`text-[15px] font-bold ${theme.text} leading-tight truncate mt-0.5`}
            >
              {activeTitle}
            </h1>
          </div>

          {/* Mobile page title */}
          <h1
            className={`md:hidden text-[15px] font-bold ${theme.text} truncate`}
          >
            {activeTitle}
          </h1>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer`}
            aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
          >
            {currentTheme === "light" ? (
              <Moon size={18} className={theme.text} />
            ) : (
              <Sun size={18} className={theme.text} />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} relative transition-colors cursor-pointer`}
              aria-label="Notifications"
            >
              <Bell size={18} className={theme.text} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className={`absolute right-0 mt-2 w-80 ${theme.card} rounded-xl shadow-xl border ${theme.outline} py-2 z-50`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${theme.outline} flex items-center justify-between`}
                >
                  <h3 className={`${theme.text} font-semibold text-[13.5px]`}>
                    Notifications
                  </h3>
                  {notifications.length > 0 && (
                    <span className="text-[11px] font-medium text-blue-600 cursor-pointer">
                      Mark all read
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className={`${theme.textSecondary} text-[13px]`}>
                      No new notifications
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {/* Notification items would go here */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => router.push("/dashboard/settings")}
            className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer hidden sm:flex items-center justify-center`}
            aria-label="Settings"
          >
            <Settings size={18} className={theme.text} />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer`}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0 ring-1 ring-blue-700/10">
                <User size={15} className="text-white" strokeWidth={2.25} />
              </div>
              <span
                className={`hidden md:inline ${theme.text} font-semibold text-[13px]`}
              >
                {user?.name || "User"}
              </span>
              <ChevronDown
                size={14}
                className={`${theme.textSecondary} transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-52 ${theme.card} rounded-xl shadow-xl border ${theme.outline} py-1.5 z-50`}
              >
                <div className={`px-3.5 py-2 border-b ${theme.outline} mb-1`}>
                  <p
                    className={`${theme.text} font-semibold text-[13px] truncate`}
                  >
                    {user?.name || "User"}
                  </p>
                  <p
                    className={`${theme.textSecondary} text-[11.5px] truncate`}
                  >
                    {user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={handleProfileClick}
                  className={`w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:${theme.surfaceVariant} ${theme.text} text-[13px] font-medium transition-colors cursor-pointer`}
                >
                  <User size={15} className={theme.textSecondary} />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowStoreSwitch(true);
                  }}
                  className={`w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:${theme.surfaceVariant} ${theme.text} text-[13px] font-medium transition-colors cursor-pointer`}
                >
                  <Repeat size={15} className={theme.textSecondary} />
                  Switch Store
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/dashboard/users");
                  }}
                  className={`w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:${theme.surfaceVariant} ${theme.text} text-[13px] font-medium transition-colors cursor-pointer`}
                >
                  <Users size={15} className={theme.textSecondary} />
                  Manage Staff
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/dashboard/user-activity");
                  }}
                  className={`w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:${theme.surfaceVariant} ${theme.text} text-[13px] font-medium transition-colors cursor-pointer`}
                >
                  <History size={15} className={theme.textSecondary} />
                  Login Activities
                </button>
                <div
                  className={`h-px ${theme.outline} bg-current opacity-30 mx-1 my-1`}
                />
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:bg-red-50 text-red-600 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <LogOut size={15} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showStoreSwitch && (
          <StoreSwitchModal
            open={showStoreSwitch}
            onClose={() => setShowStoreSwitch(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
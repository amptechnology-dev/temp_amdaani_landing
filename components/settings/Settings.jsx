"use client";

import { useState } from "react";
import {
  Package,
  ShoppingCart,
  ClipboardList,
  MailIcon,
  Phone,
  Bot,
  Loader2,
  X,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

// ---------------- Reusable UI bits ----------------

function Switch({ checked, onChange, disabled, loading }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled || loading}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 flex items-center justify-center ${
        checked ? "bg-blue-600" : "bg-slate-200"
      } ${disabled || loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin text-white" />
      ) : (
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      )}
    </button>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  right,
  clickable,
  onClick,
}) {
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 text-left group ${
        clickable ? "hover:bg-slate-50 transition-colors cursor-pointer" : ""
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
        <Icon size={16.5} className="text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-slate-800 leading-tight">
          {title}
        </p>
        {description && (
          <p className="text-[12px] text-slate-500 mt-0.5 truncate leading-tight">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{right}</div>
    </Wrapper>
  );
}

function Modal({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-[16px] text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>
        {subtitle && (
          <p className="text-[13px] text-slate-500 mb-4">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden h-fit">
      <div className="px-4.5 pt-3 pb-2.5 border-b border-slate-100">
        <h2 className="text-[13px] font-bold text-slate-800 leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-[11.5px] text-slate-400 mt-0.5 leading-tight">
            {description}
          </p>
        )}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

// ---------------- Main component ----------------

export default function Settings() {
  const {
    authState,
    isStockEnabled,
    isPurchaseOrderEnabled,
    isMrpEnabled,
    fetchUserProfile,
    hasPermission,
    permissions,
    updateAuthState,
  } = useAuth();

  const appVersion = "1.0.0";

  const getCurrentEmail = () =>
    authState?.user?.email ||
    authState?.user?.store?.email ||
    authState?.user?.store?.contact?.email ||
    "";
  const getCurrentPhone = () => authState?.user?.phone || "";

  // ── Toggles ──
  const [stockLoading, setStockLoading] = useState(false);
  const [poLoading, setPoLoading] = useState(false);
  const [mrpLoading, setMrpLoading] = useState(false);

  const updateStoreSettings = async (patch, successMsg, setLoading) => {
    try {
      setLoading(true);
      const response = await api.put("/store/update-my-store", {
        settings: {
          stockManagement: isStockEnabled,
          purchaseOrderManagement: isPurchaseOrderEnabled,
          mrpManagement: isMrpEnabled,
          ...patch,
        },
      });
      if (response?.success) {
        showToast("success", successMsg);
        await fetchUserProfile();
      } else {
        showToast("error", response?.message || "Failed to update settings");
      }
    } catch {
      showToast("error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStockToggle = () =>
    updateStoreSettings(
      { stockManagement: !isStockEnabled },
      `Stock management ${!isStockEnabled ? "enabled" : "disabled"}`,
      setStockLoading,
    );

  const handlePurchaseOrderToggle = () =>
    updateStoreSettings(
      { purchaseOrderManagement: !isPurchaseOrderEnabled },
      `Purchase management ${!isPurchaseOrderEnabled ? "enabled" : "disabled"}`,
      setPoLoading,
    );

  const handleMrpToggle = () =>
    updateStoreSettings(
      { mrpManagement: !isMrpEnabled },
      `MRP management ${!isMrpEnabled ? "enabled" : "disabled"}`,
      setMrpLoading,
    );

  // ── Toast ──
  const [toast, setToast] = useState(null);
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Change Email Modal ──
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const openEmailModal = () => {
    setNewEmail(getCurrentEmail());
    setEmailModalOpen(true);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail?.trim()) return showToast("error", "Email is required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim()))
      return showToast("error", "Enter a valid email address");

    try {
      setEmailLoading(true);
      const res = await api.post("/auth/phone-change-email/update-email", {
        email: newEmail.trim(),
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to update email");

      await updateAuthState({
        ...authState,
        user: { ...authState.user, email: newEmail.trim() },
      });
      showToast("success", "Email updated successfully");
      setEmailModalOpen(false);
    } catch (error) {
      showToast("error", error?.message || "Could not update email");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Change Phone Modal ──
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  const openPhoneModal = () => {
    setNewPhone(getCurrentPhone());
    setPhoneModalOpen(true);
  };

  const handleUpdatePhone = async () => {
    if (!newPhone?.trim())
      return showToast("error", "Phone number is required");

    try {
      setPhoneLoading(true);
      const res = await api.post("/auth/phone-change-phone/update-phone", {
        number: newPhone.trim(),
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to update phone");

      await updateAuthState({
        ...authState,
        user: { ...authState.user, phone: newPhone.trim() },
      });
      showToast("success", "Phone number updated successfully");
      setPhoneModalOpen(false);
    } catch (error) {
      showToast("error", error?.message || "Could not update phone number");
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Agent Code Modal ──
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [agentCode, setAgentCode] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);

  const handleAssignAgentCode = async () => {
    if (!agentCode?.trim()) return showToast("error", "Agent code is required");

    try {
      setAgentLoading(true);
      const res = await api.patch("/auth/assign-agent-code", {
        agentCode: agentCode.trim(),
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to assign agent code");

      showToast("success", "Agent code assigned successfully");
      setAgentModalOpen(false);
      setAgentCode("");
    } catch (error) {
      showToast("error", error?.message || "Could not assign agent code");
    } finally {
      setAgentLoading(false);
    }
  };

  const canManageSettings = hasPermission?.(permissions?.CAN_MANAGE_SETTINGS);

  return (
    <div className="h-full bg-slate-50/50 overflow-hidden">
      <div className="px-6 md:px-8 py-5 max-w-6xl mx-auto h-full flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <SettingsIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
              Settings
            </h1>
            <p className="text-[12.5px] text-slate-500 leading-tight">
              Manage your business and account preferences
            </p>
          </div>
        </div>

        {/* ── Grid layout: two columns on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5 items-start">
          {/* ── Business Preferences ── */}
          {canManageSettings && (
            <SectionCard
              title="Business Preferences"
              description="Turn business modules on or off"
            >
              <SettingsRow
                icon={Package}
                title="Stock Management"
                description="Enable inventory tracking and stock adjustments"
                right={
                  <Switch
                    checked={isStockEnabled}
                    onChange={handleStockToggle}
                    loading={stockLoading}
                  />
                }
              />
              <SettingsRow
                icon={ShoppingCart}
                title="Purchase Management"
                description="Enable purchase order features"
                right={
                  <Switch
                    checked={isPurchaseOrderEnabled}
                    onChange={handlePurchaseOrderToggle}
                    loading={poLoading}
                  />
                }
              />
              <SettingsRow
                icon={ClipboardList}
                title="MRP Management"
                description="Enable material requirement planning features"
                right={
                  <Switch
                    checked={isMrpEnabled}
                    onChange={handleMrpToggle}
                    loading={mrpLoading}
                  />
                }
              />
            </SectionCard>
          )}

          {/* ── Account ── */}
          <SectionCard
            title="Account"
            description="Update your login credentials"
          >
            <SettingsRow
              icon={MailIcon}
              title="Change Email"
              description={getCurrentEmail() || "Update your email address"}
              clickable
              onClick={openEmailModal}
              right={<ChevronRight size={16} className="text-slate-300" />}
            />
            <SettingsRow
              icon={Phone}
              title="Change Phone Number"
              description={getCurrentPhone() || "Update your phone number"}
              clickable
              onClick={openPhoneModal}
              right={<ChevronRight size={16} className="text-slate-300" />}
            />
          </SectionCard>

          {/* ── About ── */}
          <SectionCard title="About" description="Account linking and app info">
            <SettingsRow
              icon={Bot}
              title="Agent Code"
              description="Add your Agent ID to connect your account"
              clickable
              onClick={() => setAgentModalOpen(true)}
              right={<ChevronRight size={16} className="text-slate-300" />}
            />
          </SectionCard>
        </div>
      </div>

      {/* ── Change Email Modal ── */}
      <Modal
        open={emailModalOpen}
        onClose={() => !emailLoading && setEmailModalOpen(false)}
        title="Change Email"
        subtitle="Update your email address below"
      >
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={emailLoading}
          placeholder="Email Address"
          className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEmailModalOpen(false)}
            disabled={emailLoading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateEmail}
            disabled={emailLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {emailLoading && <Loader2 size={14} className="animate-spin" />}
            Update Email
          </button>
        </div>
      </Modal>

      {/* ── Change Phone Modal ── */}
      <Modal
        open={phoneModalOpen}
        onClose={() => !phoneLoading && setPhoneModalOpen(false)}
        title="Change Phone Number"
        subtitle="Update your phone number below"
      >
        <input
          type="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          disabled={phoneLoading}
          placeholder="Phone Number"
          className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setPhoneModalOpen(false)}
            disabled={phoneLoading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdatePhone}
            disabled={phoneLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {phoneLoading && <Loader2 size={14} className="animate-spin" />}
            Update Number
          </button>
        </div>
      </Modal>

      {/* ── Agent Code Modal ── */}
      <Modal
        open={agentModalOpen}
        onClose={() => !agentLoading && setAgentModalOpen(false)}
        title="Add Agent Code"
        subtitle="Enter your agent code to connect your account"
      >
        <input
          type="text"
          value={agentCode}
          onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
          disabled={agentLoading}
          placeholder="Enter your agent code"
          className="w-full h-11 px-3.5 rounded-lg border border-slate-200 text-[13.5px] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setAgentModalOpen(false)}
            disabled={agentLoading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAssignAgentCode}
            disabled={agentLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {agentLoading && <Loader2 size={14} className="animate-spin" />}
            Assign Code
          </button>
        </div>
      </Modal>

      {/* ── Toast ── */}
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

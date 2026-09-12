"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Phone,
  User,
  Calendar,
  Hash,
  ShoppingBag,
  UserCircle2,
  Sparkles,
  FileText,
  MapPin,
  Building2,
  Locate,
  Plus,
  Percent,
  X,
  Trash2,
  Pencil,
  PackageSearch,
  Banknote,
  QrCode,
  CreditCard,
  Landmark,
  Receipt,
  MessageSquareText,
  ChevronRight,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import InvoiceSummary from "./InvoiceSummary";
import AddItemFormModal from "./AddItemFormModal";
import indianStatesData from "../../src/assets/data/states.json";

// -------------------------------
// Payment method options
// -------------------------------
const PAYMENT_OPTIONS = [
  { label: "Cash", value: "cash", icon: Banknote },
  { label: "UPI", value: "upi", icon: QrCode },
  { label: "Card", value: "card", icon: CreditCard },
  { label: "Bank Transfer", value: "bank_transfer", icon: Landmark },
  { label: "Cheque", value: "cheque", icon: Receipt },
];

const INDIAN_STATES = indianStatesData?.states || [];

const getReferenceLabel = (method) => {
  switch (method) {
    case "upi":
      return "UPI ID / Transaction Reference";
    case "card":
      return "Card Last 4 Digits / Transaction ID";
    case "bank_transfer":
      return "Bank Transaction / Reference No.";
    case "cheque":
      return "Cheque Number";
    default:
      return "Reference / Transaction ID";
  }
};

const getReferencePlaceholder = (method) => {
  switch (method) {
    case "upi":
      return "e.g., user@upi or TXN123456";
    case "card":
      return "e.g., 9876 or POS1234";
    case "bank_transfer":
      return "e.g., NEFT123456 or IMPS987654";
    case "cheque":
      return "e.g., CHQ123456";
    default:
      return "Enter reference number";
  }
};

function PaymentMethodDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const selected =
    PAYMENT_OPTIONS.find((p) => p.value === value) || PAYMENT_OPTIONS[0];
  const SelectedIcon = selected.icon;

  const updateCoords = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-full min-w-[170px] px-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-blue-300 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SelectedIcon className="w-4 h-4 text-blue-600" />
          {selected.label}
        </span>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                  {isSelected && (
                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

function PaymentMethodModal({
  open,
  onClose,
  paymentMethod,
  setPaymentMethod,
  paymentNote,
  setPaymentNote,
  paidAmount,
  setPaidAmount,
  grandTotal,
  hasCustomer,
  onRequireCustomer,
}) {
  const [localMethod, setLocalMethod] = useState(paymentMethod || "cash");
  const [localNote, setLocalNote] = useState(paymentNote || "");
  const [localPaidType, setLocalPaidType] = useState("full");
  const [localPaidAmount, setLocalPaidAmount] = useState("");

  useEffect(() => {
    if (!open) return;
    setLocalMethod(paymentMethod || "cash");
    setLocalNote(paymentNote || "");
    const isPartial =
      Number(paidAmount || 0) > 0 && Number(paidAmount || 0) < grandTotal;
    setLocalPaidType(isPartial && hasCustomer ? "partial" : "full");
    setLocalPaidAmount(isPartial && hasCustomer ? String(paidAmount) : "");
  }, [open, paymentMethod, paymentNote, paidAmount, grandTotal, hasCustomer]);

  if (!open) return null;

  const handlePaidAmountChange = (e) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    setLocalPaidAmount(v);
  };

  const due = Math.max(
    grandTotal -
      (localPaidType === "full" ? grandTotal : Number(localPaidAmount || 0)),
    0,
  );

  const handleDone = () => {
    setPaymentMethod(localMethod);
    setPaymentNote(localMethod === "cash" ? "" : localNote.trim());
    const effectivePaidType = hasCustomer ? localPaidType : "full";
    setPaidAmount(
      effectivePaidType === "full"
        ? grandTotal
        : Math.min(Number(localPaidAmount || 0), grandTotal),
    );
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-semibold text-slate-800">
            Select Payment Method
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className="space-y-1">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = localMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setLocalMethod(opt.value);
                    if (opt.value === "cash") setLocalNote("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                    selected
                      ? "border-blue-300 bg-blue-50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      selected ? "text-blue-600" : "text-slate-400"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      selected
                        ? "font-semibold text-blue-700"
                        : "text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>

          {localMethod !== "cash" && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                {getReferenceLabel(localMethod)}
              </label>
              <input
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder={getReferencePlaceholder(localMethod)}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalPaidType("full")}
                className={`h-9 rounded-lg text-xs font-semibold border transition-colors ${
                  localPaidType === "full"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Full Paid
              </button>
              <button
                type="button"
                onClick={() => {
                  // POPUP instead of disabled: click still works, but
                  // if there's no customer we intercept and show the modal.
                  if (!hasCustomer) {
                    onRequireCustomer?.();
                    return;
                  }
                  setLocalPaidType("partial");
                }}
                className={`h-9 rounded-lg text-xs font-semibold border transition-colors ${
                  localPaidType === "partial"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Partial Payment
              </button>
            </div>

            {localPaidType === "partial" && hasCustomer && (
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Amount Paid Now
                </label>
                <input
                  value={localPaidAmount}
                  onChange={handlePaidAmountChange}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
                />
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-400">
                    Grand Total: ₹{grandTotal.toFixed(2)}
                  </span>
                  <span className="font-semibold text-rose-500">
                    Due: ₹{due.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// -------------------------------
// Remarks modal
// -------------------------------
function RemarksModal({ open, onClose, remarks, setRemarks }) {
  const [localRemarks, setLocalRemarks] = useState(remarks || "");

  useEffect(() => {
    if (open) setLocalRemarks(remarks || "");
  }, [open, remarks]);

  if (!open) return null;

  const handleSave = () => {
    setRemarks(localRemarks.trim());
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">
            Invoice Remarks
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={localRemarks}
            onChange={(e) => setLocalRemarks(e.target.value)}
            rows={5}
            placeholder="Add any notes for this invoice…"
            className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white resize-none"
          />
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            Save Remarks
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// -------------------------------
// NEW: Customer-required modal — replaces disabled-field / silent
// validation whenever partial payment is attempted without a customer.
// -------------------------------
function CustomerRequiredModal({ open, onClose }) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
          <User className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1.5">
          Customer Required
        </h3>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          For partial payments, you need to select or add a customer first.
          Please fill in the customer details before proceeding with a partial
          payment.
        </p>
        <Button
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-sm h-10"
        >
          Okay, Got it
        </Button>
      </div>
    </div>,
    document.body,
  );
}

// -------------------------------
// Inline product combobox for the "add row"
// -------------------------------
function InlineProductCombobox({ products, onSelect, onCreateNew }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);

  const updateCoords = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 15);
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.hsn?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q),
      )
      .slice(0, 15);
  })();

  const exactMatch = products.some(
    (p) => p.name?.toLowerCase().trim() === query.trim().toLowerCase(),
  );

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, open]);

  useEffect(() => {
    if (highlightIndex >= 0 && itemRefs.current[highlightIndex]) {
      itemRefs.current[highlightIndex].scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const pick = (product) => {
    onSelect(product);
    setQuery("");
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleCreateNew = () => {
    onCreateNew(query.trim());
    setQuery("");
    setOpen(false);
    setHighlightIndex(-1);
  };

  const showCreateRow = query.trim() && !exactMatch;
  const totalRows = filtered.length + (showCreateRow ? 1 : 0);

  const handleKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 >= totalRows ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 < 0 ? totalRows - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex === -1) return;
      if (highlightIndex < filtered.length) {
        pick(filtered[highlightIndex]);
      } else if (showCreateRow) {
        handleCreateNew();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <PackageSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or add a product…"
          className="w-full max-w-[240px] h-9 pl-8 pr-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-colors"
        />
      </div>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto"
          >
            {filtered.map((p, idx) => (
              <div
                key={p._id}
                ref={(el) => (itemRefs.current[idx] = el)}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => pick(p)}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                  highlightIndex === idx ? "bg-blue-50" : "hover:bg-blue-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    HSN: {p.hsn || "-"} · {p.unit || "Pcs"}
                  </p>
                </div>
                <span className="text-blue-600 font-semibold text-xs shrink-0 ml-2">
                  ₹{Number(p.sellingPrice ?? 0).toFixed(2)}
                </span>
              </div>
            ))}

            {filtered.length === 0 && !query.trim() && (
              <p className="text-xs text-slate-400 text-center py-4">
                Start typing to search products
              </p>
            )}

            {showCreateRow && (
              <button
                type="button"
                ref={(el) => (itemRefs.current[filtered.length] = el)}
                onMouseEnter={() => setHighlightIndex(filtered.length)}
                onClick={handleCreateNew}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 border-t border-slate-100 ${
                  highlightIndex === filtered.length
                    ? "bg-blue-50"
                    : "hover:bg-blue-50"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Create "{query.trim()}" as new product
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// -------------------------------
// Compact State selector
// -------------------------------
function CustomerStateSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return INDIAN_STATES;
    return INDIAN_STATES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.capital.toLowerCase().includes(q),
    );
  })();

  const handleSelect = (s) => {
    onChange(s.name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Landmark className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 pl-7 pr-2.5 text-sm text-left border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center"
      >
        <span className={value ? "text-slate-700" : "text-slate-400"}>
          {value || "State"}
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-hidden flex flex-col">
          <div className="p-1.5 border-b border-slate-100 shrink-0">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search state..."
              className="w-full h-8 px-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">
                No state found
              </p>
            ) : (
              filtered.map((s) => {
                const selected = value === s.name;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-sm cursor-pointer ${
                      selected
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {s.code}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const emptyCustomerForm = {
  name: "",
  mobile: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  gstNumber: "",
};

// Bigger, easier-to-read input style for the Customer Details form
const inputClass =
  "w-full h-9 pl-7 pr-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/60 focus:bg-white transition-colors";

export default function NewInvoiceFormPage({
  isLoading,
  isEditMode,
  invoiceNumber,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  cartItems,
  products = [],
  addToCart,
  setAllProducts,
  onBack,
  onInvoiceModalClose,
  discount,
  setDiscount,
  invoiceCalculations,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  paymentNote,
  setPaymentNote,
  remarks,
  setRemarks,
  payment,
  handleCreateInvoice,
  isSubmitting,
  formValues,
  storedata,
  isGstInvoice,
  isMrpEnabled = false,
  handleUpdateQuantity,
  handleUpdateItemField,
  handleRemoveItem,
  handleClearCart,
  additionalCharges = [],
  setAdditionalCharges,
  handleSaveAndContinue,
}) {
  // -------------------------------
  // Customer form state
  // -------------------------------
  const [customerForm, setCustomerForm] = useState(() => ({
    ...emptyCustomerForm,
    ...(selectedCustomer
      ? {
          name: selectedCustomer.name || "",
          mobile: selectedCustomer.mobile || "",
          address: selectedCustomer.address || "",
          city: selectedCustomer.city || "",
          state: selectedCustomer.state || "",
          postalCode: selectedCustomer.postalCode || "",
          gstNumber: selectedCustomer.gstNumber || "",
        }
      : {}),
  }));

  const [selectedCustomerId, setSelectedCustomerId] = useState(
    selectedCustomer?._id || "",
  );
  const [activeField, setActiveField] = useState(null);
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState(-1);
  const customerItemRefs = useRef([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemPrefillName, setNewItemPrefillName] = useState("");
  const customerGridRef = useRef(null);
  const [editingCartItem, setEditingCartItem] = useState(null);

  // Payment / Remarks modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  // NEW: "Customer Required" popup — shown instead of a disabled field
  const [showCustomerRequiredModal, setShowCustomerRequiredModal] =
    useState(false);

  // ---- Additional Charges + Quick Received Amount ----
  const [addingCharge, setAddingCharge] = useState(false);
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [quickReceivedAmount, setQuickReceivedAmount] = useState("");

  const handleAddCharge = () => {
    if (!chargeName.trim() || !chargeAmount || Number(chargeAmount) <= 0)
      return;
    setAdditionalCharges?.((prev) => [
      ...(prev || []),
      { id: Date.now(), name: chargeName.trim(), amount: Number(chargeAmount) },
    ]);
    setChargeName("");
    setChargeAmount("");
    setAddingCharge(false);
  };

  const handleRemoveCharge = (id) => {
    setAdditionalCharges?.((prev) => (prev || []).filter((c) => c.id !== id));
  };

  const handleQuickReceivedChange = (e) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    setQuickReceivedAmount(v);
  };

  const handleQuickReceivedBlur = () => {
    const cap = invoiceCalculations.netTotal || 0;
    const n = Math.min(Number(quickReceivedAmount) || 0, cap);
    setPaidAmount(n);
    setQuickReceivedAmount(n > 0 ? String(n) : "");
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        customerGridRef.current &&
        !customerGridRef.current.contains(e.target)
      ) {
        setActiveField(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const editSeededRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      editSeededRef.current = false;
      return;
    }

    if (isEditMode && !editSeededRef.current && selectedCustomer) {
      editSeededRef.current = true;

      setCustomerForm({
        name: selectedCustomer.name || "",
        mobile: selectedCustomer.mobile || "",
        address: selectedCustomer.address || "",
        city: selectedCustomer.city || "",
        state: selectedCustomer.state || "",
        postalCode: selectedCustomer.postalCode || "",
        gstNumber: selectedCustomer.gstNumber || "",
      });

      const matched = customers.find(
        (c) => c.mobile === selectedCustomer.mobile,
      );
      if (matched) setSelectedCustomerId(matched._id);
    }
  }, [isLoading, isEditMode, selectedCustomer, customers]);

  useEffect(() => {
    const hasData = customerForm.name || customerForm.mobile;
    setSelectedCustomer(
      hasData
        ? { _id: selectedCustomerId || undefined, ...customerForm }
        : { _id: undefined, name: "", mobile: "" },
    );
  }, [customerForm, selectedCustomerId]);

  const customerSuggestions = (() => {
    if (!activeField) return [];
    const q = (
      activeField === "mobile" ? customerForm.mobile : customerForm.name
    )
      .trim()
      .toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) => c.name?.toLowerCase().includes(q) || c.mobile?.includes(q))
      .slice(0, 8);
  })();

  useEffect(() => {
    setCustomerHighlightIndex(-1);
  }, [activeField, customerForm.mobile, customerForm.name]);

  useEffect(() => {
    if (
      customerHighlightIndex >= 0 &&
      customerItemRefs.current[customerHighlightIndex]
    ) {
      customerItemRefs.current[customerHighlightIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [customerHighlightIndex]);

  const pickCustomerSuggestion = (c) => {
    setSelectedCustomerId(c._id);
    setCustomerForm({
      name: c.name || "",
      mobile: c.mobile || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      postalCode: c.postalCode || "",
      gstNumber: c.gstNumber || "",
    });
    setActiveField(null);
    setCustomerHighlightIndex(-1);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerForm(emptyCustomerForm);
  };

  const updateField = (field) => (e) => {
    const v = e.target.value;
    setCustomerForm((prev) => ({ ...prev, [field]: v }));

    if (selectedCustomerId) {
      const matched = customers.find((c) => c._id === selectedCustomerId);
      if (matched && matched[field] !== v) setSelectedCustomerId("");
    }
  };

  const handleCustomerFieldKeyDown = (fieldName) => (e) => {
    const isOpen = activeField === fieldName && customerSuggestions.length > 0;

    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setActiveField(fieldName);
      return;
    }
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustomerHighlightIndex((prev) =>
        prev + 1 >= customerSuggestions.length ? 0 : prev + 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustomerHighlightIndex((prev) =>
        prev - 1 < 0 ? customerSuggestions.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        customerHighlightIndex >= 0 &&
        customerSuggestions[customerHighlightIndex]
      ) {
        pickCustomerSuggestion(customerSuggestions[customerHighlightIndex]);
      }
    } else if (e.key === "Escape") {
      setActiveField(null);
      setCustomerHighlightIndex(-1);
    }
  };

  const handleAddRow = (product) => {
    addToCart(product);
  };

  const handleCreateNewProduct = (typedName) => {
    setEditingCartItem(null);
    setNewItemPrefillName(typedName);
    setShowAddItemModal(true);
  };

  const handleNewProductCreated = (newItem) => {
    setAllProducts?.((prev) => [newItem, ...prev]);
    addToCart(newItem);
    setNewItemPrefillName("");
  };

  const handleCartItemUpdated = (updatedProduct) => {
    if (!editingCartItem || !updatedProduct) return;
    const cartItemId = editingCartItem._id;

    setAllProducts?.((prev) =>
      prev.map((p) => (p._id === updatedProduct._id ? updatedProduct : p)),
    );

    const productDiscountType =
      updatedProduct.discountType === "percentage" ? "percent" : "amount";
    const productDiscountValue =
      productDiscountType === "percent"
        ? Number(updatedProduct.discountPercentage || 0)
        : Number(updatedProduct.discountPrice || 0);

    handleUpdateItemField(cartItemId, "name", updatedProduct.name);
    handleUpdateItemField(
      cartItemId,
      "sellingPrice",
      Number(updatedProduct.sellingPrice || 0),
    );
    handleUpdateItemField(
      cartItemId,
      "gstRate",
      Number(updatedProduct.gstRate || 0),
    );
    handleUpdateItemField(
      cartItemId,
      "isTaxInclusive",
      Boolean(updatedProduct.isTaxInclusive),
    );
    handleUpdateItemField(cartItemId, "unit", updatedProduct.unit || "PCS");
    handleUpdateItemField(cartItemId, "hsn", updatedProduct.hsn || "");
    handleUpdateItemField(cartItemId, "mrp", Number(updatedProduct.mrp || 0));
    handleUpdateItemField(cartItemId, "discount", productDiscountValue);
    handleUpdateItemField(cartItemId, "discountType", productDiscountType);
  };

  const handleQtyChange = (id) => (e) => {
    const v = e.target.value.replace(/[^\d]/g, "");
    handleUpdateItemField(id, "qty", v);
  };
  const handleQtyBlur = (id) => (e) => {
    const n = parseInt(e.target.value, 10);
    handleUpdateItemField(id, "qty", isNaN(n) || n < 1 ? 1 : n);
  };

  const handleDecimalChange = (id, field) => (e) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    handleUpdateItemField(id, field, v);
  };
  const handleDecimalBlur = (id, field) => (e) => {
    const n = parseFloat(e.target.value);
    handleUpdateItemField(id, field, isNaN(n) ? 0 : n);
  };

  const handleDiscountBlur = (id, discountType) => (e) => {
    let n = parseFloat(e.target.value);
    if (isNaN(n) || n < 0) n = 0;
    if (discountType === "percent" && n > 100) n = 100;
    handleUpdateItemField(id, "discount", n);
  };

  const handleOrderDiscountChange = (e) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    setDiscount((prev) => ({ ...prev, value: v }));
  };

  const handleOrderDiscountBlur = (e) => {
    let n = parseFloat(e.target.value);
    if (isNaN(n) || n < 0) n = 0;
    if (discount.type === "percent" && n > 100) n = 100;
    setDiscount((prev) => ({ ...prev, value: n }));
  };

  const productDiscountTotal = cartItems.reduce((sum, item) => {
    const qty = Number(item.qty || 0);
    const perUnitDiscount = Number(item.discountInRupees ?? 0);
    return sum + perUnitDiscount * qty;
  }, 0);

  const displayGrandTotal = Number(invoiceCalculations.netTotal || 0);

  const gstTotals = Object.values(
    invoiceCalculations.gstBreakdown || {},
  ).reduce(
    (acc, g) => ({
      cgst: acc.cgst + (g.cgstAmount || 0),
      sgst: acc.sgst + (g.sgstAmount || 0),
      igst: acc.igst + (g.igstAmount || 0),
    }),
    { cgst: 0, sgst: 0, igst: 0 },
  );
  const hasIgst = gstTotals.igst > 0;

  const dueAmount = Math.max(displayGrandTotal - Number(paidAmount || 0), 0);

  // Whether a customer has actually been entered/selected
  const hasCustomer = Boolean(
    (customerForm.name && customerForm.name.trim()) ||
    (customerForm.mobile && customerForm.mobile.trim()),
  );

  // Safety net: if customer gets cleared while a partial payment was set,
  // force it back to full (prevents an invalid state).
  useEffect(() => {
    if (
      !hasCustomer &&
      Number(paidAmount) > 0 &&
      Number(paidAmount) < displayGrandTotal
    ) {
      setPaidAmount(displayGrandTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCustomer]);

  // NEW: guarded setter passed down to InvoiceSummary — blocks partial
  // amounts with the popup instead of silently clamping/erroring.
  const guardedSetPaidAmount = (nextValue) => {
    const n = Number(nextValue || 0);
    if (!hasCustomer && n > 0 && n < displayGrandTotal) {
      setShowCustomerRequiredModal(true);
      return;
    }
    setPaidAmount(nextValue);
  };

  const toggleOrderDiscountType = () => {
    setDiscount((prev) => ({
      ...prev,
      type: prev.type === "flat" ? "percent" : "flat",
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />
          <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="icon"
                onClick={onBack}
                className="rounded-full border-slate-200 hover:bg-slate-50 hover:border-slate-300 shrink-0 h-8 w-8"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {isEditMode ? "Edit Invoice" : "New Invoice"}
                  </h1>
                  {isEditMode && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs px-1.5 py-0">
                      Editing
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Add a customer and items to{" "}
                  {isEditMode ? "update" : "generate"} the invoice
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-sm text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {format(new Date(), "dd MMM yyyy")}
              </div>
              <div className="flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 rounded-full text-sm text-white font-semibold shadow-sm shadow-blue-200">
                <Hash className="w-3.5 h-3.5 text-blue-200" />
                {invoiceNumber || "Loading..."}
              </div>
            </div>
          </div>
        </div>

        {/* Customer */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-visible relative">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100 py-2 px-4 rounded-t-2xl">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <UserCircle2 className="w-3 h-3 text-white" />
                </span>
                Customer Details
              </span>
              {(customerForm.name || customerForm.mobile) && (
                <button
                  onClick={handleClearCustomer}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div
              ref={customerGridRef}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
            >
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                <input
                  value={customerForm.mobile}
                  onChange={updateField("mobile")}
                  onFocus={() => setActiveField("mobile")}
                  onKeyDown={handleCustomerFieldKeyDown("mobile")}
                  maxLength={10}
                  placeholder="Mobile *"
                  className={inputClass}
                />
                {activeField === "mobile" && customerSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {customerSuggestions.map((c, idx) => (
                      <div
                        key={c._id}
                        ref={(el) => (customerItemRefs.current[idx] = el)}
                        onMouseEnter={() => setCustomerHighlightIndex(idx)}
                        onClick={() => pickCustomerSuggestion(c)}
                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                          customerHighlightIndex === idx
                            ? "bg-blue-50"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {c.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-slate-400">{c.mobile}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                <input
                  value={customerForm.name}
                  onChange={updateField("name")}
                  onFocus={() => setActiveField("name")}
                  onKeyDown={handleCustomerFieldKeyDown("name")}
                  placeholder="Name"
                  className={inputClass}
                />
                {activeField === "name" && customerSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {customerSuggestions.map((c, idx) => (
                      <div
                        key={c._id}
                        ref={(el) => (customerItemRefs.current[idx] = el)}
                        onMouseEnter={() => setCustomerHighlightIndex(idx)}
                        onClick={() => pickCustomerSuggestion(c)}
                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                          customerHighlightIndex === idx
                            ? "bg-blue-50"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {c.name || "Unnamed"}
                          </p>
                          <p className="text-xs text-slate-400">{c.mobile}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={customerForm.gstNumber}
                  onChange={(e) =>
                    setCustomerForm((prev) => ({
                      ...prev,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="GSTIN (optional)"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={customerForm.address}
                  onChange={updateField("address")}
                  placeholder="Address"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={customerForm.city}
                  onChange={updateField("city")}
                  placeholder="City"
                  className={inputClass}
                />
              </div>

              <CustomerStateSelect
                value={customerForm.state}
                onChange={(v) => {
                  setCustomerForm((prev) => ({ ...prev, state: v }));
                  if (selectedCustomerId) {
                    const matched = customers.find(
                      (c) => c._id === selectedCustomerId,
                    );
                    if (matched && matched.state !== v)
                      setSelectedCustomerId("");
                  }
                }}
              />

              <div className="relative">
                <Locate className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={customerForm.postalCode}
                  onChange={updateField("postalCode")}
                  maxLength={6}
                  placeholder="Postal Code"
                  className={inputClass}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100 py-3 px-4">
            <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-700">
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <ShoppingBag className="w-3.5 h-3.5 text-white" />
                </span>
                Items
                {cartItems.length > 0 && (
                  <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-xs">
                    {invoiceCalculations.totalQuantity} qty
                  </Badge>
                )}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCartItem(null);
                  setNewItemPrefillName("");
                  setShowAddItemModal(true);
                }}
                className="h-8 rounded-full text-sm gap-1 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                New Product
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-blue-50/70 text-blue-900/70 text-xs uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-10">
                    #
                  </th>
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100">
                    Product
                  </th>
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-20">
                    HSN
                  </th>
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-16">
                    Unit
                  </th>
                  <th className="text-center font-semibold px-3 py-2.5 border-b border-blue-100 w-20">
                    Qty
                  </th>
                  <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-24">
                    Price
                  </th>
                  <th className="text-center font-semibold px-3 py-2.5 border-b border-blue-100 w-32">
                    Discount
                  </th>
                  <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-16">
                    GST%
                  </th>
                  <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-28">
                    Total
                  </th>
                  <th className="w-16 border-b border-blue-100"></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item, i) => {
                  const discountType = item.discountType || "amount";
                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        i % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-1.5 border-b border-slate-100 text-slate-400">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100 font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">
                        {item.hsn || "-"}
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">
                        {item.unit || "Pcs"}
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.qty}
                          onChange={handleQtyChange(item._id)}
                          onBlur={handleQtyBlur(item._id)}
                          className="w-16 h-8 text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.price ?? item.sellingPrice ?? 0}
                          onChange={handleDecimalChange(
                            item._id,
                            "sellingPrice",
                          )}
                          onBlur={handleDecimalBlur(item._id, "sellingPrice")}
                          className="w-20 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.discount ?? 0}
                            onChange={handleDecimalChange(item._id, "discount")}
                            onBlur={handleDiscountBlur(item._id, discountType)}
                            className="w-16 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemField(
                                item._id,
                                "discountType",
                                discountType === "amount"
                                  ? "percent"
                                  : "amount",
                              )
                            }
                            title="Toggle discount type"
                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {discountType === "percent" ? (
                              <Percent className="w-3.5 h-3.5" />
                            ) : (
                              "₹"
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-right text-slate-500">
                        {item.gstRate || 0}%
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-right font-bold text-blue-600">
                        ₹{Number(item.total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCartItem(item);
                              setShowAddItemModal(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                            title="Edit item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item._id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-500"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Add-row */}
                <tr className="bg-blue-50/30">
                  <td className="px-3 py-2.5 text-blue-300 font-medium">
                    {cartItems.length + 1}
                  </td>
                  <td className="px-2 py-2.5">
                    <InlineProductCombobox
                      products={products}
                      onSelect={handleAddRow}
                      onCreateNew={handleCreateNewProduct}
                    />
                  </td>
                  <td colSpan={8} className="px-3 py-2.5"></td>
                </tr>
              </tbody>
            </table>

            {cartItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-t border-slate-100">
                <ShoppingBag className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-base font-medium text-slate-500">
                  No items added yet
                </p>
                <p className="text-sm text-slate-400 mt-0.5">
                  Start typing a product name above to add it
                </p>
              </div>
            )}

            {cartItems.length > 0 && (
              <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50/40 px-5 py-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Initial Payment */}
                  {/* -------------------------------- */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-blue-600" />
                      Initial Payment
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Amount Received
                        </label>
                        <input
                          value={
                            quickReceivedAmount ||
                            (paidAmount ? String(paidAmount) : "")
                          }
                          onChange={handleQuickReceivedChange}
                          onFocus={(e) => {
                            if (!hasCustomer) {
                              e.target.blur();
                              setShowCustomerRequiredModal(true);
                            }
                          }}
                          onBlur={handleQuickReceivedBlur}
                          readOnly={!hasCustomer}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`w-full h-9 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${
                            !hasCustomer
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                              : "bg-white border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Payment Mode
                        </label>
                        <PaymentMethodDropdown
                          value={paymentMethod}
                          onChange={(val) => {
                            setPaymentMethod(val);
                            if (val === "cash") setPaymentNote("");
                          }}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Reference
                        </label>
                        <input
                          value={paymentNote || ""}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder={
                            paymentMethod === "cash"
                              ? "Not required for cash"
                              : getReferencePlaceholder(paymentMethod)
                          }
                          disabled={paymentMethod === "cash"}
                          autoCapitalize="none"
                          autoCorrect="off"
                          className={`w-full h-9 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${
                            paymentMethod === "cash"
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Payment Status
                        </label>
                        <div
                          className={`h-9 px-3 flex items-center rounded-lg text-sm font-semibold ${
                            dueAmount <= 0
                              ? "bg-emerald-50 text-emerald-600"
                              : Number(paidAmount) > 0
                                ? "bg-amber-50 text-amber-600"
                                : "bg-rose-50 text-rose-500"
                          }`}
                        >
                          {dueAmount <= 0
                            ? "PAID"
                            : Number(paidAmount) > 0
                              ? "PARTIAL"
                              : "PENDING"}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Due
                        </label>
                        <div className="h-9 px-3 flex items-center rounded-lg bg-rose-50 text-rose-600 text-sm font-bold">
                          ₹{dueAmount.toFixed(2)}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                          <MessageSquareText className="w-3 h-3" /> Remarks
                        </label>
                        <button
                          type="button"
                          onClick={() => setRemarksModalOpen(true)}
                          className="w-full h-9 px-3 text-left text-sm border border-slate-200 rounded-lg hover:bg-slate-50 truncate"
                        >
                          {remarks?.trim() ? (
                            remarks
                          ) : (
                            <span className="text-slate-400">Add remarks</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Sale Summary */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      Sale Summary
                    </h3>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Subtotal</span>
                        <span className="text-sm font-semibold text-slate-800">
                          ₹
                          {Number(invoiceCalculations.subtotal || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Item Discount
                        </span>
                        <span className="text-sm font-semibold text-emerald-600">
                          − ₹{productDiscountTotal.toFixed(2)}
                        </span>
                      </div>

                      {hasIgst ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">IGST</span>
                          <span className="text-sm font-semibold text-slate-800">
                            ₹{gstTotals.igst.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">CGST</span>
                            <span className="text-sm font-semibold text-slate-800">
                              ₹{gstTotals.cgst.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">SGST</span>
                            <span className="text-sm font-semibold text-slate-800">
                              ₹{gstTotals.sgst.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Extra Discount
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={discount?.value ?? 0}
                            onChange={handleOrderDiscountChange}
                            onBlur={handleOrderDiscountBlur}
                            className="w-16 h-7 text-sm text-right font-semibold text-slate-800 px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={toggleOrderDiscountType}
                            title="Toggle discount type"
                            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            {discount?.type === "percent" ? (
                              <Percent className="w-3.5 h-3.5" />
                            ) : (
                              "₹"
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Round Off
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            invoiceCalculations.roundOff >= 0
                              ? "text-emerald-600"
                              : "text-rose-500"
                          }`}
                        >
                          {invoiceCalculations.roundOff >= 0 ? "+" : ""}₹
                          {Number(invoiceCalculations.roundOff || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Additional Charges */}
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-slate-500 mt-1">
                          Charges
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          {addingCharge ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={chargeName}
                                onChange={(e) => setChargeName(e.target.value)}
                                placeholder="Name"
                                className="w-16 h-7 px-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                value={chargeAmount}
                                onChange={(e) =>
                                  setChargeAmount(
                                    e.target.value.replace(/[^\d.]/g, ""),
                                  )
                                }
                                placeholder="₹"
                                className="w-12 h-7 px-1.5 text-xs text-right border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={handleAddCharge}
                                className="w-7 h-7 shrink-0 flex items-center justify-center rounded bg-blue-600 text-white"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingCharge(false);
                                  setChargeName("");
                                  setChargeAmount("");
                                }}
                                className="w-7 h-7 shrink-0 flex items-center justify-center rounded border border-slate-200 text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {(additionalCharges || []).length > 0 && (
                                <div className="flex flex-wrap justify-end gap-1">
                                  {additionalCharges.map((c) => (
                                    <span
                                      key={c.id}
                                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-1.5 py-0.5 rounded-full"
                                    >
                                      {c.name}: ₹{Number(c.amount).toFixed(2)}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCharge(c.id)}
                                        className="hover:text-rose-500"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(additionalCharges || []).length < 3 && (
                                <button
                                  type="button"
                                  onClick={() => setAddingCharge(true)}
                                  className="text-xs font-medium text-blue-600 flex items-center gap-0.5"
                                >
                                  <Plus className="w-3 h-3" /> Add charge
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-slate-100 my-1" />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-bold text-slate-800">
                          Grand Total
                        </span>
                        <span className="text-xl font-extrabold text-blue-600">
                          ₹{displayGrandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">
                        Selected Products {cartItems.length}
                      </span>
                      <button
                        onClick={handleClearCart}
                        className="text-xs font-medium text-rose-500 hover:text-rose-600"
                      >
                        Clear all items
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Summary — Preview + Save & Continue + Create/Update, F6 shortcut */}
        <Card className="rounded-2xl border-slate-200 shadow-md overflow-hidden ring-1 ring-blue-100">
          <CardContent className="pt-4">
            <InvoiceSummary
              discount={discount}
              setDiscount={setDiscount}
              invoiceCalculations={invoiceCalculations}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paidAmount={paidAmount}
              setPaidAmount={guardedSetPaidAmount}
              paymentNote={paymentNote}
              setPaymentNote={setPaymentNote}
              remarks={remarks}
              setRemarks={setRemarks}
              handleCreateInvoice={handleCreateInvoice}
              handleSaveAndContinue={handleSaveAndContinue}
              onInvoiceModalClose={onInvoiceModalClose}
              isLoading={isSubmitting}
              disabled={cartItems.length === 0}
              payment={payment}
              cartItems={cartItems}
              formValues={formValues}
              storedata={storedata}
              invoiceNumber={invoiceNumber}
              isGstInvoice={isGstInvoice}
              isMrpEnabled={isMrpEnabled}
              submitLabel={isEditMode ? "Update Invoice" : "Create Invoice"}
              hasCustomer={hasCustomer}
              onRequireCustomer={() => setShowCustomerRequiredModal(true)}
            />
          </CardContent>
        </Card>
      </div>

      <AddItemFormModal
        open={showAddItemModal}
        onOpenChange={(v) => {
          setShowAddItemModal(v);
          if (!v) setEditingCartItem(null);
        }}
        editItem={editingCartItem}
        initialItemName={editingCartItem ? "" : newItemPrefillName}
        onItemCreated={(savedItem) => {
          if (editingCartItem) {
            handleCartItemUpdated(savedItem);
            setEditingCartItem(null);
          } else {
            handleNewProductCreated(savedItem);
          }
        }}
      />

      <RemarksModal
        open={remarksModalOpen}
        onClose={() => setRemarksModalOpen(false)}
        remarks={remarks}
        setRemarks={setRemarks}
      />

      <CustomerRequiredModal
        open={showCustomerRequiredModal}
        onClose={() => setShowCustomerRequiredModal(false)}
      />
    </div>
  );
}

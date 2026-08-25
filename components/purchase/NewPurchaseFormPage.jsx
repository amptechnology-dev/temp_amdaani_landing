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
  Truck,
  Sparkles,
  Trash2,
  Pencil,
  Loader2,
  FileText,
  MapPin,
  Building2,
  Locate,
  Plus,
  Percent,
  X,
  PlusCircle,
  MinusCircle,
  PackageSearch,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import PurchaseSummary from "./PurchaseSummary";
import AddItemFormModal from "../../components/invoice/AddItemFormModal";
import api from "../../utils/api";

function InlineProductCombobox({ products, onSelect, onCreateNew, onRefresh }) {
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

  const handleFocus = () => {
    setOpen(true);
    onRefresh?.();
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
          onFocus={handleFocus}
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
                  <p className="text-[11px] text-slate-400">
                    HSN: {p.hsn?.trim() || "-"} · {p.unit || "Pcs"}
                  </p>
                </div>
                <span className="text-blue-600 font-semibold text-xs shrink-0 ml-2">
                  ₹{Number(p.costPrice ?? 0).toFixed(2)}
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

const emptyVendorForm = {
  name: "",
  mobile: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  gstNumber: "",
};

// Smaller, compact input style for the Vendor Details form (matches Customer form)
const inputClass =
  "w-full h-8 pl-7 pr-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/60 focus:bg-white transition-colors";

export default function NewPurchaseFormPage({
  isLoading,
  isEditMode,
  purchaseNumber,
  setPurchaseNumber,
  vendors,
  selectedVendor,
  setSelectedVendor,
  cartItems,
  products = [],
  addToCart,
  setAllProducts,
  onBack,
  invoiceCalculations,
  paymentMethod,
  paymentNote,
  payment,
  handleCreatePurchase,
  isSubmitting,
  formValues,
  storedata,
  isGstInvoice,
  handleUpdateQuantity,
  handleUpdateItemField,
  handleRemoveItem,
  handleClearCart,
  isMrpEnabled = false,
  onRefreshProducts,
}) {
  const [vendorForm, setVendorForm] = useState(() => ({
    ...emptyVendorForm,
    ...(selectedVendor
      ? {
          name: selectedVendor.name || "",
          mobile: selectedVendor.mobile || "",
          address: selectedVendor.address || "",
          city: selectedVendor.city || "",
          state: selectedVendor.state || "",
          postalCode: selectedVendor.postalCode || "",
          gstNumber: selectedVendor.gstNumber || "",
        }
      : {}),
  }));

  const [selectedVendorId, setSelectedVendorId] = useState(
    selectedVendor?._id || "",
  );
  const [activeField, setActiveField] = useState(null);
  const [vendorHighlightIndex, setVendorHighlightIndex] = useState(-1);
  const vendorItemRefs = useRef([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemPrefillName, setNewItemPrefillName] = useState("");
  const vendorGridRef = useRef(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [fetchingItemId, setFetchingItemId] = useState(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (vendorGridRef.current && !vendorGridRef.current.contains(e.target)) {
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

    if (isEditMode && !editSeededRef.current && selectedVendor) {
      editSeededRef.current = true;

      setVendorForm({
        name: selectedVendor.name || "",
        mobile: selectedVendor.mobile || "",
        address: selectedVendor.address || "",
        city: selectedVendor.city || "",
        state: selectedVendor.state || "",
        postalCode: selectedVendor.postalCode || "",
        gstNumber: selectedVendor.gstNumber || "",
      });

      const matched = vendors.find((v) => v.mobile === selectedVendor.mobile);
      if (matched) setSelectedVendorId(matched._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isEditMode, selectedVendor, vendors]);

  useEffect(() => {
    const hasData = vendorForm.name || vendorForm.mobile;
    setSelectedVendor(
      hasData ? { _id: selectedVendorId || undefined, ...vendorForm } : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorForm, selectedVendorId]);

  const vendorSuggestions = (() => {
    if (!activeField) return [];
    const q = (activeField === "mobile" ? vendorForm.mobile : vendorForm.name)
      .trim()
      .toLowerCase();
    if (!q) return vendors.slice(0, 8);
    return vendors
      .filter((v) => v.name?.toLowerCase().includes(q) || v.mobile?.includes(q))
      .slice(0, 8);
  })();

  useEffect(() => {
    setVendorHighlightIndex(-1);
  }, [activeField, vendorForm.mobile, vendorForm.name]);

  useEffect(() => {
    if (
      vendorHighlightIndex >= 0 &&
      vendorItemRefs.current[vendorHighlightIndex]
    ) {
      vendorItemRefs.current[vendorHighlightIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [vendorHighlightIndex]);

  const pickVendorSuggestion = (v) => {
    setSelectedVendorId(v._id);
    setVendorForm({
      name: v.name || "",
      mobile: v.mobile || "",
      address: v.address || "",
      city: v.city || "",
      state: v.state || "",
      postalCode: v.postalCode || "",
      gstNumber: v.gstNumber || "",
    });
    setActiveField(null);
    setVendorHighlightIndex(-1);
  };

  const handleClearVendor = () => {
    setSelectedVendorId("");
    setVendorForm(emptyVendorForm);
  };

  const updateField = (field) => (e) => {
    const v = e.target.value;
    setVendorForm((prev) => ({ ...prev, [field]: v }));

    if (selectedVendorId) {
      const matched = vendors.find((vd) => vd._id === selectedVendorId);
      if (matched && matched[field] !== v) setSelectedVendorId("");
    }
  };

  const handleVendorFieldKeyDown = (fieldName) => (e) => {
    const isOpen = activeField === fieldName && vendorSuggestions.length > 0;

    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setActiveField(fieldName);
      return;
    }
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVendorHighlightIndex((prev) =>
        prev + 1 >= vendorSuggestions.length ? 0 : prev + 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVendorHighlightIndex((prev) =>
        prev - 1 < 0 ? vendorSuggestions.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        vendorHighlightIndex >= 0 &&
        vendorSuggestions[vendorHighlightIndex]
      ) {
        pickVendorSuggestion(vendorSuggestions[vendorHighlightIndex]);
      }
    } else if (e.key === "Escape") {
      setActiveField(null);
      setVendorHighlightIndex(-1);
    }
  };

  const handleAddRow = (product) => {
    addToCart(product);
  };

  const handleCreateNewProduct = (typedName) => {
    setNewItemPrefillName(typedName);
    setShowAddItemModal(true);
  };

  const handleEditItem = async (item) => {
    const productId = item.product || item._id;
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));

    if (!isValidObjectId(productId)) {
      setEditingCartItem({ ...item, cartItemId: item._id });
      setNewItemPrefillName("");
      setShowAddItemModal(true);
      return;
    }

    try {
      setFetchingItemId(item._id);
      const res = await api.get(`/product/id/${productId}`);
      const freshProduct = res?.data?.data || res?.data;

      if (freshProduct) {
        setEditingCartItem({
          ...freshProduct,
          cartItemId: item._id,
        });
      } else {
        setEditingCartItem({ ...item, cartItemId: item._id });
      }
    } catch (err) {
      console.warn("Failed to fetch fresh product data for edit:", err);
      setEditingCartItem({ ...item, cartItemId: item._id });
    } finally {
      setFetchingItemId(null);
      setNewItemPrefillName("");
      setShowAddItemModal(true);
    }
  };

  const handleNewProductCreated = (newItem) => {
    if (editingCartItem) {
      const targetId = editingCartItem.cartItemId || editingCartItem._id;

      handleUpdateItemField(targetId, "name", newItem.name);
      handleUpdateItemField(targetId, "hsn", newItem.hsn || "");
      handleUpdateItemField(targetId, "unit", newItem.unit || "PCS");
      handleUpdateItemField(
        targetId,
        "costPrice",
        Number(newItem.costPrice || 0),
      );
      handleUpdateItemField(
        targetId,
        "gstRate",
        Number(newItem.purchaseGstRate ?? newItem.gstRate ?? 0),
      );
      handleUpdateItemField(
        targetId,
        "isPurchaseTaxInclusive",
        Boolean(newItem.isPurchaseTaxInclusive),
      );
      handleUpdateItemField(targetId, "mrp", Number(newItem.mrp || 0));

      setAllProducts?.((prev) => [
        newItem,
        ...prev.filter((p) => p._id !== newItem._id),
      ]);
      setEditingCartItem(null);
    } else {
      setAllProducts?.((prev) => [newItem, ...prev]);
      addToCart(newItem);
    }
    setNewItemPrefillName("");
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

  const handleGstRateBlur = (id) => (e) => {
    let n = parseFloat(e.target.value);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 100) n = 100;
    handleUpdateItemField(id, "gstRate", n);
  };

  const handleHsnChange = (id) => (e) => {
    handleUpdateItemField(id, "hsn", e.target.value);
  };

  const togglePurchaseTaxInclusive = (id, current) => () => {
    handleUpdateItemField(id, "isPurchaseTaxInclusive", !current);
  };

  const addRowColSpan = isMrpEnabled ? 9 : 8;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden w-full min-w-0">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header — compact, blue-accented (matches Invoice form) */}
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
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {isEditMode ? "Edit Purchase" : "New Purchase"}
                  </h1>
                  {isEditMode && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200 text-[10px] px-1.5 py-0">
                      Editing
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Add a vendor and items to{" "}
                  {isEditMode ? "update" : "record"} the purchase
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-xs text-slate-600 font-medium">
                <Calendar className="w-3 h-3 text-slate-400" />
                {format(new Date(), "dd MMM yyyy")}
              </div>
              <div className="flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 rounded-full text-xs text-white font-semibold shadow-sm shadow-blue-200">
                <Hash className="w-3 h-3 text-blue-200" />
                {isEditMode ? (
                  purchaseNumber || "Loading..."
                ) : (
                  <input
                    value={purchaseNumber}
                    onChange={(e) => setPurchaseNumber(e.target.value)}
                    className="bg-transparent outline-none w-24 placeholder:text-blue-200 text-white text-xs"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vendor — compact form, same pattern as Customer Details */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-visible relative">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100 py-2 px-4 rounded-t-2xl">
            <CardTitle className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <Truck className="w-3 h-3 text-white" />
                </span>
                Vendor Details
              </span>
              {(vendorForm.name || vendorForm.mobile) && (
                <button
                  onClick={handleClearVendor}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div
              ref={vendorGridRef}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
            >
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 z-10" />
                <input
                  value={vendorForm.mobile}
                  onChange={updateField("mobile")}
                  onFocus={() => setActiveField("mobile")}
                  onKeyDown={handleVendorFieldKeyDown("mobile")}
                  maxLength={10}
                  placeholder="Mobile *"
                  className={inputClass}
                />
                {activeField === "mobile" && vendorSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {vendorSuggestions.map((v, idx) => (
                      <div
                        key={v._id}
                        ref={(el) => (vendorItemRefs.current[idx] = el)}
                        onMouseEnter={() => setVendorHighlightIndex(idx)}
                        onClick={() => pickVendorSuggestion(v)}
                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                          vendorHighlightIndex === idx
                            ? "bg-blue-50"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {v.name || "Unnamed"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {v.mobile}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 z-10" />
                <input
                  value={vendorForm.name}
                  onChange={updateField("name")}
                  onFocus={() => setActiveField("name")}
                  onKeyDown={handleVendorFieldKeyDown("name")}
                  placeholder="Name"
                  className={inputClass}
                />
                {activeField === "name" && vendorSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                    {vendorSuggestions.map((v, idx) => (
                      <div
                        key={v._id}
                        ref={(el) => (vendorItemRefs.current[idx] = el)}
                        onMouseEnter={() => setVendorHighlightIndex(idx)}
                        onClick={() => pickVendorSuggestion(v)}
                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 ${
                          vendorHighlightIndex === idx
                            ? "bg-blue-50"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {v.name || "Unnamed"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {v.mobile}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  value={vendorForm.gstNumber}
                  onChange={(e) =>
                    setVendorForm((prev) => ({
                      ...prev,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="GSTIN (optional)"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  value={vendorForm.address}
                  onChange={updateField("address")}
                  placeholder="Address"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  value={vendorForm.city}
                  onChange={updateField("city")}
                  placeholder="City"
                  className={inputClass}
                />
              </div>

              <input
                value={vendorForm.state}
                onChange={updateField("state")}
                placeholder="State"
                className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/60 focus:bg-white transition-colors"
              />

              <div className="relative">
                <Locate className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  value={vendorForm.postalCode}
                  onChange={updateField("postalCode")}
                  maxLength={6}
                  placeholder="Postal Code"
                  className={inputClass}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items — excel-style table */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100 py-3 px-4">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                  <ShoppingBag className="w-3.5 h-3.5 text-white" />
                </span>
                Items
                {cartItems.length > 0 && (
                  <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-[10px]">
                    {invoiceCalculations.totalQuantity} qty
                  </Badge>
                )}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setNewItemPrefillName("");
                  setShowAddItemModal(true);
                }}
                className="h-8 rounded-full text-xs gap-1 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                New Product
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto w-full min-w-0 no-scrollbar">
            <div className="min-w-[1100px]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50/70 text-blue-900/70 text-[11px] uppercase tracking-wide">
                    <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-10">
                      #
                    </th>
                    <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100">
                      Product
                    </th>
                    <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-28">
                      HSN
                    </th>
                    <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-16">
                      Unit
                    </th>
                    <th className="text-center font-semibold px-3 py-2.5 border-b border-blue-100 w-20">
                      Qty
                    </th>
                    <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-36">
                      Cost Price
                    </th>
                    <th className="text-center font-semibold px-3 py-2.5 border-b border-blue-100 w-32">
                      Discount
                    </th>
                    <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-20">
                      GST%
                    </th>
                    {isMrpEnabled && (
                      <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-24">
                        MRP
                      </th>
                    )}
                    <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-28">
                      Total
                    </th>
                    <th className="w-16 border-b border-blue-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, i) => (
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

                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <input
                          type="text"
                          value={item.hsn || ""}
                          onChange={handleHsnChange(item._id)}
                          placeholder="HSN"
                          className="w-24 h-8 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
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
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.costPrice ?? 0}
                            onChange={handleDecimalChange(item._id, "costPrice")}
                            onBlur={handleDecimalBlur(item._id, "costPrice")}
                            className="w-20 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={togglePurchaseTaxInclusive(
                              item._id,
                              item.isPurchaseTaxInclusive,
                            )}
                            title={
                              item.isPurchaseTaxInclusive
                                ? "Tax Included — click to exclude"
                                : "Tax Excluded — click to include"
                            }
                            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-md border text-[10px] font-semibold ${
                              item.isPurchaseTaxInclusive
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            {item.isPurchaseTaxInclusive ? (
                              <PlusCircle className="w-3.5 h-3.5" />
                            ) : (
                              <MinusCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.purchaseDiscount ?? 0}
                            onChange={handleDecimalChange(
                              item._id,
                              "purchaseDiscount",
                            )}
                            onBlur={handleDecimalBlur(
                              item._id,
                              "purchaseDiscount",
                            )}
                            className="w-16 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemField(
                                item._id,
                                "purchaseDiscountType",
                                (item.purchaseDiscountType || "amount") ===
                                  "amount"
                                  ? "percentage"
                                  : "amount",
                              )
                            }
                            title="Toggle discount type"
                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {(item.purchaseDiscountType || "amount") ===
                            "percentage" ? (
                              <Percent className="w-3.5 h-3.5" />
                            ) : (
                              "₹"
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-2 py-1.5 border-b border-slate-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.gstRate ?? 0}
                          onChange={handleDecimalChange(item._id, "gstRate")}
                          onBlur={handleGstRateBlur(item._id)}
                          className="w-16 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                        />
                      </td>

                      {isMrpEnabled && (
                        <td className="px-2 py-1.5 border-b border-slate-100">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.mrp ?? 0}
                            onChange={handleDecimalChange(item._id, "mrp")}
                            onBlur={handleDecimalBlur(item._id, "mrp")}
                            className="w-20 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                          />
                        </td>
                      )}

                      <td className="px-3 py-1.5 border-b border-slate-100 text-right font-bold text-blue-600">
                        ₹{Number(item.total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 border-b border-slate-100 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleEditItem(item)}
                          disabled={fetchingItemId === item._id}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          title="Edit product master"
                        >
                          {fetchingItemId === item._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Pencil className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item._id)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-500"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

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
                        onRefresh={onRefreshProducts}
                      />
                    </td>
                    <td colSpan={addRowColSpan} className="px-3 py-2.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {cartItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-t border-slate-100">
                <ShoppingBag className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm font-medium text-slate-500">
                  No items added yet
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Start typing a product name above to add it
                </p>
              </div>
            )}

            {cartItems.length > 0 && (
              <div className="flex justify-end px-3 py-2 border-t border-slate-100">
                <button
                  onClick={handleClearCart}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600"
                >
                  Clear all items
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Summary — Preview + Create only */}
        <Card className="rounded-2xl border-slate-200 shadow-md overflow-hidden ring-1 ring-blue-100">
          <CardContent className="pt-4">
            <PurchaseSummary
              invoiceCalculations={invoiceCalculations}
              paymentMethod={paymentMethod}
              paymentNote={paymentNote}
              handleCreatePurchase={handleCreatePurchase}
              isLoading={isSubmitting}
              disabled={
                !(vendorForm.name || vendorForm.mobile) ||
                cartItems.length === 0
              }
              payment={payment}
              cartItems={cartItems}
              formValues={formValues}
              storedata={storedata}
              purchaseNumber={purchaseNumber}
              isGstInvoice={isGstInvoice}
              isMrpEnabled={isMrpEnabled}
              submitLabel={isEditMode ? "Update Purchase" : "Create Purchase"}
            />
          </CardContent>
        </Card>
      </div>

      <AddItemFormModal
        open={showAddItemModal}
        onOpenChange={(open) => {
          setShowAddItemModal(open);
          if (!open) setEditingCartItem(null);
        }}
        onItemCreated={handleNewProductCreated}
        initialItemName={newItemPrefillName}
        editItem={editingCartItem}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
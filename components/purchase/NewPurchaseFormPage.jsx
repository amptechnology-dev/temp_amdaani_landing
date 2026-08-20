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

  // ✅ Reset highlight whenever the visible list changes (new query / open)
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, open]);

  // ✅ Keep the highlighted row scrolled into view
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

  // ✅ Total selectable rows = filtered products + optional "create new" row
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
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[220px] h-8 px-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
            className="bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto"
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
  console.log("NewPurchaseFormPage received storedata:", storedata);
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
  // ✅ which field's typeahead dropdown is currently open: "name" | "mobile" | null
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

  // ✅ EDIT MODE — jokhon vendor data load complete hoy (isLoading false hoy),
  // selectedVendor prop theke vendorForm sorasori bhore dao — vendors list-e
  // mobile match paoya jak ba na jak, form-e data thik e dekhabe.
  const editSeededRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      editSeededRef.current = false; // next load-er jonno reset
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

  // ✅ Push vendorForm up to parent as selectedVendor whenever it changes
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

  // ✅ Reset highlight whenever field switches or the query changes
  useEffect(() => {
    setVendorHighlightIndex(-1);
  }, [activeField, vendorForm.mobile, vendorForm.name]);

  // ✅ Keep the highlighted row scrolled into view
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
        // ✅ freshProduct-er nijer real _id ke overwrite na kore rekhe dao —
        // eta diyei AddItemFormModal PUT call korbe
        setEditingCartItem({
          ...freshProduct,
          cartItemId: item._id, // ✅ cart row track korar jonno alada field
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

      // ✅ edit mode — existing cart item field-gulo update kore dao
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

  // -------------------------------
  // ✅ Number field helpers — free typing (0, 1, 10, decimals etc.)
  // -------------------------------
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isEditMode ? "Edit Purchase" : "New Purchase"}
                </h1>
                {isEditMode && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    Editing
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Add a vendor and items to {isEditMode ? "update" : "record"} the
                purchase
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {format(new Date(), "dd MMM yyyy")}
            </div>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full text-sm text-blue-700 font-medium">
              <Hash className="w-3.5 h-3.5" />
              {isEditMode ? (
                purchaseNumber || "Loading..."
              ) : (
                <input
                  value={purchaseNumber}
                  onChange={(e) => setPurchaseNumber(e.target.value)}
                  className="bg-transparent outline-none w-28"
                />
              )}
            </div>
          </div>
        </div>

        {/* Vendor */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-visible relative">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-2.5 px-4 rounded-t-xl">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Vendor
              </span>
              {(vendorForm.name || vendorForm.mobile) && (
                <button
                  onClick={handleClearVendor}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div
              ref={vendorGridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                <input
                  value={vendorForm.mobile}
                  onChange={updateField("mobile")}
                  onFocus={() => setActiveField("mobile")}
                  onKeyDown={handleVendorFieldKeyDown("mobile")}
                  maxLength={10}
                  placeholder="Mobile *"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {activeField === "mobile" && vendorSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
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

              {/* Name — typeahead */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                <input
                  value={vendorForm.name}
                  onChange={updateField("name")}
                  onFocus={() => setActiveField("name")}
                  onKeyDown={handleVendorFieldKeyDown("name")}
                  placeholder="Name"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {activeField === "name" && vendorSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
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
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.gstNumber}
                  onChange={(e) =>
                    setVendorForm((prev) => ({
                      ...prev,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="GSTIN (optional)"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative sm:col-span-2 lg:col-span-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.address}
                  onChange={updateField("address")}
                  placeholder="Address"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.city}
                  onChange={updateField("city")}
                  placeholder="City"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={vendorForm.state}
                  onChange={updateField("state")}
                  placeholder="State"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="relative">
                  <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={vendorForm.postalCode}
                    onChange={updateField("postalCode")}
                    maxLength={6}
                    placeholder="Postal Code"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items — excel-style table */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-2.5 px-4">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Items
                {cartItems.length > 0 && (
                  <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-[10px]">
                    {invoiceCalculations.totalQuantity} qty
                  </Badge>
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewItemPrefillName("");
                  setShowAddItemModal(true);
                }}
                className="h-7 rounded-full text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                New Product
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-10">
                    #
                  </th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100">
                    Product
                  </th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-20">
                    HSN
                  </th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-16">
                    Unit
                  </th>
                  <th className="text-center font-medium px-3 py-2 border-b border-slate-100 w-20">
                    Qty
                  </th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-24">
                    Cost Price
                  </th>
                  <th className="text-center font-medium px-3 py-2 border-b border-slate-100 w-32">
                    Discount
                  </th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-16">
                    GST%
                  </th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-28">
                    Total
                  </th>
                  <th className="w-10 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item, i) => (
                  <tr key={item._id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">
                      {item.hsn?.trim() || "-"}
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
                        value={item.costPrice ?? 0}
                        onChange={handleDecimalChange(item._id, "costPrice")}
                        onBlur={handleDecimalBlur(item._id, "costPrice")}
                        className="w-20 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
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
                    <td className="px-3 py-1.5 border-b border-slate-100 text-right text-slate-500">
                      {item.gstRate || 0}%
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-right font-semibold text-blue-600">
                      ₹{Number(item.total ?? 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100 text-center">
                      <button
                        onClick={() => handleEditItem(item)}
                        disabled={fetchingItemId === item._id}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                        title="Edit item"
                      >
                        {fetchingItemId === item._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Pencil className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add-row */}
                <tr>
                  <td className="px-3 py-2 text-slate-300">
                    {cartItems.length + 1}
                  </td>
                  <td className="px-2 py-2">
                    <InlineProductCombobox
                      products={products}
                      onSelect={handleAddRow}
                      onCreateNew={handleCreateNewProduct}
                      onRefresh={onRefreshProducts}
                    />
                  </td>
                  <td colSpan={8} className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>

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
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
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
    </div>
  );
}

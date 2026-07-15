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
  Search,
  Trash2,
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

import InvoiceSummary from "./InvoiceSummary";
import AddItemFormModal from "./AddItemFormModal";

// -------------------------------
// Inline product combobox for the "add row" — uses a PORTAL so its dropdown
// is never clipped by any ancestor's overflow-hidden/overflow-x-auto.
// -------------------------------
function InlineProductCombobox({ products, onSelect, onCreateNew }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  const pick = (product) => {
    onSelect(product);
    setQuery("");
    setOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew(query.trim());
    setQuery("");
    setOpen(false);
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
          onFocus={() => setOpen(true)}
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
            {filtered.map((p) => (
              <div
                key={p._id}
                onClick={() => pick(p)}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
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

            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 border-t border-slate-100"
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

const emptyCustomerForm = {
  name: "",
  mobile: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  gstNumber: "",
};

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
  handleUpdateQuantity,
  handleUpdateItemField,
  handleRemoveItem,
  handleClearCart,
}) {
  // -------------------------------
  // Customer form state — mirrors DB schema exactly
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
  // ✅ which field's typeahead dropdown is currently open: "name" | "mobile" | null
  const [activeField, setActiveField] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemPrefillName, setNewItemPrefillName] = useState("");
  const customerGridRef = useRef(null);

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

  // ✅ EDIT MODE — customers list loaded pore, existing customer ke mobile diye match kore
  // fields e select kore dey (jehetu edit-e _id thake na loaded invoice-e)
  const editSeededRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      editSeededRef.current = false; // next load-er jonno reset
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

      // customers list-e match pele _id-o link kore dao (optional — locked na kore)
      const matched = customers.find((c) => c.mobile === selectedCustomer.mobile);
      if (matched) setSelectedCustomerId(matched._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isEditMode, selectedCustomer, customers]);

  // ✅ Push customerForm up to parent as selectedCustomer whenever it changes
  useEffect(() => {
    const hasData = customerForm.name || customerForm.mobile;
    setSelectedCustomer(
      hasData
        ? { _id: selectedCustomerId || undefined, ...customerForm }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerForm, selectedCustomerId]);

  // ✅ Typeahead suggestions — filtered live by whichever field (name/mobile) is active
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
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerForm(emptyCustomerForm);
  };

  const updateField = (field) => (e) => {
    const v = e.target.value;
    setCustomerForm((prev) => ({ ...prev, [field]: v }));

    // ✅ jodi user select kora customer-er field change kore, detach kore dao
    // (ar seta ekhon "new customer" hisebe treat hobe)
    if (selectedCustomerId) {
      const matched = customers.find((c) => c._id === selectedCustomerId);
      if (matched && matched[field] !== v) setSelectedCustomerId("");
    }
  };

  const handleAddRow = (product) => {
    addToCart(product);
  };

  const handleCreateNewProduct = (typedName) => {
    setNewItemPrefillName(typedName);
    setShowAddItemModal(true);
  };

  const handleNewProductCreated = (newItem) => {
    setAllProducts?.((prev) => [newItem, ...prev]);
    addToCart(newItem);
    setNewItemPrefillName("");
  };

  // -------------------------------
  // ✅ Number field helpers — free typing (0, 1, 10, decimals etc.)
  // -------------------------------
  const handleQtyChange = (id) => (e) => {
    const v = e.target.value.replace(/[^\d]/g, ""); // digits only
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
                  {isEditMode ? "Edit Invoice" : "New Invoice"}
                </h1>
                {isEditMode && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    Editing
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Add a customer and items to {isEditMode
                  ? "update"
                  : "generate"}{" "}
                the invoice
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
              {invoiceNumber || "Loading..."}
            </div>
          </div>
        </div>

        {/* Customer */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-visible relative">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-2.5 px-4 rounded-t-xl">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-blue-600" />
                Customer
              </span>
              {(customerForm.name || customerForm.mobile) && (
                <button
                  onClick={handleClearCustomer}
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
              ref={customerGridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {/* Mobile — typeahead */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                <input
                  value={customerForm.mobile}
                  onChange={updateField("mobile")}
                  onFocus={() => setActiveField("mobile")}
                  maxLength={10}
                  placeholder="Mobile *"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {activeField === "mobile" && customerSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {customerSuggestions.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => pickCustomerSuggestion(c)}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {c.name || "Unnamed"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.mobile}
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
                  value={customerForm.name}
                  onChange={updateField("name")}
                  onFocus={() => setActiveField("name")}
                  placeholder="Name"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {activeField === "name" && customerSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {customerSuggestions.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => pickCustomerSuggestion(c)}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {c.name || "Unnamed"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.mobile}
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
                  value={customerForm.gstNumber}
                  onChange={(e) =>
                    setCustomerForm((prev) => ({
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
                  value={customerForm.address}
                  onChange={updateField("address")}
                  placeholder="Address"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={customerForm.city}
                  onChange={updateField("city")}
                  placeholder="City"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={customerForm.state}
                  onChange={updateField("state")}
                  placeholder="State"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="relative">
                  <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={customerForm.postalCode}
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
                    Price
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
                        onChange={handleDecimalChange(item._id, "sellingPrice")}
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
                          onBlur={handleDecimalBlur(item._id, "discount")}
                          className="w-16 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItemField(
                              item._id,
                              "discountType",
                              (item.discountType || "amount") === "amount"
                                ? "percent"
                                : "amount",
                            )
                          }
                          title="Toggle discount type"
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          {(item.discountType || "amount") === "percent" ? (
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

        {/* Invoice Summary — Preview + Create only */}
        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="pt-4">
            <InvoiceSummary
              discount={discount}
              setDiscount={setDiscount}
              invoiceCalculations={invoiceCalculations}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              paymentNote={paymentNote}
              setPaymentNote={setPaymentNote}
              remarks={remarks}
              setRemarks={setRemarks}
              handleCreateInvoice={handleCreateInvoice}
              isLoading={isSubmitting}
              disabled={
                !(customerForm.name || customerForm.mobile) ||
                cartItems.length === 0
              }
              payment={payment}
              cartItems={cartItems}
              formValues={formValues}
              storedata={storedata}
              invoiceNumber={invoiceNumber}
              isGstInvoice={isGstInvoice}
              submitLabel={isEditMode ? "Update Invoice" : "Create Invoice"}
            />
          </CardContent>
        </Card>
      </div>

      {/* নতুন item add করার modal — "+" button ba "Create as new product" theke */}
      <AddItemFormModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onItemCreated={handleNewProductCreated}
        initialItemName={newItemPrefillName}
      />
    </div>
  );
}

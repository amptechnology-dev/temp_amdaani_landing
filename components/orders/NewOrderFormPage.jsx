"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Hash,
  Sparkles,
  UserCircle2,
  ShoppingBag,
  PackageSearch,
  Search,
  Phone,
  X,
  Trash2,
  Loader2,
  Save,
  Truck,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "../../utils/api";
// Path ta tomar folder structure onujayi thik koro (invoice form-er sathe jekhane ache)
import AddItemFormModal from "../../components/invoice/AddItemFormModal";

const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const inputCls =
  "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";

// -------------------------------
// Inline product combobox for the "add row" (same as invoice form)
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
    const width = Math.max(rect.width, 320);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    setCoords({
      top: rect.bottom + 4,
      left: Math.min(rect.left, maxLeft),
      width,
    });
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
      if (highlightIndex === -1) {
        // Kichu highlight na thakle, search kora thakle prothom result add hobe
        if (query.trim() && filtered[0]) pick(filtered[0]);
        return;
      }
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
                  <p className="font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    HSN: {p.hsn || "-"} · {p.unit || "Pcs"}
                  </p>
                </div>
                <span className="text-blue-600 font-semibold text-xs shrink-0 ml-2">
                  {currency(p.sellingPrice)}
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

export default function NewOrderFormPage({
  customers = [],
  products = [],
  editOrder = null,
  nextOrderNumber,
  onBack,
  onSaved,
}) {
  const isEdit = Boolean(editOrder);

  // ── state ────────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState(
    editOrder ? String(editOrder.customer?._id || editOrder.customer || "") : "",
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);

  const [orderNumber, setOrderNumber] = useState(
    editOrder?.orderNumber || nextOrderNumber || "ORD-1",
  );
  const [orderDate, setOrderDate] = useState(
    editOrder?.orderDate ? toInputDate(editOrder.orderDate) : toInputDate(new Date()),
  );
  const [deliveryDate, setDeliveryDate] = useState(
    editOrder?.deliveryDate ? toInputDate(editOrder.deliveryDate) : "",
  );

  // Product list: parent-er list + modal theke notun banano product
  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => {
    setLocalProducts((prev) => {
      const ids = new Set(products.map((p) => p._id));
      const extra = prev.filter((p) => !ids.has(p._id));
      return [...extra, ...products];
    });
  }, [products]);

  const [items, setItems] = useState(() =>
    (editOrder?.items || []).map((it) => {
      const p = it.product && typeof it.product === "object" ? it.product : null;
      const id = String(p?._id || it.product || "");
      const master = products.find((x) => x._id === id);
      return {
        product: id,
        name: it.name || p?.name || master?.name || "Item",
        unit: it.unit || p?.unit || master?.unit || "",
        sellingPrice: String(it.sellingPrice ?? master?.sellingPrice ?? 0),
        quantity: String(it.quantity ?? 1),
      };
    }),
  );

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemPrefillName, setNewItemPrefillName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customerBoxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target)) {
        setCustomerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── customer ─────────────────────────────────────────────────────────
  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    const found = customers.find((c) => c._id === customerId);
    if (found) return found;
    if (editOrder?.customer && typeof editOrder.customer === "object") return editOrder.customer;
    if (editOrder) {
      return {
        _id: customerId,
        name: editOrder.customerName || editOrder.customerDetails?.name,
        mobile: editOrder.customerMobile || editOrder.customerDetails?.mobile,
      };
    }
    return null;
  }, [customerId, customers, editOrder]);

  const customerSuggestions = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const list = q
      ? customers.filter(
          (c) => c.name?.toLowerCase().includes(q) || c.mobile?.includes(q),
        )
      : customers;
    return list.slice(0, 8);
  }, [customers, customerQuery]);

  const pickCustomer = (c) => {
    setCustomerId(c._id);
    setCustomerQuery("");
    setCustomerOpen(false);
  };

  // ── products ─────────────────────────────────────────────────────────
  const addProduct = (p) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product === p._id);
      if (exists) {
        return prev.map((i) =>
          i.product === p._id ? { ...i, quantity: String(Number(i.quantity || 0) + 1) } : i,
        );
      }
      return [
        ...prev,
        {
          product: p._id,
          name: p.name,
          unit: p.unit || "",
          sellingPrice: String(p.sellingPrice ?? 0),
          quantity: "1",
        },
      ];
    });
  };

  const handleCreateNewProduct = (typedName) => {
    setNewItemPrefillName(typedName || "");
    setShowAddItemModal(true);
  };

  const handleNewProductCreated = (newItem) => {
    if (!newItem?._id) return;
    setLocalProducts((prev) => [newItem, ...prev.filter((p) => p._id !== newItem._id)]);
    addProduct(newItem);
    setNewItemPrefillName("");
  };

  const updateItem = (id, field, value) =>
    setItems((prev) => prev.map((i) => (i.product === id ? { ...i, [field]: value } : i)));

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.product !== id));

  const handleQtyChange = (id) => (e) =>
    updateItem(id, "quantity", e.target.value.replace(/[^\d]/g, ""));
  const handleQtyBlur = (id) => (e) => {
    const n = parseInt(e.target.value, 10);
    updateItem(id, "quantity", String(isNaN(n) || n < 1 ? 1 : n));
  };

  const handlePriceChange = (id) => (e) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    updateItem(id, "sellingPrice", v);
  };
  const handlePriceBlur = (id) => (e) => {
    const n = parseFloat(e.target.value);
    updateItem(id, "sellingPrice", String(isNaN(n) ? 0 : n));
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    const totalAmount = items.reduce(
      (s, i) => s + Number(i.sellingPrice || 0) * Number(i.quantity || 0),
      0,
    );
    return { totalQty, totalAmount };
  }, [items]);

  // ── submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerId) return toast.error("Please select a customer");
    if (!orderNumber.trim()) return toast.error("Order number is required");
    if (!orderDate) return toast.error("Order date is required");
    if (deliveryDate && deliveryDate < orderDate) {
      return toast.error("Delivery date cannot be before order date");
    }
    if (items.length === 0) return toast.error("Add at least one product");
    if (items.some((i) => Number(i.quantity) <= 0)) {
      return toast.error("Quantity must be at least 1");
    }

    const payload = {
      customer: customerId,
      orderNumber: orderNumber.trim(),
      orderDate,
      // null pathale edit-e delivery date clear kora jabe
      deliveryDate: deliveryDate || null,
      items: items.map((i) => ({
        product: i.product,
        sellingPrice: Number(i.sellingPrice) || 0,
        quantity: Number(i.quantity) || 0,
      })),
    };

    try {
      setIsSaving(true);
      const res = isEdit
        ? await api.put(`/order/id/${editOrder._id}`, payload)
        : await api.post("/order", payload);

      if (res?.success === false) throw new Error(res?.message || "Failed to save order");

      toast.success(isEdit ? "Order updated!" : "Order created!");
      onSaved();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save order",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5 pb-10">
        {/* Header */}
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />
          <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="icon"
                onClick={onBack}
                className="rounded-full border-slate-200 shrink-0 h-8 w-8"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {isEdit ? "Edit Order" : "New Order"}
                  </h1>
                  {isEdit && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs px-1.5 py-0">
                      Editing
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Select a customer and add products to {isEdit ? "update" : "take"} the order
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 rounded-full text-sm text-white font-semibold shadow-sm shadow-blue-200">
              <Hash className="w-3.5 h-3.5 text-blue-200" />
              {orderNumber || "-"}
            </div>
          </div>
        </div>

        {/* Order details + Customer */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-visible relative">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-slate-100 py-2 px-4 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
                <UserCircle2 className="w-3 h-3 text-white" />
              </span>
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Customer */}
              <div className="sm:col-span-2 relative" ref={customerBoxRef}>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Customer *
                </label>
                {selectedCustomer ? (
                  <div className="h-9 px-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/60">
                    <div className="min-w-0 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-slate-800 truncate">
                        {selectedCustomer.name || "Unnamed"}
                      </span>
                      {selectedCustomer.mobile && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                          <Phone className="w-3 h-3" />
                          {selectedCustomer.mobile}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerId("")}
                      className="text-xs text-rose-500 hover:underline font-medium flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3 h-3" />
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        value={customerQuery}
                        onChange={(e) => {
                          setCustomerQuery(e.target.value);
                          setCustomerOpen(true);
                        }}
                        onFocus={() => setCustomerOpen(true)}
                        placeholder="Search customer by name or mobile…"
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                    {customerOpen && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {customerSuggestions.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">
                            No customers found
                          </p>
                        ) : (
                          customerSuggestions.map((c) => (
                            <div
                              key={c._id}
                              onClick={() => pickCustomer(c)}
                              className="px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 hover:bg-blue-50"
                            >
                              <p className="font-medium text-slate-800 truncate">
                                {c.name || "Unnamed"}
                              </p>
                              <p className="text-xs text-slate-400">{c.mobile}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Order Number *
                </label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. ORD-1001"
                  className={inputCls}
                />
              </div>

              <div className="hidden lg:block" />

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Order Date *
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={orderDate || undefined}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={inputCls}
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
                {items.length > 0 && (
                  <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-xs">
                    {totals.totalQty} qty
                  </Badge>
                )}
              </span>
              <Button
                size="sm"
                onClick={() => {
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
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-blue-50/70 text-blue-900/70 text-xs uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-10">#</th>
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100">Product</th>
                  <th className="text-left font-semibold px-3 py-2.5 border-b border-blue-100 w-16">Unit</th>
                  <th className="text-center font-semibold px-3 py-2.5 border-b border-blue-100 w-24">Qty</th>
                  <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-28">Price</th>
                  <th className="text-right font-semibold px-3 py-2.5 border-b border-blue-100 w-28">Total</th>
                  <th className="w-12 border-b border-blue-100"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.product}
                    className={`hover:bg-blue-50/50 transition-colors ${
                      i % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100 font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">
                      {item.unit || "-"}
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={handleQtyChange(item.product)}
                        onBlur={handleQtyBlur(item.product)}
                        className="w-16 h-8 text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.sellingPrice}
                        onChange={handlePriceChange(item.product)}
                        onBlur={handlePriceBlur(item.product)}
                        className="w-24 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                      />
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-right font-bold text-blue-600">
                      {currency(Number(item.sellingPrice || 0) * Number(item.quantity || 0))}
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => removeItem(item.product)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-500 mx-auto"
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
                    {items.length + 1}
                  </td>
                  <td className="px-2 py-2.5">
                    <InlineProductCombobox
                      products={localProducts}
                      onSelect={addProduct}
                      onCreateNew={handleCreateNewProduct}
                    />
                  </td>
                  <td colSpan={5} className="px-3 py-2.5"></td>
                </tr>
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-t border-slate-100">
                <ShoppingBag className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-base font-medium text-slate-500">No items added yet</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  Start typing a product name above to add it
                </p>
              </div>
            )}

            {items.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {items.length} product{items.length > 1 ? "s" : ""} · {totals.totalQty} qty
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">Order Total</span>
                  <span className="text-xl font-extrabold text-blue-600">
                    {currency(totals.totalAmount)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSaving} className="rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEdit ? "Update Order" : "Save Order"}
          </Button>
        </div>
      </div>

      <AddItemFormModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        editItem={null}
        initialItemName={newItemPrefillName}
        onItemCreated={handleNewProductCreated}
      />
    </div>
  );
}
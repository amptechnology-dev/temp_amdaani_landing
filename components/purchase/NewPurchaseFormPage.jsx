"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Phone, User, Calendar, Hash, ShoppingBag,
  Truck, Sparkles, Search, Trash2, ChevronDown, FileText, MapPin, Building2, Locate, Plus, Percent,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import PurchaseSummary from "./PurchaseSummary";
import AddItemFormModal from "../../components/invoice/AddItemFormModal";

// -------------------------------
// Small inline product-combobox — "add row" row-e use hoy
// -------------------------------
function ProductPicker({ products, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.hsn?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  })();

  const pick = (product) => {
    onSelect(product);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search product to add..."
          className="w-full h-9 pl-7 pr-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>

      {open && (
        <div className="absolute z-30 left-0 right-0 top-10 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No products found</p>
          ) : (
            filtered.map((p) => (
              <div
                key={p._id}
                onClick={() => pick(p)}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400">
                    HSN: {p.hsn || "-"} · {p.unit || "Pcs"}
                  </p>
                </div>
                <span className="text-blue-600 font-semibold text-xs shrink-0 ml-2">
                  ₹{Number(p.costPrice ?? 0).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
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
}) {
  // -------------------------------
  // Vendor form state — vendor schema er sathe consistent (customer form er moto)
  // -------------------------------
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

  const [selectedVendorId, setSelectedVendorId] = useState(selectedVendor?._id || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ✅ EDIT MODE — vendors list loaded hobar por mobile diye match kore
  // dropdown-e select + lock kore dao
  useEffect(() => {
    if (!isEditMode || selectedVendorId || vendors.length === 0) return;
    if (!selectedVendor?.mobile) return;

    const matched = vendors.find((v) => v.mobile === selectedVendor.mobile);
    if (matched) {
      setSelectedVendorId(matched._id);
      setVendorForm({
        name: matched.name || "",
        mobile: matched.mobile || "",
        address: matched.address || "",
        city: matched.city || "",
        state: matched.state || "",
        postalCode: matched.postalCode || "",
        gstNumber: matched.gstNumber || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, vendors]);

  // ✅ Push vendorForm up to parent as selectedVendor whenever it changes
  useEffect(() => {
    const hasData = vendorForm.name || vendorForm.mobile;
    setSelectedVendor(hasData ? { _id: selectedVendorId || undefined, ...vendorForm } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorForm, selectedVendorId]);

  const isLocked = !!selectedVendorId;

  const filteredVendors = (() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vendors.slice(0, 20);
    return vendors.filter(
      (v) => v.name?.toLowerCase().includes(q) || v.mobile?.includes(q)
    );
  })();

  const pickVendor = (v) => {
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
    setDropdownOpen(false);
    setSearchTerm("");
  };

  const handleNewVendor = () => {
    setSelectedVendorId("");
    setVendorForm(emptyVendorForm);
    setDropdownOpen(false);
    setSearchTerm("");
  };

  const handleChangeVendor = () => {
    setSelectedVendorId("");
    setVendorForm(emptyVendorForm);
  };

  const updateField = (field) => (e) => {
    setVendorForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddRow = (product) => {
    addToCart(product);
  };

  const handleNewProductCreated = (newItem) => {
    setAllProducts?.((prev) => [newItem, ...prev]);
    addToCart(newItem);
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
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isEditMode ? "Edit Purchase" : "New Purchase"}
                </h1>
                {isEditMode && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Editing</Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Add a vendor and items to {isEditMode ? "update" : "record"} the purchase
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
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-2.5 px-4">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Vendor
              </span>
              {isLocked && (
                <button
                  onClick={handleChangeVendor}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Change
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* ── Select Vendor dropdown ── */}
            <div ref={wrapperRef} className="relative">
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Select Vendor
              </label>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50"
              >
                <span className={vendorForm.name || vendorForm.mobile ? "text-slate-800" : "text-slate-400"}>
                  {isLocked
                    ? `${vendorForm.name || "Unnamed"} — ${vendorForm.mobile || "-"}`
                    : vendorForm.name || vendorForm.mobile
                    ? "New vendor (typed manually)"
                    : "Select existing vendor or type new below"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name or mobile..."
                        className="w-full h-9 pl-8 pr-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNewVendor}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 border-b border-slate-100"
                  >
                    + New Vendor (type details manually)
                  </button>

                  <div className="max-h-56 overflow-y-auto">
                    {filteredVendors.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No vendors found</p>
                    ) : (
                      filteredVendors.map((v) => (
                        <div
                          key={v._id}
                          onClick={() => pickVendor(v)}
                          className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 ${
                            selectedVendorId === v._id ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">{v.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {v.mobile} {v.gstNumber ? `· ${v.gstNumber}` : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Field grid — mirrors vendor schema exactly ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.mobile}
                  onChange={updateField("mobile")}
                  disabled={isLocked}
                  maxLength={10}
                  placeholder="Mobile *"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.name}
                  onChange={updateField("name")}
                  disabled={isLocked}
                  placeholder="Name"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.gstNumber}
                  onChange={(e) =>
                    setVendorForm((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))
                  }
                  disabled={isLocked}
                  placeholder="GSTIN (optional)"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="relative sm:col-span-2 lg:col-span-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.address}
                  onChange={updateField("address")}
                  disabled={isLocked}
                  placeholder="Address"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={vendorForm.city}
                  onChange={updateField("city")}
                  disabled={isLocked}
                  placeholder="City"
                  className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={vendorForm.state}
                  onChange={updateField("state")}
                  disabled={isLocked}
                  placeholder="State"
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <div className="relative">
                  <Locate className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={vendorForm.postalCode}
                    onChange={updateField("postalCode")}
                    disabled={isLocked}
                    maxLength={6}
                    placeholder="Postal Code"
                    className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
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
                onClick={() => setShowAddItemModal(true)}
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
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-10">#</th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100">Product</th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-20">HSN</th>
                  <th className="text-left font-medium px-3 py-2 border-b border-slate-100 w-16">Unit</th>
                  <th className="text-center font-medium px-3 py-2 border-b border-slate-100 w-20">Qty</th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-24">Cost Price</th>
                  <th className="text-center font-medium px-3 py-2 border-b border-slate-100 w-32">Discount</th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-16">GST%</th>
                  <th className="text-right font-medium px-3 py-2 border-b border-slate-100 w-28">Total</th>
                  <th className="w-10 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item, i) => (
                  <tr key={item._id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100 font-medium text-slate-800">
                      {item.name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">{item.hsn || "-"}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-500">{item.unit || "Pcs"}</td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleUpdateQuantity(item._id, Number(e.target.value) || 0)}
                        className="w-16 h-8 text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.costPrice ?? 0}
                        onChange={(e) =>
                          handleUpdateItemField(item._id, "costPrice", Number(e.target.value) || 0)
                        }
                        className="w-20 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.purchaseDiscount ?? 0}
                          onChange={(e) =>
                            handleUpdateItemField(item._id, "purchaseDiscount", Number(e.target.value) || 0)
                          }
                          className="w-16 h-8 text-right px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItemField(
                              item._id,
                              "purchaseDiscountType",
                              (item.purchaseDiscountType || "amount") === "amount" ? "percent" : "amount"
                            )
                          }
                          title="Toggle discount type"
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          {(item.purchaseDiscountType || "amount") === "percent" ? (
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
                  <td className="px-3 py-2 text-slate-300">{cartItems.length + 1}</td>
                  <td colSpan={2} className="px-2 py-2">
                    <ProductPicker products={products} onSelect={handleAddRow} />
                  </td>
                  <td colSpan={7} className="px-3 py-2 text-xs text-slate-400">
                    Select an existing product above, or click "New Product" to create one
                  </td>
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
              disabled={!(vendorForm.name || vendorForm.mobile) || cartItems.length === 0}
              payment={payment}
              cartItems={cartItems}
              formValues={formValues}
              storedata={storedata}
              purchaseNumber={purchaseNumber}
              isGstInvoice={isGstInvoice}
              submitLabel={isEditMode ? "Update Purchase" : "Create Purchase"}
            />
          </CardContent>
        </Card>
      </div>

      {/* নতুন item add করার modal — "+ New Product" থেকে */}
      <AddItemFormModal
        open={showAddItemModal}
        onOpenChange={setShowAddItemModal}
        onItemCreated={handleNewProductCreated}
      />
    </div>
  );
}
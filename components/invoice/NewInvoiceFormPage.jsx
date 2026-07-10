"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  User,
  X,
  Calendar,
  Hash,
  ShoppingBag,
  UserCircle2,
  ReceiptText,
  Sparkles,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

import CartItems from "./CartItems";
import InvoiceSummary from "./InvoiceSummary";
import CustomerQuickForm from "./CustomerQuickForm";

export default function NewInvoiceFormPage({
  isLoading,
  isEditMode,
  invoiceNumber,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  cartItems,
  onOpenAddItems,
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
  handleRemoveItem,
  handleClearCart,
}) {
  const [mobileQuery, setMobileQuery] = useState(
    selectedCustomer?.mobile || "",
  );
  const [nameQuery, setNameQuery] = useState(selectedCustomer?.name || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAddNew(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ✅ Query na thakleo full list dekhabe (mobile app er moto) — query thakle filter hobe
  const filteredCustomers = (() => {
    const m = mobileQuery.trim().toLowerCase();
    const n = nameQuery.trim().toLowerCase();

    if (!m && !n) return customers.slice(0, 15);

    return customers.filter((c) => {
      const nameMatch = n ? c.name?.toLowerCase().includes(n) : true;
      const mobileMatch = m ? c.mobile?.includes(m) : true;
      return n && m ? nameMatch && mobileMatch : n ? nameMatch : mobileMatch;
    });
  })();

  const handleMobileChange = (v) => {
    setMobileQuery(v);
    setShowDropdown(true);
    setShowAddNew(false);
    if (selectedCustomer && v !== selectedCustomer.mobile)
      setSelectedCustomer(null);
  };
  const handleNameChange = (v) => {
    setNameQuery(v);
    setShowDropdown(true);
    setShowAddNew(false);
    if (selectedCustomer && v !== selectedCustomer.name)
      setSelectedCustomer(null);
  };
  const pickCustomer = (c) => {
    setSelectedCustomer(c);
    setMobileQuery(c.mobile || "");
    setNameQuery(c.name || "");
    setShowDropdown(false);
    setShowAddNew(false);
  };
  const clearInputs = () => {
    setMobileQuery("");
    setNameQuery("");
    setSelectedCustomer(null);
  };

  const handleQuickFormSave = (customer) => {
    pickCustomer(customer);
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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

        <div className="space-y-6">
          {/* LEFT — Customer + Items (2/3 width) */}
          <div className="space-y-6">
            {/* Customer */}
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-visible relative">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 rounded-t-2xl">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <UserCircle2 className="w-4.5 h-4.5 text-blue-600" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {selectedCustomer?.name || selectedCustomer?.mobile ? (
                  <div className="relative flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl">
                    <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {selectedCustomer.name || "Unnamed customer"}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedCustomer.mobile || "-"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearInputs}
                      className="text-blue-600 hover:bg-blue-100 rounded-full h-8 px-3 shrink-0"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div ref={wrapperRef} className="relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Customer Mobile"
                          className="pl-9 h-12 rounded-xl"
                          value={mobileQuery}
                          onChange={(e) => handleMobileChange(e.target.value)}
                          onFocus={() => setShowDropdown(true)}
                          maxLength={10}
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Customer Name"
                          className="pl-9 h-12 rounded-xl"
                          value={nameQuery}
                          onChange={(e) => handleNameChange(e.target.value)}
                          onFocus={() => setShowDropdown(true)}
                        />
                      </div>
                    </div>

                    {/* ✅ Dropdown: customer list + "Add New Customer" */}
                    {showDropdown && (
                      <div className="absolute z-20 left-0 right-0 top-[3.75rem] bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/60 overflow-hidden">
                        {showAddNew ? (
                          <div className="p-4 max-h-[28rem] overflow-y-auto">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-slate-700">
                                Add New Customer
                              </p>
                              <button
                                onClick={() => setShowAddNew(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <CustomerQuickForm
                              onSave={handleQuickFormSave}
                              onCancel={() => setShowAddNew(false)}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="max-h-64 overflow-y-auto p-2">
                              {filteredCustomers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">
                                  No customers found
                                </div>
                              ) : (
                                filteredCustomers.map((c) => (
                                  <div
                                    key={c._id}
                                    onClick={() => pickCustomer(c)}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">
                                        {c.name}
                                      </p>
                                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" />
                                        {c.mobile}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add new customer trigger */}
                            <button
                              onClick={() => setShowAddNew(true)}
                              className="w-full flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-medium text-sm transition-colors"
                            >
                              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white shrink-0">
                                <Plus className="w-4 h-4" />
                              </span>
                              Add New Customer
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-800">
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-blue-600" />
                    Products
                    {cartItems.length > 0 && (
                      <Badge className="ml-1 bg-blue-600 hover:bg-blue-600">
                        {invoiceCalculations.totalQuantity} items
                      </Badge>
                    )}
                  </span>
                  <Button
                    size="sm"
                    onClick={onOpenAddItems}
                    className="rounded-full"
                  >
                    {cartItems.length > 0 ? "Edit Items" : "+ Add Items"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <p className="text-slate-400 mb-4">
                      Start by adding items to your invoice
                    </p>
                    <Button
                      onClick={onOpenAddItems}
                      className="rounded-full px-8"
                    >
                      + Add Items
                    </Button>
                  </div>
                ) : (
                  <CartItems
                    cartItems={cartItems}
                    handleUpdateQuantity={handleUpdateQuantity}
                    handleRemoveItem={handleRemoveItem}
                    handleClearCart={handleClearCart}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary — full width, right below Products */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
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
                disabled={!selectedCustomer || cartItems.length === 0}
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
      </div>
    </div>
  );
}

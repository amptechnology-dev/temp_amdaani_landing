"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, Calendar, Hash, ShoppingBag, Truck, ReceiptText, Sparkles } from "lucide-react";

import VendorSearch from "./VendorSearch";
import PurchaseCartItems from "./PurchaseCartItems";
import PurchaseSummary from "./PurchaseSummary";
import PurchaseProductSearch from "./PurchaseProductSearch";
import RecentPurchasesPanel from "./RecentPurchasesPanel";
import AddPurchaseItemsPage from "./AddPurchaseItemsPage";

const openInPrintWindow = (html) => {
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

const useDebounce = (value, delay = 250) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

function determineGstType(storeGst, vendorGst, storeState, vendorState) {
  const extractStateCode = (gst) => gst?.substring(0, 2);
  let isIgst = false;
  if (storeGst && vendorGst) {
    const storeCode = extractStateCode(storeGst);
    const vendorCode = extractStateCode(vendorGst);
    if (storeCode && vendorCode && storeCode !== vendorCode) isIgst = true;
  } else if (storeState && vendorState) {
    if (storeState.trim().toLowerCase() !== vendorState.trim().toLowerCase()) isIgst = true;
  }
  return isIgst;
}

export default function NewPurchase() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const vendorSearchRef = useRef(null);

  // -------------------------------
  // State
  // -------------------------------
  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [step, setStep] = useState("form"); 
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  const [vendorSearch, setVendorSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);

  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [discount, setDiscount] = useState({ type: "flat", value: 0 });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");

  const hasUserEditedPaid = useRef(false);

  const [isEditDataLoading, setIsEditDataLoading] = useState(isEditMode);
  const [existingPurchaseId, setExistingPurchaseId] = useState(null);

  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);

  const [storedata, setStoredata] = useState({});
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState({ vendors: false, invoice: false });

  const debouncedVendorSearch = useDebounce(vendorSearch, 200);

  // -------------------------------
  // Cart handlers
  // -------------------------------
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p._id === product._id);
      if (existing) {
        // ✅ শুধু qty বাড়ে, previousQty field touch হয় না (RN behavior)
        return prev.map((p) => (p._id === product._id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [
        ...prev,
        {
          _id: product._id,
          product: product._id,
          name: product.name,
          costPrice: Number(product.costPrice || 0),
          purchaseDiscount: 0,
          gstRate: Number(product.purchaseGstRate ?? product.gstRate ?? 0),
          isPurchaseTaxInclusive: Boolean(product.isPurchaseTaxInclusive),
          unit: product.unit || "PCS",
          hsn: product.hsn || "",
          mrp: Number(product.mrp || 0),
          qty: 1,
          // ✅ নতুন item — previousQty ইচ্ছাকৃতভাবে সেট করছি না (RN fallback: item.previousQty ?? item.qty)
        },
      ];
    });
    hasUserEditedPaid.current = false;
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, qty: p.qty - 1 } : p)).filter((p) => p.qty > 0)
    );
    hasUserEditedPaid.current = false;
  };

  const handleUpdateQuantity = (id, qty) => {
    if (qty < 1) {
      setCartItems((p) => p.filter((i) => i._id !== id));
      return;
    }
    // ✅ শুধু qty বদলায়, previousQty অক্ষত থাকে
    setCartItems((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
    hasUserEditedPaid.current = false;
  };

  const handleRemoveItem = (id) => {
    setCartItems((p) => p.filter((i) => i._id !== id));
    hasUserEditedPaid.current = false;
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.info("Cart cleared");
    hasUserEditedPaid.current = false;
  };

  // -------------------------------
  // isIgst
  // -------------------------------
  const isIgst = useMemo(() => {
    return determineGstType(
      storedata?.gstNumber,
      selectedVendor?.gstNumber,
      storedata?.address?.state,
      selectedVendor?.state
    );
  }, [storedata, selectedVendor]);

  // -------------------------------
  // Purchase Calculations
  // -------------------------------
  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const gstBreakdown = {};

    const computedItems = (cartItems || []).map((item) => {
      const qty = Number(item.qty ?? 0);
      const rawCostPrice = Number(item.costPrice ?? 0);
      const purchaseDiscount = Number(item.purchaseDiscount ?? 0);
      const netRate = Math.max(0, rawCostPrice - purchaseDiscount);
      const gstRate = Number(item.gstRate ?? 0);
      const isPurchaseTaxInclusive = Boolean(item.isPurchaseTaxInclusive);

      let baseRate = 0;
      let taxableValue = 0;
      let gstAmount = 0;
      let totalAmount = 0;

      if (isPurchaseTaxInclusive) {
        baseRate = gstRate > 0 ? netRate / (1 + gstRate / 100) : netRate;
        taxableValue = baseRate * qty;
        gstAmount = taxableValue * (gstRate / 100);
        totalAmount = netRate * qty;
      } else {
        baseRate = netRate;
        taxableValue = netRate * qty;
        gstAmount = taxableValue * (gstRate / 100);
        totalAmount = taxableValue + gstAmount;
      }

      subtotal += taxableValue;
      totalTax += gstAmount;

      if (isGstInvoice && gstRate > 0) {
        const cgstAmount = isIgst ? 0 : gstAmount / 2;
        const sgstAmount = isIgst ? 0 : gstAmount / 2;
        const igstAmount = isIgst ? gstAmount : 0;

        if (!gstBreakdown[gstRate]) {
          gstBreakdown[gstRate] = { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalGst: 0 };
        }
        gstBreakdown[gstRate].taxableAmount += taxableValue;
        gstBreakdown[gstRate].cgstAmount += cgstAmount;
        gstBreakdown[gstRate].sgstAmount += sgstAmount;
        gstBreakdown[gstRate].igstAmount += igstAmount;
        gstBreakdown[gstRate].totalGst += gstAmount;
      }

      return {
        ...item,
        costPrice: rawCostPrice,
        purchaseDiscount,
        gstRate,
        isPurchaseTaxInclusive,
        baseRate,
        taxableValue,
        gstAmount,
        qty,
        total: Number(totalAmount.toFixed(4)),
        // ✅ previousQty pass-through (RN computedItems er moto)
        previousQty: item.previousQty ?? qty,
      };
    });

    const grandTotalRaw = subtotal + totalTax;

    let invoiceDiscountTotal = 0;
    if (discount?.type === "flat") {
      invoiceDiscountTotal = Number(discount?.value || 0);
    } else if (discount?.type === "percent") {
      invoiceDiscountTotal = grandTotalRaw * (Number(discount?.value || 0) / 100);
    }

    const netTotal = grandTotalRaw - invoiceDiscountTotal;
    const roundedTotal = Math.round(netTotal);
    const roundOff = Number((roundedTotal - netTotal).toFixed(2));

    const totalQuantity = computedItems.reduce((sum, it) => sum + (it.qty || 0), 0);

    return {
      subtotal,
      totalTax,
      netTotal,
      roundedTotal,
      roundOff,
      grandTotal: grandTotalRaw,
      grandTotalRaw,
      discountTotal: Number(invoiceDiscountTotal.toFixed(2)),
      totalQuantity,
      itemCount: computedItems.length,
      gstBreakdown: isGstInvoice ? gstBreakdown : {},
      computedItems,
    };
  }, [cartItems, isGstInvoice, discount, isIgst]);

  // -------------------------------
  // Payment
  // -------------------------------
  const payment = useMemo(() => {
    const grandTotal = Number(invoiceCalculations?.roundedTotal ?? invoiceCalculations?.netTotal ?? 0);
    const paid = Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0);
    const normPaid = Math.min(paid, grandTotal);
    const due = Math.max(0, grandTotal - normPaid);

    let status = "unpaid";
    if (normPaid === 0 && grandTotal > 0) status = "unpaid";
    else if (due === 0 && grandTotal > 0) status = "paid";
    else if (normPaid > 0 && normPaid < grandTotal) status = "partial";

    return { grandTotal, paid: normPaid, due, status };
  }, [invoiceCalculations?.netTotal, invoiceCalculations?.roundedTotal, paidAmount]);

  useEffect(() => {
    if (!hasUserEditedPaid.current && !isEditDataLoading) {
      const gt = Number(invoiceCalculations?.roundedTotal ?? invoiceCalculations?.netTotal ?? 0);
      setPaidAmount(gt);
    }
  }, [invoiceCalculations.netTotal, invoiceCalculations.roundedTotal, isEditDataLoading]);

  // -------------------------------
  // formValues
  // -------------------------------
  const formValues = useMemo(() => {
    if (!selectedVendor) return {};
    return {
      vendorNumber: selectedVendor.mobile || "",
      vendorName: selectedVendor.name || "",
      address: selectedVendor.address || "",
      state: selectedVendor.state || "",
      postalCode: selectedVendor.postalCode || "",
      gstNumber: selectedVendor.gstNumber || "",
    };
  }, [selectedVendor]);

  // -------------------------------
  // API
  // -------------------------------
  const fetchStoreData = async () => {
    try {
      const res = await api.get("/store");
      const data = res?.data || {};
      setStoredata(data);
      return data;
    } catch {
      setStoredata({});
      return {};
    }
  };

  const fetchNextPurchaseNumber = async () => {
    try {
      const res = await api.get("/purchase/last");
      const last = res?.data?.invoiceNumber?.split("-").pop() || 0;
      setPurchaseNumber(`PUR-${format(new Date(), "yy")}-${String(+last + 1).padStart(4, "0")}`);
    } catch {
      setPurchaseNumber(`PUR-${format(new Date(), "yy")}-0001`);
    }
  };

  const fetchVendors = async () => {
    setIsLoading((p) => ({ ...p, vendors: true }));
    try {
      const res = await api.get("/vendor?limit=500");
      setVendors(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setIsLoading((p) => ({ ...p, vendors: false }));
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await api.get("/product?page=1&limit=20");
      setAllProducts(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load products");
    }
  };

  // -------------------------------
  // Load existing purchase for edit
  // -------------------------------
  const loadPurchaseForEdit = async (id) => {
    setIsEditDataLoading(true);
    try {
      const res = await api.get(`/purchase/id/${id}`);
      const full = res?.data;

      if (!full) {
        toast.error("Purchase not found");
        setIsEditDataLoading(false);
        return;
      }

      const normalizedItems = (full.items || []).map((item) => {
        const originalQty = Number(item.quantity ?? item.qty ?? 0);
        return {
          _id: item.product || item._id || `${item.name}-${Math.random()}`,
          product: item.product || null,
          name: item.name,
          costPrice: Number(item.costPrice ?? item.rate ?? 0),
          purchaseDiscount: Number(item.purchaseDiscount ?? 0),
          gstRate: Number(item.gstRate ?? 0),
          isPurchaseTaxInclusive: item.isPurchaseTaxInclusive ?? false,
          hsn: item.hsn ?? "",
          unit: item.unit ?? "pcs",
          mrp: Number(item.mrp ?? 0),
          qty: originalQty,
          // ✅✅ ROOT FIX — original quantity সংরক্ষণ, RN normalizedItems এর মতো
          previousQty: originalQty,
        };
      });

      setCartItems(normalizedItems);
      setExistingPurchaseId(full._id);
      setPurchaseNumber(full.invoiceNumber);
      setIsGstInvoice(!!full.vendorGstNumber);

      setSelectedVendor({
        name: full.vendorName,
        mobile: full.vendorMobile,
        address: full.vendorAddress,
        gstNumber: full.vendorGstNumber || "",
        state: full.vendorState || "",
        postalCode: full.vendorPostalCode || "",
      });

      setDiscount({ type: "flat", value: Number(full.discountTotal || 0) });
      setPaymentMethod(full.paymentMethod || "cash");
      setPaymentNote(full.paymentNote || "");
      setPaidAmount(Number(full.amountPaid ?? full.grandTotal ?? 0));
      hasUserEditedPaid.current = true;
    } catch {
      toast.error("Failed to load purchase for editing");
    } finally {
      setIsEditDataLoading(false);
    }
  };

  // -------------------------------
  // Effects
  // -------------------------------
  useEffect(() => {
    const init = async () => {
      const store = await fetchStoreData();
      if (isEditMode) {
        await loadPurchaseForEdit(editId);
      } else {
        await fetchNextPurchaseNumber();
      }
      fetchVendors();
      fetchAllProducts();
    };
    init();
  }, [editId]);

  // ✅ Edit mode-e purono purchase (product field na thakle/mismatch hole)
  // name+hsn diye match kore _id/product ke actual product._id te sync kora
  // (previousQty field touch kori na — original quantity aksot thake)
  useEffect(() => {
    if (!isEditMode || allProducts.length === 0 || cartItems.length === 0) return;

    setCartItems((prev) =>
      prev.map((item) => {
        const alreadyMatched = allProducts.some((p) => p._id === item.product);
        if (alreadyMatched) return item;

        const matchedProduct = allProducts.find(
          (p) =>
            p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim() &&
            (p.hsn || "") === (item.hsn || "")
        );

        return matchedProduct
          ? { ...item, _id: matchedProduct._id, product: matchedProduct._id }
          : item;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, isEditMode]);

  useEffect(() => {
    if (!debouncedVendorSearch) {
      setFilteredVendors(vendors.slice(0, 10));
      return;
    }
    const term = debouncedVendorSearch.toLowerCase();
    setFilteredVendors(
      vendors.filter((v) => v.name?.toLowerCase().includes(term) || v.mobile?.includes(term))
    );
  }, [debouncedVendorSearch, vendors]);

  // -------------------------------
  // Handlers
  // -------------------------------
  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDropdown(false);
    setVendorSearch("");
    hasUserEditedPaid.current = false;
  };

  const handleCreatePurchase = async () => {
    if (!selectedVendor || cartItems.length === 0) return;

    // ✅ Guard: fake/invalid product id backend-e pathiye crash na kore tar jonno
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));

    const invalidItems = invoiceCalculations.computedItems.filter(
      (item) =>
        !isValidObjectId(item.product) ||
        !Number.isFinite(item.qty) ||
        item.qty <= 0
    );

    if (invalidItems.length > 0) {
      toast.error(
        `"${invalidItems[0].name}" ekhon ar valid product hishebe pawa jacche na. Item ta remove kore abar add korun.`
      );
      return;
    }

    setIsLoading((p) => ({ ...p, invoice: true }));

    try {
      const paymentStatus =
        payment.paid === 0 && payment.grandTotal > 0
          ? "unpaid"
          : payment.due === 0 && payment.grandTotal > 0
          ? "paid"
          : "partial";

      const purchaseData = {
        invoiceNumber: purchaseNumber,
        vendor: isEditMode ? undefined : selectedVendor._id || null,
        vendorName: selectedVendor.name,
        vendorMobile: selectedVendor.mobile,
        vendorAddress: selectedVendor.address || "",
        vendorGstNumber: selectedVendor.gstNumber || "",
        vendorState: selectedVendor.state || "",
        vendorPostalCode: selectedVendor.postalCode || "",
        date: format(new Date(), "yyyy-MM-dd"),
        isIgst,
        items: invoiceCalculations.computedItems.map((item) => ({
          product: item.product,
          name: item.name,
          hsn: item.hsn || "",
          unit: item.unit || "PCS",
          mrp: item.mrp || 0,
          costPrice: item.costPrice,
          rate: item.costPrice,
          purchaseDiscount: item.purchaseDiscount,
          gstRate: item.gstRate,
          isPurchaseTaxInclusive: !!item.isPurchaseTaxInclusive,
          quantity: item.qty,
          // ✅✅ ROOT FIX — এই field-টাই মিসিং ছিল, backend স্টক adjust করতে এটা ব্যবহার করে
          previousQuantity: Number(item.previousQty ?? item.qty ?? 0),
          baseRate: Number(item.baseRate.toFixed(2)),
          taxableValue: Number(item.taxableValue.toFixed(2)),
          gstAmount: Number(item.gstAmount.toFixed(2)),
          total: Number(item.total.toFixed(2)),
        })),
        subTotal: Number(invoiceCalculations.subtotal.toFixed(2)),
        gstTotal: Number(invoiceCalculations.totalTax.toFixed(2)),
        discountTotal: invoiceCalculations.discountTotal,
        roundOff: invoiceCalculations.roundOff,
        grandTotal: Number(invoiceCalculations.roundedTotal.toFixed(2)),
        amountPaid: Number(payment.paid.toFixed(2)),
        amountDue: Number(payment.due.toFixed(2)),
        paymentStatus,
        paymentMethod,
        paymentNote: paymentNote || "",
      };

      const res = isEditMode
        ? await api.put(`/purchase/id/${existingPurchaseId}`, purchaseData)
        : await api.post("/purchase", purchaseData);

      const html = generatePurchaseHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: res.data,
        formValues,
        cartItems: invoiceCalculations.computedItems,
        invoiceCalculations,
        invoiceNumber: purchaseNumber,
        storedata,
        invoiceDate: new Date(),
        isGstInvoice,
        payment: { paid: payment.paid, due: payment.due, status: paymentStatus },
      });

      openInPrintWindow(html);
      toast.success(isEditMode ? "Purchase updated!" : "Purchase created!");

      setPurchaseRefreshKey((k) => k + 1);

      if (isEditMode) {
        router.push("/dashboard/purchase");
      } else {
        setSelectedVendor(null);
        setCartItems([]);
        setPaidAmount(0);
        hasUserEditedPaid.current = false;
        setDiscount({ type: "flat", value: 0 });
        setPaymentMethod("cash");
        setPaymentNote("");
        await fetchNextPurchaseNumber();
      }
    } catch {
      toast.error(isEditMode ? "Purchase update failed" : "Purchase creation failed");
    } finally {
      setIsLoading((p) => ({ ...p, invoice: false }));
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className={`min-h-screen ${currentTheme.background}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isEditMode ? "Edit Purchase" : "Create New Purchase"}
                </h1>
                {isEditMode && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Editing</Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Record stock purchased from your vendor
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

       {isEditDataLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            Loading purchase details...
          </div>
        ) : step === "items" ? (
          <AddPurchaseItemsPage
            products={allProducts}
            cartItems={cartItems}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onCancel={() => setStep("form")}
            onConfirm={() => setStep("form")}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <Truck className="w-4.5 h-4.5 text-blue-600" />
                    Vendor
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <VendorSearch
                    vendorSearchRef={vendorSearchRef}
                    vendorSearch={vendorSearch}
                    setVendorSearch={setVendorSearch}
                    showVendorDropdown={showVendorDropdown}
                    setShowVendorDropdown={setShowVendorDropdown}
                    filteredVendors={filteredVendors}
                    selectedVendor={selectedVendor}
                    isLoading={isLoading.vendors}
                    handleVendorSelect={handleVendorSelect}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-800">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4.5 h-4.5 text-blue-600" />
                      Items
                      {cartItems.length > 0 && (
                        <Badge className="ml-1 bg-blue-600 hover:bg-blue-600">
                          {invoiceCalculations.totalQuantity} items
                        </Badge>
                      )}
                    </span>
                    {cartItems.length > 0 && (
                      <Button size="sm" onClick={() => setStep("items")} className="rounded-full">
                        Edit Items
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <p className="text-slate-400 mb-4">
                        Start by adding items to this purchase
                      </p>
                      <Button onClick={() => setStep("items")} className="rounded-full px-8">
                        + Add Items
                      </Button>
                    </div>
                  ) : (
                    <PurchaseCartItems
                      cartItems={cartItems}
                      handleUpdateQuantity={handleUpdateQuantity}
                      handleRemoveItem={handleRemoveItem}
                      handleClearCart={handleClearCart}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT */}
            <div className="space-y-6 lg:sticky lg:top-6">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <ReceiptText className="w-4.5 h-4.5 text-blue-600" />
                    Purchase Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <PurchaseSummary
                    discount={discount}
                    setDiscount={setDiscount}
                    invoiceCalculations={invoiceCalculations}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    paidAmount={paidAmount}
                    setPaidAmount={(val) => {
                      hasUserEditedPaid.current = true;
                      setPaidAmount(val);
                    }}
                    paymentNote={paymentNote}
                    setPaymentNote={setPaymentNote}
                    handleCreatePurchase={handleCreatePurchase}
                    isLoading={isLoading.invoice}
                    disabled={!selectedVendor || cartItems.length === 0}
                    payment={payment}
                    cartItems={invoiceCalculations.computedItems}
                    formValues={formValues}
                    storedata={storedata}
                    purchaseNumber={purchaseNumber}
                    isGstInvoice={isGstInvoice}
                    submitLabel={isEditMode ? "Update Purchase" : "Create Purchase"}
                  />
                </CardContent>
              </Card>

              <RecentPurchasesPanel limit={8} refreshKey={purchaseRefreshKey} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
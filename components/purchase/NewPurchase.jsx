"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

import PurchaseListPage from "./PurchaseListPage";
import NewPurchaseFormPage from "./NewPurchaseFormPage";
import AddPurchaseItemsPage from "./AddPurchaseItemsPage";

function determineGstType(storeGst, vendorGst, storeState, vendorState) {
  const extractStateCode = (gst) => gst?.substring(0, 2);
  let isIgst = false;
  if (storeGst && vendorGst) {
    const a = extractStateCode(storeGst);
    const b = extractStateCode(vendorGst);
    if (a && b && a !== b) isIgst = true;
  } else if (storeState && vendorState) {
    if (storeState.trim().toLowerCase() !== vendorState.trim().toLowerCase())
      isIgst = true;
  }
  return isIgst;
}

export default function PurchaseFlow() {
  // step: "list" | "form" | "items"
  const { isMrpEnabled } = useAuth();
  const [step, setStep] = useState("list");
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);

  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  const [allProducts, setAllProducts] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [discount, setDiscount] = useState({ type: "flat", value: 0 });
  const [paymentMethod] = useState("cash");
  const [paymentNote] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const hasUserEditedPaid = useRef(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [existingPurchaseId, setExistingPurchaseId] = useState(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [storedata, setStoredata] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isIgst = useMemo(
    () =>
      determineGstType(
        storedata?.gstNumber,
        selectedVendor?.gstNumber,
        storedata?.address?.state,
        selectedVendor?.state,
      ),
    [storedata, selectedVendor],
  );

  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const gstBreakdown = {};

    const computedItems = (cartItems || []).map((item) => {
      const qty = Number(item.qty ?? 0);
      const rawCostPrice = Number(item.costPrice ?? 0);
      const discountType = item.purchaseDiscountType || "amount";
      const rawDiscountInput = Number(item.purchaseDiscount ?? 0);
      const purchaseDiscount =
        discountType === "percentage"
          ? (rawCostPrice * rawDiscountInput) / 100
          : rawDiscountInput;
      const netRate = Math.max(0, rawCostPrice - purchaseDiscount);
      const gstRate = Number(item.gstRate ?? 0);
      const isPurchaseTaxInclusive = Boolean(item.isPurchaseTaxInclusive);

      let baseRate = 0,
        taxableValue = 0,
        gstAmount = 0,
        totalAmount = 0;

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
          gstBreakdown[gstRate] = {
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalGst: 0,
          };
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
        purchaseDiscount: rawDiscountInput,
        purchaseDiscountType: discountType,
        gstRate,
        isPurchaseTaxInclusive,
        baseRate,
        taxableValue,
        gstAmount,
        qty,
        total: Number(totalAmount.toFixed(4)),
        previousQty: item.previousQty ?? qty,
      };
    });

    const grandTotalRaw = subtotal + totalTax;
    let invoiceDiscountTotal = 0;
    if (discount?.type === "percent") {
      invoiceDiscountTotal =
        grandTotalRaw * (Number(discount?.value || 0) / 100);
    } else {
      invoiceDiscountTotal = Number(discount?.value || 0);
    }

    const netTotal = grandTotalRaw - invoiceDiscountTotal;
    const roundedTotal = Math.round(netTotal);
    const roundOff = Number((roundedTotal - netTotal).toFixed(2));
    const totalQuantity = computedItems.reduce(
      (sum, it) => sum + (it.qty || 0),
      0,
    );

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

  const payment = useMemo(() => {
    const grandTotal = Number(
      invoiceCalculations?.roundedTotal ?? invoiceCalculations?.netTotal ?? 0,
    );
    const paid = Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0);
    const normPaid = Math.min(paid, grandTotal);
    const due = Math.max(0, grandTotal - normPaid);
    let status = "unpaid";
    if (normPaid === 0 && grandTotal > 0) status = "unpaid";
    else if (due === 0 && grandTotal > 0) status = "paid";
    else if (normPaid > 0 && normPaid < grandTotal) status = "partial";
    return { grandTotal, paid: normPaid, due, status };
  }, [
    invoiceCalculations?.netTotal,
    invoiceCalculations?.roundedTotal,
    paidAmount,
  ]);

  useEffect(() => {
    if (!hasUserEditedPaid.current) {
      const gt = Number(
        invoiceCalculations?.roundedTotal ?? invoiceCalculations?.netTotal ?? 0,
      );
      setPaidAmount(gt);
    }
  }, [invoiceCalculations.netTotal, invoiceCalculations.roundedTotal]);

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
      setPurchaseNumber(
        `PUR-${format(new Date(), "yy")}-${String(+last + 1).padStart(4, "0")}`,
      );
    } catch {
      setPurchaseNumber(`PUR-${format(new Date(), "yy")}-0001`);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get("/vendor?limit=500");
      setVendors(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load vendors");
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await api.get("/product?page=1&limit=100");
      setAllProducts(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchAllProducts();
  }, []);

  // ✅ Edit mode e product id mismatch fix (name+hsn diye match)
  useEffect(() => {
    if (!isEditMode || allProducts.length === 0 || cartItems.length === 0)
      return;
    setCartItems((prev) =>
      prev.map((item) => {
        const alreadyMatched = allProducts.some((p) => p._id === item.product);
        if (alreadyMatched) return item;
        const matchedProduct = allProducts.find(
          (p) =>
            p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim() &&
            (p.hsn || "") === (item.hsn || ""),
        );
        return matchedProduct
          ? { ...item, _id: matchedProduct._id, product: matchedProduct._id }
          : item;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, isEditMode]);

  // -------------------------------
  // Reset / Navigation
  // -------------------------------
  const resetFormState = async () => {
    setSelectedVendor(null);
    setCartItems([]);
    setPaidAmount(0);
    hasUserEditedPaid.current = false;
    setIsEditMode(false);
    setExistingPurchaseId(null);
    const store = await fetchStoreData();
    await fetchNextPurchaseNumber();
    await fetchAllProducts(); // ✅ প্রতিবার fresh product data আনো
    return store;
  };

  const handleStartNewPurchase = async () => {
    setIsFormLoading(true);
    await resetFormState();
    setIsFormLoading(false);
    setStep("form");
  };

  const handleEditPurchase = async (purchaseId) => {
    setIsFormLoading(true);
    setStep("form");
    try {
      await fetchStoreData();
      await fetchAllProducts();
      const res = await api.get(`/purchase/id/${purchaseId}`);
      const full = res?.data;
      if (!full) {
        toast.error("Purchase not found");
        setStep("list");
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
          purchaseDiscountType: item.purchaseDiscountType || "amount",
          gstRate: Number(item.gstRate ?? 0),
          isPurchaseTaxInclusive: item.isPurchaseTaxInclusive ?? false,
          hsn: item.hsn ?? "",
          unit: item.unit ?? "pcs",
          mrp: Number(item.mrp ?? 0),
          qty: originalQty,
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
      setPaidAmount(Number(full.amountPaid ?? full.grandTotal ?? 0));
      hasUserEditedPaid.current = true;
      setIsEditMode(true);
    } catch {
      toast.error("Failed to load purchase for editing");
      setStep("list");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBackToList = () => setStep("list");

  // -------------------------------
  // Cart handlers
  // -------------------------------
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p._id === product._id);
      if (existing)
        return prev.map((p) =>
          p._id === product._id ? { ...p, qty: p.qty + 1 } : p,
        );

      const purchaseDiscountType = product.purchaseDiscountType || "amount";
      const purchaseDiscountDisplayValue =
        purchaseDiscountType === "percentage"
          ? Number(product.purchaseDiscountPercentage || 0)
          : Number(product.purchaseDiscount || 0);

      return [
        ...prev,
        {
          _id: product._id,
          product: product._id,
          name: product.name,
          costPrice: Number(product.costPrice || 0),
          purchaseDiscount: purchaseDiscountDisplayValue,
          purchaseDiscountType,
          gstRate: Number(product.purchaseGstRate ?? product.gstRate ?? 0),
          isPurchaseTaxInclusive: Boolean(product.isPurchaseTaxInclusive),
          unit: product.unit || "PCS",
          hsn: product.hsn || "",
          mrp: Number(product.mrp || 0),
          qty: 1,
        },
      ];
    });
    hasUserEditedPaid.current = false;
  };

  const handleUpdateItemField = (id, field, value) => {
    setCartItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, [field]: value } : i)),
    );
    hasUserEditedPaid.current = false;
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) =>
      prev
        .map((p) => (p._id === productId ? { ...p, qty: p.qty - 1 } : p))
        .filter((p) => p.qty > 0),
    );
    hasUserEditedPaid.current = false;
  };

  const handleUpdateQuantity = (id, qty) => {
    if (qty < 1) {
      setCartItems((p) => p.filter((i) => i._id !== id));
      return;
    }
    setCartItems((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
    hasUserEditedPaid.current = false;
  };

  const handleRemoveItem = (id) => {
    setCartItems((p) => p.filter((i) => i._id !== id));
    hasUserEditedPaid.current = false;
  };

  const handleClearCart = () => {
    setCartItems([]);
    hasUserEditedPaid.current = false;
  };

  // -------------------------------
  // Create / Update
  // -------------------------------
  const handleCreatePurchase = async () => {
    // ✅ vendor mandatory na — shudhu cart empty check thakbe
    if (cartItems.length === 0) return null;

    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));
    const invalidItems = invoiceCalculations.computedItems.filter(
      (item) =>
        !isValidObjectId(item.product) ||
        !Number.isFinite(item.qty) ||
        item.qty <= 0,
    );
    if (invalidItems.length > 0) {
      toast.error(
        `"${invalidItems[0].name}" ekhon ar valid product hishebe pawa jacche na. Item ta remove kore abar add korun.`,
      );
      return null;
    }

    setIsSubmitting(true);
    try {
      const paymentStatus =
        payment.paid === 0 && payment.grandTotal > 0
          ? "unpaid"
          : payment.due === 0 && payment.grandTotal > 0
            ? "paid"
            : "partial";

      // ✅ vendor na thakle "Walk-in Vendor" fallback
      const vendor = selectedVendor || { name: "Walk-in Vendor", mobile: "" };

      const purchaseData = {
        invoiceNumber: purchaseNumber,
        vendor: isEditMode ? undefined : vendor._id || null,
        vendorName: vendor.name,
        vendorMobile: vendor.mobile,
        vendorAddress: vendor.address || "",
        vendorGstNumber: vendor.gstNumber || "",
        vendorState: vendor.state || "",
        vendorPostalCode: vendor.postalCode || "",
        date: format(new Date(), "yyyy-MM-dd"),
        isIgst,
        items: invoiceCalculations.computedItems.map((item) => {
          const rawCostPrice = Number(item.costPrice ?? 0);
          const discountType = item.purchaseDiscountType || "amount";
          const rawDiscountInput = Number(item.purchaseDiscount ?? 0);
          const actualDiscountAmount =
            discountType === "percentage"
              ? (rawCostPrice * rawDiscountInput) / 100
              : rawDiscountInput;

          return {
            product: item.product,
            name: item.name,
            hsn: item.hsn || "",
            unit: item.unit || "PCS",
            mrp: item.mrp || 0,
            costPrice: item.costPrice,
            rate: item.costPrice,
            purchaseDiscount: Number(actualDiscountAmount.toFixed(2)),
            purchaseDiscountType: discountType,
            gstRate: item.gstRate,
            isPurchaseTaxInclusive: !!item.isPurchaseTaxInclusive,
            quantity: item.qty,
            previousQuantity: Number(item.previousQty ?? item.qty ?? 0),
            baseRate: Number(item.baseRate.toFixed(2)),
            taxableValue: Number(item.taxableValue.toFixed(2)),
            gstAmount: Number(item.gstAmount.toFixed(2)),
            total: Number(item.total.toFixed(2)),
          };
        }),
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
        isMrpEnabled,
        payment: {
          paid: payment.paid,
          due: payment.due,
          status: paymentStatus,
        },
      });

      toast.success(isEditMode ? "Purchase updated!" : "Purchase created!");
      setPurchaseRefreshKey((k) => k + 1);

      // ⚠️ resetFormState() + setStep("list") ekhon r ekhane call hocche na.
      // Modal close howar por handlePurchaseModalClose e giye reset hobe.

      return html;
    } catch (error) {
      toast.error(error?.message || "Purchase creation failed");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseModalClose = async () => {
    await resetFormState();
    setStep("list");
  };

  // -------------------------------
  // Render — step switch
  // -------------------------------
  if (step === "list") {
    return (
      <PurchaseListPage
        refreshKey={purchaseRefreshKey}
        onCreateNew={handleStartNewPurchase}
        onEditPurchase={handleEditPurchase}
      />
    );
  }

  if (step === "items") {
    return (
      <AddPurchaseItemsPage
        products={allProducts}
        cartItems={cartItems}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onCancel={() => setStep("form")}
        onConfirm={() => setStep("form")}
      />
    );
  }

  return (
    <NewPurchaseFormPage
      isLoading={isFormLoading}
      isEditMode={isEditMode}
      purchaseNumber={purchaseNumber}
      setPurchaseNumber={setPurchaseNumber}
      vendors={vendors}
      selectedVendor={selectedVendor}
      setSelectedVendor={setSelectedVendor}
      cartItems={invoiceCalculations.computedItems}
      products={allProducts}
      addToCart={addToCart}
      setAllProducts={setAllProducts}
      onBack={handleBackToList}
      onPurchaseModalClose={handlePurchaseModalClose}
      invoiceCalculations={invoiceCalculations}
      paymentMethod={paymentMethod}
      paymentNote={paymentNote}
      payment={payment}
      handleCreatePurchase={handleCreatePurchase}
      isSubmitting={isSubmitting}
      formValues={formValues}
      storedata={storedata}
      isGstInvoice={isGstInvoice}
      isMrpEnabled={isMrpEnabled}
      handleUpdateQuantity={handleUpdateQuantity}
      handleUpdateItemField={handleUpdateItemField}
      handleRemoveItem={handleRemoveItem}
      handleClearCart={handleClearCart}
      onRefreshProducts={fetchAllProducts}
      discount={discount}
      setDiscount={setDiscount}
    />
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "../../utils/api";
import { generateInvoiceHTML } from "../../utils/invoiceTemplate";
import { useAuth } from "../../context/AuthContext";

import InvoiceListPage from "./InvoiceList";
import NewInvoiceFormPage from "./NewInvoiceFormPage";
import AddItemsPage from "./AddItemsPage";

const openInvoiceInPrintWindow = (html) => {
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4)
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
}

function parseInvoiceNumber(invoiceNo) {
  const parts = invoiceNo.split("-");
  if (parts.length === 3) {
    const [prefix, financialYear, sequentialNo] = parts;
    return { prefix, financialYear, sequentialNo: parseInt(sequentialNo, 10) };
  }
  return { prefix: "INV", financialYear: getFinancialYear(), sequentialNo: 1 };
}

function incrementInvoiceNumber(currentInvoiceNo, storeInfo) {
  const { financialYear, sequentialNo } = parseInvoiceNumber(currentInvoiceNo);
  const prefix = storeInfo?.settings?.invoicePrefix || "INV";
  const currentFY = getFinancialYear();

  if (financialYear !== currentFY) {
    return `${prefix}-${currentFY}-1`;
  }
  return `${prefix}-${currentFY}-${sequentialNo + 1}`;
}

function determineGstType(storeGst, customerGst, storeState, customerState) {
  const extractStateCode = (gst) => gst?.substring(0, 2);
  let isIgst = false;
  if (storeGst && customerGst) {
    const a = extractStateCode(storeGst);
    const b = extractStateCode(customerGst);
    if (a && b && a !== b) isIgst = true;
  } else if (storeState && customerState) {
    if (storeState.trim().toLowerCase() !== customerState.trim().toLowerCase())
      isIgst = true;
  }
  return isIgst;
}

// -------------------------------------------------------------
// ⚠️ IMPORTANT — DISCOUNT PERSISTENCE STRATEGY
// -------------------------------------------------------------
// Backend Invoice schema-te item-er `discountType` field save hoy na
// (schema-te define kora nei, ar backend access nei tai oi dik theke
// fix kora jacche na). Mobile app kokhono percent-discount UI support
// kore na — always rupee-amount discount pathay. Fole mobile-er kono
// mismatch hoy na, karon save-hoye-jawa "amount" fallback always thik.
//
// Web-e percent-discount UI ache (user-friendliness-er jonno), kintu
// backend-e pathanor thik age eta rupee-amount-e convert kore dei —
// exactly mobile-er moto. Fole edit/view korar somoy discountType
// fallback ("amount") always thik thakbe, karon stored value already
// rupee-e — kokhono percent-mismatch hobe na.
// -------------------------------------------------------------

// -------------------------------
// MAIN — orchestrates step navigation: list -> form -> items -> back to form
// -------------------------------
export default function SalesFlow() {
  const { isMrpEnabled } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState("list");
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  const [allProducts, setAllProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [discount, setDiscount] = useState({ type: "flat", value: 0 });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [remarks, setRemarks] = useState("");

  const hasUserEditedPaid = useRef(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [existingInvoiceId, setExistingInvoiceId] = useState(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [storedata, setStoredata] = useState({});
  const [afterStoredata, setAfterStoredata] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isIgst = useMemo(() => {
    return determineGstType(
      storedata?.gstNumber,
      selectedCustomer?.gstNumber,
      storedata?.address?.state,
      selectedCustomer?.state,
    );
  }, [storedata, selectedCustomer]);

  // -------------------------------
  // Invoice calculations
  // -------------------------------
  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const gstBreakdown = {};

    const computedItems = (cartItems || []).map((item) => {
      const gstRate = Number(item.gstRate || 0);
      const qty = Number(item.qty || 0);
      const sellingPriceRaw = Number(item.sellingPrice ?? item.price ?? 0);
      const discountType = item.discountType || "amount";

      let rawDiscountInput = Number(item.discount || 0);
      if (discountType === "percent") {
        rawDiscountInput = Math.min(Math.max(rawDiscountInput, 0), 100);
      } else {
        rawDiscountInput = Math.max(rawDiscountInput, 0);
      }

      // per-unit discount, converted to rupees regardless of discountType
      const itemDiscount =
        discountType === "percent"
          ? (sellingPriceRaw * rawDiscountInput) / 100
          : rawDiscountInput;
      const isTaxInclusive = Boolean(item.isTaxInclusive);
      const sellingPrice = Math.max(0, sellingPriceRaw - itemDiscount);

      let baseRate = 0,
        taxableValue = 0,
        gstAmount = 0,
        totalAmount = 0;

      if (isGstInvoice) {
        if (isTaxInclusive) {
          baseRate = sellingPriceRaw / (1 + gstRate / 100);
          taxableValue = (sellingPrice / (1 + gstRate / 100)) * qty;
          gstAmount = taxableValue * (gstRate / 100);
          totalAmount = sellingPrice * qty;
        } else {
          baseRate = sellingPriceRaw;
          taxableValue = sellingPrice * qty;
          gstAmount = taxableValue * (gstRate / 100);
          totalAmount = taxableValue + gstAmount;
        }
        subtotal += totalAmount;
        totalTax += gstAmount;

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
      } else {
        baseRate = sellingPriceRaw;
        taxableValue = sellingPrice * qty;
        totalAmount = taxableValue;
        subtotal += totalAmount;
      }

      return {
        ...item,
        baseRate,
        discount: rawDiscountInput,
        discountType,
        // ✅ NEW FIELD — always in rupees per unit. This is what gets
        // persisted to backend regardless of the UI discountType toggle.
        discountInRupees: Number(itemDiscount.toFixed(2)),
        mrp: Number(item.mrp || 0),
        taxableValue,
        gstAmount,
        total: Number(totalAmount),
        qty,
        price: sellingPriceRaw,
        gstRate,
        isTaxInclusive,
      };
    });

    const grandTotalRaw = subtotal;
    let discountTotal = 0;
    if (discount?.type === "flat") discountTotal = Number(discount?.value || 0);
    else if (discount?.type === "percent")
      discountTotal = grandTotalRaw * (Number(discount?.value || 0) / 100);

    const netTotal = Math.round(grandTotalRaw - discountTotal);
    const rawDifference =
      Math.round(grandTotalRaw - discountTotal) -
      (grandTotalRaw - discountTotal);
    const roundOff = Number((rawDifference + Number.EPSILON).toFixed(2));
    const totalQuantity = computedItems.reduce((s, it) => s + (it.qty || 0), 0);

    return {
      subtotal,
      netTotal,
      roundOff,
      totalTax: isGstInvoice ? totalTax : 0,
      grandTotal: grandTotalRaw,
      grandTotalRaw,
      discountTotal: Number(discountTotal.toFixed(2)),
      totalQuantity,
      itemCount: computedItems.length,
      gstBreakdown: isGstInvoice ? gstBreakdown : {},
      computedItems,
    };
  }, [cartItems, isGstInvoice, discount, isIgst]);

  const payment = useMemo(() => {
    const grandTotal = Number(invoiceCalculations?.netTotal ?? 0);
    const paid = Math.max(0, Number.isFinite(paidAmount) ? paidAmount : 0);
    const normPaid = Math.min(paid, grandTotal);
    const due = Math.max(0, grandTotal - normPaid);
    let status = "unpaid";
    if (normPaid === 0 && grandTotal > 0) status = "unpaid";
    else if (due === 0 && grandTotal > 0) status = "paid";
    else if (normPaid > 0 && normPaid < grandTotal) status = "partial";
    return { grandTotal, paid: normPaid, due, status };
  }, [invoiceCalculations?.netTotal, paidAmount]);

  useEffect(() => {
    if (!hasUserEditedPaid.current)
      setPaidAmount(invoiceCalculations.netTotal || 0);
  }, [invoiceCalculations.netTotal]);

  const formValues = useMemo(() => {
    if (!selectedCustomer) return {};
    return {
      contactNumber: selectedCustomer.mobile || "",
      customerName: selectedCustomer.name || "",
      customerAddress: selectedCustomer.address || "",
      customerState: selectedCustomer.state || "",
      customerGstNumber: selectedCustomer.gstNumber || "",
    };
  }, [selectedCustomer]);

  // -------------------------------
  // Data fetchers
  // -------------------------------
  const fetchStoreData = async () => {
    try {
      const res = await api.get("/store");
      const data = res?.data || {};
      setStoredata(data);
      return data;
    } catch {
      return {};
    }
  };

  const fetchLastInvoice = async (storeInfo = storedata) => {
    try {
      const res = await api.get("/invoice/last");
      const prefix = storeInfo?.settings?.invoicePrefix || "INV";
      const startNo = storeInfo?.settings?.invoiceStartNumber || 1;
      const currentFY = getFinancialYear();

      const hasValidInvoice =
        (res?.success === undefined || res?.success === true) &&
        res?.data?.invoiceNumber;

      if (hasValidInvoice) {
        const newInvoiceNo = incrementInvoiceNumber(
          res.data.invoiceNumber,
          storeInfo,
        );
        setInvoiceNumber(newInvoiceNo);

        setAfterStoredata({
          address: res.data?.address,
          bankDetails: res.data?.bankDetails,
          name: res.data?.name,
          settings: res.data?.settings,
          contactNo: res.data?.contactNo,
          logoUrl: res.data?.logoUrl,
          gstNumber: res.data?.gstNumber,
          signatureUrl: res.data?.signatureUrl,
        });
      } else {
        setInvoiceNumber(`${prefix}-${currentFY}-${startNo}`);
      }
    } catch {
      const prefix = storeInfo?.settings?.invoicePrefix || "INV";
      const startNo = storeInfo?.settings?.invoiceStartNumber || 1;
      setInvoiceNumber(`${prefix}-${getFinancialYear()}-${startNo}`);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customer?limit=500");
      setCustomers(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load customers");
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
    fetchCustomers();
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (!isEditMode || allProducts.length === 0 || cartItems.length === 0)
      return;

    setCartItems((prev) =>
      prev.map((item) => {
        const alreadyMatched = allProducts.some((p) => p._id === item._id);
        if (alreadyMatched) return item;

        const matchedProduct = allProducts.find(
          (p) =>
            p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim() &&
            (p.hsn || "") === (item.hsn || ""),
        );

        return matchedProduct ? { ...item, _id: matchedProduct._id } : item;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, isEditMode]);

  const resetFormState = async () => {
    setSelectedCustomer(null);
    setCartItems([]);
    setPaidAmount(0);
    hasUserEditedPaid.current = false;
    setDiscount({ type: "flat", value: 0 });
    setPaymentMethod("cash");
    setPaymentNote("");
    setRemarks("");
    setIsEditMode(false);
    setExistingInvoiceId(null);
    const store = await fetchStoreData();
    await fetchLastInvoice(store);
  };

  const handleStartNewInvoice = async () => {
    setIsFormLoading(true);
    await resetFormState();
    setIsFormLoading(false);
    setStep("form");
  };

  const autoStartHandledRef = useRef(false);

  useEffect(() => {
    if (autoStartHandledRef.current) return;
    const shouldAutoStart = searchParams.get("new") === "true";
    if (!shouldAutoStart) return;

    autoStartHandledRef.current = true;
    handleStartNewInvoice();
    router.replace("/dashboard/sales");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleEditInvoice = async (invoiceId, targetStep = "form") => {
    setIsFormLoading(true);
    setStep(targetStep);
    try {
      const store = await fetchStoreData();
      const res = await api.get(`/invoice/id/${invoiceId}`);
      const fullInvoice = res?.data;
      if (!fullInvoice) {
        toast.error("Invoice not found");
        setStep("list");
        return;
      }

      // ✅ DB-te discountType kokhono save hoy na, kintu discount value
      // shomoyi rupee-amount-e save kora thake (creation-er shomoy ei
      // file-e amra oitai kori). Tai edit-e load korar shomoy discountType
      // shomoy "amount" dhora — eta CORRECT, karon stored discount shomoy
      // amount-i, kokhono percent na.
      const normalizedItems = (fullInvoice.items || []).map((item) => ({
        _id: item.productId || item._id || `${item.name}-${Math.random()}`,
        name: item.name,
        sellingPrice: Number(item.sellingPrice ?? item.price ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        isTaxInclusive: item.isTaxInclusive ?? false,
        discount: Number(item.discount ?? 0),
        discountType: "amount", // stored discount always in rupees
        hsn: item.hsn ?? "",
        unit: item.unit ?? "pcs",
        mrp: Number(item.mrp ?? 0),
        qty: Number(item.quantity ?? item.qty ?? 0),
      }));

      setCartItems(normalizedItems);
      setExistingInvoiceId(fullInvoice._id);
      setInvoiceNumber(fullInvoice.invoiceNumber);
      setIsGstInvoice(fullInvoice.type === "gst");
      setSelectedCustomer({
        name: fullInvoice.customerName,
        mobile: fullInvoice.customerMobile,
        address: fullInvoice.customerAddress,
        gstNumber: fullInvoice.customerGstNumber || "",
        state: fullInvoice.customerState || "",
      });
      setDiscount({
        type: "flat",
        value: Number(fullInvoice.discountTotal || 0),
      });
      setPaymentMethod(fullInvoice.paymentMethod || "cash");
      setPaymentNote(fullInvoice.paymentNote || "");
      setRemarks(fullInvoice.remarks || "");
      setPaidAmount(
        Number(fullInvoice.amountPaid ?? fullInvoice.grandTotal ?? 0),
      );
      hasUserEditedPaid.current = true;
      setIsEditMode(true);
    } catch {
      toast.error("Failed to load invoice for editing");
      setStep("list");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBackToList = () => setStep("list");

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p._id === product._id);
      if (existing)
        return prev.map((p) =>
          p._id === product._id ? { ...p, qty: p.qty + 1 } : p,
        );

      const productDiscountType =
        product.discountType === "percentage" ? "percent" : "amount";
      const productDiscountValue =
        productDiscountType === "percent"
          ? Number(product.discountPercentage || 0)
          : Number(product.discountPrice || 0);

      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          sellingPrice: Number(product.sellingPrice || 0),
          gstRate: Number(product.gstRate || 0),
          isTaxInclusive: Boolean(product.isTaxInclusive),
          unit: product.unit || "PCS",
          hsn: product.hsn || "",
          mrp: Number(product.mrp || 0),
          discount: productDiscountValue,
          discountType: productDiscountType,
          qty: 1,
        },
      ];
    });
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

  const handleUpdateQuantities = (id, qty) => {
    if (qty < 1) {
      setCartItems((p) => p.filter((i) => i._id !== id));
      return;
    }
    setCartItems((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
    hasUserEditedPaid.current = false;
  };

  const handleUpdateItemField = (id, field, value) => {
    setCartItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, [field]: value } : i)),
    );
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

  const setItemQty = (productId, qty) => {
    if (qty < 1) {
      setCartItems((p) => p.filter((i) => i._id !== productId));
      return;
    }
    setCartItems((p) =>
      p.map((i) => (i._id === productId ? { ...i, qty } : i)),
    );
    hasUserEditedPaid.current = false;
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || cartItems.length === 0) return null;
    setIsSubmitting(true);
    try {
      const finalGrandTotal = Number(invoiceCalculations.netTotal || 0);

      // ✅ race-condition fix — submit-er thik muhurte netTotal/paidAmount
      // shorasori use koro, stale `payment` memoized object er upor bhorosa
      // na kore (item/discount ekhoni edit kore turant Create Invoice
      // click korle useEffect tokhono paidAmount sync kore ni thakte pare).
      const finalPaid = hasUserEditedPaid.current
        ? Math.min(Math.max(0, Number(paidAmount) || 0), finalGrandTotal)
        : finalGrandTotal;
      const finalDue = Math.max(0, finalGrandTotal - finalPaid);

      const paymentStatus =
        finalPaid === 0 && finalGrandTotal > 0
          ? "unpaid"
          : finalDue === 0 && finalGrandTotal > 0
            ? "paid"
            : "partial";

      const invoiceData = {
        invoiceNumber,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        customerAddress: selectedCustomer.address || "",
        customerGstNumber: selectedCustomer.gstNumber || "",
        customerState: selectedCustomer.state || "",
        type: isGstInvoice ? "gst" : "non-gst",
        isIgst,
        items: invoiceCalculations.computedItems.map((item) => ({
          productId: item._id,
          name: item.name,
          hsn: item.hsn || "",
          unit: item.unit || "PCS",
          sellingPrice: item.price,
          gstRate: item.gstRate,
          isTaxInclusive: !!item.isTaxInclusive,
          quantity: item.qty,
          // ✅ FIX: shomoyi RUPEE-AMOUNT pathao, percent hok ba amount UI-te
          // — exactly mobile-er moto. Backend discountType save kore na
          // (access nei fix korar), tai eituku frontend-e resolve kore
          // dile edit/view korar shomoy r kokhono mismatch hobe na.
          discount: item.discountInRupees,
          discountType: "amount",
          mrp: item.mrp > 0 ? item.mrp : null,
          total: Number(item.total.toFixed(2)),
        })),
        subTotal: Number(invoiceCalculations.subtotal.toFixed(2)),
        gstTotal: Number(
          (isGstInvoice ? invoiceCalculations.totalTax : 0).toFixed(2),
        ),
        discountTotal: invoiceCalculations.discountTotal,
        roundOff: invoiceCalculations.roundOff,
        grandTotal: Number(finalGrandTotal.toFixed(2)),
        amountPaid: Number(finalPaid.toFixed(2)),
        amountDue: Number(finalDue.toFixed(2)),
        paymentStatus,
        paymentMethod,
        paymentNote: paymentNote || "",
        remarks: remarks || "",
      };

      const res = isEditMode
        ? await api.put(`/invoice/id/${existingInvoiceId}`, invoiceData)
        : await api.post("/invoice", invoiceData);

      const html = generateInvoiceHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: res.data,
        formValues,
        cartItems: invoiceCalculations.computedItems,
        invoiceCalculations,
        invoiceNumber,
        storedata:
          Object.keys(afterStoredata).length > 0 ? afterStoredata : storedata,
        invoiceDate: new Date(),
        isGstInvoice,
        isMrpEnabled,
        payment: {
          paid: finalPaid,
          due: finalDue,
          status: paymentStatus,
        },
      });

      toast.success(isEditMode ? "Invoice updated!" : "Invoice created!");
      setInvoiceRefreshKey((k) => k + 1);

      return html;
    } catch {
      toast.error(
        isEditMode ? "Invoice update failed" : "Invoice creation failed",
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceModalClose = async () => {
    await resetFormState();
    setStep("list");
  };

  if (step === "list") {
    return (
      <InvoiceListPage
        refreshKey={invoiceRefreshKey}
        onCreateNew={handleStartNewInvoice}
        onEditInvoice={(invoiceId) => handleEditInvoice(invoiceId, "form")}
        onEditItems={(invoiceId) => handleEditInvoice(invoiceId, "items")}
      />
    );
  }

  if (step === "items") {
    return (
      <AddItemsPage
        products={allProducts}
        cartItems={cartItems}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onCancel={() => setStep("form")}
        onConfirm={() => setStep("form")}
        onProductCreated={(newItem) => {
          setAllProducts((prev) => [newItem, ...prev]);
        }}
      />
    );
  }

  return (
    <NewInvoiceFormPage
      isLoading={isFormLoading}
      isEditMode={isEditMode}
      invoiceNumber={invoiceNumber}
      customers={customers}
      selectedCustomer={selectedCustomer}
      setSelectedCustomer={setSelectedCustomer}
      cartItems={invoiceCalculations.computedItems}
      products={allProducts}
      addToCart={addToCart}
      onOpenAddItems={() => setStep("items")}
      onBack={handleBackToList}
      onInvoiceModalClose={handleInvoiceModalClose}
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
      remarks={remarks}
      setRemarks={setRemarks}
      payment={payment}
      handleCreateInvoice={handleCreateInvoice}
      isSubmitting={isSubmitting}
      formValues={formValues}
      storedata={
        Object.keys(afterStoredata).length > 0 ? afterStoredata : storedata
      }
      isGstInvoice={isGstInvoice}
      isMrpEnabled={isMrpEnabled}
      handleUpdateQuantity={handleUpdateQuantities}
      handleUpdateItemField={handleUpdateItemField}
      handleRemoveItem={handleRemoveItem}
      handleClearCart={handleClearCart}
      setAllProducts={setAllProducts}
    />
  );
}
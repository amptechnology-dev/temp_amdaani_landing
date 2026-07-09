"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

// UI
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  ArrowLeft,
  Calendar,
  Hash,
  ShoppingBag,
  UserCircle2,
  ReceiptText,
  Sparkles,
} from "lucide-react";

// Components
import CustomerSearch from "./CustomerSearch";
import CartItems from "./CartItems";
import InvoiceSummary from "./InvoiceSummary";
import ProductList from "./ProductSearch";
import InvoiceList from "./InvoiceList";

// -------------------------------
// Utils
// -------------------------------
const openInvoiceInPrintWindow = (html) => {
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

function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) {
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  }
  return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
}

function parseInvoiceNumber(invoiceNo) {
  const parts = invoiceNo.split("-");
  if (parts.length === 3) {
    const [prefix, financialYear, sequentialNo] = parts;
    return { prefix, financialYear, sequentialNo: parseInt(sequentialNo, 10) };
  }
  if (parts.length === 2) {
    const [prefix, sequentialNo] = parts;
    return {
      prefix,
      financialYear: getFinancialYear(),
      sequentialNo: parseInt(sequentialNo, 10),
    };
  }
  return { prefix: "INV", financialYear: getFinancialYear(), sequentialNo: 1 };
}

function determineGstType(storeGst, customerGst, storeState, customerState) {
  const extractStateCode = (gst) => gst?.substring(0, 2);
  let isIgst = false;

  if (storeGst && customerGst) {
    const storeCode = extractStateCode(storeGst);
    const customerCode = extractStateCode(customerGst);
    if (storeCode && customerCode && storeCode !== customerCode) {
      isIgst = true;
    }
  } else if (storeState && customerState) {
    if (
      storeState.trim().toLowerCase() !== customerState.trim().toLowerCase()
    ) {
      isIgst = true;
    }
  }
  return isIgst;
}

// -------------------------------
// MAIN
// -------------------------------
export default function NewSalePage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);

  // -------------------------------
  // State
  // -------------------------------
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isGstInvoice, setIsGstInvoice] = useState(true);

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [discount, setDiscount] = useState({ type: "flat", value: 0 });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [remarks, setRemarks] = useState("");

  const hasUserEditedPaid = useRef(false);

  const [isEditDataLoading, setIsEditDataLoading] = useState(isEditMode);
  const [existingInvoiceId, setExistingInvoiceId] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  const [storedata, setStoredata] = useState({});
  const [afterStoredata, setAfterStoredata] = useState({});

  // ✅ নতুন invoice তৈরি হলে RecentInvoices/InvoiceList কে refresh করাতে
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState({
    customers: false,
    products: false,
    invoice: false,
  });

  const debouncedCustomerSearch = useDebounce(customerSearch, 200);

  // -------------------------------
  // Cart handlers
  // -------------------------------
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p._id === product._id);
      if (existing) {
        return prev.map((p) =>
          p._id === product._id ? { ...p, qty: p.qty + 1 } : p,
        );
      }
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
          discount: 0,
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
    toast.info("Cart cleared");
    hasUserEditedPaid.current = false;
  };

  // -------------------------------
  // ✅ isIgst
  // -------------------------------
  const isIgst = useMemo(() => {
    const customerGst = selectedCustomer?.gstNumber;
    const customerState = selectedCustomer?.state;
    return determineGstType(
      storedata?.gstNumber,
      customerGst,
      storedata?.address?.state,
      customerState,
    );
  }, [storedata, selectedCustomer]);

  // -------------------------------
  // ✅ Invoice Calculations
  // -------------------------------
  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const gstBreakdown = {};

    const computedItems = (cartItems || []).map((item) => {
      const gstRate = Number(item.gstRate || 0);
      const qty = Number(item.qty || 0);
      const sellingPriceRaw = Number(item.sellingPrice ?? item.price ?? 0);
      const itemDiscount = Number(item.discount || 0);
      const isTaxInclusive = Boolean(item.isTaxInclusive);

      const sellingPrice = Math.max(0, sellingPriceRaw - itemDiscount);

      let baseRate = 0;
      let taxableValue = 0;
      let gstAmount = 0;
      let totalAmount = 0;

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
        gstAmount = 0;
        totalAmount = taxableValue;
        subtotal += totalAmount;
      }

      return {
        ...item,
        baseRate,
        discount: itemDiscount,
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
    if (discount?.type === "flat") {
      discountTotal = Number(discount?.value || 0);
    } else if (discount?.type === "percent") {
      discountTotal = grandTotalRaw * (Number(discount?.value || 0) / 100);
    }

    const grandTotalAfterDiscount = grandTotalRaw;
    const netTotal = Math.round(grandTotalAfterDiscount - discountTotal);
    const rawDifference =
      Math.round(grandTotalAfterDiscount - discountTotal) -
      (grandTotalAfterDiscount - discountTotal);
    const roundOff = Number((rawDifference + Number.EPSILON).toFixed(2));

    const totalQuantity = computedItems.reduce(
      (sum, it) => sum + (it.qty || 0),
      0,
    );

    return {
      subtotal,
      netTotal,
      roundOff,
      totalTax: isGstInvoice ? totalTax : 0,
      grandTotal: grandTotalAfterDiscount,
      grandTotalRaw,
      discountTotal: Number(discountTotal.toFixed(2)),
      discountAmount: Number(discountTotal.toFixed(2)),
      totalQuantity,
      itemCount: computedItems.length,
      gstBreakdown: isGstInvoice ? gstBreakdown : {},
      computedItems,
    };
  }, [cartItems, isGstInvoice, discount, isIgst]);

  // -------------------------------
  // ✅ Payment
  // -------------------------------
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
    if (!hasUserEditedPaid.current && !isEditDataLoading) {
      setPaidAmount(invoiceCalculations.netTotal || 0);
    }
  }, [invoiceCalculations.netTotal, isEditDataLoading]);

  // -------------------------------
  // ✅ formValues
  // -------------------------------
  const formValues = useMemo(() => {
    if (!selectedCustomer) return {};
    return {
      contactNumber: selectedCustomer.mobile || "",
      customerName: selectedCustomer.name || "",
      customerAddress: selectedCustomer.address || "",
      customerState: selectedCustomer.state || "",
      customerPostalCode: selectedCustomer.postalCode || "",
      customerGstNumber: selectedCustomer.gstNumber || "",
    };
  }, [selectedCustomer]);

  // -------------------------------
  // Store data
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

  const fetchLastInvoice = async (storeInfo = storedata) => {
    try {
      const res = await api.get("/invoice/last");
      const prefix = storeInfo?.settings?.invoicePrefix || "INV";
      const startNo = storeInfo?.settings?.invoiceStartNumber || 1;
      const currentFY = getFinancialYear();

      if (res?.data?.invoiceNumber) {
        const { financialYear, sequentialNo } = parseInvoiceNumber(
          res.data.invoiceNumber,
        );

        const nextNumber =
          financialYear !== currentFY
            ? `${prefix}-${currentFY}-1`
            : `${prefix}-${currentFY}-${sequentialNo + 1}`;

        setInvoiceNumber(nextNumber);

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
      const currentFY = getFinancialYear();
      setInvoiceNumber(`${prefix}-${currentFY}-${startNo}`);
    }
  };

  const fetchCustomers = async () => {
    setIsLoading((p) => ({ ...p, customers: true }));
    try {
      const res = await api.get("/customer?limit=500");
      setCustomers(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setIsLoading((p) => ({ ...p, customers: false }));
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
  // ✅ Load existing invoice for edit mode
  // -------------------------------
  const loadInvoiceForEdit = async (id) => {
    setIsEditDataLoading(true);
    try {
      const res = await api.get(`/invoice/id/${id}`);
      const fullInvoice = res?.data;

      if (!fullInvoice) {
        toast.error("Invoice not found");
        setIsEditDataLoading(false);
        return;
      }

      const normalizedItems = (fullInvoice.items || []).map((item) => ({
        _id: item.productId || item._id || `${item.name}-${Math.random()}`, // ✅ productId কে আগে রাখুন
        name: item.name,
        sellingPrice: Number(item.sellingPrice ?? item.price ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        isTaxInclusive: item.isTaxInclusive ?? false,
        discount: Number(item.discount ?? 0),
        hsn: item.hsn ?? "",
        unit: item.unit ?? "pcs",
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
        postalCode: fullInvoice.customerPostalCode || "",
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
    } catch {
      toast.error("Failed to load invoice for editing");
    } finally {
      setIsEditDataLoading(false);
    }
  };

  // -------------------------------
  // ✅ Effects
  // -------------------------------
  useEffect(() => {
    const init = async () => {
      const store = await fetchStoreData();

      if (isEditMode) {
        await loadInvoiceForEdit(editId);
      } else {
        await fetchLastInvoice(store);
      }

      fetchCustomers();
      fetchAllProducts();
    };
    init();
  }, [editId]);

  useEffect(() => {
  if (!isEditMode || allProducts.length === 0 || cartItems.length === 0) return;

  setCartItems((prev) =>
    prev.map((item) => {
      const alreadyMatched = allProducts.some((p) => p._id === item._id);
      if (alreadyMatched) return item;

      const matchedProduct = allProducts.find(
        (p) =>
          p.name?.toLowerCase().trim() === item.name?.toLowerCase().trim() &&
          (p.hsn || "") === (item.hsn || "")
      );

      return matchedProduct ? { ...item, _id: matchedProduct._id } : item;
    })
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [allProducts, isEditMode]);

  useEffect(() => {
    if (!debouncedCustomerSearch) {
      setFilteredCustomers(customers.slice(0, 10));
      return;
    }
    const term = debouncedCustomerSearch.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) => c.name?.toLowerCase().includes(term) || c.mobile?.includes(term),
      ),
    );
  }, [debouncedCustomerSearch, customers]);

  // -------------------------------
  // Handlers
  // -------------------------------
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearch("");
    hasUserEditedPaid.current = false;
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;

    setIsLoading((p) => ({ ...p, invoice: true }));

    try {
      const paymentStatus =
        payment.paid === 0 && payment.grandTotal > 0
          ? "unpaid"
          : payment.due === 0 && payment.grandTotal > 0
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
          discount: item.discount,
          total: Number(item.total.toFixed(2)),
        })),
        subTotal: Number(invoiceCalculations.subtotal.toFixed(2)),
        gstTotal: Number(
          (isGstInvoice ? invoiceCalculations.totalTax : 0).toFixed(2),
        ),
        discountTotal: invoiceCalculations.discountTotal,
        roundOff: invoiceCalculations.roundOff,
        grandTotal: Number(invoiceCalculations.netTotal.toFixed(2)),
        amountPaid: Number(payment.paid.toFixed(2)),
        amountDue: Number(payment.due.toFixed(2)),
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
        payment: {
          paid: payment.paid,
          due: payment.due,
          status: paymentStatus,
        },
      });

      openInvoiceInPrintWindow(html);
      toast.success(isEditMode ? "Invoice updated!" : "Invoice created!");

      // ✅ InvoiceList/RecentInvoices কে জানাচ্ছি নতুন invoice এসেছে, refresh করো
      setInvoiceRefreshKey((k) => k + 1);

      if (isEditMode) {
        router.push("/dashboard/invoices");
      } else {
        setSelectedCustomer(null);
        setCartItems([]);
        setPaidAmount(0);
        hasUserEditedPaid.current = false;
        setDiscount({ type: "flat", value: 0 });
        setPaymentMethod("cash");
        setPaymentNote("");
        setRemarks("");
        await fetchLastInvoice(storedata);
      }
    } catch {
      toast.error(
        isEditMode ? "Invoice update failed" : "Invoice creation failed",
      );
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
        {/* ---------------- HEADER ---------------- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {isEditMode ? "Edit Invoice" : "Create New Invoice"}
                </h1>
                {isEditMode && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    Editing
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Fill in the details below to{" "}
                {isEditMode ? "update the" : "generate a"} GST-ready invoice
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

        {isEditDataLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            Loading invoice details...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ---------------- LEFT (2/3) ---------------- */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <UserCircle2 className="w-4.5 h-4.5 text-blue-600" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <CustomerSearch
                    customerSearchRef={customerSearchRef}
                    customerSearch={customerSearch}
                    setCustomerSearch={setCustomerSearch}
                    showCustomerDropdown={showCustomerDropdown}
                    setShowCustomerDropdown={setShowCustomerDropdown}
                    filteredCustomers={filteredCustomers}
                    selectedCustomer={selectedCustomer}
                    isLoading={isLoading.customers}
                    handleCustomerSelect={handleCustomerSelect}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <ShoppingBag className="w-4.5 h-4.5 text-blue-600" />
                    Products
                    {cartItems.length > 0 && (
                      <Badge className="ml-1 bg-blue-600 hover:bg-blue-600">
                        {invoiceCalculations.totalQuantity} items
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <ProductList
                    products={allProducts}
                    cartItems={cartItems}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                  />

                  <CartItems
                    cartItems={cartItems}
                    handleUpdateQuantity={handleUpdateQuantity}
                    handleRemoveItem={handleRemoveItem}
                    handleClearCart={handleClearCart}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ---------------- RIGHT (1/3) — sticky stack ---------------- */}
            <div className="space-y-6 lg:sticky lg:top-6">
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    <ReceiptText className="w-4.5 h-4.5 text-blue-600" />
                    Invoice Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <InvoiceSummary
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
                    handleCreateInvoice={handleCreateInvoice}
                    isLoading={isLoading.invoice}
                    disabled={!selectedCustomer || cartItems.length === 0}
                    payment={payment}
                    cartItems={invoiceCalculations.computedItems}
                    formValues={formValues}
                    storedata={
                      Object.keys(afterStoredata).length > 0
                        ? afterStoredata
                        : storedata
                    }
                    invoiceNumber={invoiceNumber}
                    isGstInvoice={isGstInvoice}
                    submitLabel={
                      isEditMode ? "Update Invoice" : "Create Invoice"
                    }
                  />
                </CardContent>
              </Card>

              {/* ✅ layout bug fix — এটা আলাদা grid item না, sticky stack-এর ভেতরে */}
              <InvoiceList limit={8} refreshKey={invoiceRefreshKey} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

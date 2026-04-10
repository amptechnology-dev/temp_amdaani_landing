"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

// UI
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { ArrowLeft, Calendar, Hash, FileText } from "lucide-react";

// Components
import CustomerSearch from "./CustomerSearch";
import ProductSearch from "./ProductSearch";
import CartItems from "./CartItems";
import InvoiceSummary from "./InvoiceSummary";
import ProductList from "./ProductSearch";

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

// -------------------------------
// MAIN
// -------------------------------
export default function NewSalePage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

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

  // Data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [isLoading, setIsLoading] = useState({
    customers: false,
    products: false,
    invoice: false,
  });

  const debouncedCustomerSearch = useDebounce(customerSearch, 200);
  const debouncedProductSearch = useDebounce(productSearch, 200);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p._id === product._id);

      if (existing) {
        return prev.map((p) =>
          p._id === product._id ? { ...p, qty: p.qty + 1 } : p
        );
      }

      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          price: product.sellingPrice,
          gstRate: product.gstRate || 0,
          isTaxInclusive: product.isTaxInclusive,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) =>
      prev
        .map((p) => (p._id === productId ? { ...p, qty: p.qty - 1 } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const getCartQty = (productId) =>
    cartItems.find((p) => p._id === productId)?.qty || 0;

  // -------------------------------
  // Invoice Calculations (UNCHANGED)
  // -------------------------------
  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    cartItems.forEach((item) => {
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      const gstRate = Number(item.gstRate || 0);

      let lineTotal = price * qty;

      if (isGstInvoice && gstRate > 0 && !item.isTaxInclusive) {
        totalTax += (lineTotal * gstRate) / 100;
        lineTotal += (lineTotal * gstRate) / 100;
      }

      subtotal += lineTotal;
    });

    const discountAmount =
      discount.type === "percent"
        ? (subtotal * discount.value) / 100
        : discount.value;

    const netTotal = Math.max(0, subtotal - discountAmount);
    const roundedTotal = Math.round(netTotal);
    const roundOff = roundedTotal - netTotal;

    return {
      subtotal,
      totalTax,
      discountAmount,
      netTotal,
      roundOff,
    };
  }, [cartItems, discount, isGstInvoice]);

  // -------------------------------
  // Effects
  // -------------------------------
  useEffect(() => {
    fetchInvoiceNumber();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!debouncedCustomerSearch) {
      setFilteredCustomers(customers.slice(0, 10));
      return;
    }

    const term = debouncedCustomerSearch.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) => c.name?.toLowerCase().includes(term) || c.mobile?.includes(term)
      )
    );
  }, [debouncedCustomerSearch, customers]);

  useEffect(() => {
    if (paidAmount === 0 && invoiceCalculations.netTotal > 0) {
      setPaidAmount(invoiceCalculations.netTotal);
    }
  }, [invoiceCalculations.netTotal]);

  // -------------------------------
  // API
  // -------------------------------
  const fetchInvoiceNumber = async () => {
    try {
      const res = await api.get("/invoice/last");
      const last = res?.data?.invoiceNumber?.split("-").pop() || 0;
      setInvoiceNumber(
        `INV-${format(new Date(), "yy")}-${String(+last + 1).padStart(4, "0")}`
      );
    } catch {
      setInvoiceNumber(`INV-${format(new Date(), "yy")}-0001`);
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

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      const res = await api.get("/product?page=1&limit=20");
      setAllProducts(res?.data?.docs || []);
    } catch (e) {
      toast.error("Failed to load products");
    }
  };

  // -------------------------------
  // Handlers
  // -------------------------------
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  };

  const handleProductSelect = (product) => {
    const exist = cartItems.find((i) => i._id === product._id);
    if (exist) {
      setCartItems((p) =>
        p.map((i) => (i._id === product._id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setCartItems((p) => [
        ...p,
        {
          _id: product._id,
          name: product.name,
          price: product.sellingPrice,
          gstRate: product.gstRate,
          isTaxInclusive: product.isTaxInclusive,
          qty: 1,
        },
      ]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleUpdateQuantity = (id, qty) => {
    if (qty < 1) {
      setCartItems((p) => p.filter((i) => i._id !== id));
      return;
    }
    setCartItems((p) => p.map((i) => (i._id === id ? { ...i, qty } : i)));
  };

  const handleRemoveItem = (id) => {
    setCartItems((p) => p.filter((i) => i._id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.info("Cart cleared");
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;

    setIsLoading((p) => ({ ...p, invoice: true }));

    try {
      const res = await api.post("/invoice", {
        invoiceNumber,
        customerName: selectedCustomer.name,
        items: cartItems,
        grandTotal: invoiceCalculations.netTotal,
        amountPaid: paidAmount,
        paymentMethod,
        remarks,
      });

      const html = generateInvoiceHTML({
        invoiceData: res.data,
        cartItems,
        invoiceCalculations,
        invoiceNumber,
        isGstInvoice,
      });

      openInvoiceInPrintWindow(html);

      setSelectedCustomer(null);
      setCartItems([]);
      setPaidAmount(0);
      fetchInvoiceNumber();
    } catch {
      toast.error("Invoice creation failed");
    } finally {
      setIsLoading((p) => ({ ...p, invoice: false }));
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className={`min-h-screen ${currentTheme.background} p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => history.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Create New Invoice</h1>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-card p-2 rounded">
              <Calendar className="w-4 h-4" />
              {format(new Date(), "dd MMM yyyy")}
            </div>
            <div className="flex items-center gap-2 bg-card p-2 rounded">
              <Hash className="w-4 h-4" />
              {invoiceNumber}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent>
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

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

          {/* RIGHT */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
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
                isLoading={isLoading.invoice}
                disabled={!selectedCustomer || cartItems.length === 0}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

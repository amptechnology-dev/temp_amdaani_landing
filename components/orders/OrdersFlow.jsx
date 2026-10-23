"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "../../utils/api";

import OrderListPage from "./OrderList";
import NewOrderFormPage from "./NewOrderFormPage";

// -------------------------------------------------------------
// Orders orchestrator: list <-> form (new / edit)
// "Create Invoice" Sales page-e redirect kore (SalesFlow ?fromOrder=ID)
// -------------------------------------------------------------
export default function OrdersFlow() {
  const [step, setStep] = useState("list");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/order?limit=200&sort=-createdAt");
      const list = res?.data?.docs ?? res?.data;
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customer?limit=500");
      setCustomers(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load customers");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/product?page=1&limit=500");
      setProducts(res?.data?.docs || []);
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, [fetchOrders]);

  // Ager order number theke next number (ORD-1001 -> ORD-1002)
  const nextOrderNumber = useMemo(() => {
    let max = 0;
    let prefix = "ORD-";
    orders.forEach((o) => {
      const m = String(o.orderNumber || "").match(/^(.*?)(\d+)$/);
      if (m) {
        const n = parseInt(m[2], 10);
        if (n > max) {
          max = n;
          prefix = m[1] || prefix;
        }
      }
    });
    return `${prefix}${max + 1}`;
  }, [orders]);

  const handleCreateNew = () => {
    setEditOrder(null);
    setStep("form");
  };

  const handleEditOrder = async (orderId) => {
    setIsFormLoading(true);
    setStep("form");
    try {
      const res = await api.get(`/order/id/${orderId}`);
      const doc = res?.data?.data || res?.data;
      if (!doc) {
        toast.error("Order not found");
        setStep("list");
        return;
      }
      setEditOrder(doc);
    } catch {
      toast.error("Failed to load order for editing");
      setStep("list");
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleBack = () => {
    setEditOrder(null);
    setStep("list");
  };

  const handleSaved = async () => {
    setEditOrder(null);
    setStep("list");
    await fetchOrders();
  };

  if (step === "form") {
    if (isFormLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        </div>
      );
    }
    return (
      <NewOrderFormPage
        key={editOrder?._id || "new-order"}
        customers={customers}
        products={products}
        editOrder={editOrder}
        nextOrderNumber={nextOrderNumber}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <OrderListPage
      orders={orders}
      isLoading={isLoading}
      onRefresh={fetchOrders}
      onCreateNew={handleCreateNew}
      onEditOrder={handleEditOrder}
    />
  );
}
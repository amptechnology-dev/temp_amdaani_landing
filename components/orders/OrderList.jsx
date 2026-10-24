"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Plus,
  X,
  Loader2,
  ClipboardList,
  Pencil,
  Calendar,
  Phone,
  RefreshCw,
  Truck,
  FileText,
  Repeat,
  CheckCircle2,
  User,
} from "lucide-react";

import api from "../../utils/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── constants ───────────────────────────────────────────────────────────
export const ORDER_STATUS = ["order_taken", "approved", "invoiced", "delivered"];

const STATUS_META = {
  order_taken: { label: "Order Taken", cls: "bg-amber-500 text-white" },
  approved: { label: "Approved", cls: "bg-blue-600 text-white" },
  invoiced: { label: "Invoiced", cls: "bg-purple-600 text-white" },
  delivered: { label: "Delivered", cls: "bg-green-600 text-white" },
};

// Ei status gulo-te order edit kora jay
const EDITABLE_STATUS = ["order_taken", "approved"];

// Sudhu approved order theke invoice create kora jay
const INVOICEABLE_STATUS = ["approved"];

// Manually je status-e jawa jay (backend statusFlow-er sathe match).
// "invoiced" kokhono manual na — invoice create korle automatically hoy.
const NEXT_STATUS = {
  order_taken: ["approved"],
  approved: [],
  invoiced: ["delivered"],
  delivered: [],
};

// ── helpers ─────────────────────────────────────────────────────────────
const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "-" : format(dt, "dd MMM yyyy");
};

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getStatus = (o) => String(o?.status || "order_taken").toLowerCase();

const getCustomerName = (o) =>
  o?.customerName || o?.customerDetails?.name || o?.customer?.name || "-";
const getCustomerMobile = (o) =>
  o?.customerMobile || o?.customerDetails?.mobile || o?.customer?.mobile || "";

// Kon user order-ta nilo
const getCreatedByName = (o) => o?.createdBy?.name || "-";

// Delivered hole actual date, noile expected delivery date
const getDeliveryDate = (o) => o?.actualDeliveryDate || o?.deliveryDate;

const getItemName = (it) =>
  it?.name || (typeof it?.product === "object" ? it?.product?.name : "") || "-";

// Purono order-e productPrice na thakle order price-i dekhabo
const getItemProductPrice = (it) => Number(it?.productPrice ?? it?.sellingPrice ?? 0);

const getOrderTotal = (o) => {
  const direct = o?.grandTotal ?? o?.totalAmount ?? o?.total;
  if (direct !== undefined && direct !== null) return Number(direct);
  return (o?.items || []).reduce(
    (s, it) => s + Number(it.sellingPrice || 0) * Number(it.quantity || 0),
    0,
  );
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.order_taken;
  return <Badge className={`text-[11px] ${meta.cls}`}>{meta.label}</Badge>;
}

const STATUS_FILTERS = ORDER_STATUS.map((s) => ({
  key: s,
  label: STATUS_META[s].label,
}));

// ── Status change dialog ────────────────────────────────────────────────
function StatusDialog({ open, onClose, order, saving, onSubmit }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    deliveredBy: "",
    challanNo: "",
    challanDate: "",
    lorryNumber: "",
    deliveryAddress: "",
  });

  useEffect(() => {
    if (!open || !order) return;
    setStatus(null);
    setForm({
      deliveredBy: order.deliveredBy || "",
      challanNo: order.challanNo || "",
      challanDate: toInputDate(order.challanDate) || toInputDate(new Date()),
      lorryNumber: order.lorryNumber || "",
      deliveryAddress: order.deliveryAddress || order.customerAddress || "",
    });
  }, [open, order]);

  if (!order) return null;

  const current = getStatus(order);
  const allowed = NEXT_STATUS[current] || [];

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!status) {
      toast.info("Please select a status");
      return;
    }
    if (!allowed.includes(status)) {
      toast.error("This status change is not allowed");
      return;
    }
    const payload = { status };
    if (status === "delivered") {
      if (!form.deliveredBy.trim()) {
        toast.error("Delivered By is required");
        return;
      }
      payload.deliveredBy = form.deliveredBy.trim();
      payload.challanNo = form.challanNo.trim();
      payload.challanDate = form.challanDate;
      payload.lorryNumber = form.lorryNumber.trim();
      payload.deliveryAddress = form.deliveryAddress.trim();
    }
    onSubmit(payload);
  };

  const inputCls =
    "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change Status · #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ORDER_STATUS.map((s) => {
              const isCurrent = s === current;
              const isAllowed = allowed.includes(s);
              const isSelected = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => setStatus(s)}
                  className={`h-10 rounded-lg border text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isCurrent
                        ? "bg-slate-100 border-slate-300 text-slate-700 cursor-default"
                        : isAllowed
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "border-slate-100 text-slate-300 bg-slate-50/60 cursor-not-allowed"
                  }`}
                >
                  {STATUS_META[s].label}
                  {isCurrent && (
                    <span className="ml-1 text-[10px] font-medium opacity-70">(current)</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            "Invoiced" status manually set kora jay na — approved order theke invoice create
            korle automatically hoy.
          </p>

          {status === "delivered" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Delivered By *
                </label>
                <input
                  value={form.deliveredBy}
                  onChange={setField("deliveredBy")}
                  placeholder="Delivery person name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Challan No
                </label>
                <input
                  value={form.challanNo}
                  onChange={setField("challanNo")}
                  placeholder="e.g. CH-1001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Challan Date
                </label>
                <input
                  type="date"
                  value={form.challanDate}
                  onChange={setField("challanDate")}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Lorry Number
                </label>
                <input
                  value={form.lorryNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lorryNumber: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. WB23AB1234"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Delivery Address
                </label>
                <input
                  value={form.deliveryAddress}
                  onChange={setField("deliveryAddress")}
                  placeholder="Delivery address"
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !status}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main list page ──────────────────────────────────────────────────────
export default function OrderListPage({
  orders,
  isLoading,
  onRefresh,
  onCreateNew,
  onEditOrder,
}) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        getCustomerName(o).toLowerCase().includes(q) ||
        getCustomerMobile(o).includes(q) ||
        getCreatedByName(o).toLowerCase().includes(q) ||
        String(o.orderNumber || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (statusFilter !== "all" && getStatus(o) !== statusFilter) return false;
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, limit]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / limit));
  const pagedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

  const openDetail = async (o) => {
    try {
      setLoadingId(o._id);
      const res = await api.get(`/order/id/${o._id}`);
      const doc = res?.data?.data || res?.data || o;
      setDetail(doc);
      setDetailOpen(true);
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setLoadingId(null);
    }
  };

  const handleEdit = (orderId) => {
    setDetailOpen(false);
    onEditOrder(orderId);
  };

  // Order theke direct Sales (SalesFlow ?fromOrder=ID handle kore)
  const handleCreateInvoice = (orderId) => {
    setDetailOpen(false);
    router.push(`/dashboard/sales?fromOrder=${orderId}`);
  };

  const handleStatusSubmit = async (payload) => {
    if (!detail?._id) return;
    try {
      setStatusSaving(true);
      const res = await api.put(`/order/status/${detail._id}`, payload);
      if (res?.success === false) throw new Error(res?.message || "Failed");
      toast.success("Order status updated");
      setStatusOpen(false);
      setDetailOpen(false);
      await onRefresh();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update status",
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const detailStatus = getStatus(detail);
  const canEditDetail = EDITABLE_STATUS.includes(detailStatus);
  const canInvoiceDetail = INVOICEABLE_STATUS.includes(detailStatus);
  const canChangeStatus = (NEXT_STATUS[detailStatus] || []).length > 0;

  return (
    <div className="min-h-screen p-3 md:p-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-sm text-slate-400">Take, track and invoice customer orders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onCreateNew} size="sm" className="text-sm h-9 px-4">
            <Plus className="w-4 h-4 mr-1.5" />
            New Order
          </Button>
        </div>
      </div>

      {/* Search + limit */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by customer, phone, order number or created by…"
            className="pl-9 h-9 text-sm rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select value={limit} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[110px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x} className="text-sm">
                {x} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
        {[{ key: "all", label: "All" }, ...STATUS_FILTERS].map((chip) => {
          const active = statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {active && <span>✓</span>}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">Orders</span>
          <span className="text-sm text-slate-400">
            Showing {pagedOrders.length} of {filteredOrders.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ClipboardList className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No Orders Found</p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchQuery
                ? `No orders match "${searchQuery}".`
                : "Start by taking your first order."}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateNew} size="sm" className="text-sm h-9">
                <Plus className="w-4 h-4 mr-1.5" />
                New Order
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">Order #</th>
                  <th className="text-left font-semibold px-3 py-2">Customer</th>
                  <th className="text-left font-semibold px-3 py-2">Created By</th>
                  <th className="text-left font-semibold px-3 py-2">Order Date</th>
                  <th className="text-left font-semibold px-3 py-2">Delivery Date</th>
                  <th className="text-center font-semibold px-3 py-2">Status</th>
                  <th className="text-right font-semibold px-3 py-2">Amount</th>
                  <th className="text-center font-semibold px-3 py-2 w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((o, index) => {
                  const st = getStatus(o);
                  return (
                    <tr
                      key={o._id}
                      onClick={() => openDetail(o)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-3 py-2 text-slate-700 italic font-medium text-sm align-middle whitespace-nowrap">
                        #{o.orderNumber}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="font-medium text-slate-800 truncate text-sm">
                          {getCustomerName(o)}
                        </div>
                        {getCustomerMobile(o) && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="w-3 h-3" />
                            {getCustomerMobile(o)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {getCreatedByName(o)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {fmtDate(o.orderDate || o.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          {fmtDate(getDeliveryDate(o))}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center align-middle">
                        <StatusBadge status={st} />
                      </td>
                      <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                        <span className="text-blue-600 font-bold text-sm">
                          {currency(getOrderTotal(o))}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-center align-middle whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {loadingId === o._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-sm"
                            disabled={!EDITABLE_STATUS.includes(st)}
                            onClick={() => onEditOrder(o._id)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mt-3">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Detail dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[92vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="px-5 py-3 border-b shrink-0 space-y-2.5">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-slate-800">
              <span>Order</span>
              <span className="text-slate-500 font-normal">#{detail?.orderNumber}</span>
              {detail && <StatusBadge status={detailStatus} />}
            </DialogTitle>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={!canEditDetail}
                onClick={() => handleEdit(detail._id)}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>

              {/* Quick approve — sudhu order_taken hole */}
              {detailStatus === "order_taken" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusSaving}
                  onClick={() => handleStatusSubmit({ status: "approved" })}
                  className="text-green-700 border-green-200 hover:bg-green-50"
                >
                  {statusSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Approve
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                disabled={!canChangeStatus}
                onClick={() => setStatusOpen(true)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Repeat className="w-3.5 h-3.5 mr-1.5" />
                Change Status
              </Button>
              <Button
                size="sm"
                disabled={!canInvoiceDetail}
                onClick={() => handleCreateInvoice(detail._id)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Create Invoice
              </Button>
            </div>

            {detail && detailStatus === "order_taken" && (
              <p className="text-xs text-amber-600">
                Invoice can possiable after approaved order
              </p>
            )}
          </DialogHeader>

          {detail && (
            <div className="flex-1 overflow-auto p-5 space-y-4 bg-slate-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <Info label="Customer" value={getCustomerName(detail)} />
                <Info label="Mobile" value={safe(getCustomerMobile(detail))} />
                <Info label="Order Date" value={fmtDate(detail.orderDate || detail.createdAt)} />
                <Info label="Delivery Date" value={fmtDate(getDeliveryDate(detail))} />
                <Info label="Created By" value={safe(detail.createdBy?.name)} />
                <Info label="Created At" value={fmtDate(detail.createdAt)} />
              </div>

              {detailStatus === "delivered" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <Info label="Delivered By" value={safe(detail.deliveredBy)} />
                  <Info label="Challan No" value={safe(detail.challanNo)} />
                  <Info label="Challan Date" value={fmtDate(detail.challanDate)} />
                  <Info label="Lorry Number" value={safe(detail.lorryNumber)} />
                  <div className="col-span-2">
                    <Info label="Delivery Address" value={safe(detail.deliveryAddress)} />
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left font-semibold px-4 py-2.5 w-10">#</th>
                        <th className="text-left font-semibold px-4 py-2.5">Product</th>
                        <th className="text-right font-semibold px-4 py-2.5">Qty</th>
                        <th className="text-right font-semibold px-4 py-2.5">Product Price</th>
                        <th className="text-right font-semibold px-4 py-2.5">Order Price</th>
                        <th className="text-right font-semibold px-4 py-2.5">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detail.items || []).map((it, i) => (
                        <tr key={it._id || i}>
                          <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {getItemName(it)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            {Number(it.quantity || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-500">
                            {currency(getItemProductPrice(it))}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-700 font-medium">
                            {currency(it.sellingPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-600">
                            {currency(Number(it.sellingPrice || 0) * Number(it.quantity || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td colSpan={5} className="px-4 py-3 text-right">
                          TOTAL
                        </td>
                        <td className="px-4 py-3 text-right">
                          {currency(getOrderTotal(detail))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StatusDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        order={detail}
        saving={statusSaving}
        onSubmit={handleStatusSubmit}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800 truncate">{value}</div>
    </div>
  );
}
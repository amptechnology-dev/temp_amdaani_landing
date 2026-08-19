"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
} from "date-fns";

// Icons
import {
  Loader2,
  Plus,
  Edit,
  Trash,
  Search,
  Wallet,
  Receipt,
  MoreVertical,
  RefreshCw,
  X,
  FileText,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Hash,
  Landmark,
  IndianRupee,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

// shadcn components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Helper: debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "thisWeek" },
  { label: "This Month", value: "thisMonth" },
];

const PAYMENT_METHOD_FILTERS = [
  { label: "All", value: "all" },
  { label: "Cash", value: "cash" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "card" },
  { label: "Bank Transfer", value: "bank transfer" },
];

const PAYMENT_METHOD_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer"];

// Validation Schema
const expenseSchema = Yup.object().shape({
  headId: Yup.string().required("Expense head is required"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  paidTo: Yup.string().required("Paid To is required"),
  paymentMethod: Yup.string().required("Payment method is required"),
  date: Yup.string().required("Date is required"),
  invoiceRef: Yup.string(),
  notes: Yup.string(),
});

// Fetch functions
const fetchExpenses = async () => {
  const res = await api.get("/expense");
  return {
    items: res.data?.docs || [],
    total: res.data?.total || res.data?.docs?.length || 0,
  };
};

const fetchExpenseHeads = async () => {
  const res = await api.get("/expense-head");
  return res.data?.docs || res.data || [];
};

const extractErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An unexpected error occurred";
};

const getPaymentMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case "cash":
      return Banknote;
    case "upi":
      return Smartphone;
    case "card":
      return CreditCard;
    case "bank transfer":
      return Landmark;
    default:
      return Wallet;
  }
};

const filterByDate = (expenses, filter) => {
  if (filter === "all") return expenses;
  return expenses.filter((e) => {
    const d = new Date(e.date);
    switch (filter) {
      case "today":
        return isToday(d);
      case "yesterday":
        return isYesterday(d);
      case "thisWeek":
        return isThisWeek(d);
      case "thisMonth":
        return isThisMonth(d);
      default:
        return true;
    }
  });
};

const filterByPaymentMethod = (expenses, method) => {
  if (method === "all") return expenses;
  return expenses.filter(
    (e) => e.paymentMethod?.toLowerCase() === method.toLowerCase(),
  );
};

export default function ExpensesPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDateFilter, setActiveDateFilter] = useState("all");
  const [activePaymentFilter, setActivePaymentFilter] = useState("all");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  const [allExpenses, setAllExpenses] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchExpenses();
      setAllExpenses(data.items);
    } catch (error) {
      toast.error(`Failed to load expenses: ${extractErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExpenseHeads = useCallback(async () => {
    try {
      const heads = await fetchExpenseHeads();
      setExpenseHeads(heads);
    } catch (error) {
      // silent — heads are optional for select dropdown
    }
  }, []);

  useEffect(() => {
    if (!authState?.isAuthenticated) return;
    loadExpenses();
    loadExpenseHeads();
  }, [authState?.isAuthenticated, loadExpenses, loadExpenseHeads]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadExpenses();
      toast.success("Expenses refreshed successfully!");
    } catch {
      toast.error("Failed to refresh expenses");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expense/id/${id}`),
    onSuccess: () => {
      setAllExpenses((prev) =>
        prev.filter((e) => e._id !== selectedExpense._id),
      );
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
      toast.success("Expense deleted successfully!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error) || "Failed to delete expense.");
    },
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const requestBody = {
        head: values.headId,
        amount: Number(values.amount),
        paidTo: values.paidTo,
        paymentMethod: values.paymentMethod,
        date: values.date,
        invoiceRef: values.invoiceRef || "",
        notes: values.notes || "",
      };

      let response;
      if (isUpdate && selectedExpense) {
        response = await api.put(
          `/expense/id/${selectedExpense._id}`,
          requestBody,
        );
      } else {
        response = await api.post("/expense", requestBody);
      }

      if (response.data?.success || response.success) {
        toast.success(
          isUpdate
            ? "Expense updated successfully!"
            : "Expense added successfully!",
        );
        resetForm();
        setIsExpenseDialogOpen(false);
        setSelectedExpense(null);
        setIsUpdate(false);
        await loadExpenses();
      } else {
        throw new Error(
          response.data?.message || response.message || "Operation failed",
        );
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleClearSearch = () => setSearchTerm("");

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setIsUpdate(false);
    setIsExpenseDialogOpen(true);
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setIsUpdate(true);
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = (expense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const initialValues = {
    headId: selectedExpense?.head?.[0]?._id || selectedExpense?.headId || "",
    amount: selectedExpense?.amount || "",
    paidTo: selectedExpense?.paidTo || "",
    paymentMethod: selectedExpense?.paymentMethod || "",
    date: selectedExpense?.date
      ? new Date(selectedExpense.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    invoiceRef: selectedExpense?.invoiceRef || "",
    notes: selectedExpense?.notes || "",
  };

  // Filtering pipeline: date -> payment method -> search (fuzzy)
  const filteredExpenses = useMemo(() => {
    const dateFiltered = filterByDate(allExpenses, activeDateFilter);
    const methodFiltered = filterByPaymentMethod(
      dateFiltered,
      activePaymentFilter,
    );

    const q = debouncedSearch.trim().toLowerCase();
    const searched = !q
      ? methodFiltered
      : methodFiltered.filter((e) => {
          const headName = (e.head?.[0]?.name || "").toLowerCase();
          const paidTo = (e.paidTo || "").toLowerCase();
          const notes = (e.notes || "").toLowerCase();
          const invoiceRef = (e.invoiceRef || "").toLowerCase();
          return (
            headName.includes(q) ||
            paidTo.includes(q) ||
            notes.includes(q) ||
            invoiceRef.includes(q)
          );
        });

    return [...searched].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allExpenses, activeDateFilter, activePaymentFilter, debouncedSearch]);

  // Overview stats (based on currently filtered set)
  const totalExpenses = filteredExpenses.length;
  const totalAmount = filteredExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0,
  );
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

  const paymentMethodBreakdown = filteredExpenses.reduce((acc, e) => {
    const method = e.paymentMethod?.toLowerCase() || "other";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const mostUsedPaymentMethod =
    Object.keys(paymentMethodBreakdown).length > 0
      ? Object.keys(paymentMethodBreakdown).reduce((a, b) =>
          paymentMethodBreakdown[a] > paymentMethodBreakdown[b] ? a : b,
        )
      : "N/A";

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ---------------- HEADER ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1
                className={`text-2xl md:text-3xl font-bold ${currentTheme.text}`}
              >
                Expenses
              </h1>
              <p className={`mt-1 text-sm ${currentTheme.textSecondary}`}>
                Track and manage your business expenses
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={handleAddExpense}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Expenses",
                value: totalExpenses,
                icon: Receipt,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Total Amount",
                value: formatCurrency(totalAmount),
                icon: IndianRupee,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Average",
                value: formatCurrency(averageExpense),
                icon: TrendingUp,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Top Method",
                value:
                  mostUsedPaymentMethod !== "N/A"
                    ? mostUsedPaymentMethod.charAt(0).toUpperCase() +
                      mostUsedPaymentMethod.slice(1)
                    : "N/A",
                icon: Wallet,
                color: "text-orange-600 bg-orange-50",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${stat.color}`}
                >
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {stat.label}
                  </p>
                  <p className="text-base font-bold text-slate-800 truncate">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ---------------- SEARCH ---------------- */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by head, paid to, notes, or invoice ref..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-11 h-12 rounded-full bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ---------------- FILTER CHIPS ---------------- */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveDateFilter(f.value)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeDateFilter === f.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PAYMENT_METHOD_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActivePaymentFilter(f.value)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activePaymentFilter === f.value
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- EXPENSE LIST ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))
          ) : filteredExpenses.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Receipt className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {searchTerm ? "No Expenses Found" : "No Expenses Yet"}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mb-4">
                {searchTerm
                  ? `No expenses match "${searchTerm}".`
                  : "Start by adding your first expense to begin tracking spending."}
              </p>
              {!searchTerm && (
                <Button onClick={handleAddExpense}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filteredExpenses.map((expense, index) => {
                const headName = expense.head?.[0]?.name || "Uncategorized";
                const enteredByName = expense.enteredBy?.[0]?.name || "Unknown";
                const MethodIcon = getPaymentMethodIcon(expense.paymentMethod);

                return (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    onClick={() => handleEditExpense(expense)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all relative group"
                    style={{ borderLeftWidth: 4, borderLeftColor: "#DC2626" }}
                  >
                    {/* Top row — head name + actions menu */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="font-bold text-slate-800 truncate">
                          {headName}
                        </p>
                      </div>

                      <div className="flex items-start gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] flex items-center gap-1"
                        >
                          <MethodIcon className="w-3 h-3" />
                          {expense.paymentMethod || "—"}
                        </Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense)}
                                className="text-red-600"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Amount row */}
                    <div className="flex items-center justify-between mt-3 px-2.5 py-1.5 rounded-lg border border-dashed border-rose-200 bg-rose-50">
                      <span className="text-[10px] font-bold tracking-wide text-slate-500">
                        AMOUNT
                      </span>
                      <span className="text-sm font-extrabold text-rose-600">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>

                    {/* Paid to + date row */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {expense.paidTo || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {expense.date
                          ? format(new Date(expense.date), "dd MMM yyyy")
                          : "—"}
                      </div>
                    </div>

                    {/* Notes / invoice ref */}
                    {(expense.notes || expense.invoiceRef) && (
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-dashed border-slate-100">
                        {expense.notes && (
                          <span className="text-[11px] text-slate-400 italic truncate">
                            {expense.notes}
                          </span>
                        )}
                        {expense.invoiceRef && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                            <Hash className="w-3 h-3" />
                            Ref: {expense.invoiceRef}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 mt-2">
                      Entered by {enteredByName}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {!isLoading && filteredExpenses.length > 0 && (
          <p className="text-center text-xs text-slate-400">
            Showing {filteredExpenses.length} of {allExpenses.length} expenses
          </p>
        )}
      </div>

      {/* ---------------- Add/Edit Expense Dialog ---------------- */}
      <Dialog
        open={isExpenseDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsExpenseDialogOpen(false);
            setSelectedExpense(null);
            setIsUpdate(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isUpdate ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
              {isUpdate
                ? "Update expense details below."
                : "Enter expense details to add to your records."}
            </DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={expenseSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              isSubmitting,
              handleChange,
              handleBlur,
              values,
              errors,
              touched,
              setFieldValue,
            }) => (
              <Form className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="headId">Expense Head *</Label>
                    <Select
                      value={values.headId}
                      onValueChange={(val) => setFieldValue("headId", val)}
                    >
                      <SelectTrigger
                        id="headId"
                        className={`mt-1 ${errors.headId && touched.headId ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select expense head" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseHeads.map((h) => (
                          <SelectItem key={h._id} value={h._id}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorMessage
                      name="headId"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        value={values.amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="0.00"
                        className={`mt-1 ${errors.amount && touched.amount ? "border-red-500" : ""}`}
                      />
                      <ErrorMessage
                        name="amount"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={values.date}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`mt-1 ${errors.date && touched.date ? "border-red-500" : ""}`}
                      />
                      <ErrorMessage
                        name="date"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paidTo">Paid To *</Label>
                    <Input
                      id="paidTo"
                      name="paidTo"
                      value={values.paidTo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter payee name"
                      className={`mt-1 ${errors.paidTo && touched.paidTo ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="paidTo"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select
                      value={values.paymentMethod}
                      onValueChange={(val) =>
                        setFieldValue("paymentMethod", val)
                      }
                    >
                      <SelectTrigger
                        id="paymentMethod"
                        className={`mt-1 ${errors.paymentMethod && touched.paymentMethod ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorMessage
                      name="paymentMethod"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="invoiceRef">Invoice Reference</Label>
                    <Input
                      id="invoiceRef"
                      name="invoiceRef"
                      value={values.invoiceRef}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter invoice reference (optional)"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={values.notes}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Additional notes (optional)"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExpenseDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isUpdate ? (
                      <Edit className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isUpdate ? "Update Expense" : "Add Expense"}
                  </Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete Confirmation Dialog ---------------- */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              <strong>{selectedExpense?.head?.[0]?.name || "expense"}</strong>{" "}
              entry of{" "}
              <strong>{formatCurrency(selectedExpense?.amount)}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedExpense && deleteMutation.mutate(selectedExpense._id)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 mr-2" />
              )}
              Delete Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion } from "framer-motion";
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
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Hash,
  Landmark,
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

  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [activeDateFilter, activePaymentFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / limit));
  const pagedExpenses = filteredExpenses.slice(
    (page - 1) * limit,
    page * limit,
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  // Combined chip list: date chips + payment-method chips (Items-page pattern)
  const chips = [
    ...DATE_FILTERS,
    ...PAYMENT_METHOD_FILTERS,
  ];

  const isChipActive = (chip) => {
    const isDateChip = DATE_FILTERS.some((f) => f.value === chip.value);
    if (isDateChip) return activeDateFilter === chip.value;
    return activePaymentFilter === chip.value;
  };

  const handleChipClick = (chip) => {
    const isDateChip = DATE_FILTERS.some((f) => f.value === chip.value);
    if (isDateChip) {
      setActiveDateFilter(chip.value);
    } else {
      setActivePaymentFilter((prev) => (prev === chip.value ? "all" : chip.value));
    }
  };

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header — compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${currentTheme.text}`}>
            Expenses
          </h1>
          <p className={`text-sm ${currentTheme.textSecondary}`}>
            Track and manage your business expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            onClick={handleAddExpense}
            size="sm"
            className={`text-sm h-9 px-4 ${currentTheme.buttonPrimary}`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Search + limit — compact single row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by head, paid to, notes, or invoice ref…"
            className="pl-9 h-9 text-sm rounded-lg"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <X
              onClick={handleClearSearch}
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

      {/* Filter chips — date + payment method combined */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
        {chips.map((chip) => {
          const active = isChipActive(chip);
          const isMethodChip = PAYMENT_METHOD_FILTERS.some(
            (f) => f.value === chip.value,
          );
          return (
            <button
              key={chip.value}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                active
                  ? isMethodChip
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ===== Excel-style dense table ===== */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">Expenses</span>
          <span className="text-sm text-slate-400">
            Showing {pagedExpenses.length} of {filteredExpenses.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Receipt className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">
              {searchTerm ? "No Expenses Found" : "No Expenses Yet"}
            </p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchTerm
                ? `No expenses match "${searchTerm}".`
                : "Add your first expense to begin tracking spending."}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddExpense} size="sm" className="text-sm h-9">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">Head</th>
                  <th className="text-left font-semibold px-3 py-2">Paid To</th>
                  <th className="text-left font-semibold px-3 py-2">Method</th>
                  <th className="text-left font-semibold px-3 py-2">Date</th>
                  <th className="text-left font-semibold px-3 py-2">Ref / Notes</th>
                  <th className="text-right font-semibold px-3 py-2">Amount</th>
                  <th className="text-center font-semibold px-3 py-2 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedExpenses.map((expense, index) => {
                  const headName = expense.head?.[0]?.name || "Uncategorized";
                  const MethodIcon = getPaymentMethodIcon(expense.paymentMethod);

                  return (
                    <motion.tr
                      key={expense._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleEditExpense(expense)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                        {(page - 1) * limit + index + 1}
                      </td>

                      <td className="px-3 py-2 align-middle">
                        <span className="font-medium text-slate-800 truncate text-sm">
                          {headName}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {expense.paidTo || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[11px] flex items-center gap-1 w-fit"
                        >
                          <MethodIcon className="w-3.5 h-3.5" />
                          {expense.paymentMethod || "—"}
                        </Badge>
                      </td>

                      <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {expense.date
                            ? format(new Date(expense.date), "dd MMM yyyy")
                            : "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-slate-400 text-xs align-middle max-w-[180px] truncate">
                        {expense.invoiceRef && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5" />
                            {expense.invoiceRef}
                          </span>
                        )}
                        {expense.notes && (
                          <span className="italic truncate block">
                            {expense.notes}
                          </span>
                        )}
                        {!expense.invoiceRef && !expense.notes && "—"}
                      </td>

                      <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                        <span className="text-rose-600 font-semibold text-sm">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>

                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditExpense(expense)}
                                className="text-sm"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteExpense(expense)}
                                className="text-red-600 text-sm"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — compact */}
      {!isLoading && filteredExpenses.length > 0 && (
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
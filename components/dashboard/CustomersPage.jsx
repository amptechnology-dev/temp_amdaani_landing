"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion } from "framer-motion";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Icons
import {
  Loader2,
  Plus,
  Edit,
  Trash,
  Search,
  User,
  Phone,
  PhoneCall,
  MoreVertical,
  RefreshCw,
  CheckCircle,
  X,
  MapPin,
  Hash,
  Star,
  Users,
  Wallet,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

// Helper function for debouncing
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Validation Schema
const customerSchema = Yup.object().shape({
  partyName: Yup.string()
    .required("Party name is required")
    .min(2, "Party name must be at least 2 characters"),
  contactNumber: Yup.string()
    .required("Contact number is required")
    .matches(/^\d{10}$/, "Contact number must be 10 digits"),
  gstin: Yup.string()
    .matches(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN format",
    )
    .nullable(),
  address: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  postalCode: Yup.string()
    .matches(/^\d{6}$/, "Postal code must be 6 digits")
    .nullable(),
});

// Fetch customers functions
const fetchAllCustomers = async ({ page, pageSize }) => {
  const res = await api.get("/customer", {
    params: { page, limit: pageSize },
  });

  return {
    items: res.data?.docs || res.data?.customers || [],
    total: res.data?.total || res.data?.totalDocs || 0,
    totalPages:
      res.data?.totalPages || Math.ceil((res.data?.total || 0) / pageSize),
  };
};

const fetchDueCustomers = async ({ page, pageSize }) => {
  const res = await api.get("/customer/due", {
    params: { page, limit: pageSize },
  });

  return {
    items: res.data?.docs || res.data?.customers || [],
    total: res.data?.total || res.data?.totalDocs || 0,
    totalPages:
      res.data?.totalPages || Math.ceil((res.data?.total || 0) / pageSize),
  };
};

const extractErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An unexpected error occurred";
};

// Due severity helper
const getDueSeverity = (amount) => {
  if (amount >= 10000) return "#DC2626";
  if (amount >= 5000) return "#F57C00";
  return "#059669";
};

export default function CustomersPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();
  const router = useRouter();

  // State management
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "due"
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  const [allCustomersData, setAllCustomersData] = useState({
    items: [],
    total: 0,
    totalPages: 0,
  });
  const [dueCustomersData, setDueCustomersData] = useState({
    items: [],
    total: 0,
    totalPages: 0,
  });

  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingDue, setIsLoadingDue] = useState(true);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  useEffect(() => {
    if (!authState?.isAuthenticated) return;

    const fetchAllData = async () => {
      try {
        setIsLoadingAll(true);
        const allData = await fetchAllCustomers({ page, pageSize });
        setAllCustomersData(allData);
      } catch (error) {
        toast.error(
          `Failed to load all customers: ${extractErrorMessage(error)}`,
        );
      } finally {
        setIsLoadingAll(false);
      }
    };

    const fetchDueData = async () => {
      try {
        setIsLoadingDue(true);
        const dueData = await fetchDueCustomers({ page, pageSize });
        setDueCustomersData(dueData);
      } catch (error) {
        toast.error(
          `Failed to load due customers: ${extractErrorMessage(error)}`,
        );
      } finally {
        setIsLoadingDue(false);
      }
    };

    fetchAllData();
    fetchDueData();
  }, [page, pageSize, authState?.isAuthenticated]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [allData, dueData] = await Promise.all([
        fetchAllCustomers({ page, pageSize }),
        fetchDueCustomers({ page, pageSize }),
      ]);
      setAllCustomersData(allData);
      setDueCustomersData(dueData);
      toast.success("Customers refreshed successfully!");
    } catch {
      toast.error("Failed to refresh customers");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const customersData = useMemo(() => {
    return activeFilter === "due" ? dueCustomersData : allCustomersData;
  }, [activeFilter, allCustomersData, dueCustomersData]);

  const isLoading = activeFilter === "due" ? isLoadingDue : isLoadingAll;

  // Top 5 customer IDs — sorted by totalInvoices
  const top5CustomerIds = useMemo(() => {
    return [...allCustomersData.items]
      .filter((c) => (c.totalInvoices || 0) > 0)
      .sort((a, b) => (b.totalInvoices || 0) - (a.totalInvoices || 0))
      .slice(0, 5)
      .map((c) => c._id);
  }, [allCustomersData.items]);

  const getCustomerRank = (customerId) => {
    const index = top5CustomerIds.indexOf(customerId);
    return index !== -1 ? index + 1 : 0;
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customer/id/${id}`),
    onSuccess: () => {
      Promise.all([
        fetchAllCustomers({ page, pageSize }),
        fetchDueCustomers({ page, pageSize }),
      ]).then(([allData, dueData]) => {
        setAllCustomersData(allData);
        setDueCustomersData(dueData);
      });
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      toast.success("Customer deleted successfully!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error) || "Failed to delete customer.");
    },
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const requestBody = {
        name: values.partyName,
        mobile: values.contactNumber,
        address: values.address || "",
        city: values.city || "",
        state: values.state || "",
        postalCode: values.postalCode || "",
        gstNumber: values.gstin || "",
        country: "India",
      };

      let response;
      if (isUpdate && selectedCustomer) {
        response = await api.put(
          `/customer/id/${selectedCustomer._id}`,
          requestBody,
        );
      } else {
        response = await api.post("/customer", requestBody);
      }

      if (response.data?.success || response.success) {
        toast.success(
          isUpdate
            ? "Customer updated successfully!"
            : "Customer added successfully!",
        );
        resetForm();
        setIsCustomerDialogOpen(false);
        setSelectedCustomer(null);
        setIsUpdate(false);

        const [allData, dueData] = await Promise.all([
          fetchAllCustomers({ page, pageSize }),
          fetchDueCustomers({ page, pageSize }),
        ]);
        setAllCustomersData(allData);
        setDueCustomersData(dueData);
      } else {
        throw new Error(
          response.data?.message || response.message || "Operation failed",
        );
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Failed to save customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleClearSearch = () => setSearchTerm("");

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsUpdate(false);
    setIsCustomerDialogOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsUpdate(true);
    setIsCustomerDialogOpen(true);
  };

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleCall = (mobile) => {
    if (mobile) window.location.href = `tel:${mobile}`;
  };

  const initialValues = {
    partyName: selectedCustomer?.name || "",
    contactNumber: selectedCustomer?.mobile || selectedCustomer?.phone || "",
    gstin: selectedCustomer?.gstNumber || selectedCustomer?.gstin || "",
    address: selectedCustomer?.address || "",
    city: selectedCustomer?.city || "",
    state: selectedCustomer?.state || "",
    postalCode: selectedCustomer?.postalCode || selectedCustomer?.pincode || "",
  };

  const customers = customersData?.items || [];
  const total = customersData?.total || 0;
  const totalPages = customersData?.totalPages || 1;

  const totalCustomers = allCustomersData.total;
  const customersWithDue = allCustomersData.items.filter(
    (c) => (c.totalDue || c.dueAmount || 0) > 0,
  ).length;
  const totalDueCustomers = dueCustomersData.total;

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(q) ||
        customer.mobile?.toLowerCase().includes(q) ||
        customer.gstNumber?.toLowerCase().includes(q) ||
        customer.address?.toLowerCase().includes(q),
    );
  }, [customers, searchTerm]);

  // Filter chips — All / Due (Items page-er chip pattern)
  const chips = [
    { key: "all", label: "All Customers", icon: Users, count: totalCustomers },
    {
      key: "due",
      label: "Due Customers",
      icon: Wallet,
      count: totalDueCustomers,
      danger: true,
    },
  ];

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header — compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${currentTheme.text}`}>
            Customers
          </h1>
          <p className={`text-sm ${currentTheme.textSecondary}`}>
            Manage your customers and track outstanding payments
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
            onClick={handleAddCustomer}
            size="sm"
            className={`text-sm h-9 px-4 ${currentTheme.buttonPrimary}`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search + limit — compact single row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or phone number…"
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

        <Select value={pageSize} onValueChange={(v) => setPageSize(Number(v))}>
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

      {/* Filter chips — compact */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
        {chips.map((chip) => {
          const active = activeFilter === chip.key;
          const Icon = chip.icon;
          const loadingCount = chip.key === "due" ? isLoadingDue : isLoadingAll;
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                active
                  ? chip.danger
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {chip.label}
              <span
                className={`ml-0.5 px-1.5 rounded-full text-xs font-bold ${
                  active ? "bg-white/70" : "bg-slate-100"
                }`}
              >
                {loadingCount ? "…" : chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== Excel-style dense table ===== */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">
            Customers
          </span>
          <span className="text-sm text-slate-400">
            Showing {filteredCustomers.length} of {total}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            {activeFilter === "due" ? (
              <>
                <CheckCircle className="w-11 h-11 text-blue-400 mb-2" />
                <p className="text-base font-semibold text-slate-700">
                  {searchTerm ? "No Customers Found" : "All Clear! 🎉"}
                </p>
                <p className="text-sm text-slate-400 max-w-xs mt-0.5">
                  {searchTerm
                    ? `No customers match "${searchTerm}".`
                    : "All your customers have cleared their outstanding payments."}
                </p>
              </>
            ) : (
              <>
                <User className="w-11 h-11 text-slate-300 mb-2" />
                <p className="text-base font-semibold text-slate-700">
                  {searchTerm ? "No Customers Found" : "No Customers Yet"}
                </p>
                <p className="text-sm text-slate-400 max-w-xs mt-0.5">
                  {searchTerm
                    ? `No customers match "${searchTerm}".`
                    : "Add your first customer to begin tracking sales and payments."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">
                    Customer
                  </th>
                  <th className="text-left font-semibold px-3 py-2">
                    Contact
                  </th>
                  <th className="text-left font-semibold px-3 py-2">
                    Location
                  </th>
                  <th className="text-right font-semibold px-3 py-2">
                    Invoices
                  </th>
                  <th className="text-right font-semibold px-3 py-2">
                    {activeFilter === "due" ? "Outstanding" : "Due"}
                  </th>
                  <th className="text-center font-semibold px-3 py-2 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const dueAmount =
                    customer.totalDue || customer.dueAmount || 0;
                  const dColor = getDueSeverity(dueAmount);
                  const rank = getCustomerRank(customer._id);

                  return (
                    <motion.tr
                      key={customer._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => {
                        if (activeFilter === "due") {
                          router.push(
                            `/dashboard/customers/due/${customer._id}`,
                          );
                        } else {
                          handleEditCustomer(customer);
                        }
                      }}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                        {(page - 1) * pageSize + index + 1}
                      </td>

                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          {rank > 0 && (
                            <span
                              title="Top customer"
                              className="shrink-0 flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              #{rank}
                            </span>
                          )}
                          <span className="font-medium text-slate-800 capitalize truncate text-sm">
                            {customer.name || "No Name"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {customer.mobile || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-slate-500 text-sm align-middle max-w-[180px] truncate">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {customer.address || "-"}
                          </span>
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right align-middle">
                        <span className="flex items-center justify-end gap-1 text-slate-500 text-sm">
                          <Hash className="w-3.5 h-3.5" />
                          {customer.totalInvoices || 0}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                        {dueAmount > 0 ? (
                          <span
                            className="font-bold text-sm"
                            style={{ color: dColor }}
                          >
                            ₹{dueAmount.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>

                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {customer.mobile && (
                            <button
                              onClick={() => handleCall(customer.mobile)}
                              title="Call customer"
                              className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                                onClick={() => handleEditCustomer(customer)}
                                className="text-sm"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteCustomer(customer)}
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

      {/* ---------------- Add/Edit Customer Dialog ---------------- */}
      <Dialog
        open={isCustomerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCustomerDialogOpen(false);
            setSelectedCustomer(null);
            setIsUpdate(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isUpdate ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription>
              {isUpdate
                ? "Update customer details below."
                : "Enter customer details to add to your list."}
            </DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={customerSchema}
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
            }) => (
              <Form className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="partyName">Party Name *</Label>
                    <Input
                      id="partyName"
                      name="partyName"
                      value={values.partyName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter party name"
                      className={`mt-1 ${errors.partyName && touched.partyName ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="partyName"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      value={values.contactNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter 10-digit contact number"
                      maxLength={10}
                      className={`mt-1 ${errors.contactNumber && touched.contactNumber ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="contactNumber"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      name="gstin"
                      value={values.gstin}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter GSTIN (optional)"
                      className={`mt-1 ${errors.gstin && touched.gstin ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="gstin"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter address"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={values.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="City"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={values.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="State"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={values.postalCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="6-digit postal code"
                      maxLength={6}
                      className={`mt-1 ${errors.postalCode && touched.postalCode ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="postalCode"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCustomerDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isUpdate ? (
                      <Edit className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isUpdate ? "Update Customer" : "Add Customer"}
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedCustomer?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedCustomer && deleteMutation.mutate(selectedCustomer._id)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 mr-2" />
              )}
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
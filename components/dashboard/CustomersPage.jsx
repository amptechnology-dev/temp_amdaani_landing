"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";

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
  IndianRupee,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  MapPin,
  Hash,
  Star,
  FileText,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// -----------------------------------------
// Due severity helper — RN app er getDueSeverity() logic
// -----------------------------------------
const getDueSeverity = (amount) => {
  if (amount >= 10000)
    return {
      level: "critical",
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FCA5A5",
    };
  if (amount >= 5000)
    return {
      level: "warning",
      color: "#F57C00",
      bg: "#FFF7ED",
      border: "#FDBA74",
    };
  return {
    level: "normal",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#93C5FD",
  };
};

export default function CustomersPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100); // card view — বড় page size, scroll-based
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
  }, [debouncedSearch, activeTab]);

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
    return activeTab === "due" ? dueCustomersData : allCustomersData;
  }, [activeTab, allCustomersData, dueCustomersData]);

  const isLoading = activeTab === "due" ? isLoadingDue : isLoadingAll;

  // ✅ Top 5 customer IDs (RN app er top5CustomerIds logic) — sorted by totalInvoices
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

  const totalCustomers = allCustomersData.total;
  const totalDueFromAll = allCustomersData.items.reduce(
    (sum, c) => sum + (c.totalDue || c.dueAmount || 0),
    0,
  );
  const activeCustomers = allCustomersData.items.filter(
    (c) => !c.status || c.status === "active",
  ).length;
  const customersWithDue = allCustomersData.items.filter(
    (c) => (c.totalDue || c.dueAmount || 0) > 0,
  ).length;
  const totalDueCustomers = dueCustomersData.total;

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(q) ||
      customer.mobile?.toLowerCase().includes(q) ||
      customer.gstNumber?.toLowerCase().includes(q) ||
      customer.address?.toLowerCase().includes(q)
    );
  });

  const totalDueAmount = dueCustomersData.items.reduce(
    (sum, c) => sum + (c.totalDue || c.dueAmount || 0),
    0,
  );

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
                My Customers
              </h1>
              <p className={`mt-1 text-sm ${currentTheme.textSecondary}`}>
                Manage your customers and track outstanding payments
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
              <Button onClick={handleAddCustomer}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Customers",
                value: totalCustomers,
                icon: Users,
                loading: isLoadingAll,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Total Due",
                value: `₹${totalDueFromAll.toLocaleString("en-IN")}`,
                icon: Wallet,
                loading: isLoadingAll,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Active",
                value: activeCustomers,
                icon: CheckCircle,
                loading: isLoadingAll,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "With Due",
                value:
                  activeTab === "due" ? totalDueCustomers : customersWithDue,
                icon: AlertCircle,
                loading: isLoadingAll,
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
                    {stat.loading ? (
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
            placeholder="Search by name or phone number..."
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

        {/* ---------------- TABS (segmented control, RN app er style) ---------------- */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1 h-12 rounded-xl">
            <TabsTrigger
              value="all"
              className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              All Customers
              <Badge variant="secondary" className="ml-1">
                {isLoadingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  totalCustomers
                )}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="due"
              className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 relative"
            >
              <Wallet className="w-4 h-4" />
              Due Customers
              {totalDueCustomers > 0 && (
                <Badge className="ml-1 bg-red-500 hover:bg-red-500">
                  {isLoadingDue ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    totalDueCustomers
                  )}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ---------------- DUE SUMMARY CARD (শুধু Due tab-এ) ---------------- */}
        {activeTab === "due" && dueCustomersData.items.length > 0 && (
          <Card className="rounded-2xl border-slate-200 bg-slate-50/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Total Due
                  </p>
                  <p className="text-lg font-bold text-rose-600">
                    ₹{totalDueAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-medium text-slate-500">
                    Due Accounts
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {totalDueCustomers}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------------- CUSTOMER LIST ---------------- */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200">
              {activeTab === "due" ? (
                <>
                  <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {searchTerm ? "No Customers Found" : "All Clear! 🎉"}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    {searchTerm
                      ? `No customers match "${searchTerm}".`
                      : "Great job! All your customers have cleared their outstanding payments."}
                  </p>
                </>
              ) : (
                <>
                  <User className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {searchTerm ? "No Customers Found" : "No Customers Yet"}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm mb-4">
                    {searchTerm
                      ? `No customers match "${searchTerm}".`
                      : "Start by adding your first customer to begin tracking sales and payments."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleAddCustomer}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filteredCustomers.map((customer, index) => {
                const isDueTab = activeTab === "due";
                const dueAmount = customer.totalDue || customer.dueAmount || 0;
                const showDueBadge = isDueTab && dueAmount > 0;
                const severity = showDueBadge
                  ? getDueSeverity(dueAmount)
                  : null;
                const rank = getCustomerRank(customer._id);

                return (
                  <motion.div
                    key={customer._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    style={
                      showDueBadge
                        ? {
                            borderLeftWidth: 4,
                            borderLeftColor: severity.color,
                          }
                        : undefined
                    }
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEditCustomer(customer)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleEditCustomer(customer);
                        }
                      }}
                      className="w-full text-left p-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      {/* Top row — name + rank + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-bold text-slate-800 capitalize truncate">
                            {customer.name || "No Name"}
                          </p>
                          {rank > 0 && (
                            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              #{rank}
                            </span>
                          )}
                        </div>

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        >
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
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteCustomer(customer)}
                                className="text-red-600"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Contact row */}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          {customer.mobile || "No mobile"}
                        </div>
                        {customer.mobile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCall(customer.mobile);
                            }}
                            className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shrink-0"
                            title="Call customer"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-white" />
                          </button>
                        )}
                      </div>

                      {/* Due section — Due tab only */}
                      {showDueBadge && (
                        <div
                          className="flex items-center justify-between mt-3 p-2.5 rounded-xl border border-dashed"
                          style={{
                            borderColor: severity.border,
                            backgroundColor: severity.bg,
                          }}
                        >
                          <div>
                            <p className="text-[10px] font-bold tracking-wide text-slate-500">
                              OUTSTANDING
                            </p>
                            <p
                              className="text-xl font-extrabold"
                              style={{ color: severity.color }}
                            >
                              ₹{dueAmount.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                            style={{ backgroundColor: `${severity.color}15` }}
                          >
                            <FileText
                              className="w-3.5 h-3.5"
                              style={{ color: severity.color }}
                            />
                            <span
                              className="text-xs font-bold"
                              style={{ color: severity.color }}
                            >
                              {customer.pendingInvoiceCount || 0} Pending
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bottom stats row */}
                      <div className="flex items-center flex-wrap gap-3 mt-2.5">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Hash className="w-3.5 h-3.5" />
                          {customer.totalInvoices || 0} Invoice
                          {customer.totalInvoices !== 1 ? "s" : ""}
                        </div>

                        {!showDueBadge && dueAmount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />₹
                            {dueAmount.toLocaleString("en-IN")} due
                          </div>
                        )}

                        {customer.address && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {!isLoading && filteredCustomers.length > 0 && (
          <p className="text-center text-xs text-slate-400">
            Showing {filteredCustomers.length} of {total} customers
          </p>
        )}
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
                  <Button type="submit" disabled={isSubmitting}>
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

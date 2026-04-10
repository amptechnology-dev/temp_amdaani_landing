"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, Field, ErrorMessage } from "formik";
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
  Building,
  Mail,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Hash,
  Globe,
} from "lucide-react";

// shadcn components (make sure to install these)
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      "Invalid GSTIN format"
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

  console.log("Fetched all customers:", res.data);

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

  console.log("Fetched due customers:", res.data);

  return {
    items: res.data?.docs || res.data?.customers || [],
    total: res.data?.total || res.data?.totalDocs || 0,
    totalPages:
      res.data?.totalPages || Math.ceil((res.data?.total || 0) / pageSize),
  };
};

// Extract error message helper
const extractErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return "An unexpected error occurred";
};

export default function CustomersPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  // Separate states for all customers and due customers
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

  // Loading states
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingDue, setIsLoadingDue] = useState(true);

  // Use the useDebounce hook
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  // Fetch both APIs together in useEffect
  useEffect(() => {
    if (!authState?.isAuthenticated) return;

    const fetchAllData = async () => {
      try {
        setIsLoadingAll(true);
        const allData = await fetchAllCustomers({ page, pageSize });
        setAllCustomersData(allData);
      } catch (error) {
        toast.error(
          `Failed to load all customers: ${extractErrorMessage(error)}`
        );
        console.error("Error fetching all customers:", error);
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
          `Failed to load due customers: ${extractErrorMessage(error)}`
        );
        console.error("Error fetching due customers:", error);
      } finally {
        setIsLoadingDue(false);
      }
    };

    // Fetch both APIs in parallel
    fetchAllData();
    fetchDueData();
  }, [page, pageSize, authState?.isAuthenticated]);

  // Refresh function to fetch both APIs again
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
    } catch (error) {
      toast.error("Failed to refresh customers");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Determine which data to use based on active tab
  const customersData = useMemo(() => {
    if (activeTab === "due") {
      return dueCustomersData;
    }
    return allCustomersData;
  }, [activeTab, allCustomersData, dueCustomersData]);

  const isLoading = useMemo(() => {
    if (activeTab === "due") {
      return isLoadingDue;
    }
    return isLoadingAll;
  }, [activeTab, isLoadingAll, isLoadingDue]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customer/id/${id}`),
    onSuccess: () => {
      // Refresh both datasets after deletion
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
      const message = extractErrorMessage(error);
      toast.error(message || "Failed to delete customer. Please try again.");
    },
  });

  // Form submit handler
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
        // Update API
        response = await api.put(
          `/customer/id/${selectedCustomer._id}`,
          requestBody
        );
        console.log("Updating customer:", response);
      } else {
        // Create API
        response = await api.post("/customer", requestBody);
      }

      if (response.data?.success || response.success) {
        toast.success(
          isUpdate
            ? "Customer updated successfully!"
            : "Customer added successfully!"
        );

        resetForm();
        setIsCustomerDialogOpen(false);
        setSelectedCustomer(null);
        setIsUpdate(false);

        // Refresh both datasets after adding/updating
        const [allData, dueData] = await Promise.all([
          fetchAllCustomers({ page, pageSize }),
          fetchDueCustomers({ page, pageSize }),
        ]);

        setAllCustomersData(allData);
        setDueCustomersData(dueData);
      } else {
        throw new Error(
          response.data?.message || response.message || "Operation failed"
        );
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      toast.error(message || "Failed to save customer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

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

  // Initial values for form
  const initialValues = {
    partyName: selectedCustomer?.name || "",
    contactNumber: selectedCustomer?.mobile || selectedCustomer?.phone || "",
    gstin: selectedCustomer?.gstNumber || selectedCustomer?.gstin || "",
    address: selectedCustomer?.address || "",
    city: selectedCustomer?.city || "",
    state: selectedCustomer?.state || "",
    postalCode: selectedCustomer?.postalCode || selectedCustomer?.pincode || "",
  };

  // Render logic
  const customers = customersData?.items || [];
  const total = customersData?.total || 0;
  const totalPages = customersData?.totalPages || 1;

  // Calculate stats from both datasets
  const totalCustomers = allCustomersData.total;
  const totalDueFromAll = allCustomersData.items.reduce(
    (sum, customer) => sum + (customer.dueAmount || 0),
    0
  );
  const activeCustomers = allCustomersData.items.filter(
    (customer) => !customer.status || customer.status === "active"
  ).length;
  const customersWithDue = allCustomersData.items.filter(
    (customer) => (customer.dueAmount || 0) > 0
  ).length;
  const totalDueCustomers = dueCustomersData.total;

  // FRONTEND SEARCH FILTER
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.mobile?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.gstNumber?.toLowerCase().includes(searchLower) ||
      customer.address?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
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
                Customers
              </h1>
              <p className={`mt-2 ${currentTheme.textSecondary}`}>
                Manage your customers, track payments, and build relationships
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
                className={`${currentTheme.buttonTertiary}`}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>

              <Button
                onClick={handleAddCustomer}
                className={`${currentTheme.buttonPrimary}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className={`${currentTheme.card} border ${currentTheme.outline}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${currentTheme.textSecondary}`}
                    >
                      Total Customers
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${currentTheme.text}`}
                    >
                      {isLoadingAll ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        totalCustomers.toLocaleString()
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${currentTheme.accentLight}`}>
                    <User
                      className={`w-5 h-5 ${currentTheme.accent.replace(
                        "bg-",
                        "text-"
                      )}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`${currentTheme.card} border ${currentTheme.outline}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${currentTheme.textSecondary}`}
                    >
                      Total Due
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${currentTheme.text}`}
                    >
                      {isLoadingAll ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        `₹${totalDueFromAll.toLocaleString()}`
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${currentTheme.accentLight}`}>
                    <IndianRupee
                      className={`w-5 h-5 ${currentTheme.accent.replace(
                        "bg-",
                        "text-"
                      )}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`${currentTheme.card} border ${currentTheme.outline}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${currentTheme.textSecondary}`}
                    >
                      Active
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${currentTheme.text}`}
                    >
                      {isLoadingAll ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        activeCustomers
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${currentTheme.accentLight}`}>
                    <CheckCircle
                      className={`w-5 h-5 ${currentTheme.success}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`${currentTheme.card} border ${currentTheme.outline}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${currentTheme.textSecondary}`}
                    >
                      With Due
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${currentTheme.text}`}
                    >
                      {isLoadingAll ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : activeTab === "due" ? (
                        totalDueCustomers
                      ) : (
                        customersWithDue
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${currentTheme.accentLight}`}>
                    <AlertCircle className={`w-5 h-5 ${currentTheme.error}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`${currentTheme.card} border ${currentTheme.outline} rounded-xl p-4`}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentTheme.textTertiary}`}
                />
                <Input
                  placeholder="Search customers by name, phone, email, or company..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={`pl-10 ${currentTheme.surface}`}
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${currentTheme.textTertiary} hover:${currentTheme.text}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent className={`${currentTheme.card}`}>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList
            className={`grid w-full md:w-auto grid-cols-2 ${currentTheme.background} p-1`}
          >
            <TabsTrigger value="all">
              All Customers
              <Badge variant="secondary" className="ml-2">
                {isLoadingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  totalCustomers
                )}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="due"
              className={`data-[state=active]:${currentTheme.onBackground}`}
            >
              With Due Amount
              <Badge variant="secondary" className="ml-2">
                {isLoadingDue ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  totalDueCustomers
                )}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Table Section */}
            <Card
              className={`${currentTheme.card} border ${currentTheme.outline} overflow-hidden`}
            >
              <CardHeader className={`${currentTheme.surfaceVariant}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className={currentTheme.text}>
                      Customer List
                    </CardTitle>
                    <CardDescription className={currentTheme.textSecondary}>
                      {isLoading ? (
                        "Loading customers..."
                      ) : (
                        <>
                          Showing {(page - 1) * pageSize + 1} to{" "}
                          {Math.min(page * pageSize, total)} of {total}{" "}
                          customers
                        </>
                      )}
                    </CardDescription>
                  </div>
                  {(isLoadingAll || isLoadingDue || isRefreshing) && (
                    <div className="flex items-center text-sm">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className={currentTheme.textSecondary}>
                        Loading...
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-12 text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">
                      No customers found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : activeTab === "due"
                        ? "No customers with due amount"
                        : "Get started by adding your first customer"}
                    </p>
                    <Button onClick={handleAddCustomer}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className={`${currentTheme.surfaceVariant}`}>
                        <TableRow>
                          <TableHead className="w-[250px]">Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>GSTIN</TableHead>
                          <TableHead className="text-right">
                            Due Amount
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredCustomers.map((customer, index) => (
                            <motion.tr
                              key={customer._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{
                                duration: 0.2,
                                delay: index * 0.02,
                              }}
                              className={`hover:${currentTheme.surfaceVariant} border-b ${currentTheme.outline}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded-lg ${currentTheme.accentLight}`}
                                  >
                                    <User
                                      className={`w-4 h-4 ${currentTheme.accent.replace(
                                        "bg-",
                                        "text-"
                                      )}`}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {customer.name}
                                    </div>
                                    <div
                                      className={`text-xs ${currentTheme.textTertiary} mt-1`}
                                    >
                                      ID: {customer._id?.slice(-6) || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3" />
                                    <span>
                                      {customer.mobile || customer.phone}
                                    </span>
                                  </div>
                                  {customer.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-3 h-3" />
                                      <span className="text-sm truncate">
                                        {customer.email}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1 max-w-[200px]">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                                    <span className="text-sm truncate">
                                      {customer.address || "No address"}
                                    </span>
                                  </div>
                                  {(customer.city || customer.state) && (
                                    <div className="text-xs text-gray-500">
                                      {[customer.city, customer.state]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3 h-3" />
                                  <span className="text-sm font-mono">
                                    {customer.gstNumber ||
                                      customer.gstin ||
                                      "-"}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                <div
                                  className={`font-medium ${
                                    (customer.dueAmount || 0) > 0
                                      ? currentTheme.error
                                      : currentTheme.success
                                  }`}
                                >
                                  ₹{(customer.totalDue || 0).toLocaleString()}
                                </div>
                                <div
                                  className={`text-xs ${currentTheme.textTertiary}`}
                                >
                                  {customer.totalInvoices || 0} invoices
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    customer.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    customer.status === "active"
                                      ? `${currentTheme.accent} text-white`
                                      : currentTheme.textTertiary
                                  }
                                >
                                  {customer.status || "active"}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className={`${currentTheme.card}`}
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleEditCustomer(customer)
                                      }
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        console.log("View details:", customer)
                                      }
                                    >
                                      View Details
                                    </DropdownMenuItem>
                                    {(customer.dueAmount || 0) > 0 && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          console.log(
                                            "Send reminder:",
                                            customer
                                          )
                                        }
                                      >
                                        Send Reminder
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteCustomer(customer)
                                      }
                                      className="text-red-600"
                                    >
                                      <Trash className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>

              {/* Pagination */}
              {filteredCustomers.length > 0 && (
                <div
                  className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t ${currentTheme.outline} ${currentTheme.surfaceVariant}`}
                >
                  <div className={`text-sm ${currentTheme.textSecondary}`}>
                    Page {page} of {totalPages}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={currentTheme.buttonTertiary}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum = i + 1;
                          if (totalPages > 5) {
                            if (page > 3) {
                              pageNum = page - 2 + i;
                              if (pageNum > totalPages)
                                pageNum = totalPages - 4 + i;
                            }
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 p-0 ${
                                page === pageNum
                                  ? `${currentTheme.buttonPrimary}`
                                  : currentTheme.buttonTertiary
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}

                      {totalPages > 5 && page < totalPages - 2 && (
                        <>
                          <span className={`px-2 ${currentTheme.textTertiary}`}>
                            ...
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(totalPages)}
                            className={`w-8 h-8 p-0 ${currentTheme.buttonTertiary}`}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className={currentTheme.buttonTertiary}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className={`text-sm ${currentTheme.textSecondary}`}>
                    {total.toLocaleString()} total customers
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Customer Dialog */}
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
        <DialogContent className={`sm:max-w-[500px] ${currentTheme.card}`}>
          <DialogHeader>
            <DialogTitle className={currentTheme.text}>
              {isUpdate ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription className={currentTheme.textSecondary}>
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
                  {/* Party Name */}
                  <div>
                    <Label
                      htmlFor="partyName"
                      className={`text-sm font-medium ${currentTheme.text}`}
                    >
                      Party Name *
                    </Label>
                    <Input
                      id="partyName"
                      name="partyName"
                      value={values.partyName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter party name"
                      className={`mt-1 ${currentTheme.surface} ${
                        errors.partyName && touched.partyName
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    <ErrorMessage
                      name="partyName"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <Label
                      htmlFor="contactNumber"
                      className={`text-sm font-medium ${currentTheme.text}`}
                    >
                      Contact Number *
                    </Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      value={values.contactNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter 10-digit contact number"
                      maxLength={10}
                      className={`mt-1 ${currentTheme.surface} ${
                        errors.contactNumber && touched.contactNumber
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    <ErrorMessage
                      name="contactNumber"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  {/* GSTIN */}
                  <div>
                    <Label
                      htmlFor="gstin"
                      className={`text-sm font-medium ${currentTheme.text}`}
                    >
                      GSTIN
                    </Label>
                    <Input
                      id="gstin"
                      name="gstin"
                      value={values.gstin}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter GSTIN (optional)"
                      className={`mt-1 ${currentTheme.surface} ${
                        errors.gstin && touched.gstin ? "border-red-500" : ""
                      }`}
                    />
                    <ErrorMessage
                      name="gstin"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <Label
                      htmlFor="address"
                      className={`text-sm font-medium ${currentTheme.text}`}
                    >
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={values.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter address"
                      className={`mt-1 ${currentTheme.surface}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* City */}
                    <div>
                      <Label
                        htmlFor="city"
                        className={`text-sm font-medium ${currentTheme.text}`}
                      >
                        City
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        value={values.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="City"
                        className={`mt-1 ${currentTheme.surface}`}
                      />
                    </div>

                    {/* State */}
                    <div>
                      <Label
                        htmlFor="state"
                        className={`text-sm font-medium ${currentTheme.text}`}
                      >
                        State
                      </Label>
                      <Input
                        id="state"
                        name="state"
                        value={values.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="State"
                        className={`mt-1 ${currentTheme.surface}`}
                      />
                    </div>
                  </div>

                  {/* Postal Code */}
                  <div>
                    <Label
                      htmlFor="postalCode"
                      className={`text-sm font-medium ${currentTheme.text}`}
                    >
                      Postal Code
                    </Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={values.postalCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="6-digit postal code"
                      maxLength={6}
                      className={`mt-1 ${currentTheme.surface} ${
                        errors.postalCode && touched.postalCode
                          ? "border-red-500"
                          : ""
                      }`}
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
                    className={currentTheme.buttonTertiary}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={currentTheme.buttonPrimary}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className={currentTheme.card}>
          <AlertDialogHeader>
            <AlertDialogTitle className={currentTheme.text}>
              Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription className={currentTheme.textSecondary}>
              Are you sure you want to delete{" "}
              <strong className={currentTheme.text}>
                {selectedCustomer?.name}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsDeleteDialogOpen(false)}
              className={currentTheme.buttonTertiary}
            >
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

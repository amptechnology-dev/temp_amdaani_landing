"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Store,
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
  FileText,
  Building2,
  Wallet,
  Pencil,
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

// Helper: debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Validation patterns (mobile app er logic onujayi)
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

// Validation Schema
const vendorSchema = Yup.object().shape({
  name: Yup.string()
    .required("Vendor name is required")
    .min(2, "Vendor name must be at least 2 characters")
    .max(50, "Vendor name must be at most 50 characters"),
  mobile: Yup.string()
    .required("Contact number is required")
    .test(
      "mobile-or-landline",
      "Enter a valid mobile or landline number",
      (value) => {
        if (!value) return false;
        const digits = value.replace(/\D/g, "");
        return /^[6-9]\d{9}$/.test(digits) || /^0\d{7,11}$/.test(digits);
      },
    ),
  state: Yup.string().required("State is required"),
  gstNumber: Yup.string()
    .nullable()
    .test("gst-format", "Invalid GSTIN format", (value) => {
      if (!value) return true;
      return GSTIN_REGEX.test(value.replace(/\s+/g, "").toUpperCase());
    }),
  panNumber: Yup.string()
    .nullable()
    .test("pan-format", "Invalid PAN format", (value) => {
      if (!value) return true;
      return PAN_REGEX.test(value.replace(/\s+/g, "").toUpperCase());
    }),
  address: Yup.string(),
  city: Yup.string(),
  postalCode: Yup.string()
    .matches(/^\d{6}$/, "Postal code must be 6 digits")
    .nullable(),
});

// Fetch vendors functions
const fetchAllVendors = async ({ page, pageSize }) => {
  const res = await api.get("/vendor", { params: { page, limit: pageSize } });

  return {
    items: res.data?.docs || res.data?.vendors || [],
    total: res.data?.total || res.data?.totalDocs || 0,
    totalPages:
      res.data?.totalPages || Math.ceil((res.data?.total || 0) / pageSize),
  };
};

const fetchDueVendors = async ({ page, pageSize }) => {
  const res = await api.get("/vendor/due", {
    params: { page, limit: pageSize },
  });

  return {
    items: res.data?.docs || res.data?.vendors || [],
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

// Due severity helper (mobile app er getDueSeverity() logic)
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

export default function VendorsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  const [allVendorsData, setAllVendorsData] = useState({
    items: [],
    total: 0,
    totalPages: 0,
  });
  const [dueVendorsData, setDueVendorsData] = useState({
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
        const allData = await fetchAllVendors({ page, pageSize });
        setAllVendorsData(allData);
      } catch (error) {
        toast.error(`Failed to load vendors: ${extractErrorMessage(error)}`);
      } finally {
        setIsLoadingAll(false);
      }
    };

    const fetchDueData = async () => {
      try {
        setIsLoadingDue(true);
        const dueData = await fetchDueVendors({ page, pageSize });
        setDueVendorsData(dueData);
      } catch (error) {
        toast.error(
          `Failed to load due vendors: ${extractErrorMessage(error)}`,
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
        fetchAllVendors({ page, pageSize }),
        fetchDueVendors({ page, pageSize }),
      ]);
      setAllVendorsData(allData);
      setDueVendorsData(dueData);
      toast.success("Vendors refreshed successfully!");
    } catch {
      toast.error("Failed to refresh vendors");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const vendorsData = useMemo(() => {
    return activeTab === "due" ? dueVendorsData : allVendorsData;
  }, [activeTab, allVendorsData, dueVendorsData]);

  const isLoading = activeTab === "due" ? isLoadingDue : isLoadingAll;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/vendor/id/${id}`),
    onSuccess: () => {
      Promise.all([
        fetchAllVendors({ page, pageSize }),
        fetchDueVendors({ page, pageSize }),
      ]).then(([allData, dueData]) => {
        setAllVendorsData(allData);
        setDueVendorsData(dueData);
      });
      setIsDeleteDialogOpen(false);
      setSelectedVendor(null);
      toast.success("Vendor deleted successfully!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error) || "Failed to delete vendor.");
    },
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const requestBody = {
        name: values.name,
        mobile: values.mobile.replace(/\D/g, ""),
        address: values.address || "",
        city: values.city || "",
        state: values.state || "",
        postalCode: values.postalCode || "",
        gstNumber: values.gstNumber ? values.gstNumber.toUpperCase() : "",
        panNumber: values.panNumber ? values.panNumber.toUpperCase() : "",
        country: values.country || "IN",
      };

      let response;
      if (isUpdate && selectedVendor) {
        response = await api.put(
          `/vendor/id/${selectedVendor._id}`,
          requestBody,
        );
      } else {
        response = await api.post("/vendor", requestBody);
      }

      if (response.data?.success || response.success) {
        toast.success(
          isUpdate
            ? "Vendor updated successfully!"
            : "Vendor added successfully!",
        );
        resetForm();
        setIsVendorDialogOpen(false);
        setSelectedVendor(null);
        setIsUpdate(false);

        const [allData, dueData] = await Promise.all([
          fetchAllVendors({ page, pageSize }),
          fetchDueVendors({ page, pageSize }),
        ]);
        setAllVendorsData(allData);
        setDueVendorsData(dueData);
      } else {
        throw new Error(
          response.data?.message || response.message || "Operation failed",
        );
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Failed to save vendor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleClearSearch = () => setSearchTerm("");

  const handleAddVendor = () => {
    setSelectedVendor(null);
    setIsUpdate(false);
    setIsVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setIsUpdate(true);
    setIsVendorDialogOpen(true);
  };

  const handleDeleteVendor = (vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteDialogOpen(true);
  };

  const handleCall = (mobile) => {
    if (mobile) window.location.href = `tel:${mobile}`;
  };

  const initialValues = {
    name: selectedVendor?.name || "",
    mobile: selectedVendor?.mobile || "",
    gstNumber: selectedVendor?.gstNumber || "",
    panNumber: selectedVendor?.panNumber || "",
    address: selectedVendor?.address || "",
    city: selectedVendor?.city || "",
    state: selectedVendor?.state || "",
    postalCode: selectedVendor?.postalCode || "",
    country: selectedVendor?.country || "IN",
  };

  const vendors = vendorsData?.items || [];
  const total = vendorsData?.total || 0;

  const totalVendors = allVendorsData.total;
  const totalDueFromAll = allVendorsData.items.reduce(
    (sum, v) => sum + (v.totalDue || 0),
    0,
  );
  const activeVendors = allVendorsData.items.filter(
    (v) => !v.status || v.status === "active" || v.isActive,
  ).length;
  const vendorsWithDue = allVendorsData.items.filter(
    (v) => (v.totalDue || 0) > 0,
  ).length;
  const totalDueVendorsCount = dueVendorsData.total;

  const filteredVendors = vendors.filter((vendor) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      vendor.name?.toLowerCase().includes(q) ||
      vendor.mobile?.toLowerCase().includes(q) ||
      vendor.gstNumber?.toLowerCase().includes(q) ||
      vendor.address?.toLowerCase().includes(q) ||
      vendor.state?.toLowerCase().includes(q)
    );
  });

  const totalDueAmount = dueVendorsData.items.reduce(
    (sum, v) => sum + (v.totalDue || 0),
    0,
  );

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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
                My Vendors
              </h1>
              <p className={`mt-1 text-sm ${currentTheme.textSecondary}`}>
                Manage your vendors and track outstanding payments
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
              <Button onClick={handleAddVendor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Vendors",
                value: totalVendors,
                icon: Building2,
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
                value: activeVendors,
                icon: CheckCircle,
                loading: isLoadingAll,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "With Due",
                value:
                  activeTab === "due" ? totalDueVendorsCount : vendorsWithDue,
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

        {/* ---------------- SEARCH + FILTER PANEL ---------------- */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, GSTIN or state..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-11 h-12 rounded-full bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1 h-11 rounded-xl">
              <TabsTrigger
                value="all"
                className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                All Vendors
                <Badge variant="secondary" className="ml-1">
                  {isLoadingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    totalVendors
                  )}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="due"
                className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2 relative"
              >
                <Wallet className="w-4 h-4" />
                Due Vendors
                {totalDueVendorsCount > 0 && (
                  <Badge className="ml-1 bg-red-500 hover:bg-red-500">
                    {isLoadingDue ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      totalDueVendorsCount
                    )}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ---------------- DUE SUMMARY CARD (শুধু Due tab-এ) ---------------- */}
        {activeTab === "due" && dueVendorsData.items.length > 0 && (
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
                    {totalDueVendorsCount}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <Store className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ---------------- VENDOR LIST (compact grid, purchase-list style) ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : filteredVendors.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200">
              {activeTab === "due" ? (
                <>
                  <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {searchTerm ? "No Vendors Found" : "All Clear! 🎉"}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    {searchTerm
                      ? `No vendors match "${searchTerm}".`
                      : "Great job! All your vendors have cleared their outstanding payments."}
                  </p>
                </>
              ) : (
                <>
                  <Store className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    {searchTerm ? "No Vendors Found" : "No Vendors Yet"}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm mb-4">
                    {searchTerm
                      ? `No vendors match "${searchTerm}".`
                      : "Start by adding your first vendor to begin tracking purchases and payments."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleAddVendor}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vendor
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filteredVendors.map((vendor, index) => {
                const isDueTab = activeTab === "due";
                const dueAmount = vendor.totalDue || 0;
                const showDueBadge = isDueTab && dueAmount > 0;
                const severity = showDueBadge
                  ? getDueSeverity(dueAmount)
                  : null;

                return (
                  <motion.div
                    key={vendor._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    onClick={() => {
                      if (activeTab === "due") {
                        router.push(`/dashboard/vendors/due/${vendor._id}`);
                      } else {
                        handleEditVendor(vendor);
                      }
                    }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all relative group"
                    style={
                      showDueBadge
                        ? {
                            borderLeftWidth: 4,
                            borderLeftColor: severity.color,
                          }
                        : undefined
                    }
                  >
                    {/* Top row — name + actions menu */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 capitalize truncate">
                          {vendor.name || "No Vendor"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {vendor.mobile || "-"}
                        </div>
                      </div>

                      <div className="flex items-start gap-1 shrink-0">
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {vendor.gstNumber ? "GST" : "Non-GST"}
                          </Badge>
                        </div>
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
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteVendor(vendor)}
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

                    {/* Due / GSTIN / state row */}
                    {showDueBadge ? (
                      <div
                        className="flex items-center justify-between mt-3 px-2.5 py-1.5 rounded-lg border border-dashed"
                        style={{
                          borderColor: severity.border,
                          backgroundColor: severity.bg,
                        }}
                      >
                        <span className="text-[10px] font-bold tracking-wide text-slate-500">
                          OUTSTANDING
                        </span>
                        <span
                          className="text-sm font-extrabold"
                          style={{ color: severity.color }}
                        >
                          ₹{dueAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : (
                      vendor.gstNumber && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                          <Hash className="w-3 h-3" />
                          {vendor.gstNumber}
                        </div>
                      )
                    )}

                    {/* Bottom row — location + pending badge */}
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {vendor.address ||
                            `${vendor.state || "-"}${vendor.country ? ", " + vendor.country : ""}`}
                        </span>
                      </div>
                      {showDueBadge ? (
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                          <FileText className="w-3 h-3" />
                          {vendor.pendingPurchaseCount || 0} Pending
                        </span>
                      ) : (
                        !isDueTab &&
                        dueAmount > 0 && (
                          <p className="text-orange-600 font-bold text-xs shrink-0">
                            ₹{dueAmount.toLocaleString("en-IN")} due
                          </p>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {!isLoading && filteredVendors.length > 0 && (
          <p className="text-center text-xs text-slate-400">
            Showing {filteredVendors.length} of {total} vendors
          </p>
        )}
      </div>

      {/* ---------------- Add/Edit Vendor Dialog ---------------- */}
      <Dialog
        open={isVendorDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsVendorDialogOpen(false);
            setSelectedVendor(null);
            setIsUpdate(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isUpdate ? "Edit Vendor" : "Add New Vendor"}
            </DialogTitle>
            <DialogDescription>
              {isUpdate
                ? "Update vendor details below."
                : "Enter vendor details to add to your list."}
            </DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={vendorSchema}
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
                    <Label htmlFor="name">Vendor Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter vendor name"
                      className={`mt-1 ${errors.name && touched.name ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="name"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mobile">Contact Number *</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      value={values.mobile}
                      onChange={(e) => {
                        const cleaned = e.target.value
                          .replace(/[^\d-]/g, "")
                          .slice(0, 12);
                        setFieldValue("mobile", cleaned);
                      }}
                      onBlur={handleBlur}
                      placeholder="Mobile (10-digit) or Landline (0XXXXXXXXX)"
                      maxLength={12}
                      className={`mt-1 ${errors.mobile && touched.mobile ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="mobile"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={values.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter state"
                      className={`mt-1 ${errors.state && touched.state ? "border-red-500" : ""}`}
                    />
                    <ErrorMessage
                      name="state"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstNumber">GSTIN</Label>
                      <Input
                        id="gstNumber"
                        name="gstNumber"
                        value={values.gstNumber}
                        onChange={(e) =>
                          setFieldValue(
                            "gstNumber",
                            e.target.value.toUpperCase(),
                          )
                        }
                        onBlur={handleBlur}
                        placeholder="15 char GSTIN"
                        className={`mt-1 ${errors.gstNumber && touched.gstNumber ? "border-red-500" : ""}`}
                      />
                      <ErrorMessage
                        name="gstNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="panNumber">PAN Number</Label>
                      <Input
                        id="panNumber"
                        name="panNumber"
                        value={values.panNumber}
                        onChange={(e) =>
                          setFieldValue(
                            "panNumber",
                            e.target.value.toUpperCase(),
                          )
                        }
                        onBlur={handleBlur}
                        placeholder="PAN (optional)"
                        maxLength={10}
                        className={`mt-1 ${errors.panNumber && touched.panNumber ? "border-red-500" : ""}`}
                      />
                      <ErrorMessage
                        name="panNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
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
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={values.postalCode}
                        onChange={(e) =>
                          setFieldValue(
                            "postalCode",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
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
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVendorDialogOpen(false)}
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
                    {isUpdate ? "Update Vendor" : "Add Vendor"}
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
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedVendor?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedVendor && deleteMutation.mutate(selectedVendor._id)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 mr-2" />
              )}
              Delete Vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
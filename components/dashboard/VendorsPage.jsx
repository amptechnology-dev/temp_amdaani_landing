"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { motion } from "framer-motion";
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
  IndianRupee,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  MapPin,
  Hash,
  Building2,
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

// Helper: debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Validation patterns
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

// Due severity helper
const getDueSeverity = (amount) => {
  if (amount >= 10000) return "#DC2626";
  if (amount >= 5000) return "#F57C00";
  return "#059669";
};

export default function VendorsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const { authState } = useAuth();
  const router = useRouter();

  // State
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "due"
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  }, [debouncedSearch, activeFilter]);

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
    return activeFilter === "due" ? dueVendorsData : allVendorsData;
  }, [activeFilter, allVendorsData, dueVendorsData]);

  const isLoading = activeFilter === "due" ? isLoadingDue : isLoadingAll;

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
  const totalPages = vendorsData?.totalPages || 1;

  const totalVendors = allVendorsData.total;
  const vendorsWithDue = allVendorsData.items.filter(
    (v) => (v.totalDue || 0) > 0,
  ).length;
  const totalDueVendorsCount = dueVendorsData.total;

  const filteredVendors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (vendor) =>
        vendor.name?.toLowerCase().includes(q) ||
        vendor.mobile?.toLowerCase().includes(q) ||
        vendor.gstNumber?.toLowerCase().includes(q) ||
        vendor.address?.toLowerCase().includes(q) ||
        vendor.state?.toLowerCase().includes(q),
    );
  }, [vendors, searchTerm]);

  // Filter chips — All / Due (mirrors Items page's chip pattern)
  const chips = [
    { key: "all", label: "All Vendors", icon: Building2, count: totalVendors },
    {
      key: "due",
      label: "Due Vendors",
      icon: Wallet,
      count: totalDueVendorsCount,
      danger: true,
    },
  ];

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header — compact, Items-page style */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-lg md:text-xl font-bold ${currentTheme.text}`}>
            Vendors
          </h1>
          <p className={`text-xs ${currentTheme.textSecondary}`}>
            Manage your vendors and track outstanding payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={handleAddVendor} size="sm" className={currentTheme.buttonPrimary}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Search + limit — compact single row */}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search by name, phone, GSTIN or state…"
            className="pl-9 h-8 text-sm rounded-lg"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <X
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select value={pageSize} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x}>
                {x} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips — compact, Items-page style */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 no-scrollbar">
        {chips.map((chip) => {
          const active = activeFilter === chip.key;
          const Icon = chip.icon;
          const loadingCount =
            chip.key === "due" ? isLoadingDue : isLoadingAll;
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active
                  ? chip.danger
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3 h-3" />
              {chip.label}
              <span
                className={`ml-0.5 px-1.5 rounded-full text-[10px] font-bold ${
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
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-semibold text-slate-700">
            Vendors
          </span>
          <span className="text-xs text-slate-400">
            Showing {filteredVendors.length} of {total}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading vendors...
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            {activeFilter === "due" ? (
              <>
                <CheckCircle className="w-10 h-10 text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchTerm ? "No Vendors Found" : "All Clear! 🎉"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                  {searchTerm
                    ? `No vendors match "${searchTerm}".`
                    : "All your vendors have cleared their outstanding payments."}
                </p>
              </>
            ) : (
              <>
                <Store className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchTerm ? "No Vendors Found" : "No Vendors Yet"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                  {searchTerm
                    ? `No vendors match "${searchTerm}".`
                    : "Add your first vendor to begin tracking purchases and payments."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-1.5 w-8">
                    #
                  </th>
                  <th className="text-left font-semibold px-3 py-1.5">
                    Vendor
                  </th>
                  <th className="text-left font-semibold px-3 py-1.5">
                    Contact
                  </th>
                  <th className="text-left font-semibold px-3 py-1.5">
                    Location
                  </th>
                  <th className="text-left font-semibold px-3 py-1.5">
                    GSTIN
                  </th>
                  <th className="text-right font-semibold px-3 py-1.5">
                    {activeFilter === "due" ? "Outstanding" : "Due"}
                  </th>
                  <th className="text-center font-semibold px-3 py-1.5 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor, index) => {
                  const dueAmount = vendor.totalDue || 0;
                  const dColor = getDueSeverity(dueAmount);

                  return (
                    <motion.tr
                      key={vendor._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => {
                        if (activeFilter === "due") {
                          router.push(`/dashboard/vendors/due/${vendor._id}`);
                        } else {
                          handleEditVendor(vendor);
                        }
                      }}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-1.5 text-slate-400 text-xs align-middle">
                        {(page - 1) * pageSize + index + 1}
                      </td>

                      <td className="px-3 py-1.5 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-slate-800 capitalize truncate">
                            {vendor.name || "No Vendor"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 shrink-0"
                          >
                            {vendor.gstNumber ? "GST" : "Non-GST"}
                          </Badge>
                        </div>
                      </td>

                      <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {vendor.mobile || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-1.5 text-slate-500 text-xs align-middle max-w-[180px] truncate">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {vendor.address ||
                              `${vendor.state || "-"}${vendor.country ? ", " + vendor.country : ""}`}
                          </span>
                        </span>
                      </td>

                      <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                        {vendor.gstNumber ? (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {vendor.gstNumber}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-3 py-1.5 text-right align-middle whitespace-nowrap">
                        {dueAmount > 0 ? (
                          <span
                            className="font-bold text-xs"
                            style={{ color: dColor }}
                          >
                            ₹{dueAmount.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      <td
                        className="px-3 py-1.5 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
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
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — compact, Items-page style */}
      <div className="flex justify-between items-center mt-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <p className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
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
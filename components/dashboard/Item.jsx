"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Icons
import {
  Plus,
  Edit,
  Trash,
  Search,
  Loader2,
  MoreVertical,
  Trophy,
  ShoppingCart,
  Clock,
  Flame,
  Repeat,
  X,
  Info,
  Package,
  IndianRupee,
  Warehouse,
  ChevronDown,
  Tag,
  FileText,
  Check,
} from "lucide-react";

// Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import * as Yup from "yup";
import { Formik, Form } from "formik";

// =========================
// Constants
// =========================
const UNIT_OPTIONS = [
  "PCS", "KG", "GRAM", "LITRE", "ML", "BOX", "CARTON", "DOZEN",
  "METER", "FEET", "PACK", "BAG", "BOTTLE", "ROLL", "SET",
];

const GST_RATES = [0, 5, 12, 18, 28];

// =========================
// Fetch Items API
// =========================
const fetchItems = async ({ queryKey }) => {
  const [_key, { page, limit }] = queryKey;
  const params = { page, limit };
  const res = await api.get("/product", { params });
  return {
    items: res.data?.docs ?? [],
    total: res.data?.totalDocs ?? 0,
    totalPages: res.data?.totalPages ?? 1,
  };
};

// ⚠️ endpoint tomar backend er sathe match kore niyo
const fetchCategories = async () => {
  const res = await api.get("/category");
  return res.data?.docs || res.data || [];
};

// ⚠️ endpoint tomar backend er sathe match kore niyo
const fetchHsnCodes = async () => {
  const res = await api.get("/hsn");
  return res.data?.docs || res.data || [];
};

// =========================
// Validation Schema
// =========================
const itemSchema = Yup.object().shape({
  name: Yup.string().trim().required("Item name is required").min(2, "At least 2 characters"),
  unit: Yup.string().required("Unit is required"),
  sellingPrice: Yup.number().typeError("Must be a number").required("Sales price is required").positive("Must be positive"),
  costPrice: Yup.number().typeError("Must be a number").nullable().min(0, "Cannot be negative"),
  discountPrice: Yup.number().typeError("Must be a number").nullable().min(0, "Cannot be negative"),
  gstRate: Yup.number().min(0).max(28),
  isTaxInclusive: Yup.boolean(),
  discountType: Yup.string().oneOf(["percentage", "amount"]),
  openingStock: Yup.string(),
  openingStockValue: Yup.string(),
});

// =========================
// Sort chip config
// =========================
const SORT_MODES = {
  DEFAULT: "default",
  RECENT: "recent",
  TOP_SELLING: "top_selling",
  RESELLING: "reselling",
};

const SORT_CHIPS = [
  { kind: "sort", mode: SORT_MODES.RECENT, label: "Recent", icon: Clock },
  { kind: "sort", mode: SORT_MODES.TOP_SELLING, label: "Top Selling", icon: Flame },
  { kind: "sort", mode: SORT_MODES.RESELLING, label: "Re-selling", icon: Repeat },
];

// =========================
// Opening stock validation
// =========================
function validateOpeningStockValues(stockStr, valueStr, isEdit = false) {
  const errors = {};
  const hasStock = stockStr !== "" && stockStr !== undefined && stockStr !== null;
  const hasValue = valueStr !== "" && valueStr !== undefined && valueStr !== null;

  if (hasValue && !hasStock) {
    errors.openingStock = "Opening stock quantity is required when value is entered";
  }

  if (hasStock) {
    const num = Number(stockStr);
    if (isNaN(num)) {
      errors.openingStock = "Opening stock must be a number";
    } else if (isEdit) {
      if (num < 0) errors.openingStock = "Opening stock cannot be negative";
    } else {
      if (num <= 0) errors.openingStock = "Opening stock must be greater than 0";
    }
  }

  if (hasValue) {
    const num = Number(valueStr);
    if (isNaN(num)) errors.value = "Value must be a number";
    else if (num < 0) errors.value = "Value cannot be negative";
  }

  return errors;
}

// =========================================================
// ✅ CategorySelector — RN app er CategorySelectorBottomSheet
// er equivalent: search + list + inline "add new category"
// =========================================================
function CategorySelector({ value, onSelect }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const wrapperRef = useRef(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name) => await api.post("/category", { name }),
    onSuccess: (res) => {
      const newCategory = res.data;
      queryClient.invalidateQueries(["categories"]);
      onSelect(newCategory);
      setShowAddForm(false);
      setNewCategoryName("");
      setOpen(false);
      toast.success("Category created and selected!");
    },
    onError: () => toast.error("Failed to create category"),
  });

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setShowAddForm(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 border border-slate-200 rounded-md flex items-center justify-between text-sm bg-white hover:bg-slate-50"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || "Select category"}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {!showAddForm ? (
            <>
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    autoFocus
                    placeholder="Search category..."
                    className="pl-8 h-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">No categories found</p>
                ) : (
                  filtered.map((cat) => (
                    <div
                      key={cat._id}
                      onClick={() => {
                        onSelect(cat);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                      {value === cat.name && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(true);
                  setNewCategoryName(search);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 font-medium border-t border-slate-100 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Category
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <Input
                autoFocus
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-9 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  onClick={() => createCategoryMutation.mutate(newCategoryName.trim())}
                >
                  {createCategoryMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// ✅ HsnCodeSelector — RN app er HsnCodeSelectorBottomSheet er
// equivalent: search + list + "add new HSN" (code + GST rate)
// select korle gstRate auto-fill hoy ebong tax option "Exclude Tax"-e set hoy
// =========================================================
function HsnCodeSelector({ value, onSelect }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHsnCode, setNewHsnCode] = useState("");
  const [newHsnGstRate, setNewHsnGstRate] = useState("0");
  const wrapperRef = useRef(null);

  const { data: hsnCodes = [], isLoading } = useQuery({
    queryKey: ["hsnCodes"],
    queryFn: fetchHsnCodes,
    staleTime: 60000,
  });

  const createHsnMutation = useMutation({
    mutationFn: async (payload) => await api.post("/hsn", payload),
    onSuccess: (res) => {
      const newHsn = res.data;
      queryClient.invalidateQueries(["hsnCodes"]);
      onSelect(newHsn);
      setShowAddForm(false);
      setNewHsnCode("");
      setNewHsnGstRate("0");
      setOpen(false);
      toast.success("HSN code created and selected!");
    },
    onError: () => toast.error("Failed to create HSN code"),
  });

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setShowAddForm(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = hsnCodes.filter((h) =>
    h.code?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 border border-slate-200 rounded-md flex items-center justify-between text-sm bg-white hover:bg-slate-50"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || "Select HSN code"}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {!showAddForm ? (
            <>
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    autoFocus
                    placeholder="Search HSN code..."
                    className="pl-8 h-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">No HSN codes found</p>
                ) : (
                  filtered.map((hsn) => (
                    <div
                      key={hsn._id}
                      onClick={() => {
                        onSelect(hsn);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {hsn.code}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {hsn.gstRate ? `${hsn.gstRate}% GST` : "No GST"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(true);
                  setNewHsnCode(search);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 font-medium border-t border-slate-100 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New HSN Code
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <Input
                autoFocus
                placeholder="HSN/SAC code"
                value={newHsnCode}
                onChange={(e) => setNewHsnCode(e.target.value)}
                className="h-9 text-sm"
              />
              <Select value={newHsnGstRate} onValueChange={setNewHsnGstRate}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GST_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r}% GST</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={!newHsnCode.trim() || createHsnMutation.isPending}
                  onClick={() =>
                    createHsnMutation.mutate({
                      code: newHsnCode.trim(),
                      gstRate: Number(newHsnGstRate),
                    })
                  }
                >
                  {createHsnMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================
// MAIN COMPONENT
// =========================
export default function ItemsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const queryClient = useQueryClient();

  // -----------------------
  // State
  // -----------------------
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState(SORT_MODES.DEFAULT);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showOpeningStock, setShowOpeningStock] = useState(false);

  const [openingStockValues, setOpeningStockValues] = useState({ openingStock: "", value: "" });
  const [isFetchingOpeningStock, setIsFetchingOpeningStock] = useState(false);
  const [openingStockErrors, setOpeningStockErrors] = useState({});
  const [openingStockTouched, setOpeningStockTouched] = useState({ openingStock: false, value: false });

  // -----------------------
  // Query
  // -----------------------
  const { data, isLoading } = useQuery({
    queryKey: ["items", { page, limit }],
    queryFn: fetchItems,
    staleTime: 20000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // -----------------------
  // Top-selling product
  // -----------------------
  const topSellingProduct = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce((top, current) => {
      const topSell = top.sellCount || 0;
      const currentSell = current.sellCount || 0;
      if (currentSell > topSell) return current;
      if (currentSell === topSell)
        return (current.sellingPrice || 0) > (top.sellingPrice || 0) ? current : top;
      return top;
    });
  }, [items]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name?.toLowerCase().includes(q));
  }, [items, search]);

  const categoryFiltered = useMemo(() => {
    if (selectedCategory === "all") return searchFiltered;
    return searchFiltered.filter(
      (item) => (item.category?.name || item.category || "Uncategorised") === selectedCategory
    );
  }, [searchFiltered, selectedCategory]);

  const orderedItems = useMemo(() => {
    let result = [...categoryFiltered];
    switch (sortMode) {
      case SORT_MODES.RECENT:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case SORT_MODES.TOP_SELLING:
        result.sort((a, b) => (b.sellCount || 0) - (a.sellCount || 0));
        break;
      case SORT_MODES.RESELLING:
        result = result.filter((item) => (item.sellCount || 0) > 0).sort((a, b) => (b.sellCount || 0) - (a.sellCount || 0));
        break;
      case SORT_MODES.DEFAULT:
      default:
        result.sort((a, b) => (b.sellCount || 0) - (a.sellCount || 0));
        if (topSellingProduct && !search.trim() && selectedCategory === "all") {
          const rest = result.filter((i) => i._id !== topSellingProduct._id);
          result = [topSellingProduct, ...rest];
        }
        break;
    }
    return result;
  }, [categoryFiltered, sortMode, topSellingProduct, search, selectedCategory]);

  const allChips = useMemo(() => {
    const categoryNames = [
      ...new Set(items.map((item) => item.category?.name || item.category || "Uncategorised")),
    ];
    return [
      { kind: "all", label: "All" },
      ...SORT_CHIPS,
      ...categoryNames.map((name) => ({ kind: "category", label: name })),
    ];
  }, [items]);

  const isChipActive = (chip) => {
    if (chip.kind === "all") return sortMode === SORT_MODES.DEFAULT && selectedCategory === "all";
    if (chip.kind === "sort") return sortMode === chip.mode;
    if (chip.kind === "category") return selectedCategory === chip.label;
    return false;
  };

  const handleChipClick = (chip) => {
    if (chip.kind === "all") {
      setSortMode(SORT_MODES.DEFAULT);
      setSelectedCategory("all");
      return;
    }
    if (chip.kind === "sort") {
      setSortMode((prev) => (prev === chip.mode ? SORT_MODES.DEFAULT : chip.mode));
      return;
    }
    if (chip.kind === "category") {
      setSelectedCategory((prev) => (prev === chip.label ? "all" : chip.label));
    }
  };

  // -----------------------
  // ✅ Edit mode e opening stock fresh fetch — RN app er useEffect(fetchProduct) port
  // -----------------------
  useEffect(() => {
    const productId = selectedItem?._id || selectedItem?.id;
    if (!isItemDialogOpen || !selectedItem || !productId) return;

    const fetchProduct = async () => {
      try {
        setIsFetchingOpeningStock(true);
        const response = await api.get(`/product/id/${productId}`);
        const data = response?.data?.data || response?.data;

        const fyStock = data?.financialYearStock;
        if (fyStock) {
          setOpeningStockValues({
            openingStock: fyStock.stock > 0 ? String(fyStock.stock) : "",
            value: fyStock.value > 0 ? String(fyStock.value) : "",
          });
        } else {
          setOpeningStockValues({ openingStock: "", value: "" });
        }
      } catch (err) {
        console.warn("Failed to fetch product for opening stock prefill:", err);
      } finally {
        setIsFetchingOpeningStock(false);
      }
    };

    fetchProduct();
  }, [isItemDialogOpen, selectedItem]);

  // -----------------------
  // Mutations
  // -----------------------
  const saveItemMutation = useMutation({
    mutationFn: async ({ data, isUpdate, id }) => {
      if (isUpdate) return await api.put(`/product/id/${id}`, data);
      return await api.post("/product", data);
    },
    onSuccess: () => {
      toast.success("Item saved!");
      queryClient.invalidateQueries(["items"]);
      closeItemDialog();
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to save item";
      toast.error(msg);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/product/id/${id}`),
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries(["items"]);
      setIsDeleteDialogOpen(false);
    },
    onError: () => toast.error("Failed to delete item"),
  });

  // -----------------------
  // Form Initial Values
  // -----------------------
  const initialValues = useMemo(() => {
    const savedDiscountType = selectedItem?.discountType ?? "amount";
    const savedDiscountPercentage = Number(selectedItem?.discountPercentage ?? 0);
    const savedDiscountPrice = Number(selectedItem?.discountPrice ?? 0);

    const discountPriceDisplay =
      savedDiscountType === "percentage"
        ? savedDiscountPercentage > 0
          ? String(savedDiscountPercentage)
          : ""
        : savedDiscountPrice > 0
        ? String(savedDiscountPrice)
        : "";

    return {
      name: selectedItem?.name || "",
      unit: selectedItem?.unit || "",
      category: selectedItem?.category?.name || selectedItem?.category || "",
      sku: selectedItem?.sku || "",
      hsn: selectedItem?.hsn || "",
      sellingPrice: selectedItem?.sellingPrice ? String(selectedItem.sellingPrice) : "",
      costPrice: selectedItem?.costPrice ? String(selectedItem.costPrice) : "",
      discountPrice: discountPriceDisplay,
      discountType: savedDiscountType,
      gstRate: selectedItem?.gstRate ? String(selectedItem.gstRate) : "0",
      isTaxInclusive: selectedItem?.isTaxInclusive || false,
    };
  }, [selectedItem]);

  // -----------------------
  // HANDLERS
  // -----------------------
  const closeItemDialog = () => {
    setIsItemDialogOpen(false);
    setSelectedItem(null);
    setShowOpeningStock(false);
    setOpeningStockValues({ openingStock: "", value: "" });
    setOpeningStockErrors({});
    setOpeningStockTouched({ openingStock: false, value: false });
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setShowOpeningStock(false);
    setOpeningStockValues({ openingStock: "", value: "" });
    setOpeningStockErrors({});
    setOpeningStockTouched({ openingStock: false, value: false });
    setIsItemDialogOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowOpeningStock(false);
    setOpeningStockValues({ openingStock: "", value: "" });
    setOpeningStockErrors({});
    setOpeningStockTouched({ openingStock: false, value: false });
    setIsItemDialogOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount || 0);

  const isEditMode = Boolean(selectedItem);

  return (
    <div className={`min-h-screen p-6 ${currentTheme.background}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${currentTheme.text}`}>Items</h1>
          <p className={currentTheme.textSecondary}>Manage your inventory items</p>
        </div>
        <Button onClick={handleAdd} className={currentTheme.buttonPrimary}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* SEARCH + PAGE SIZE */}
      <Card className={`mb-4 ${currentTheme.card}`}>
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items…"
              className="pl-10 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <X
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
              />
            )}
          </div>

          <Select value={limit} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((x) => (
                <SelectItem key={x} value={x}>{x} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* FILTER CHIPS */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {allChips.map((chip) => {
          const active = isChipActive(chip);
          const Icon = chip.icon;
          return (
            <button
              key={chip.kind === "category" ? `cat-${chip.label}` : `${chip.kind}-${chip.label}`}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {active && chip.kind === "all" && <span>✓</span>}
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ITEMS LIST */}
      <Card className={`${currentTheme.card} overflow-hidden`}>
        <CardHeader className={currentTheme.surfaceVariant}>
          <CardTitle>Items</CardTitle>
          <CardDescription>Showing {orderedItems.length} of {total} items</CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading items...
            </div>
          ) : orderedItems.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-16">No items found</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {orderedItems.map((item, index) => {
                  const isTopSelling = topSellingProduct && item._id === topSellingProduct._id && (item.sellCount || 0) > 0;
                  const displayPrice = item.discountPrice > 0 ? item.sellingPrice - item.discountPrice : item.sellingPrice;
                  const stock = item.currentStock ?? 0;
                  const stockColor =
                    stock <= 5 ? "bg-rose-50 text-rose-600 border-rose-200"
                    : stock <= 20 ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200";

                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`relative bg-white rounded-2xl border overflow-hidden ${
                        isTopSelling ? "border-blue-400 ring-1 ring-blue-100" : "border-slate-200"
                      }`}
                    >
                      {isTopSelling && (
                        <div className="flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-br-lg w-fit">
                          <Trophy className="w-3 h-3" /> Top selling Product
                        </div>
                      )}

                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 capitalize truncate">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize truncate">
                            {(item.category?.name || item.category || "No Category")} · {item.unit}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {item.hsn && <span className="text-[11px] text-slate-500 font-medium">HSN {item.hsn}</span>}
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${stockColor}`}>
                              {stock} in stock
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            {item.discountPrice > 0 ? (
                              <>
                                <p className="text-blue-600 font-bold text-base leading-tight">{formatCurrency(displayPrice)}</p>
                                <p className="text-xs text-slate-400 line-through">{formatCurrency(item.sellingPrice)}</p>
                              </>
                            ) : (
                              <p className="text-blue-600 font-bold text-base">{formatCurrency(item.sellingPrice)}</p>
                            )}
                            <p className="flex items-center justify-end gap-1 text-xs text-slate-400 mt-1">
                              <ShoppingCart className="w-3 h-3" />
                              {item.sellCount || 0} sold
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-4">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <p className="text-sm">Page {page} of {totalPages}</p>
        <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      {/* ====================================================== */}
      {/* ADD / EDIT DIALOG */}
      {/* ====================================================== */}
      <Dialog open={isItemDialogOpen} onOpenChange={(open) => { if (!open) closeItemDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>Enter the item details below.</DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={itemSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              const salesPrice = Number(values.sellingPrice) || 0;
              const costPrice = Number(values.costPrice) || 0;
              const inputDiscount = Number(values.discountPrice) || 0;

              let discountValue = 0;
              let discountPercentage = 0;

              if (values.discountType === "percentage") {
                discountPercentage = inputDiscount;
                discountValue = parseFloat(((salesPrice * inputDiscount) / 100).toFixed(2));
              } else {
                discountValue = inputDiscount;
                discountPercentage = salesPrice > 0 ? parseFloat(((inputDiscount / salesPrice) * 100).toFixed(4)) : 0;
              }

              const payload = {
                name: values.name,
                unit: values.unit,
                category: values.category,
                sku: values.sku,
                hsn: values.hsn,
                sellingPrice: salesPrice,
                costPrice: costPrice,
                discountPrice: discountValue,
                discountType: values.discountType,
                discountPercentage: discountPercentage,
                gstRate: Number(values.gstRate) || 0,
                isTaxInclusive: values.isTaxInclusive,
              };

              const stockErrors = validateOpeningStockValues(
                openingStockValues.openingStock,
                openingStockValues.value,
                isEditMode
              );

              if (Object.keys(stockErrors).length > 0) {
                setOpeningStockErrors(stockErrors);
                setOpeningStockTouched({ openingStock: true, value: true });
                setShowOpeningStock(true);
                setSubmitting(false);
                toast.error("Please fix the opening stock fields");
                return;
              }

              const hasOpeningStock = openingStockValues.openingStock !== "" && openingStockValues.openingStock !== undefined;
              const hasOpeningValue = openingStockValues.value !== "" && openingStockValues.value !== undefined;

              if (hasOpeningStock || hasOpeningValue) {
                payload.openingStock = hasOpeningStock ? Number(openingStockValues.openingStock) : 0;
                payload.value = hasOpeningValue ? Number(openingStockValues.value) : 0;
              }

              await saveItemMutation.mutateAsync({
                data: payload,
                isUpdate: !!selectedItem,
                id: selectedItem?._id,
              });

              setSubmitting(false);
            }}
          >
            {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => {
              const salesPriceNum = Number(values.sellingPrice) || 0;
              const discountNum = Number(values.discountPrice) || 0;
              let finalPrice = salesPriceNum;
              if (values.discountType === "percentage") {
                finalPrice = salesPriceNum - (salesPriceNum * discountNum) / 100;
              } else {
                finalPrice = salesPriceNum - discountNum;
              }
              if (finalPrice < 0) finalPrice = 0;

              return (
                <Form className="space-y-5">
                  {/* ---- Product Details ---- */}
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Package className="w-4 h-4 text-blue-600" />
                    Product Details
                  </div>
                  <Separator />

                  <div>
                    <Label>Item Name *</Label>
                    <Input name="name" value={values.name} onChange={handleChange} placeholder="Enter item name" />
                    {touched.name && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit *</Label>
                      <Select value={values.unit} onValueChange={(v) => setFieldValue("unit", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {touched.unit && errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
                    </div>

                    {/* ✅ Category — searchable dropdown + inline add-new (RN app er moto) */}
                    <div>
                      <Label>Item Category</Label>
                      <CategorySelector
                        value={values.category}
                        onSelect={(cat) => setFieldValue("category", cat.name)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SKU</Label>
                      <Input name="sku" value={values.sku} onChange={handleChange} />
                    </div>

                    {/* ✅ HSN Code — searchable dropdown + inline add-new,
                        select korle GST rate auto-fill + tax option "Exclude Tax"-e set hoy (RN er moto) */}
                    <div>
                      <Label>HSN/SAC Code</Label>
                      <HsnCodeSelector
                        value={values.hsn}
                        onSelect={(hsn) => {
                          setFieldValue("hsn", hsn.code);
                          if (hsn.gstRate && Number(hsn.gstRate) > 0) {
                            setFieldValue("gstRate", String(hsn.gstRate));
                            setFieldValue("isTaxInclusive", false); // Exclude Tax — RN app er default behavior
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* ---- Price Section ---- */}
                  <div className="flex items-center gap-2 text-slate-700 font-semibold pt-2">
                    <IndianRupee className="w-4 h-4 text-blue-600" />
                    Price
                  </div>
                  <Separator />

                  <div>
                    <Label>Purchase Price (optional)</Label>
                    <Input name="costPrice" value={values.costPrice} onChange={handleChange} placeholder="Enter purchase price" type="number" />
                  </div>

                  <div>
                    <Label>Sales Price *</Label>
                    <div className="flex gap-2">
                      <Input
                        name="sellingPrice"
                        value={values.sellingPrice}
                        onChange={handleChange}
                        placeholder="Enter sales price"
                        type="number"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setFieldValue("isTaxInclusive", !values.isTaxInclusive)}
                        className={`flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold border shrink-0 ${
                          values.isTaxInclusive
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {values.isTaxInclusive ? "Include Tax" : "Exclude Tax"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    {touched.sellingPrice && errors.sellingPrice && (
                      <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>
                    )}
                  </div>

                  <div>
                    <Label>Discount on Sales</Label>
                    <div className="flex gap-2">
                      <Input
                        name="discountPrice"
                        value={values.discountPrice}
                        onChange={handleChange}
                        placeholder="Enter discount"
                        type="number"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newType = values.discountType === "amount" ? "percentage" : "amount";
                          const currentInput = Number(values.discountPrice) || 0;
                          let converted = currentInput;
                          if (newType === "percentage" && values.discountType === "amount") {
                            converted = salesPriceNum > 0 ? parseFloat(((currentInput / salesPriceNum) * 100).toFixed(2)) : 0;
                          } else if (newType === "amount" && values.discountType === "percentage") {
                            converted = parseFloat(((salesPriceNum * currentInput) / 100).toFixed(2));
                          }
                          setFieldValue("discountType", newType);
                          setFieldValue("discountPrice", converted > 0 ? String(converted) : "");
                        }}
                        className="flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold border shrink-0 bg-slate-100 text-slate-600 border-slate-200"
                      >
                        {values.discountType === "percentage" ? "Percentage (%)" : "Amount (₹)"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {values.sellingPrice && values.discountPrice ? (
                      <p className="text-sm text-slate-600 font-medium mt-1.5">
                        Sales Price (After Discount): ₹{finalPrice.toFixed(2)}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label>Tax Rate (GST %)</Label>
                    <Select value={values.gstRate} onValueChange={(v) => setFieldValue("gstRate", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GST rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {GST_RATES.map((r) => (
                          <SelectItem key={r} value={String(r)}>{r === 0 ? "No GST (0%)" : `${r}% GST`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ---- Opening Stock Section ---- */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                      <Warehouse className="w-4 h-4 text-blue-600" />
                      Opening Stock
                    </div>
                    <Separator className="mb-3" />

                    {isFetchingOpeningStock ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading opening stock...
                      </div>
                    ) : !showOpeningStock ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowOpeningStock(true)}
                          className="text-xs font-medium text-blue-600 border border-blue-100 rounded-full px-3 py-1.5"
                        >
                          {openingStockValues.openingStock ? "Edit Opening Stock" : "+ Add Opening Stock"}
                        </button>

                        {openingStockValues.openingStock && openingStockValues.value && (
                          <p className="text-sm text-slate-500">
                            Opening Stock: <span className="font-medium text-slate-700">{openingStockValues.openingStock}</span>
                            {", "}Value: <span className="font-medium text-slate-700">₹{openingStockValues.value}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Opening Stock Qty</Label>
                            <Input
                              value={openingStockValues.openingStock}
                              onChange={(e) => {
                                const text = e.target.value;
                                setOpeningStockValues((prev) => {
                                  const next = { ...prev, openingStock: text };
                                  setOpeningStockErrors(validateOpeningStockValues(next.openingStock, next.value, isEditMode));
                                  return next;
                                });
                              }}
                              onBlur={() => setOpeningStockTouched((p) => ({ ...p, openingStock: true }))}
                              placeholder="Quantity"
                              type="number"
                            />
                            {openingStockTouched.openingStock && openingStockErrors.openingStock && (
                              <p className="text-xs text-red-500 mt-1">{openingStockErrors.openingStock}</p>
                            )}
                          </div>
                          <div>
                            <Label>Opening Stock Value</Label>
                            <Input
                              value={openingStockValues.value}
                              onChange={(e) => {
                                const text = e.target.value;
                                setOpeningStockValues((prev) => {
                                  const next = { ...prev, value: text };
                                  setOpeningStockErrors(validateOpeningStockValues(next.openingStock, next.value, isEditMode));
                                  return next;
                                });
                              }}
                              onBlur={() => setOpeningStockTouched((p) => ({ ...p, value: true }))}
                              placeholder="Total value (₹)"
                              type="number"
                            />
                            {openingStockTouched.value && openingStockErrors.value && (
                              <p className="text-xs text-red-500 mt-1">{openingStockErrors.value}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <p className="text-xs text-blue-700 italic">
                            Opening stock value = Opening stock qty × Purchase rate
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOpeningStock(false)}
                          className="w-full"
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={closeItemDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {selectedItem ? "Update Item" : "Save Item"}
                    </Button>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <h2 className="text-lg font-bold">Delete Item</h2>
            <p>Are you sure you want to delete <strong>{selectedItem?.name}</strong>?</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemMutation.mutate(selectedItem?._id)}
              className="bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
"use client";

import { useState, useMemo } from "react";
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
import * as Yup from "yup";
import { Formik, Form } from "formik";

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

// =========================
// Validation Schema
// =========================
const itemSchema = Yup.object().shape({
  name: Yup.string().required("Item name is required"),
  unit: Yup.string().required("Unit is required"),
  sellingPrice: Yup.number().required().min(0),
  costPrice: Yup.number().nullable().min(0),
  discountPrice: Yup.number().nullable().min(0),
  gstRate: Yup.number().min(0).max(28),
});

// =========================
// Sort chip config (RN app er SORT_MODES/SORT_CHIPS er sathe consistent)
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
  // Top-selling product (current page items theke — RN app er logic)
  // -----------------------
  const topSellingProduct = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce((top, current) => {
      const topSell = top.sellCount || 0;
      const currentSell = current.sellCount || 0;
      if (currentSell > topSell) return current;
      if (currentSell === topSell)
        return (current.sellingPrice || 0) > (top.sellingPrice || 0)
          ? current
          : top;
      return top;
    });
  }, [items]);

  // -----------------------
  // Search filter (name)
  // -----------------------
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name?.toLowerCase().includes(q));
  }, [items, search]);

  // -----------------------
  // Category filter
  // -----------------------
  const categoryFiltered = useMemo(() => {
    if (selectedCategory === "all") return searchFiltered;
    return searchFiltered.filter(
      (item) => (item.category?.name || item.category || "Uncategorised") ===
        selectedCategory
    );
  }, [searchFiltered, selectedCategory]);

  // -----------------------
  // Sort pipeline
  // -----------------------
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
        result = result
          .filter((item) => (item.sellCount || 0) > 0)
          .sort((a, b) => (b.sellCount || 0) - (a.sellCount || 0));
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

  // -----------------------
  // Unified chip list: All + sort chips + category chips
  // -----------------------
  const allChips = useMemo(() => {
    const categoryNames = [
      ...new Set(
        items.map((item) => item.category?.name || item.category || "Uncategorised")
      ),
    ];

    return [
      { kind: "all", label: "All" },
      ...SORT_CHIPS,
      ...categoryNames.map((name) => ({ kind: "category", label: name })),
    ];
  }, [items]);

  const isChipActive = (chip) => {
    if (chip.kind === "all")
      return sortMode === SORT_MODES.DEFAULT && selectedCategory === "all";
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
  // Mutations
  // -----------------------
  const saveItemMutation = useMutation({
    mutationFn: async ({ data, isUpdate, id }) => {
      if (isUpdate) {
        return await api.put(`/product/id/${id}`, data);
      }
      return await api.post("/product", data);
    },
    onSuccess: () => {
      toast.success("Item saved!");
      queryClient.invalidateQueries(["items"]);
      setIsItemDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => toast.error("Failed to save item"),
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
  const initialValues = {
    name: selectedItem?.name || "",
    unit: selectedItem?.unit || "",
    category: selectedItem?.category?.name || selectedItem?.category || "",
    sku: selectedItem?.sku || "",
    hsn: selectedItem?.hsn || "",
    sellingPrice: selectedItem?.sellingPrice || "",
    costPrice: selectedItem?.costPrice || "",
    discountPrice: selectedItem?.discountPrice || "",
    gstRate: selectedItem?.gstRate || "",
    isTaxInclusive: selectedItem?.isTaxInclusive || false,
  };

  // -----------------------
  // HANDLERS
  // -----------------------
  const handleAdd = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);

  return (
    <div className={`min-h-screen p-6 ${currentTheme.background}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${currentTheme.text}`}>Items</h1>
          <p className={currentTheme.textSecondary}>
            Manage your inventory items
          </p>
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
                <SelectItem key={x} value={x}>
                  {x} / page
                </SelectItem>
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

      {/* ITEMS LIST — card design (RN app er moto) */}
      <Card className={`${currentTheme.card} overflow-hidden`}>
        <CardHeader className={currentTheme.surfaceVariant}>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            Showing {orderedItems.length} of {total} items
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading items...
            </div>
          ) : orderedItems.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-16">
              No items found
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {orderedItems.map((item, index) => {
                  const isTopSelling =
                    topSellingProduct &&
                    item._id === topSellingProduct._id &&
                    (item.sellCount || 0) > 0;

                  const displayPrice =
                    item.discountPrice > 0
                      ? item.sellingPrice - item.discountPrice
                      : item.sellingPrice;

                  const stock = item.currentStock ?? 0;
                  const stockColor =
                    stock <= 5
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : stock <= 20
                      ? "bg-orange-50 text-orange-600 border-orange-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200";

                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`relative bg-white rounded-2xl border overflow-hidden ${
                        isTopSelling
                          ? "border-blue-400 ring-1 ring-blue-100"
                          : "border-slate-200"
                      }`}
                    >
                      {isTopSelling && (
                        <div className="flex items-center gap-1 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-br-lg w-fit">
                          <Trophy className="w-3 h-3" /> Top selling Product
                        </div>
                      )}

                      <div className="p-4 flex items-start justify-between gap-3">
                        {/* LEFT */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 capitalize truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize truncate">
                            {(item.category?.name || item.category || "No Category")} · {item.unit}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {item.hsn && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                HSN {item.hsn}
                              </span>
                            )}
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${stockColor}`}
                            >
                              {stock} in stock
                            </span>
                          </div>
                        </div>

                        {/* RIGHT */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right">
                            {item.discountPrice > 0 ? (
                              <>
                                <p className="text-blue-600 font-bold text-base leading-tight">
                                  {formatCurrency(displayPrice)}
                                </p>
                                <p className="text-xs text-slate-400 line-through">
                                  {formatCurrency(item.sellingPrice)}
                                </p>
                              </>
                            ) : (
                              <p className="text-blue-600 font-bold text-base">
                                {formatCurrency(item.sellingPrice)}
                              </p>
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
                              <DropdownMenuItem
                                onClick={() => handleDelete(item)}
                                className="text-red-600"
                              >
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
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>

        <p className="text-sm">
          Page {page} of {totalPages}
        </p>

        <Button
          variant="outline"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
            <DialogDescription>Enter the item details below.</DialogDescription>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={itemSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              const payload = {
                name: values.name,
                unit: values.unit,
                category: values.category,
                sku: values.sku,
                hsn: values.hsn,
                sellingPrice: Number(values.sellingPrice),
                costPrice: Number(values.costPrice),
                discountPrice: Number(values.discountPrice),
                gstRate: Number(values.gstRate),
                isTaxInclusive: values.isTaxInclusive,
              };

              await saveItemMutation.mutateAsync({
                data: payload,
                isUpdate: !!selectedItem,
                id: selectedItem?._id,
              });

              setSubmitting(false);
            }}
          >
            {({ values, handleChange, isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input name="name" value={values.name} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unit *</Label>
                    <Input name="unit" value={values.unit} onChange={handleChange} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input name="category" value={values.category} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU</Label>
                    <Input name="sku" value={values.sku} onChange={handleChange} />
                  </div>
                  <div>
                    <Label>HSN</Label>
                    <Input name="hsn" value={values.hsn} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Selling Price *</Label>
                    <Input
                      name="sellingPrice"
                      value={values.sellingPrice}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label>Cost Price</Label>
                    <Input
                      name="costPrice"
                      value={values.costPrice}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label>Discount</Label>
                    <Input
                      name="discountPrice"
                      value={values.discountPrice}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>GST %</Label>
                    <Input name="gstRate" value={values.gstRate} onChange={handleChange} />
                  </div>
                  <div>
                    <Label>Tax Inclusive?</Label>
                    <Select
                      value={values.isTaxInclusive ? "yes" : "no"}
                      onValueChange={(val) =>
                        handleChange({
                          target: { name: "isTaxInclusive", value: val === "yes" },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsItemDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                    Save Item
                  </Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <h2 className="text-lg font-bold">Delete Item</h2>
            <p>
              Are you sure you want to delete{" "}
              <strong>{selectedItem?.name}</strong>?
            </p>
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
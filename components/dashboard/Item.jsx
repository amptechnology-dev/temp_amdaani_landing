"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useAuth, permissions } from "../../context/AuthContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash,
  Search,
  Loader2,
  MoreVertical,
  Trophy,
  ShoppingCart,
  X,
  Clock,
  Flame,
  Repeat,
  PackagePlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

import AddItemFormModal from "../../components/invoice/AddItemFormModal";
import AdjustStockModal from "./AdjustStockModal";

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

export default function ItemsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const queryClient = useQueryClient();
  const { isStockEnabled, hasPermission } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState(SORT_MODES.DEFAULT);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ── Stock adjustment modal ──
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["items", { page, limit }],
    queryFn: fetchItems,
    staleTime: 20000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

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

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/product/id/${id}`),
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries(["items"]);
      setIsDeleteDialogOpen(false);
    },
    onError: () => toast.error("Failed to delete item"),
  });

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

  const handleItemSaved = () => {
    queryClient.invalidateQueries(["items"]);
    setSelectedItem(null);
  };

  const openStockModal = (item) => {
    setStockItem(item);
    setStockModalOpen(true);
  };

  const handleStockAdjusted = () => {
    queryClient.invalidateQueries(["items"]);
    setStockItem(null);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount || 0);

  const canManageStock = isStockEnabled && hasPermission?.(permissions.CAN_MANAGE_STOCKS);

  const stockColor = (stock) =>
    stock <= 5 ? "#DC2626" : stock <= 20 ? "#F57C00" : "#059669";

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header — compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-lg md:text-xl font-bold ${currentTheme.text}`}>Items</h1>
          <p className={`text-xs ${currentTheme.textSecondary}`}>Manage your inventory items</p>
        </div>
        <Button onClick={handleAdd} size="sm" className={currentTheme.buttonPrimary}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Search + limit — compact single row */}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search items…"
            className="pl-9 h-8 text-sm rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <X
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select value={limit} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x}>{x} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips — compact */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 no-scrollbar">
        {allChips.map((chip) => {
          const active = isChipActive(chip);
          const Icon = chip.icon;
          return (
            <button
              key={chip.kind === "category" ? `cat-${chip.label}` : `${chip.kind}-${chip.label}`}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {active && chip.kind === "all" && <span>✓</span>}
              {Icon && <Icon className="w-3 h-3" />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ===== Excel-style dense table ===== */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-semibold text-slate-700">Items</span>
          <span className="text-xs text-slate-400">
            Showing {orderedItems.length} of {total}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading items...
          </div>
        ) : orderedItems.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-14">No items found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-1.5 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-1.5">Item</th>
                  <th className="text-left font-semibold px-3 py-1.5">Category</th>
                  {isStockEnabled && (
                    <th className="text-right font-semibold px-3 py-1.5">Stock</th>
                  )}
                  <th className="text-right font-semibold px-3 py-1.5">Price</th>
                  <th className="text-right font-semibold px-3 py-1.5">Sold</th>
                  <th className="text-center font-semibold px-3 py-1.5 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
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
                  const sColor = stockColor(stock);

                  return (
                    <tr
                      key={item._id}
                      onClick={() => handleEdit(item)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-1.5 text-slate-400 text-xs align-middle">
                        {(page - 1) * limit + index + 1}
                      </td>

                      <td className="px-3 py-1.5 align-middle">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isTopSelling && (
                            <span
                              title="Top Selling"
                              className="shrink-0 flex items-center gap-0.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            >
                              <Trophy className="w-2.5 h-2.5" />
                              TOP
                            </span>
                          )}
                          <span className="font-medium text-slate-800 capitalize truncate">
                            {item.name}
                          </span>
                          {item.hsn && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                              HSN {item.hsn}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-1.5 text-slate-500 text-xs capitalize align-middle whitespace-nowrap">
                        {(item.category?.name || item.category || "Uncategorised")} · {item.unit}
                      </td>

                      {isStockEnabled && (
                        <td className="px-3 py-1.5 text-right align-middle">
                          <span
                            className="font-bold text-xs"
                            style={{ color: sColor }}
                          >
                            {stock}
                          </span>
                        </td>
                      )}

                      <td className="px-3 py-1.5 text-right align-middle whitespace-nowrap">
                        {item.discountPrice > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <span className="text-blue-600 font-semibold text-xs">
                              {formatCurrency(displayPrice)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatCurrency(item.sellingPrice)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-blue-600 font-semibold text-xs">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-1.5 text-right align-middle">
                        <span className="flex items-center justify-end gap-1 text-slate-500 text-xs">
                          <ShoppingCart className="w-3 h-3" />
                          {item.sellCount || 0}
                        </span>
                      </td>

                      <td className="px-3 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {canManageStock && (
                            <button
                              onClick={() => openStockModal(item)}
                              title="Adjust Stock"
                              className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <PackagePlus className="w-3 h-3" />
                            </button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="w-3.5 h-3.5" />
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — compact */}
      <div className="flex justify-between items-center mt-3">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      <AddItemFormModal
        open={isItemDialogOpen}
        onOpenChange={(open) => {
          setIsItemDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        onItemCreated={handleItemSaved}
        editItem={selectedItem}
      />

      <AdjustStockModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        item={stockItem}
        onAdjusted={handleStockAdjusted}
      />

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
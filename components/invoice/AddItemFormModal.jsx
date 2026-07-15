"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  X,
  Package,
  IndianRupee,
  Search,
  Check,
  Trash2,
  Pencil,
  ChevronDown,
  Warehouse,
  Info,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import api from "../../utils/api";

const UNITS = [
  { name: "Piece", symbol: "pcs" },
  { name: "Box", symbol: "box" },
  { name: "Kilogram", symbol: "kg" },
  { name: "Gram", symbol: "g" },
  { name: "Liter", symbol: "ltr" },
  { name: "Milliliter", symbol: "ml" },
  { name: "Dozen", symbol: "dz" },
  { name: "Carton", symbol: "ctn" },
  { name: "Acre", symbol: "acre" },
  { name: "Meter", symbol: "m" },
];

const COMMON_GST_RATES = [0, 5, 12, 18, 28];

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));

const unwrapDoc = (res) => {
  const raw = res?.data;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.data) {
    return raw.data;
  }
  return raw;
};

const unwrapList = (res) => {
  const raw = res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.docs)) return raw.docs;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

// ✅ ItemsPage er moto opening stock validation
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
    } else if (num <= 0) {
      errors.openingStock = "Opening stock must be greater than 0";
    }
  }

  if (hasValue) {
    const num = Number(valueStr);
    if (isNaN(num)) errors.openingStockValue = "Value must be a number";
    else if (num < 0) errors.openingStockValue = "Value cannot be negative";
  }

  return errors;
}

const validationSchema = Yup.object().shape({
  itemName: Yup.string().trim().required("Item name is required").min(2),
  hsnCode: Yup.string().trim(),
  unit: Yup.string().required("Unit is required"),
  salesPrice: Yup.number()
    .required("Sales price is required")
    .positive("Sales price must be positive"),
  purchasePrice: Yup.number()
    .nullable()
    .positive("Purchase price must be positive")
    .typeError("Must be a number"),
  discountPrice: Yup.number()
    .nullable()
    .min(0, "Discount cannot be negative")
    .typeError("Must be a number"),
});

// =========================================================
// Category inline creator
// =========================================================
function CategorySection({ value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/category");
      setCategories(unwrapList(res));
    } catch {
      // fail silently — non-blocking field
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  useEffect(() => {
    if (value && categories.length === 0) fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filtered = useMemo(() => {
    let list = categories;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, search]);

  const selectedCategory = categories.find((c) => c._id === value);

  const handleSelect = (cat) => {
    if (value === cat._id) {
      onChange("");
    } else {
      onChange(cat._id);
    }
    setOpen(false);
    setSearch("");
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    const nameTyped = newCategoryName.trim();
    try {
      const res = await api.post("/category", { name: nameTyped });
      const created = unwrapDoc(res);

      if (created && isValidObjectId(created._id)) {
        setCategories((prev) => [...prev, created]);
        onChange(created._id);
        setNewCategoryName("");
        setIsAddingNew(false);
        toast.success("Category created and selected!");
        return;
      }

      const listRes = await api.get("/category");
      const freshList = unwrapList(listRes);
      setCategories(freshList);
      const matched = freshList.find(
        (c) => c.name?.toLowerCase().trim() === nameTyped.toLowerCase(),
      );

      if (matched && isValidObjectId(matched._id)) {
        onChange(matched._id);
        setNewCategoryName("");
        setIsAddingNew(false);
        toast.success("Category created and selected!");
      } else {
        toast.error(
          "Category created but couldn't auto-select it. Please pick it from the list.",
        );
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editTarget || !editName.trim()) return;
    try {
      const res = await api.put(`/category/id/${editTarget._id}`, {
        name: editName.trim(),
      });
      const updated = unwrapDoc(res) || {
        ...editTarget,
        name: editName.trim(),
      };
      setCategories((prev) =>
        prev.map((c) => (c._id === editTarget._id ? updated : c)),
      );
      toast.success("Category updated");
      setEditTarget(null);
      setEditName("");
    } catch {
      toast.error("Failed to update category");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/category/id/${deleteTarget._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      if (value === deleteTarget._id) onChange("");
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <Label>Category</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50"
          >
            <span
              className={selectedCategory ? "text-slate-800" : "text-slate-400"}
            >
              {selectedCategory?.name || "Select category"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b border-slate-100">
            {!isAddingNew ? (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="w-full flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md px-2 py-2"
              >
                <Plus className="w-4 h-4" />
                Add New Category
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="h-9"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleCreateCategory}
                  disabled={savingCategory}
                >
                  {savingCategory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewCategoryName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">
                No categories found
              </p>
            ) : (
              filtered.map((cat) => {
                const selected = value === cat._id;
                const isEditingThis = editTarget?._id === cat._id;

                if (isEditingThis) {
                  return (
                    <div
                      key={cat._id}
                      className="flex items-center gap-1.5 px-2 py-1.5"
                    >
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleUpdateCategory();
                          }
                        }}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleUpdateCategory}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setEditTarget(null)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat._id}
                    className={`flex items-center justify-between rounded-md px-2 py-2 cursor-pointer group ${
                      selected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelect(cat)}
                  >
                    <span
                      className={`text-sm truncate ${
                        selected
                          ? "text-blue-700 font-medium"
                          : "text-slate-700"
                      }`}
                    >
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget(cat);
                          setEditName(cat.name);
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(cat);
                        }}
                        className="p-1.5 rounded hover:bg-red-100 text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =========================================================
// HSN Code inline creator
// =========================================================
function HsnCodeSection({ value, gstRate, onHsnSelect }) {
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGstRate, setNewGstRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fetchHsnCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hsncode");
      setHsnCodes(unwrapList(res));
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchHsnCodes();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return hsnCodes;
    const q = search.toLowerCase();
    return hsnCodes.filter(
      (h) =>
        h.code?.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q),
    );
  }, [hsnCodes, search]);

  const handleSelect = (hsn) => {
    onHsnSelect(hsn);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onHsnSelect(null);
    setOpen(false);
  };

  const validateNewHsn = () => {
    const errs = {};
    if (!newCode.trim()) errs.code = "HSN code is required";
    else if (!/^\d+$/.test(newCode.trim()))
      errs.code = "HSN code must contain only numbers";

    if (newGstRate.trim() === "") errs.gstRate = "GST rate is required";
    else {
      const rate = parseFloat(newGstRate);
      if (isNaN(rate)) errs.gstRate = "GST rate must be a valid number";
      else if (rate < 0 || rate > 100)
        errs.gstRate = "GST rate must be between 0 and 100";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateHsn = async () => {
    if (!validateNewHsn()) return;
    setSaving(true);
    try {
      const res = await api.post("/hsncode", {
        code: newCode.trim(),
        description: newDescription.trim(),
        gstRate: parseFloat(newGstRate),
      });
      const created = unwrapDoc(res);

      if (created && created.code) {
        setHsnCodes((prev) => [...prev, created]);
        onHsnSelect(created);
        setNewCode("");
        setNewDescription("");
        setNewGstRate("");
        setIsAddingNew(false);
        setOpen(false);
        toast.success("HSN code created and selected!");
        return;
      }

      const listRes = await api.get("/hsncode");
      const freshList = unwrapList(listRes);
      setHsnCodes(freshList);
      const matched = freshList.find((h) => h.code === newCode.trim());

      if (matched) {
        onHsnSelect(matched);
        setNewCode("");
        setNewDescription("");
        setNewGstRate("");
        setIsAddingNew(false);
        setOpen(false);
        toast.success("HSN code created and selected!");
      } else {
        toast.error(
          "HSN code created but couldn't auto-select it. Please pick it from the list.",
        );
      }
    } catch {
      toast.error("Failed to create HSN code");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Label>HSN/SAC Code</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50"
          >
            <span className={value ? "text-slate-800" : "text-slate-400"}>
              {value
                ? `${value}${gstRate ? ` (${gstRate}% GST)` : ""}`
                : "Select HSN code"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0" align="start">
          {!isAddingNew ? (
            <>
              <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="flex-1 flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md px-2 py-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New HSN Code
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-slate-400 hover:text-red-500 px-2"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search HSN code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-8"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-1">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">
                    No HSN codes found
                  </p>
                ) : (
                  filtered.map((hsn) => {
                    const selected = value === hsn.code;
                    return (
                      <div
                        key={hsn._id}
                        onClick={() => handleSelect(hsn)}
                        className={`rounded-md px-2.5 py-2 cursor-pointer ${
                          selected ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-medium ${
                              selected ? "text-blue-700" : "text-slate-800"
                            }`}
                          >
                            {hsn.code}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {hsn.gstRate}% GST
                          </span>
                        </div>
                        {hsn.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {hsn.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  Add HSN Code
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <Input
                  placeholder="HSN Code *"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="h-9"
                />
                {formErrors.code && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>
                )}
              </div>

              <Input
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-9"
              />

              <div>
                <Input
                  placeholder="GST Rate (%) *"
                  type="number"
                  value={newGstRate}
                  onChange={(e) => setNewGstRate(e.target.value)}
                  className="h-9"
                />
                {formErrors.gstRate && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.gstRate}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">
                  Common GST Rates:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_GST_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewGstRate(String(r))}
                      className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                        newGstRate === String(r)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={handleCreateHsn}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create HSN Code
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// =========================================================
// MAIN — Add / Edit Item Form Modal (shared, ItemsPage-style design)
// =========================================================
export default function AddItemFormModal({
  open,
  onOpenChange,
  onItemCreated,
  initialItemName = "",
  editItem = null,
}) {
  const isEditMode = Boolean(editItem);

  // ✅ Modal jekhan theke-i khola hok na keno, fresh full product data
  // nijei fetch kore neyoya hoy — caller-er upor nirbhor kore na
  const [resolvedItem, setResolvedItem] = useState(null);
  const [isFetchingEditItem, setIsFetchingEditItem] = useState(false);
  const [showOpeningStock, setShowOpeningStock] = useState(false);
  const fetchedForIdRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setResolvedItem(null);
      setShowOpeningStock(false);
      fetchedForIdRef.current = null;
      return;
    }
    if (!editItem) {
      setResolvedItem(null);
      setShowOpeningStock(false);
      return;
    }

    const targetId = editItem._id;

    if (!isValidObjectId(targetId)) {
      // temp/locally-added item — cart-er existing data e use koro
      setResolvedItem(editItem);
      return;
    }

    if (fetchedForIdRef.current === targetId) return;

    const fetchFresh = async () => {
      try {
        setIsFetchingEditItem(true);
        const res = await api.get(`/product/id/${targetId}`);
        const fresh = res?.data?.data || res?.data;
        fetchedForIdRef.current = targetId;
        setResolvedItem(
          fresh
            ? {
                ...fresh,
                cartItemId: editItem.cartItemId,
                qty: editItem.qty,
                purchaseDiscount: editItem.purchaseDiscount,
                purchaseDiscountType: editItem.purchaseDiscountType,
              }
            : editItem,
        );
        if (fresh?.financialYearStock?.stock > 0) setShowOpeningStock(true);
      } catch (err) {
        console.warn("Failed to fetch fresh item data:", err);
        setResolvedItem(editItem);
      } finally {
        setIsFetchingEditItem(false);
      }
    };

    fetchFresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editItem]);

  const activeItem = resolvedItem || editItem;
  const canUpdateExisting = isValidObjectId(activeItem?._id);

  const initialValues = useMemo(() => {
    if (!activeItem) {
      return {
        itemName: initialItemName,
        itemCode: "",
        hsnCode: "",
        unit: "",
        category: "",
        salesPrice: "",
        purchasePrice: "",
        isTaxInclusive: false,
        gstRate: "",
        discountType: "amount",
        discountPrice: "",
        openingStock: "",
        openingStockValue: "",
      };
    }

    const rawUnit = String(activeItem.unit || "").toLowerCase();
    const matchedUnit = UNITS.find(
      (u) =>
        u.symbol.toLowerCase() === rawUnit || u.name.toLowerCase() === rawUnit,
    );

    let categoryId = "";
    if (activeItem.category && typeof activeItem.category === "object") {
      categoryId = isValidObjectId(activeItem.category._id)
        ? activeItem.category._id
        : "";
    } else if (isValidObjectId(activeItem.category)) {
      categoryId = activeItem.category;
    }

    const savedDiscountType = activeItem.discountType ?? "amount";
    const savedDiscountPercentage = Number(activeItem.discountPercentage ?? 0);
    const savedDiscountPrice = Number(activeItem.discountPrice ?? 0);
    const discountPriceDisplay =
      savedDiscountType === "percentage"
        ? savedDiscountPercentage > 0
          ? String(savedDiscountPercentage)
          : ""
        : savedDiscountPrice > 0
          ? String(savedDiscountPrice)
          : "";

    const fyStock = activeItem.financialYearStock;

    return {
      itemName: activeItem.name || "",
      itemCode: activeItem.sku || "",
      hsnCode: activeItem.hsn || "",
      unit: matchedUnit ? matchedUnit.name : "",
      category: categoryId,
      salesPrice: activeItem.sellingPrice ? String(activeItem.sellingPrice) : "",
      purchasePrice: activeItem.costPrice ? String(activeItem.costPrice) : "",
      isTaxInclusive: !!activeItem.isTaxInclusive,
      gstRate: activeItem.gstRate ? String(activeItem.gstRate) : "",
      discountType: savedDiscountType,
      discountPrice: discountPriceDisplay,
      openingStock: fyStock?.stock > 0 ? String(fyStock.stock) : "",
      openingStockValue: fyStock?.value > 0 ? String(fyStock.value) : "",
    };
  }, [activeItem, initialItemName]);

  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    try {
      const salesPrice = Number(values.salesPrice) || 0;
      const inputDiscount = Number(values.discountPrice) || 0;

      const discountValue =
        values.discountType === "percentage"
          ? parseFloat(((salesPrice * inputDiscount) / 100).toFixed(2))
          : inputDiscount;

      const discountPercentage =
        values.discountType === "percentage"
          ? inputDiscount
          : salesPrice > 0
            ? parseFloat(((inputDiscount / salesPrice) * 100).toFixed(4))
            : 0;

      // ✅ Opening stock validation — ItemsPage er moto add e >0 baddhotamulok,
      // edit e 0 o cholbe
      const stockErrors = validateOpeningStockValues(
        values.openingStock,
        values.openingStockValue,
        isEditMode && canUpdateExisting,
      );
      if (Object.keys(stockErrors).length > 0) {
        toast.error(Object.values(stockErrors)[0]);
        setShowOpeningStock(true);
        setSubmitting(false);
        return;
      }

      const payload = {
        name: values.itemName,
        unit: values.unit,
        category: isValidObjectId(values.category) ? values.category : "",
        sku: values.itemCode || "",
        hsn: values.hsnCode || "",
        sellingPrice: salesPrice,
        costPrice: Number(values.purchasePrice) || 0,
        gstRate: values.gstRate ? Number(values.gstRate) : 0,
        isTaxInclusive: !!values.isTaxInclusive,
        discountPrice: discountValue,
        discountType: values.discountType,
        discountPercentage,
      };

      const hasOpeningStock =
        values.openingStock !== "" && values.openingStock != null;
      const hasOpeningValue =
        values.openingStockValue !== "" && values.openingStockValue != null;

      if (hasOpeningStock || hasOpeningValue) {
        payload.openingStock = hasOpeningStock
          ? Number(values.openingStock)
          : 0;
        payload.value = hasOpeningValue ? Number(values.openingStockValue) : 0;
      }

      const res =
        isEditMode && canUpdateExisting
          ? await api.put(`/product/id/${activeItem._id}`, payload)
          : await api.post("/product", payload);

      const savedItem = unwrapDoc(res);

      toast.success(
        isEditMode && canUpdateExisting
          ? "Item updated successfully!"
          : "Item added successfully!",
      );
      resetForm();
      onOpenChange(false);
      onItemCreated?.(savedItem);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to save item. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            {isEditMode ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>Enter the item details below.</DialogDescription>
        </DialogHeader>

        {isFetchingEditItem ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading item details...
          </div>
        ) : (
          <Formik
            key={
              open
                ? activeItem?._id || activeItem?.cartItemId || initialItemName
                : "closed"
            }
            enableReinitialize
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              setFieldValue,
              isSubmitting,
            }) => {
              const salesPriceNum = Number(values.salesPrice) || 0;
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
                    <Input
                      name="itemName"
                      value={values.itemName}
                      onChange={handleChange}
                      placeholder="Enter item name"
                      className="mt-1"
                    />
                    {touched.itemName && errors.itemName && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.itemName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit *</Label>
                      <Select
                        value={values.unit}
                        onValueChange={(v) => setFieldValue("unit", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u.name} value={u.name}>
                              {u.name} ({u.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {touched.unit && errors.unit && (
                        <p className="text-xs text-red-500 mt-1">{errors.unit}</p>
                      )}
                    </div>

                    <CategorySection
                      value={values.category}
                      onChange={(v) => setFieldValue("category", v)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SKU (optional)</Label>
                      <Input
                        name="itemCode"
                        value={values.itemCode}
                        onChange={handleChange}
                        placeholder="Item code"
                        className="mt-1"
                      />
                    </div>

                    <HsnCodeSection
                      value={values.hsnCode}
                      gstRate={values.gstRate}
                      onHsnSelect={(hsn) => {
                        if (!hsn) {
                          setFieldValue("hsnCode", "");
                          setFieldValue("gstRate", "");
                          setFieldValue("isTaxInclusive", false);
                          return;
                        }
                        setFieldValue("hsnCode", hsn.code);
                        if (hsn.gstRate && Number(hsn.gstRate) > 0) {
                          setFieldValue("gstRate", String(hsn.gstRate));
                          setFieldValue("isTaxInclusive", false);
                        } else {
                          setFieldValue("gstRate", "");
                          setFieldValue("isTaxInclusive", false);
                        }
                      }}
                    />
                  </div>

                  {/* ---- Price ---- */}
                  <div className="flex items-center gap-2 text-slate-700 font-semibold pt-2">
                    <IndianRupee className="w-4 h-4 text-blue-600" />
                    Price
                  </div>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Purchase Price (optional)</Label>
                      <Input
                        name="purchasePrice"
                        value={values.purchasePrice}
                        onChange={handleChange}
                        placeholder="Enter purchase price"
                        type="number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Sales Price *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          name="salesPrice"
                          value={values.salesPrice}
                          onChange={handleChange}
                          placeholder="Enter sales price"
                          type="number"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFieldValue("isTaxInclusive", !values.isTaxInclusive)
                          }
                          className={`flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                            values.isTaxInclusive
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {values.isTaxInclusive ? "Incl. Tax" : "Excl. Tax"}
                        </button>
                      </div>
                      {touched.salesPrice && errors.salesPrice && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.salesPrice}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Rate (GST %)</Label>
                      <div className="mt-1 h-10 px-3 rounded-md border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                        {values.gstRate
                          ? `${values.gstRate}% GST`
                          : "Set via HSN code"}
                      </div>
                    </div>
                    <div>
                      <Label>Discount on Sales</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          name="discountPrice"
                          value={values.discountPrice}
                          onChange={handleChange}
                          placeholder="0"
                          type="number"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newType =
                              values.discountType === "amount"
                                ? "percentage"
                                : "amount";
                            const currentInput = Number(values.discountPrice) || 0;
                            let converted = currentInput;
                            if (
                              newType === "percentage" &&
                              values.discountType === "amount"
                            ) {
                              converted =
                                salesPriceNum > 0
                                  ? parseFloat(
                                      ((currentInput / salesPriceNum) * 100).toFixed(2),
                                    )
                                  : 0;
                            } else if (
                              newType === "amount" &&
                              values.discountType === "percentage"
                            ) {
                              converted = parseFloat(
                                ((salesPriceNum * currentInput) / 100).toFixed(2),
                              );
                            }
                            setFieldValue("discountType", newType);
                            setFieldValue(
                              "discountPrice",
                              converted > 0 ? String(converted) : "",
                            );
                          }}
                          className="flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border shrink-0 bg-slate-100 text-slate-600 border-slate-200"
                        >
                          {values.discountType === "percentage" ? "%" : "₹"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {values.salesPrice && values.discountPrice ? (
                    <p className="text-sm text-slate-600 font-medium">
                      Sales Price (After Discount): ₹{finalPrice.toFixed(2)}
                    </p>
                  ) : null}

                  {/* ---- Opening Stock — collapsible, ItemsPage-style ---- */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                      <Warehouse className="w-4 h-4 text-blue-600" />
                      Opening Stock
                    </div>
                    <Separator className="mb-3" />

                    {!showOpeningStock ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowOpeningStock(true)}
                          className="text-xs font-medium text-blue-600 border border-blue-100 rounded-full px-3 py-1.5"
                        >
                          {values.openingStock
                            ? "Edit Opening Stock"
                            : "+ Add Opening Stock"}
                        </button>

                        {values.openingStock && values.openingStockValue && (
                          <p className="text-sm text-slate-500">
                            Opening Stock:{" "}
                            <span className="font-medium text-slate-700">
                              {values.openingStock}
                            </span>
                            {", "}Value:{" "}
                            <span className="font-medium text-slate-700">
                              ₹{values.openingStockValue}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Opening Stock Qty</Label>
                            <Input
                              name="openingStock"
                              value={values.openingStock}
                              onChange={handleChange}
                              placeholder="Quantity"
                              type="number"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Opening Stock Value</Label>
                            <Input
                              name="openingStockValue"
                              value={values.openingStockValue}
                              onChange={handleChange}
                              placeholder="Total value (₹)"
                              type="number"
                              className="mt-1"
                            />
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

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {isEditMode && canUpdateExisting
                        ? "Update Item"
                        : "Add Item"}
                    </Button>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        )}
      </DialogContent>
    </Dialog>
  );
}
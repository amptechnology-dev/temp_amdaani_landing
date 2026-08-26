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
  PlusCircle,
  MinusCircle,
  Percent,
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
import { useAuth } from "../../context/AuthContext";

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

const TAX_OPTIONS = [
  {
    id: "with_tax",
    label: "Include Tax",
    description: "Price includes applicable taxes",
    Icon: PlusCircle,
  },
  {
    id: "without_tax",
    label: "Exclude Tax",
    description: "Price excludes taxes (tax will be added)",
    Icon: MinusCircle,
  },
];

const defaultTaxOption = TAX_OPTIONS[1];

const GST_RATE_OPTIONS = COMMON_GST_RATES.map((r) => ({
  id: String(r),
  rate: r,
  label: `${r}% GST`,
  description: r === 0 ? "Nil rated / exempt goods" : `Standard ${r}% GST slab`,
}));

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

function validateOpeningStockValues(stockStr, valueStr, isEdit = false) {
  const errors = {};
  const hasStock =
    stockStr !== "" && stockStr !== undefined && stockStr !== null;
  const hasValue =
    valueStr !== "" && valueStr !== undefined && valueStr !== null;

  if (hasValue && !hasStock) {
    errors.openingStock =
      "Opening stock quantity is required when value is entered";
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
  mrp: Yup.number()
    .nullable()
    .positive("MRP must be positive")
    .typeError("MRP must be a valid number"),
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
            className="mt-0.5 w-full h-9 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50"
          >
            <span
              className={`text-xs ${selectedCategory ? "text-slate-800" : "text-slate-400"}`}
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
            className="mt-0.5 w-full h-9 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50"
          >
            <span
              className={`text-xs ${value ? "text-slate-800" : "text-slate-400"}`}
            >
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
// Tax Option toggle — simple click-to-switch, no popover
// =========================================================
function TaxOptionSection({ value, onChange }) {
  const selected =
    TAX_OPTIONS.find((o) => o.id === value?.id) || defaultTaxOption;
  const isInclude = selected.id === "with_tax";

  const handleToggle = () => {
    const next = isInclude ? TAX_OPTIONS[1] : TAX_OPTIONS[0];
    onChange(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 h-9 rounded-full text-[11px] font-semibold border shrink-0 transition-colors ${
        isInclude
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
      }`}
    >
      <selected.Icon className="w-3.5 h-3.5" />
      {selected.label}
    </button>
  );
}

// =========================================================
// Tax Rate selector
// =========================================================
function TaxRateSection({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [customRate, setCustomRate] = useState(
    value?.rate != null ? String(value.rate) : "",
  );

  useEffect(() => {
    setCustomRate(value?.rate != null ? String(value.rate) : "");
  }, [value]);

  const applyCustomRate = () => {
    const num = parseFloat(customRate);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error("Enter a valid GST rate between 0 and 100");
      return;
    }
    onChange({ rate: num, label: `${num}% GST` });
    setOpen(false);
  };

  return (
    <div>
      <Label>Tax Rate (GST %)</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="mt-0.5 w-full h-9 px-3 rounded-md border border-slate-200 bg-white flex items-center justify-between text-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              className={`text-xs ${value ? "text-slate-800" : "text-slate-400"}`}
            >
              {value ? value.label : "Select tax rate"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-2" align="start">
          <p className="text-xs font-semibold text-slate-500 px-1 pb-1.5">
            Common GST Rates
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {GST_RATE_OPTIONS.map((opt) => {
              const isSelected = value?.rate === opt.rate;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange({ rate: opt.rate, label: opt.label });
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? "text-blue-700" : "text-slate-800"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400">{opt.description}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {opt.rate}%
                  </span>
                </button>
              );
            })}
          </div>

          <Separator className="my-2" />

          <p className="text-xs font-semibold text-slate-500 px-1 pb-1.5">
            Custom Rate
          </p>
          <div className="flex items-center gap-1.5 px-1 pb-1">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="e.g. 3"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustomRate();
                  }
                }}
                className="h-9 pr-7"
              />
              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9"
              onClick={applyCustomRate}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// =========================================================
// MAIN — Add / Edit Item Form Modal
// =========================================================
export default function AddItemFormModal({
  open,
  onOpenChange,
  onItemCreated,
  initialItemName = "",
  editItem = null,
}) {
  const isEditMode = Boolean(editItem);
  const { isMrpEnabled } = useAuth();

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

  const [selectedTaxOption, setSelectedTaxOption] = useState(defaultTaxOption);
  const [selectedTaxRate, setSelectedTaxRate] = useState(null);

  const [selectedPurchaseTaxOption, setSelectedPurchaseTaxOption] =
    useState(defaultTaxOption);
  const [selectedPurchaseTaxRate, setSelectedPurchaseTaxRate] = useState(null);

  useEffect(() => {
    if (!open) return;

    if (!activeItem) {
      setSelectedTaxOption(defaultTaxOption);
      setSelectedTaxRate(null);
      setSelectedPurchaseTaxOption(defaultTaxOption);
      setSelectedPurchaseTaxRate(null);
      return;
    }

    const taxOption = activeItem.isTaxInclusive
      ? TAX_OPTIONS[0]
      : defaultTaxOption;

    const taxRate =
      activeItem.gstRate && Number(activeItem.gstRate) > 0
        ? {
            rate: Number(activeItem.gstRate),
            label: `${activeItem.gstRate}% GST`,
          }
        : null;

    setSelectedTaxOption(taxOption);
    setSelectedTaxRate(taxRate);

    const purchaseTaxOption = activeItem.isPurchaseTaxInclusive
      ? TAX_OPTIONS[0]
      : defaultTaxOption;

    const purchaseGstRateValue =
      activeItem.purchaseGstRate ?? activeItem.gstRate;
    const purchaseTaxRate =
      purchaseGstRateValue && Number(purchaseGstRateValue) > 0
        ? {
            rate: Number(purchaseGstRateValue),
            label: `${purchaseGstRateValue}% GST`,
          }
        : null;

    setSelectedPurchaseTaxOption(purchaseTaxOption);
    setSelectedPurchaseTaxRate(purchaseTaxRate);
  }, [open, activeItem]);

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
        mrp: "",
        discountType: "amount",
        discountPrice: "",
        purchaseDiscountType: "amount",
        purchaseDiscountPrice: "",
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

    const savedPurchaseDiscountType =
      activeItem.purchaseDiscountType ?? "amount";
    const savedPurchaseDiscountPercentage = Number(
      activeItem.purchaseDiscountPercentage ?? 0,
    );
    const savedPurchaseDiscountAmount = Number(
      activeItem.purchaseDiscount ?? 0,
    );
    const purchaseDiscountPriceDisplay =
      savedPurchaseDiscountType === "percentage"
        ? savedPurchaseDiscountPercentage > 0
          ? String(savedPurchaseDiscountPercentage)
          : ""
        : savedPurchaseDiscountAmount > 0
          ? String(savedPurchaseDiscountAmount)
          : "";

    const fyStock = activeItem.financialYearStock;

    return {
      itemName: activeItem.name || "",
      itemCode: activeItem.sku || "",
      hsnCode: activeItem.hsn || "",
      unit: matchedUnit ? matchedUnit.name : "",
      category: categoryId,
      salesPrice: activeItem.sellingPrice
        ? String(activeItem.sellingPrice)
        : "",
      purchasePrice: activeItem.costPrice ? String(activeItem.costPrice) : "",
      mrp: activeItem.mrp ? String(activeItem.mrp) : "",
      discountType: savedDiscountType,
      discountPrice: discountPriceDisplay,
      purchaseDiscountType: savedPurchaseDiscountType,
      purchaseDiscountPrice: purchaseDiscountPriceDisplay,
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

      const purchasePrice = Number(values.purchasePrice) || 0;
      const inputPurchaseDiscount = Number(values.purchaseDiscountPrice) || 0;

      const purchaseDiscountValue =
        values.purchaseDiscountType === "percentage"
          ? parseFloat(
              ((purchasePrice * inputPurchaseDiscount) / 100).toFixed(2),
            )
          : inputPurchaseDiscount;

      const purchaseDiscountPercentage =
        values.purchaseDiscountType === "percentage"
          ? inputPurchaseDiscount
          : purchasePrice > 0
            ? parseFloat(
                ((inputPurchaseDiscount / purchasePrice) * 100).toFixed(4),
              )
            : 0;

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
        costPrice: purchasePrice,
        ...(isMrpEnabled ? { mrp: Number(values.mrp) || 0 } : {}),

        gstRate: selectedTaxRate?.rate ? Number(selectedTaxRate.rate) : 0,
        isTaxInclusive: selectedTaxOption?.id === "with_tax",
        discountPrice: discountValue,
        discountType: values.discountType,
        discountPercentage,

        purchaseGstRate: selectedPurchaseTaxRate?.rate
          ? Number(selectedPurchaseTaxRate.rate)
          : 0,
        isPurchaseTaxInclusive: selectedPurchaseTaxOption?.id === "with_tax",
        purchaseDiscount: purchaseDiscountValue,
        purchaseDiscountType: values.purchaseDiscountType,
        purchaseDiscountPercentage,
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
        err?.response?.data?.message ||
        "Failed to save item. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-blue-600" />
            {isEditMode ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter the item details below.
          </DialogDescription>
        </DialogHeader>

        {isFetchingEditItem ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
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
                finalPrice =
                  salesPriceNum - (salesPriceNum * discountNum) / 100;
              } else {
                finalPrice = salesPriceNum - discountNum;
              }
              if (finalPrice < 0) finalPrice = 0;

              const purchasePriceNum = Number(values.purchasePrice) || 0;
              const purchaseDiscountNum =
                Number(values.purchaseDiscountPrice) || 0;
              let finalPurchasePrice = purchasePriceNum;
              if (values.purchaseDiscountType === "percentage") {
                finalPurchasePrice =
                  purchasePriceNum -
                  (purchasePriceNum * purchaseDiscountNum) / 100;
              } else {
                finalPurchasePrice = purchasePriceNum - purchaseDiscountNum;
              }
              if (finalPurchasePrice < 0) finalPurchasePrice = 0;

              return (
                <Form className="space-y-2">
                  {/* ---- Item basic fields (single clean row) ---- */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div className="sm:col-span-2">
                      <Label>Item Name *</Label>
                      <Input
                        name="itemName"
                        value={values.itemName}
                        onChange={handleChange}
                        placeholder="Enter item name"
                        className="mt-0.5 h-9"
                      />
                      {touched.itemName && errors.itemName && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.itemName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Unit *</Label>
                      <Select
                        value={values.unit}
                        onValueChange={(v) => setFieldValue("unit", v)}
                      >
                        <SelectTrigger className="mt-0.5 h-9">
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
                        <p className="text-xs text-red-500 mt-1">
                          {errors.unit}
                        </p>
                      )}
                    </div>

                    <CategorySection
                      value={values.category}
                      onChange={(v) => setFieldValue("category", v)}
                    />

                    <HsnCodeSection
                      value={values.hsnCode}
                      gstRate={selectedTaxRate?.rate ?? values.gstRate}
                      onHsnSelect={(hsn) => {
                        if (!hsn) {
                          setFieldValue("hsnCode", "");
                          setSelectedTaxRate(null);
                          setSelectedTaxOption(defaultTaxOption);
                          setSelectedPurchaseTaxRate(null);
                          setSelectedPurchaseTaxOption(defaultTaxOption);
                          return;
                        }
                        setFieldValue("hsnCode", hsn.code);

                        if (hsn.gstRate && Number(hsn.gstRate) > 0) {
                          const rateObj = {
                            rate: Number(hsn.gstRate),
                            label: `${hsn.gstRate}% GST`,
                          };
                          setSelectedTaxRate(rateObj);
                          setSelectedTaxOption(defaultTaxOption);
                          setSelectedPurchaseTaxRate(rateObj);
                          setSelectedPurchaseTaxOption(defaultTaxOption);
                        } else {
                          setSelectedTaxRate(null);
                          setSelectedTaxOption(defaultTaxOption);
                          setSelectedPurchaseTaxRate(null);
                          setSelectedPurchaseTaxOption(defaultTaxOption);
                        }
                      }}
                    />
                  </div>

                  {/* ---- Price — Purchase row, then Sales row (stacked) ---- */}
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm pt-0.5">
                    <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                    Price
                  </div>
                  <Separator className="!my-0.5" />

                  {/* ===== PURCHASE row ===== */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                      Purchase
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <Label>Purchase Price (optional)</Label>
                        <div className="flex gap-2 mt-0.5">
                          <Input
                            name="purchasePrice"
                            value={values.purchasePrice}
                            onChange={handleChange}
                            placeholder="Enter purchase price"
                            type="number"
                            className="flex-1 h-9"
                          />
                          <TaxOptionSection
                            value={selectedPurchaseTaxOption}
                            onChange={setSelectedPurchaseTaxOption}
                          />
                        </div>
                        {touched.purchasePrice && errors.purchasePrice && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.purchasePrice}
                          </p>
                        )}
                      </div>

                      <TaxRateSection
                        value={selectedPurchaseTaxRate}
                        onChange={setSelectedPurchaseTaxRate}
                      />

                      <div>
                        <Label>Discount</Label>
                        <div className="flex gap-2 mt-0.5">
                          <Input
                            name="purchaseDiscountPrice"
                            value={values.purchaseDiscountPrice}
                            onChange={handleChange}
                            placeholder="0"
                            type="number"
                            className="flex-1 h-9"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newType =
                                values.purchaseDiscountType === "amount"
                                  ? "percentage"
                                  : "amount";
                              const currentInput =
                                Number(values.purchaseDiscountPrice) || 0;
                              const priceForConversion =
                                Number(values.purchasePrice) || 0;
                              let converted = currentInput;
                              if (
                                newType === "percentage" &&
                                values.purchaseDiscountType === "amount"
                              ) {
                                converted =
                                  priceForConversion > 0
                                    ? parseFloat(
                                        (
                                          (currentInput / priceForConversion) *
                                          100
                                        ).toFixed(2),
                                      )
                                    : 0;
                              } else if (
                                newType === "amount" &&
                                values.purchaseDiscountType === "percentage"
                              ) {
                                converted = parseFloat(
                                  (
                                    (priceForConversion * currentInput) /
                                    100
                                  ).toFixed(2),
                                );
                              }
                              setFieldValue("purchaseDiscountType", newType);
                              setFieldValue(
                                "purchaseDiscountPrice",
                                converted > 0 ? String(converted) : "",
                              );
                            }}
                            className="flex items-center justify-center w-9 h-9 rounded-full text-[11px] font-semibold border shrink-0 bg-slate-100 text-slate-600 border-slate-200"
                          >
                            {values.purchaseDiscountType === "percentage"
                              ? "%"
                              : "₹"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {values.purchasePrice && values.purchaseDiscountPrice ? (
                      <p className="text-xs text-slate-500 font-medium">
                        After Discount: ₹{finalPurchasePrice.toFixed(2)}
                      </p>
                    ) : null}
                  </div>

                  <Separator className="!my-1" />

                  {/* ===== SALES row ===== */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                      Sales
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <Label>Sales Price *</Label>
                        <div className="flex gap-2 mt-0.5">
                          <Input
                            name="salesPrice"
                            value={values.salesPrice}
                            onChange={handleChange}
                            placeholder="Enter sales price"
                            type="number"
                            className="flex-1 h-9"
                          />
                          <TaxOptionSection
                            value={selectedTaxOption}
                            onChange={setSelectedTaxOption}
                          />
                        </div>
                        {touched.salesPrice && errors.salesPrice && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.salesPrice}
                          </p>
                        )}
                      </div>

                      <TaxRateSection
                        value={selectedTaxRate}
                        onChange={setSelectedTaxRate}
                      />

                      <div>
                        <Label>Discount</Label>
                        <div className="flex gap-2 mt-0.5">
                          <Input
                            name="discountPrice"
                            value={values.discountPrice}
                            onChange={handleChange}
                            placeholder="0"
                            type="number"
                            className="flex-1 h-9"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newType =
                                values.discountType === "amount"
                                  ? "percentage"
                                  : "amount";
                              const currentInput =
                                Number(values.discountPrice) || 0;
                              let converted = currentInput;
                              if (
                                newType === "percentage" &&
                                values.discountType === "amount"
                              ) {
                                converted =
                                  salesPriceNum > 0
                                    ? parseFloat(
                                        (
                                          (currentInput / salesPriceNum) *
                                          100
                                        ).toFixed(2),
                                      )
                                    : 0;
                              } else if (
                                newType === "amount" &&
                                values.discountType === "percentage"
                              ) {
                                converted = parseFloat(
                                  (
                                    (salesPriceNum * currentInput) /
                                    100
                                  ).toFixed(2),
                                );
                              }
                              setFieldValue("discountType", newType);
                              setFieldValue(
                                "discountPrice",
                                converted > 0 ? String(converted) : "",
                              );
                            }}
                            className="flex items-center justify-center w-9 h-9 rounded-full text-[11px] font-semibold border shrink-0 bg-slate-100 text-slate-600 border-slate-200"
                          >
                            {values.discountType === "percentage" ? "%" : "₹"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {values.salesPrice && values.discountPrice ? (
                      <p className="text-xs text-slate-500 font-medium">
                        After Discount: ₹{finalPrice.toFixed(2)}
                      </p>
                    ) : null}
                  </div>

                  {isMrpEnabled && (
                    <div className="sm:w-1/3">
                      <Label>MRP (optional)</Label>
                      <Input
                        name="mrp"
                        value={values.mrp}
                        onChange={handleChange}
                        placeholder="Enter MRP"
                        type="number"
                        className="mt-0.5 h-9"
                      />
                      {touched.mrp && errors.mrp && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.mrp}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ---- Opening Stock — collapsible ---- */}
                  <div className="pt-0">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-0.5">
                      <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                      Opening Stock
                    </div>
                    <Separator className="!mb-1" />

                    {!showOpeningStock ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setShowOpeningStock(true)}
                          className="text-xs font-medium text-blue-600 border border-blue-100 rounded-full px-3 py-1"
                        >
                          {values.openingStock
                            ? "Edit Opening Stock"
                            : "+ Add Opening Stock"}
                        </button>

                        {values.openingStock && values.openingStockValue && (
                          <p className="text-xs text-slate-500">
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
                      <div className="space-y-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <div>
                            <Label>Opening Stock Qty</Label>
                            <Input
                              name="openingStock"
                              value={values.openingStock}
                              onChange={handleChange}
                              placeholder="Quantity"
                              type="number"
                              className="mt-0.5 h-9"
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
                              className="mt-0.5 h-9"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 h-9">
                            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <p className="text-xs text-blue-700 italic">
                              Value = Qty × Purchase rate
                            </p>
                          </div>
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

                  <DialogFooter className="pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
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

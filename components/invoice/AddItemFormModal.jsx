"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

// ✅ MongoDB ObjectId hard validator — kokhono raw text (jemon "medicine")
// category/hsn field e boshte deoya jabe na
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));

// ✅ RN er "newCategory.data || newCategory" fallback — backend response
// kokhono ekta extra layer nested thake (res.data.data), kokhono thake na.
// Ei helper dutoi case handle kore, ebong shob shomoy ekta array-e normalize kore.
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
  openingStock: Yup.number()
    .nullable()
    .min(0, "Cannot be negative")
    .typeError("Must be a number"),
});

// =========================================================
// Category inline creator — mirrors RN AddCategoryBottomSheet
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
      onChange(""); // toggle deselect — RN behavior
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

      // ✅ Guard: response structure jai hok na keno, sudhu bandho id thakle
      // field e boshbe. Nahole raw text ("medicine") kokhono form field e jabe na.
      if (created && isValidObjectId(created._id)) {
        setCategories((prev) => [...prev, created]);
        onChange(created._id);
        setNewCategoryName("");
        setIsAddingNew(false);
        toast.success("Category created and selected!");
        return;
      }

      // ✅ Fallback — RN app er moto: response e valid _id na pele,
      // category list abar fetch kore naam mile khuje ber kori
      const listRes = await api.get("/category");
      const freshList = unwrapList(listRes);
      setCategories(freshList);
      const matched = freshList.find(
        (c) => c.name?.toLowerCase().trim() === nameTyped.toLowerCase()
      );

      if (matched && isValidObjectId(matched._id)) {
        onChange(matched._id);
        setNewCategoryName("");
        setIsAddingNew(false);
        toast.success("Category created and selected!");
      } else {
        toast.error(
          "Category created but couldn't auto-select it. Please pick it from the list."
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
      const updated = unwrapDoc(res) || { ...editTarget, name: editName.trim() };
      setCategories((prev) =>
        prev.map((c) => (c._id === editTarget._id ? updated : c))
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
            <span className={selectedCategory ? "text-slate-800" : "text-slate-400"}>
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
                        selected ? "text-blue-700 font-medium" : "text-slate-700"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
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
// HSN Code inline creator — mirrors RN HsnCodeSelectorBottomSheet
// + AddHsnCodeBottomSheet exactly (code, description, GST rate chips)
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
        h.description?.toLowerCase().includes(q)
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
    else if (!/^\d+$/.test(newCode.trim())) errs.code = "HSN code must contain only numbers";

    if (newGstRate.trim() === "") errs.gstRate = "GST rate is required";
    else {
      const rate = parseFloat(newGstRate);
      if (isNaN(rate)) errs.gstRate = "GST rate must be a valid number";
      else if (rate < 0 || rate > 100) errs.gstRate = "GST rate must be between 0 and 100";
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

      // ✅ Fallback — response e proper doc na pele list refetch kore code diye khuje ber kori
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
          "HSN code created but couldn't auto-select it. Please pick it from the list."
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
              {value ? `${value}${gstRate ? ` (${gstRate}% GST)` : ""}` : "Select HSN code"}
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
                <p className="text-sm font-semibold text-slate-800">Add HSN Code</p>
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
                  <p className="text-xs text-red-500 mt-1">{formErrors.gstRate}</p>
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
// MAIN — Add Item Form Modal
// =========================================================
export default function AddItemFormModal({ open, onOpenChange, onItemCreated }) {
  const initialValues = {
    itemName: "",
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
  };

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

      const payload = {
        name: values.itemName,
        unit: values.unit,
        // ✅ FINAL GUARD — kokhono raw text (jemon "medicine") backend e jabe na,
        // sudhu bandho ObjectId thakle pathabo, nahole field ta khali pathabo
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

      if (values.openingStock !== "" && values.openingStock != null) {
        payload.openingStock = Number(values.openingStock);
      }

      const res = await api.post("/product", payload);
      const newItem = unwrapDoc(res);

      toast.success("Item added successfully!");
      resetForm();
      onOpenChange(false);
      onItemCreated?.(newItem);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to add item. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Add New Item
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
            <Form className="space-y-4">
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
                  <p className="text-xs text-red-500 mt-1">{errors.itemName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                  Price
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Purchase Price</Label>
                    <Input
                      name="purchasePrice"
                      value={values.purchasePrice}
                      onChange={handleChange}
                      placeholder="Optional"
                      type="number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Sales Price *</Label>
                    <Input
                      name="salesPrice"
                      value={values.salesPrice}
                      onChange={handleChange}
                      placeholder="Required"
                      type="number"
                      className="mt-1"
                    />
                    {touched.salesPrice && errors.salesPrice && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.salesPrice}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label>GST Rate</Label>
                    <div className="mt-1 h-10 px-3 rounded-md border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                      {values.gstRate ? `${values.gstRate}% GST` : "Set via HSN code"}
                    </div>
                  </div>
                  <div>
                    <Label>Tax Inclusive?</Label>
                    <Select
                      value={values.isTaxInclusive ? "yes" : "no"}
                      onValueChange={(v) =>
                        setFieldValue("isTaxInclusive", v === "yes")
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">
                          Exclude Tax (add on top)
                        </SelectItem>
                        <SelectItem value="yes">
                          Include Tax (price includes GST)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label>Discount on Sales</Label>
                    <Input
                      name="discountPrice"
                      value={values.discountPrice}
                      onChange={handleChange}
                      placeholder="0"
                      type="number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Discount Type</Label>
                    <Select
                      value={values.discountType}
                      onValueChange={(v) => setFieldValue("discountType", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {values.salesPrice && values.discountPrice ? (
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {(() => {
                      const sale = Number(values.salesPrice) || 0;
                      const disc = Number(values.discountPrice) || 0;
                      const final =
                        values.discountType === "percentage"
                          ? sale - (sale * disc) / 100
                          : sale - disc;
                      return `Price after discount: ₹${Math.max(0, final).toFixed(2)}`;
                    })()}
                  </p>
                ) : null}
              </div>

              <div className="border-t pt-4">
                <Label>Opening Stock (optional)</Label>
                <Input
                  name="openingStock"
                  value={values.openingStock}
                  onChange={handleChange}
                  placeholder="Starting quantity"
                  type="number"
                  className="mt-1"
                />
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
                  Add Item
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
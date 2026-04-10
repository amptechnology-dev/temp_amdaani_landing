"use client";

import { useState, useMemo, useEffect } from "react";
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
  Package,
  Hash,
  Scale,
  Percent,
  IndianRupee,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Formik, Form, Field, ErrorMessage } from "formik";

// =========================
// Fetch Items API
// =========================
const fetchItems = async ({ queryKey }) => {
  const [_key, { page, limit }] = queryKey;

  const params = { page, limit };
  const res = await api.get("/product", { params });
  console.log("ITEM FETCH RESPONSE", res);

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

  const [selectedItem, setSelectedItem] = useState(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // -----------------------
  // Query
  // -----------------------
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["items", { page, limit }],
    queryFn: fetchItems,
    staleTime: 20000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // -----------------------
  // Local Search Filter
  // -----------------------
  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

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
    category: selectedItem?.category || "",
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

      {/* SEARCH */}
      <Card className={`mb-6 ${currentTheme.card}`}>
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items…"
              className="pl-10"
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

      {/* TABLE */}
      <Card className={`${currentTheme.card} overflow-hidden`}>
        <CardHeader className={currentTheme.surfaceVariant}>
          <CardTitle Items />
          <CardDescription>
            Showing {filteredItems.length} of {total} items
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <AnimatePresence>
                  {filteredItems.map((item, index) => (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b"
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.sku || "-"}</TableCell>
                      <TableCell>{item.hsn || "-"}</TableCell>
                      <TableCell className="font-medium">
                        ₹{item.sellingPrice}
                      </TableCell>
                      <TableCell>{item.gstRate}%</TableCell>
                      <TableCell>{item.currentStock ?? 0}</TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm">
                              <MoreVertical />
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
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
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
                {/* Fields */}
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unit *</Label>
                    <Input
                      name="unit"
                      value={values.unit}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Input
                      name="category"
                      value={values.category}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU</Label>
                    <Input
                      name="sku"
                      value={values.sku}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label>HSN</Label>
                    <Input
                      name="hsn"
                      value={values.hsn}
                      onChange={handleChange}
                    />
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
                    <Input
                      name="gstRate"
                      value={values.gstRate}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label>Tax Inclusive?</Label>
                    <Select
                      value={values.isTaxInclusive ? "yes" : "no"}
                      onValueChange={(val) =>
                        handleChange({
                          target: {
                            name: "isTaxInclusive",
                            value: val === "yes",
                          },
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
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
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

"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const extractErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "An unexpected error occurred";

export default function AddExpenseHeadDialog({
  open,
  onOpenChange,
  editData = null,
  onSuccess, // async (head) => void
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(editData?._id);

  // Sync form whenever dialog opens / editData changes
  useEffect(() => {
    if (open) {
      setName(editData?.name || "");
      setError("");
    }
  }, [open, editData]);

  const handleSave = async (e) => {
    e?.preventDefault();

    if (!name.trim()) {
      setError("Expense head name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = { name: name.trim(), isActive: editData?.isActive ?? true };

      const res = isEdit
        ? await api.put(`/expense-head/id/${editData._id}`, payload)
        : await api.post("/expense-head", payload);

      // api wrapper kothao res.data, kothao direct res return kore — dutoi handle kora
      const body = res?.data ?? res;
      if (body?.success === false) {
        throw new Error(body?.message || "Something went wrong");
      }

      toast.success(body?.message || "Operation successful");

      // created/updated head object ber kora (backend response shape onujayi)
      const head =
        body?.doc || body?.data?.doc || body?.data || body?.head || null;

      await onSuccess?.(head);
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense Head" : "Add Expense Head"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the expense head name."
              : "Create a new category to group your expenses."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="headName">Expense Head Name *</Label>
            <Input
              id="headName"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Rent, Electricity, Salary"
              className={`mt-1 ${error ? "border-red-500" : ""}`}
            />
            {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isEdit ? "Update Expense Head" : "Add Expense Head"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
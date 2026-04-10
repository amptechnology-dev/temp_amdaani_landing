"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "../../utils/api";

export default function CustomerQuickForm({ onSave }) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    gstNumber: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.mobile) return;

    setLoading(true);

    try {
      // ✅ SAME PAYLOAD STRUCTURE AS YOUR MAIN FORM
      const requestBody = {
        name: form.name,
        mobile: form.mobile,
        address: "",
        city: "",
        state: "",
        postalCode: "",
        gstNumber: form.gstNumber || "",
        country: "India",
      };

      const response = await api.post("/customer", requestBody);

      if (response?.data?.success || response?.success) {
        const createdCustomer = response.data?.data || response.data;

        toast.success("Customer added successfully");

        // ✅ AUTO SELECT CUSTOMER FOR INVOICE
        onSave(createdCustomer);

        // reset quick form
        setForm({ name: "", mobile: "", gstNumber: "" });
      } else {
        throw new Error(response.data?.message || "Failed to add customer");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mt-4">
      <h4 className="font-medium mb-3">Quick Add Customer</h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Name *</Label>
          <Input
            placeholder="Customer name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Mobile *</Label>
          <Input
            placeholder="10-digit mobile"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            maxLength={10}
            required
          />
        </div>

        <div>
          <Label>GSTIN (Optional)</Label>
          <Input
            placeholder="GST number"
            value={form.gstNumber}
            onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Adding..." : "Add Customer"}
        </Button>
      </form>
    </div>
  );
}

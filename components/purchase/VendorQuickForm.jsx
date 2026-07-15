"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Phone, User, FileText, Home, Building2, MapPin, Locate } from "lucide-react";
import api from "../../utils/api";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh",
];

export default function VendorQuickForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    mobile: "", name: "", gstNumber: "",
    address: "", city: "", state: "", postalCode: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mobile) {
      toast.error("Contact number is required");
      return;
    }
    setLoading(true);
    try {
      const requestBody = {
        name: form.name,
        mobile: form.mobile,
        address: form.address,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        gstNumber: form.gstNumber || "",
        country: "India",
      };

      const response = await api.post("/vendor", requestBody);

      if (response?.data?.success || response?.success) {
        const createdVendor = response.data?.data || response.data;
        toast.success("Vendor added successfully");
        onSave(createdVendor);
        setForm({ mobile: "", name: "", gstNumber: "", address: "", city: "", state: "", postalCode: "" });
      } else {
        throw new Error(response.data?.message || "Failed to add vendor");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add vendor");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({ mobile: "", name: "", gstNumber: "", address: "", city: "", state: "", postalCode: "" });
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Contact Number *"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.mobile}
          onChange={update("mobile")}
          maxLength={10}
          required
        />
      </div>

      <div className="relative">
        <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Vendor Name"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.name}
          onChange={update("name")}
        />
      </div>

      <div className="relative">
        <FileText className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="GSTIN"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.gstNumber}
          onChange={update("gstNumber")}
        />
      </div>

      <p className="text-sm font-semibold text-slate-600 pt-1">Address Details</p>

      <div className="relative">
        <Home className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Street / Address"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.address}
          onChange={update("address")}
        />
      </div>

      <div className="relative">
        <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="City"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.city}
          onChange={update("city")}
        />
      </div>

      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
        <select
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          value={form.state}
          onChange={update("state")}
        >
          <option value="">State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <svg className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div className="relative">
        <Locate className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Postal Code"
          className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={form.postalCode}
          onChange={update("postalCode")}
          maxLength={6}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 h-12 rounded-full border-slate-300 text-slate-500 font-medium">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold">
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
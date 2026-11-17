"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Store as StoreIcon, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useAuth } from "../../context/AuthContext";

// ======================================================
// SWITCH STORE DIALOG
// ======================================================
export function SwitchStoreDialog({ open, onClose, onAddStore }) {
  const { authState, getMyStores, switchStore } = useAuth();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const currentStoreId =
    authState?.user?.store?._id || authState?.user?.store || null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await getMyStores();
        if (cancelled) return;

        if (res?.success) {
          setStores(Array.isArray(res.data) ? res.data : []);
        } else {
          toast.error(res?.message || "Failed to load stores");
        }
      } catch (err) {
        if (!cancelled) toast.error("Failed to load stores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // response shape alada hole-o jeno kaj kore
  const getId = (s) => s.storeId || s.store?._id || s._id;
  const getName = (s) => s.name || s.store?.name || "Store";
  const getLogo = (s) => s.logoUrl || s.store?.logoUrl;
  const getRole = (s) => s.role?.name || s.role;

  const handleSwitch = async (store) => {
    const id = String(getId(store));
    if (id === String(currentStoreId)) {
      onClose();
      return;
    }

    setSwitchingId(id);
    try {
      const res = await switchStore(id);

      if (res?.success) {
        toast.success(`Switched to ${getName(store)}`);
        onClose();
        // puro app-er state (subscription, settings, data) fresh korar jonno reload
        window.location.href = "/dashboard";
      } else {
        toast.error(res?.message || "Failed to switch store");
        setSwitchingId(null);
      }
    } catch (err) {
      toast.error("Failed to switch store");
      setSwitchingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !switchingId && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Store</DialogTitle>
          <DialogDescription>
            Select a store to continue working.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : stores.length === 0 ? (
            <p className="text-sm text-center text-slate-500 py-6">
              No stores found
            </p>
          ) : (
            stores.map((store) => {
              const id = String(getId(store));
              const isCurrent = id === String(currentStoreId);
              const isSwitching = switchingId === id;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={!!switchingId}
                  onClick={() => handleSwitch(store)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors cursor-pointer disabled:opacity-60 ${
                    isCurrent
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {getLogo(store) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getLogo(store)}
                        alt={getName(store)}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <StoreIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {getName(store)}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {getRole(store) || "—"}
                      {isCurrent && " · Current"}
                    </p>
                  </div>
                  {isSwitching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  ) : isCurrent ? (
                    <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={!!switchingId}>
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              onAddStore();
            }}
            disabled={!!switchingId}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================================================
// FORM FIELD HELPERS
// NOTE: Eguli component-er BAIRE thakte hobe. Bhitore thakle
// protibar re-render e remount hoy ar input focus hariye jay.
// ======================================================
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  disabled,
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`cs-${name}`} className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={`cs-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
    </div>
  );
}

function FileField({ label, file, onChange, disabled }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <label className="flex items-center gap-2 border border-dashed rounded-md px-3 py-2 text-xs text-slate-500 cursor-pointer hover:bg-slate-50">
        <Upload className="w-4 h-4 shrink-0" />
        <span className="truncate">{file ? file.name : "Choose image"}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}

// ======================================================
// CREATE STORE DIALOG
// ======================================================
const emptyForm = {
  name: "",
  type: "retail",
  tagline: "",
  ownershipType: "",
  gstNumber: "",
  panNumber: "",
  registrationNo: "",
  contactNo: "",
  email: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  usedReferralCode: "",
};

export function CreateStoreDialog({ open, onClose, onCreated }) {
  const { createStore } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setLogo(null);
      setSignature(null);
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!form.name.trim()) return toast.error("Store name is required");
    if (!form.type.trim()) return toast.error("Store type is required");
    if (form.contactNo && !/^[6-9]\d{9}$/.test(form.contactNo.trim()))
      return toast.error("Enter a valid 10-digit contact number");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return toast.error("Enter a valid email");

    // Postman payload-er moto exact FormData
    const fd = new FormData();
    const simple = [
      "name",
      "type",
      "tagline",
      "ownershipType",
      "gstNumber",
      "panNumber",
      "registrationNo",
      "contactNo",
      "email",
      "usedReferralCode",
    ];
    simple.forEach((k) => {
      if (form[k]?.trim()) fd.append(k, form[k].trim());
    });

    if (form.street.trim()) fd.append("address[street]", form.street.trim());
    if (form.city.trim()) fd.append("address[city]", form.city.trim());
    if (form.state.trim()) fd.append("address[state]", form.state.trim());
    if (form.postalCode.trim())
      fd.append("address[postalCode]", form.postalCode.trim());

    if (logo) fd.append("logo", logo);
    if (signature) fd.append("signature", signature);

    setLoading(true);
    try {
      const res = await createStore(fd);

      if (res?.success) {
        toast.success(res.message || "Store created successfully");
        onClose();
        onCreated?.(); // Switch Store dialog abar khule new store dekhabe
      } else {
        toast.error(res?.message || "Failed to create store");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = { onChange: handleChange, disabled: loading };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Store</DialogTitle>
          <DialogDescription>
            Create another store under your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Store Name"
              name="name"
              value={form.name}
              placeholder="Ayendri Store"
              required
              {...fieldProps}
            />
            <div className="space-y-1.5">
              <Label htmlFor="cs-type" className="text-xs">
                Store Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="cs-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                disabled={loading}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="service">Service</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Field
              label="Tagline"
              name="tagline"
              value={form.tagline}
              placeholder="Best quality products"
              {...fieldProps}
            />
            <Field
              label="Ownership Type"
              name="ownershipType"
              value={form.ownershipType}
              placeholder="individual"
              {...fieldProps}
            />
            <Field
              label="GST Number"
              name="gstNumber"
              value={form.gstNumber}
              placeholder="22AAAAA0000A1Z5"
              {...fieldProps}
            />
            <Field
              label="PAN Number"
              name="panNumber"
              value={form.panNumber}
              placeholder="AAAAA0000A"
              {...fieldProps}
            />
            <Field
              label="Registration No"
              name="registrationNo"
              value={form.registrationNo}
              placeholder="REG123456"
              {...fieldProps}
            />
            <Field
              label="Contact No"
              name="contactNo"
              value={form.contactNo}
              placeholder="9876543210"
              {...fieldProps}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              placeholder="store@example.com"
              {...fieldProps}
            />
            <Field
              label="Referral Code"
              name="usedReferralCode"
              value={form.usedReferralCode}
              placeholder="Optional"
              {...fieldProps}
            />
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Address
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Street"
                name="street"
                value={form.street}
                placeholder="123 Main St"
                {...fieldProps}
              />
              <Field
                label="City"
                name="city"
                value={form.city}
                placeholder="Kolkata"
                {...fieldProps}
              />
              <Field
                label="State"
                name="state"
                value={form.state}
                placeholder="West Bengal"
                {...fieldProps}
              />
              <Field
                label="Postal Code"
                name="postalCode"
                value={form.postalCode}
                placeholder="700001"
                {...fieldProps}
              />
            </div>
          </div>

          <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FileField
              label="Logo"
              file={logo}
              onChange={setLogo}
              disabled={loading}
            />
            <FileField
              label="Signature"
              file={signature}
              onChange={setSignature}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Creating..." : "Create Store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
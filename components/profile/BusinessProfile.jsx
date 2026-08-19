// components/dashboard/BusinessProfile.jsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import {
  Store,
  Building2,
  Phone,
  Mail,
  FileText,
  BadgeCheck,
  Signpost,
  MapPin,
  Landmark,
  CreditCard,
  User,
  Banknote,
  QrCode,
  Upload,
  X,
  Save,
  Loader2,
  ChevronDown,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import api from "../../utils/api";

// =========================
// Static data — registration page er sathe MILIYE deya holo (Bakery soho)
// =========================
const OWNERSHIP_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Private Limited Company",
  "LLP",
  "Public Limited Company",
  "OPC",
  "Others",
];

const BUSINESS_TYPES = [
  "Grocery / Retail",
  "Restaurant / Café",
  "Salon / Beauty",
  "Service Provider",
  "Wholesale / Distributor",
  "Pharmacy",
  "Electronics",
  "Clothing / Fashion",
  "Hardware Store",
  "Bakery",
  "Others",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const bankFieldNames = [
  "bankName",
  "accountNo",
  "holderName",
  "ifsc",
  "branch",
];

// =========================
// Validation schema (mirrors mobile Yup schema)
// =========================
const validationSchema = Yup.object().shape(
  {
    businessName: Yup.string().required("Business Name is required"),

    gstin: Yup.string()
      .nullable()
      .test(
        "valid-gstin",
        "Invalid GSTIN format",
        (value) =>
          !value ||
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            value,
          ),
      ),

    phoneNumber: Yup.string().matches(
      /^[0-9]{10}$/,
      "Phone Number must be 10 digits",
    ),
    emailId: Yup.string().email("Invalid email"),
    businessType: Yup.string().required("Business Type is required"),
    businessTagline: Yup.string().nullable(),
    registrationNo: Yup.string().nullable(),

    street: Yup.string().required("Street is required"),
    city: Yup.string().required("City is required"),
    state: Yup.string().required("State is required"),
    country: Yup.string().nullable(),

    pincode: Yup.string()
      .required("Pincode is required")
      .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),

    bankName: Yup.string()
      .nullable()
      .when(["accountNo", "holderName", "ifsc", "branch"], {
        is: (...others) => others.some((v) => v && v.trim()),
        then: (schema) => schema.required("Bank Name is required"),
        otherwise: (schema) => schema,
      }),

    accountNo: Yup.string()
      .nullable()
      .test(
        "accountNo-format",
        "Must be 9–18 digits",
        (v) => !v || /^[0-9]{9,18}$/.test(v),
      )
      .when(["bankName", "holderName", "ifsc", "branch"], {
        is: (...others) => others.some((v) => v && v.trim()),
        then: (schema) => schema.required("Account Number is required"),
        otherwise: (schema) => schema,
      }),

    holderName: Yup.string()
      .nullable()
      .when(["bankName", "accountNo", "ifsc", "branch"], {
        is: (...others) => others.some((v) => v && v.trim()),
        then: (schema) => schema.required("Holder Name is required"),
        otherwise: (schema) => schema,
      }),

    ifsc: Yup.string()
      .nullable()
      .test(
        "ifsc-format",
        "Invalid IFSC code",
        (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
      )
      .when(["bankName", "accountNo", "holderName", "branch"], {
        is: (...others) => others.some((v) => v && v.trim()),
        then: (schema) => schema.required("IFSC Code is required"),
        otherwise: (schema) => schema,
      }),

    branch: Yup.string()
      .nullable()
      .when(["bankName", "accountNo", "holderName", "ifsc"], {
        is: (...others) => others.some((v) => v && v.trim()),
        then: (schema) => schema.required("Branch is required"),
        otherwise: (schema) => schema,
      }),

    upiId: Yup.string()
      .matches(/^\w+@\w+$/, "Invalid UPI ID")
      .nullable(),

    invoicePrefix: Yup.string()
      .trim()
      .required("Invoice prefix is required")
      .test(
        "valid-chars",
        "Prefix can only contain uppercase letters, /, or -",
        (v) => /^[A-Z/-]+$/.test(v || ""),
      )
      .test(
        "length",
        "Prefix must be 2–6 characters. e.g. INV, A2Z, CAFE24",
        (v) => (v ? v.length >= 2 && v.length <= 6 : false),
      ),

    invoiceStartNumber: Yup.string()
      .matches(/^[0-9]+$/, "Must be a number")
      .nullable(),

    userName: Yup.string().required("User Name is required"),
    userEmail: Yup.string().email("Invalid email"),
    userPhone: Yup.string().matches(/^[0-9]{10}$/, "Must be 10 digits"),

    logo: Yup.mixed().nullable(),
    signature: Yup.mixed().nullable(),
  },
  [
    ["bankName", "accountNo"],
    ["bankName", "holderName"],
    ["bankName", "ifsc"],
    ["bankName", "branch"],
    ["accountNo", "holderName"],
    ["accountNo", "ifsc"],
    ["accountNo", "branch"],
    ["holderName", "ifsc"],
    ["holderName", "branch"],
    ["ifsc", "branch"],
  ],
);

// =========================
// Field mappings (form field -> API field) — used for diffing on save
// =========================
const FIELD_MAPPINGS = {
  tagline: "businessTagline",
  gstNumber: "gstin",
  registrationNo: "registrationNo",
  contactNo: "phoneNumber",
  email: "emailId",
  "address[street]": "street",
  "address[city]": "city",
  "address[state]": "state",
  "address[postalCode]": "pincode",
  "bankDetails[bankName]": "bankName",
  "bankDetails[accountNo]": "accountNo",
  "bankDetails[holderName]": "holderName",
  "bankDetails[ifsc]": "ifsc",
  "bankDetails[branch]": "branch",
  "bankDetails[upiId]": "upiId",
  "settings[invoiceTerms]": "invoiceTerms",
  "settings[invoicePrefix]": "invoicePrefix",
  ownershipType: "ownershipType",
};

export default function BusinessProfile() {
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState({});

  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const formik = useFormik({
    initialValues: {
      businessName: "",
      gstin: "",
      phoneNumber: "",
      emailId: "",
      businessTagline: "",
      registrationNo: "",
      street: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      ownershipType: "",
      businessType: "",
      bankName: "",
      accountNo: "",
      holderName: "",
      ifsc: "",
      branch: "",
      upiId: "",
      invoicePrefix: "",
      invoiceTerms: "",
      invoiceStartNumber: "",
      userName: "",
      userEmail: "",
      userPhone: "",
      logo: null,
      signature: null,
    },
    validationSchema,
    onSubmit: handleSave,
  });

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    handleSubmit,
  } = formik;

  useEffect(() => {
    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      if (res.success && res.data) {
        const { data } = res;
        const store = data.store || {};
        const address = store.address || {};
        const bankDetails = store.bankDetails || {};
        const settings = store.settings || {};

        const mapped = {
          businessName: store.name || "",
          gstin: store.gstNumber || "",
          phoneNumber: store.contactNo || "",
          emailId: store.email || "",
          businessTagline: store.tagline || "",
          registrationNo: store.registrationNo || "",
          street: address.street || "",
          city: address.city || "",
          state: address.state || "",
          country: address.country || "",
          pincode: address.postalCode || "",
          ownershipType: store.ownershipType || "",
          businessType: store.type || "",
          bankName: bankDetails.bankName || "",
          accountNo: bankDetails.accountNo || "",
          holderName: bankDetails.holderName || "",
          ifsc: bankDetails.ifsc || "",
          branch: bankDetails.branch || "",
          upiId: bankDetails.upiId || "",
          invoicePrefix: settings.invoicePrefix || "",
          invoiceTerms: settings.invoiceTerms || "",
          invoiceStartNumber: settings.invoiceStartNumber?.toString() || "",
          userName: data.name || "",
          userEmail: data.email || "",
          userPhone: data.phone || "",
        };

        const logo = store.logoUrl
          ? {
              uri: store.logoUrl,
              fileName: "business_logo.jpg",
              isOriginal: true,
            }
          : null;
        const signature = store.signatureUrl
          ? {
              uri: store.signatureUrl,
              fileName: "business_signature.jpg",
              isOriginal: true,
            }
          : null;

        setOriginalData({ ...mapped, logo, signature });

        // ✅ resetForm er bodole setValues — enableReinitialize soriye deya hoyeche,
        // eta race-condition khoychilo jar karone businessName field khali dekhachilo
        formik.setValues({ ...mapped, logo, signature });
        formik.setTouched({});
      }
    } catch (err) {
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }

  function getChangedFields(vals) {
    const changes = {};
    Object.entries(FIELD_MAPPINGS).forEach(([apiField, formField]) => {
      const currentValue = vals[formField] || "";
      const originalValue = originalData[formField] || "";
      if (currentValue !== originalValue) changes[apiField] = currentValue;
    });
    return changes;
  }

  async function handleSave(vals) {
    try {
      setSaving(true);
      const changedFields = getChangedFields(vals);
      const logoChanged = vals.logo && !vals.logo.isOriginal;
      const signatureChanged = vals.signature && !vals.signature.isOriginal;

      if (
        Object.keys(changedFields).length === 0 &&
        !logoChanged &&
        !signatureChanged
      ) {
        toast.info("No changes detected to save.");
        return;
      }

      const formData = new FormData();
      Object.entries(changedFields).forEach(([key, value]) =>
        formData.append(key, value),
      );

      if (logoChanged && vals.logo?.file) {
        formData.append(
          "logo",
          vals.logo.file,
          vals.logo.fileName || "logo.jpg",
        );
      }
      if (signatureChanged && vals.signature?.file) {
        formData.append(
          "signature",
          vals.signature.file,
          vals.signature.fileName || "signature.png",
        );
      }

      const res = await api.put("/store/update-my-store", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.success) {
        toast.success("Profile updated successfully");
        await fetchProfileData();
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Something went wrong, try again later");
    } finally {
      setSaving(false);
    }
  }

  const handleFileSelect = (field, file) => {
    if (!file) return;
    const isValid = file.type.startsWith("image/");
    if (!isValid) {
      toast.error("Please select a valid image file");
      return;
    }
    const uri = URL.createObjectURL(file);
    setFieldValue(field, { uri, file, fileName: file.name, isOriginal: false });
  };

  const handleCancel = () => {
    formik.setValues({ ...originalData });
    formik.setTouched({});
    toast.info("Changes discarded");
  };

  // ✅ Safe fallback — jodi kokhono emon business type ashe jeta list e nei,
  // dropdown khali na dekhiye seta o ekta option hishebe dekhabe
  const businessTypeOptions = useMemo(() => {
    if (values.businessType && !BUSINESS_TYPES.includes(values.businessType)) {
      return [values.businessType, ...BUSINESS_TYPES];
    }
    return BUSINESS_TYPES;
  }, [values.businessType]);

  const stateOptions = useMemo(() => {
    if (values.state && !INDIAN_STATES.includes(values.state)) {
      return [values.state, ...INDIAN_STATES];
    }
    return INDIAN_STATES;
  }, [values.state]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-80" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Business Profile
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your company details, banking info and invoice preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="basic" className="gap-1.5">
              <Building2 className="w-4 h-4" />
              Business Details
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-1.5">
              <Landmark className="w-4 h-4" />
              Bank &amp; Invoice
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "basic" ? (
          <>
            {/* ===================== Basic Details ===================== */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  label="Business Name *"
                  icon={Store}
                  error={touched.businessName && errors.businessName}
                >
                  <Input
                    value={values.businessName}
                    readOnly
                    className="pl-10 bg-slate-50 text-slate-900 cursor-not-allowed"
                  />
                </Field>

                <Field
                  label="Business Type *"
                  icon={Building2}
                  error={touched.businessType && errors.businessType}
                >
                  <Select
                    value={values.businessType}
                    onValueChange={(v) => setFieldValue("businessType", v)}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Phone Number *"
                  icon={Phone}
                  error={touched.phoneNumber && errors.phoneNumber}
                >
                  <Input
                    value={values.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    maxLength={10}
                    inputMode="numeric"
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="Email ID"
                  icon={Mail}
                  error={touched.emailId && errors.emailId}
                >
                  <Input
                    type="email"
                    value={values.emailId}
                    onChange={handleChange("emailId")}
                    onBlur={handleBlur("emailId")}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="GSTIN"
                  icon={FileText}
                  error={touched.gstin && errors.gstin}
                >
                  <Input
                    value={values.gstin}
                    onChange={(e) =>
                      setFieldValue("gstin", e.target.value.toUpperCase())
                    }
                    onBlur={handleBlur("gstin")}
                    disabled={!!originalData.gstin}
                    className="pl-10 uppercase"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </Field>

                <Field
                  label="Registration Number"
                  icon={BadgeCheck}
                  error={touched.registrationNo && errors.registrationNo}
                >
                  <Input
                    value={values.registrationNo}
                    onChange={handleChange("registrationNo")}
                    onBlur={handleBlur("registrationNo")}
                    disabled={!!originalData.registrationNo}
                    className="pl-10"
                  />
                </Field>

                <div>
                  <Label className="mb-2 block text-slate-700">
                    Registration Type
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {OWNERSHIP_TYPES.map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFieldValue("ownershipType", type)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          values.ownershipType === type
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {errors.ownershipType && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.ownershipType}
                    </p>
                  )}
                </div>

                <Field
                  label="Business Tagline"
                  icon={FileText}
                  error={touched.businessTagline && errors.businessTagline}
                >
                  <Input
                    value={values.businessTagline}
                    onChange={handleChange("businessTagline")}
                    onBlur={handleBlur("businessTagline")}
                    className="pl-10"
                  />
                </Field>
              </CardContent>
            </Card>

            {/* ===================== Address ===================== */}
            <Card>
              <CardHeader>
                <CardTitle>Business Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  label="Street Address *"
                  icon={Signpost}
                  error={touched.street && errors.street}
                >
                  <Input
                    value={values.street}
                    onChange={handleChange("street")}
                    onBlur={handleBlur("street")}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="City *"
                  icon={Building2}
                  error={touched.city && errors.city}
                >
                  <Input
                    value={values.city}
                    onChange={handleChange("city")}
                    onBlur={handleBlur("city")}
                    maxLength={20}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="State *"
                  icon={MapPin}
                  error={touched.state && errors.state}
                >
                  <Select
                    value={values.state}
                    onValueChange={(v) => setFieldValue("state", v)}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {stateOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Pincode *"
                  icon={MapPin}
                  error={touched.pincode && errors.pincode}
                >
                  <Input
                    value={values.pincode}
                    onChange={handleChange("pincode")}
                    onBlur={handleBlur("pincode")}
                    inputMode="numeric"
                    maxLength={6}
                    className="pl-10"
                  />
                </Field>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* ===================== Bank Details ===================== */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>
                  Payment and banking information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  label="Bank Name"
                  icon={Landmark}
                  error={touched.bankName && errors.bankName}
                >
                  <Input
                    value={values.bankName}
                    onChange={handleChange("bankName")}
                    onBlur={handleBlur("bankName")}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="Account Number"
                  icon={CreditCard}
                  error={touched.accountNo && errors.accountNo}
                >
                  <Input
                    value={values.accountNo}
                    onChange={handleChange("accountNo")}
                    onBlur={handleBlur("accountNo")}
                    inputMode="numeric"
                    maxLength={18}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="Account Holder Name"
                  icon={User}
                  error={touched.holderName && errors.holderName}
                >
                  <Input
                    value={values.holderName}
                    onChange={handleChange("holderName")}
                    onBlur={handleBlur("holderName")}
                    maxLength={25}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="IFSC Code"
                  icon={Banknote}
                  error={touched.ifsc && errors.ifsc}
                >
                  <Input
                    value={values.ifsc}
                    onChange={(e) =>
                      setFieldValue("ifsc", e.target.value.toUpperCase())
                    }
                    onBlur={handleBlur("ifsc")}
                    maxLength={20}
                    className="pl-10 uppercase"
                  />
                </Field>

                <Field
                  label="Branch"
                  icon={Landmark}
                  error={touched.branch && errors.branch}
                >
                  <Input
                    value={values.branch}
                    onChange={handleChange("branch")}
                    onBlur={handleBlur("branch")}
                    maxLength={20}
                    className="pl-10"
                  />
                </Field>

                <Field
                  label="UPI ID"
                  icon={QrCode}
                  error={touched.upiId && errors.upiId}
                >
                  <Input
                    value={values.upiId}
                    onChange={handleChange("upiId")}
                    onBlur={handleBlur("upiId")}
                    maxLength={70}
                    placeholder="name@bank"
                    className="pl-10"
                  />
                </Field>
              </CardContent>
            </Card>

            {/* ===================== Invoice Settings ===================== */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>Configure invoice preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  label="Invoice Prefix *"
                  icon={FileText}
                  error={touched.invoicePrefix && errors.invoicePrefix}
                >
                  <Input
                    value={values.invoicePrefix}
                    onChange={(e) =>
                      setFieldValue(
                        "invoicePrefix",
                        e.target.value.toUpperCase(),
                      )
                    }
                    onBlur={handleBlur("invoicePrefix")}
                    maxLength={8}
                    placeholder="e.g. INV, A2Z, CAFE24"
                    className="pl-10 uppercase"
                  />
                </Field>

                <Field
                  label="Invoice Start Number"
                  icon={FileText}
                  error={
                    touched.invoiceStartNumber && errors.invoiceStartNumber
                  }
                >
                  <Input
                    value={values.invoiceStartNumber}
                    onChange={handleChange("invoiceStartNumber")}
                    onBlur={handleBlur("invoiceStartNumber")}
                    inputMode="numeric"
                    className="pl-10"
                  />
                </Field>

                <div>
                  <Label className="mb-2 block text-slate-700">
                    Invoice Terms &amp; Conditions
                  </Label>
                  <Textarea
                    value={values.invoiceTerms}
                    onChange={handleChange("invoiceTerms")}
                    onBlur={handleBlur("invoiceTerms")}
                    rows={5}
                    placeholder="Enter invoice terms and conditions"
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Plain text supported for now — rich formatting can be added
                    later.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ===================== Logo & Signature ===================== */}
            <Card>
              <CardHeader>
                <CardTitle>Business Logo</CardTitle>
                <CardDescription>
                  Upload your business logo for invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploadBox
                  value={values.logo}
                  onSelect={(file) => handleFileSelect("logo", file)}
                  onRemove={() => setFieldValue("logo", null)}
                  inputRef={logoInputRef}
                  icon={Upload}
                  label="Tap to upload logo"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Upload your signature for invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploadBox
                  value={values.signature}
                  onSelect={(file) => handleFileSelect("signature", file)}
                  onRemove={() => setFieldValue("signature", null)}
                  inputRef={signatureInputRef}
                  icon={Upload}
                  label="Tap to add signature"
                  sublabel="PNG with transparent background recommended"
                />
              </CardContent>
            </Card>
          </>
        )}
      </form>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-3 z-10">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =========================
// Small reusable pieces
// =========================
function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <Label className="mb-1.5 block text-slate-700">{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
        )}
        {children}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ImageUploadBox({
  value,
  onSelect,
  onRemove,
  inputRef,
  icon: Icon,
  label,
  sublabel,
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative inline-block">
          <img
            src={value.uri}
            alt="preview"
            className="w-40 h-24 object-contain rounded-lg border border-slate-200 bg-slate-50"
          />
          {!value.isOriginal && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -left-2 text-[10px]"
            >
              New
            </Badge>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
        >
          <Icon className="w-8 h-8 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {sublabel && (
            <span className="text-xs text-slate-400">{sublabel}</span>
          )}
        </button>
      )}
    </div>
  );
}

// components/dashboard/PrintPreference.jsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, FileStack, Check, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import api from "../../utils/api";

const MODES = [
  {
    value: "a4",
    label: "A4",
    description: "Standard full-page invoice — best for office printers",
    icon: FileText,
    dimensions: "210 × 297 mm",
  },
  {
    value: "a5",
    label: "A5",
    description: "Compact half-page format — saves paper for short bills",
    icon: FileStack,
    dimensions: "148 × 210 mm",
  },
];

export default function PrintPreference() {
  const [mode, setMode] = useState(null);
  const [savedMode, setSavedMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrintPreference();
  }, []);

  const fetchPrintPreference = async () => {
    try {
      setLoading(true);
      const res = await api.get("/store");
      const current = res?.data?.settings?.printMode || "a4";
      setMode(current);
      setSavedMode(current);
    } catch (err) {
      toast.error("Failed to load print preference");
      setMode("a4");
      setSavedMode("a4");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mode) {
      toast.error("Please select a print format");
      return;
    }
    if (mode === savedMode) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("settings[printMode]", mode);

      const res = await api.put("/store/update-my-store", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.success) {
        toast.success(`Print format set to ${mode.toUpperCase()}`);
        setSavedMode(mode);
      } else {
        toast.error(res.message || "Failed to save print preference");
      }
    } catch (err) {
      toast.error("Failed to save print preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Print Preference</h1>
            <p className="text-sm text-slate-400">
              Choose the default paper size for invoices &amp; purchase bills
            </p>
          </div>
        </div>

        {/* Format selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map((item) => {
            const isActive = mode === item.value;
            const Icon = item.icon;
            return (
              <Card
                key={item.value}
                onClick={() => setMode(item.value)}
                className={`cursor-pointer transition-all rounded-2xl border-2 ${
                  isActive
                    ? "border-blue-500 bg-blue-50/60 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CardContent className="p-5 relative">
                  {isActive && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                      isActive ? "bg-blue-600" : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-500"}`}
                    />
                  </div>

                  <p className={`font-bold ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{item.dimensions}</p>
                  <p className="text-sm text-slate-500 mt-2 leading-snug">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live preview hint */}
        <Card className="bg-white border-dashed border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="rounded border border-slate-300 bg-slate-50 shrink-0"
              style={
                mode === "a5"
                  ? { width: 42, height: 60 }
                  : { width: 50, height: 70 }
              }
            />
            <p className="text-xs text-slate-400">
              Selected format:{" "}
              <span className="font-semibold text-slate-600">
                {mode ? mode.toUpperCase() : "-"}
              </span>{" "}
              — this will be used as the default paper size when printing
              invoices and purchase bills.
            </p>
          </CardContent>
        </Card>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving || !mode || mode === savedMode}
          className="w-full rounded-xl h-11"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Preference
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
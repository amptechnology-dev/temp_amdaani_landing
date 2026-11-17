"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import api from "../../utils/api"; 

export const FEATURE_LABELS = {
  manageStaff: "Manage Staff",
  stockManagement: "Stock Management",
  orders: "Orders",
  reports: "Reports",
  purchaseManagement: "Purchase Management",
};

export default function FeatureLockedDialog({ featureKey, currentPlanName, onClose }) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    if (!featureKey) return;
    api
      .get("/plan/active")
      .then((res) => {
        if (res.success) {
          setPlans(
            (res.data || []).filter(
              (p) => p.planType !== "topup" && p.enabledFeatures?.[featureKey],
            ),
          );
        }
      })
      .catch(() => setPlans([]));
  }, [featureKey]);

  return (
    <Dialog open={!!featureKey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center mb-2">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <DialogTitle>{FEATURE_LABELS[featureKey]} is locked</DialogTitle>
          <DialogDescription>
            Your current plan ({currentPlanName || "Free"}) does not include{" "}
            {FEATURE_LABELS[featureKey]}. Upgrade to use it.
          </DialogDescription>
        </DialogHeader>

        {plans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Available in
            </p>
            {plans.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-slate-500">
                  ₹{p.price} / {p.durationDays} days
                </span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push("/dashboard/pricing");
            }}
          >
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
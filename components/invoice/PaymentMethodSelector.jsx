"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  FileText,
} from "lucide-react";

const paymentIcons = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
  bank_transfer: Building,
  cheque: FileText,
};

const methods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <Label>Payment Method</Label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select payment method" />
        </SelectTrigger>

        <SelectContent>
          {methods.map((method) => {
            const Icon = paymentIcons[method.value] || CreditCard;
            return (
              <SelectItem key={method.value} value={method.value}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{method.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

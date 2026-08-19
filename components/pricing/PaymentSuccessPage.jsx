"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");
  const txnid = searchParams.get("txnid");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Payment Successful!</h1>
      {amount && <p className="text-slate-500">Amount paid: ₹{amount}</p>}
      {txnid && <p className="text-xs text-slate-400">Transaction ID: {txnid}</p>}
      <Button className="mt-4" onClick={() => router.push("/dashboard/pricing")}>
        Go to Plans
      </Button>
    </div>
  );
}
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Payment Failed</h1>
      {amount && <p className="text-slate-500">Amount: ₹{amount}</p>}
      <p className="text-sm text-slate-400">Please try again or contact support.</p>
      <Button className="mt-4" onClick={() => router.push("/dashboard/pricing")}>
        Try Again
      </Button>
    </div>
  );
}
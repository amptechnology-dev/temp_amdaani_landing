"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PaymentRedirectPage() {
  const searchParams = useSearchParams();
  const formRef = useRef(null);

  const paymentUrl = searchParams.get("paymentUrl");
  const formDataRaw = searchParams.get("formData");
  const formData = formDataRaw ? JSON.parse(formDataRaw) : {};

  useEffect(() => {
    if (formRef.current) {
      formRef.current.submit();
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-500">Redirecting to payment gateway...</p>

      {/* Auto-submitting hidden form — same approach as mobile's HTML auto-submit */}
      <form ref={formRef} action={paymentUrl} method="POST" style={{ display: "none" }}>
        {Object.keys(formData).map((key) => (
          <input key={key} type="hidden" name={key} value={formData[key]} />
        ))}
      </form>
    </div>
  );
}
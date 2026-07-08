"use client";

import { Search, User, Phone, MapPin, X, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomerQuickForm from "./CustomerQuickForm";
import { useEffect, useRef } from "react";

export default function CustomerSearch({
  customerSearchRef,
  customerSearch,
  setCustomerSearch,
  showCustomerDropdown,
  setShowCustomerDropdown,
  isLoading,
  filteredCustomers,
  selectedCustomer,
  handleCustomerSelect,
}) {
  const wrapperRef = useRef(null);

  // ✅ CLOSE ON OUTSIDE CLICK
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------------------
  // SELECTED CUSTOMER CARD
  // -------------------------------
  if (selectedCustomer) {
    return (
      <div ref={wrapperRef}>
        <div className="relative flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl">
          <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 truncate">
                {selectedCustomer.name}
              </h3>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Selected
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500">
              <Phone className="w-3.5 h-3.5" />
              {selectedCustomer.mobile}
            </div>

            {selectedCustomer.address && (
              <p className="text-sm text-slate-400 mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="truncate">{selectedCustomer.address}</span>
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCustomerSelect(null)}
            className="text-blue-600 hover:bg-blue-100 rounded-full h-8 px-3 shrink-0"
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------
  // SEARCH + DROPDOWN
  // -------------------------------
  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />

        <Input
          ref={customerSearchRef}
          placeholder="Search customer by name, mobile, or GST..."
          className="pl-11 pr-9 h-12 rounded-full bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={customerSearch}
          onChange={(e) => {
            setCustomerSearch(e.target.value);
            setShowCustomerDropdown(true);
          }}
          onFocus={() => setShowCustomerDropdown(true)}
        />

        {customerSearch && (
          <button
            onClick={() => setCustomerSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showCustomerDropdown && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/60 max-h-80 overflow-auto">
          {isLoading ? (
            <div className="p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No customers found
            </div>
          ) : (
            <div className="p-2">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {customer.mobile}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <CustomerQuickForm onSave={handleCustomerSelect} />
      </div>
    </div>
  );
}
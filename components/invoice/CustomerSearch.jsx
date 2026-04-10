"use client";

import { Search, User, Phone, MapPin, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  if (selectedCustomer) {
    return (
      <div ref={wrapperRef} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {selectedCustomer.mobile}
              </span>
            </div>

            {selectedCustomer.address && (
              <p className="text-sm text-muted-foreground mt-2 flex gap-2">
                <MapPin className="w-4 h-4" />
                {selectedCustomer.address}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline">Selected</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCustomerSelect(null)}
              className="text-primary"
            >
              Change
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-3" />

      <Input
        ref={customerSearchRef}
        placeholder="Search customer by name, mobile, or GST..."
        className="pl-10"
        value={customerSearch}
        onChange={(e) => {
          setCustomerSearch(e.target.value);
          setShowCustomerDropdown(true);
        }}
        onFocus={() => setShowCustomerDropdown(true)}
      />

      {customerSearch && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCustomerSearch("")}
          className="absolute right-2 top-2"
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      {showCustomerDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer._id}
                onClick={() => handleCustomerSelect(customer)}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b"
              >
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.mobile}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-4">
        <CustomerQuickForm onSave={handleCustomerSelect} />
      </div>
    </div>
  );
}

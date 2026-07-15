"use client";
import { ThemeProvider } from "../../context/ThemeContext";
import { AuthProvider } from "../../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <main>{children}</main>
          <Toaster position="top-right" />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
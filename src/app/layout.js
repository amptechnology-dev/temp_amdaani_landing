"use client";
import "./globals.css";
import { ThemeProvider } from "../../context/ThemeContext";
import Navigation from "../../components/Navigation";
import Footer from "../../components/Footer";
import { AuthProvider } from "../../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body>
        {/* 🚨 SidebarProvider should be TOPMOST provider */}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              {/* Global content wrapper */}
              <main>{children}</main>
              <Toaster position="top-right" />
            </AuthProvider>

            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

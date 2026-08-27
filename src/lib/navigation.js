import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  Wallet,
  FileText,
  TrendingUp,
  PackageSearch,
  BarChart3,
  FileBarChart,
  PieChart,
  Landmark,
  UserCheck,
  Building2,
  CreditCard,
  BookOpen,
  MessageSquareHeart,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";

// -----------------------------------------
// Reports sub-items (single source of truth)
// -----------------------------------------
export const reportSubItems = [
  {
    title: "Sales Report",
    url: "/dashboard/reports/sales",
    icon: TrendingUp,
    key: "sales",
  },
  {
    title: "Product Report",
    url: "/dashboard/reports/products",
    icon: Package,
    key: "products",
  },
  {
    title: "Product Wise Sales",
    url: "/dashboard/reports/product-wise-sales",
    icon: BarChart3,
    key: "productWiseSales",
  },
  {
    title: "Expense Report",
    url: "/dashboard/reports/expenses",
    icon: Wallet,
    key: "expenses",
  },
  {
    title: "GST Report",
    url: "/dashboard/reports/gst",
    icon: FileBarChart,
    key: "gst",
  },
  {
    title: "Stock Report",
    url: "/dashboard/reports/stock",
    icon: PackageSearch,
    key: "stock",
    requiresStock: true,
  },
  {
    title: "Profit & Loss Report",
    url: "/dashboard/reports/profit-loss",
    icon: PieChart,
    key: "profitLoss",
  },
  {
    title: "Purchase Report",
    url: "/dashboard/reports/purchase",
    icon: ShoppingCart,
    key: "purchase",
    requiresPurchaseOrder: true,
  },
  {
    title: "Creditors Report",
    url: "/dashboard/reports/creditors",
    icon: Landmark,
    key: "creditors",
  },
  {
    title: "Debtors Report",
    url: "/dashboard/reports/debtors",
    icon: UserCheck,
    key: "debtors",
  },
];

// -----------------------------------------
// Grouped sidebar sections (single source of truth)
// -----------------------------------------
export const sections = [
  {
    label: "Menu",
    items: [{ title: "Overview", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Master",
    items: [
      { title: "Items", url: "/dashboard/items", icon: Package },
      {
        title: "Vendors",
        url: "/dashboard/vendors",
        icon: Users,
        requiresPurchaseOrder: true,
      },
      { title: "Customers", url: "/dashboard/customers", icon: Users },
    ],
  },
  {
    label: "Billing & Other Expenses",
    items: [
      {
        title: "Purchase",
        url: "/dashboard/purchase",
        icon: ShoppingCart,
        requiresPurchaseOrder: true,
      },
      { title: "Sales", url: "/dashboard/sales", icon: Receipt },
      { title: "Other Expenses", url: "/dashboard/expenses", icon: Wallet },
    ],
  },
  {
    label: "Reports & Insights",
    items: [
      {
        title: "All Transactions",
        url: "/dashboard/transactions",
        icon: FileText,
      },
    ],
  },
  {
    label: "Business Setup",
    items: [
      { title: "Business Profile", url: "/dashboard/profile", icon: Building2 },
      {
        title: "Print Preference",
        url: "/dashboard/print-preference",
        icon: FileText,
      },
    ],
  },
  {
    label: "Subscriptions",
    items: [
      { title: "Plans & Pricing", url: "/dashboard/pricing", icon: CreditCard },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Our Products",
        url: "/dashboard/products",
        icon: PackageSearch,
      },
      { title: "How to Use", url: "/dashboard/how-to-use", icon: BookOpen },
      {
        title: "Give Feedback",
        url: "/dashboard/feedback",
        icon: MessageSquareHeart,
      },
    ],
  },
  {
    label: "Support",
    items: [
      { title: "Help & Support", url: "/dashboard/support", icon: LifeBuoy },
      {
        title: "Privacy Policy",
        url: "/dashboard/privacy-policy",
        icon: ShieldCheck,
      },
    ],
  },
];

export function isItemVisible(
  item,
  { isStockEnabled, isPurchaseOrderEnabled },
) {
  if (item.requiresStock && !isStockEnabled) return false;
  if (item.requiresPurchaseOrder && !isPurchaseOrderEnabled) return false;
  return true;
}

/**
 * Given the current pathname, resolve { title, parent } for the Topbar.
 * - Checks report sub-items first (more specific match).
 * - Falls back to top-level section items.
 * - Falls back to a formatted last URL segment if nothing matches.
 */
export function getPageInfo(pathname) {
  if (!pathname || pathname === "/dashboard") {
    return { title: "Overview", parent: null };
  }

  // Longest-prefix match among report sub-items
  const reportMatch = reportSubItems
    .filter((item) => pathname.startsWith(item.url))
    .sort((a, b) => b.url.length - a.url.length)[0];
  if (reportMatch) {
    return { title: reportMatch.title, parent: "Reports" };
  }

  // Longest-prefix match among top-level section items
  const allItems = sections.flatMap((s) => s.items);
  const match = allItems
    .filter(
      (item) => item.url !== "/dashboard" && pathname.startsWith(item.url),
    )
    .sort((a, b) => b.url.length - a.url.length)[0];
  if (match) {
    return { title: match.title, parent: null };
  }

  // Fallback: derive a readable title from the URL
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "Dashboard";
  const fallbackTitle = last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: fallbackTitle, parent: null };
}

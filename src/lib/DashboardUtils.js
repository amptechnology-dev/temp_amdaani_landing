import { format, startOfMonth, subMonths, isSameMonth } from "date-fns";

export const fetchDashboardData = async () => {
  console.log("⚡ fetchDashboardData CALLED");

  const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [invoiceRes, productRes, dueRes, transactionRes] = await Promise.all([
    api.get("/invoice?limit=50000&status=active"),
    api.get("/product?limit=50000"),
    api.get("/customer/due?limit=20000"),
    api.get("/invoice/transactions", { params: { startDate } }),
  ]);

  // Correct Logging
  console.log("📌 RAW RESPONSES:");
  console.log("Invoices:", invoiceRes);
  console.log("Products:", productRes);
  console.log("Due:", dueRes);
  console.log("Transactions:", transactionRes);

  // Correct Extraction
  const invoices = invoiceRes.data?.docs || [];
  const products = productRes.data?.docs || [];
  const dueCustomers = dueRes.data?.docs || [];
  const transactions = transactionRes.data || [];

  const today = format(new Date(), "yyyy-MM-dd");
  const thisMonth = new Date().getMonth();

  const todayInvoices = invoices.filter(
    (inv) => format(new Date(inv.invoiceDate), "yyyy-MM-dd") === today
  );

  const thisMonthInvoices = invoices.filter(
    (inv) => new Date(inv.invoiceDate).getMonth() === thisMonth
  );

  const sum = (arr, key) => arr.reduce((a, b) => a + (b[key] || 0), 0);

  // METRICS
  const metrics = {
    annualSale: sum(invoices, "grandTotal"),
    lastYearSale: 0,
    annualGrowth: 0,
    annualInvoices: invoices.length,

    monthlySale: sum(thisMonthInvoices, "grandTotal"),
    lastMonthSale: 0,
    monthlyGrowth: 0,
    monthlyInvoices: thisMonthInvoices.length,

    weeklySale: 0,
    weeklyInvoices: 0,

    todaySale: sum(todayInvoices, "grandTotal"),
    todayInvoices: todayInvoices.length,
  };

  // TOP CUSTOMERS FIXED FORMAT
  const topCustomers = {
    percentage: 100,
    sorted: dueCustomers
      .map((c) => ({
        customer: c.name || "Unknown",
        mobile: c.mobile,
        count: c.pendingInvoiceCount || 0,
        total: c.totalDue || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };

  // TOP PRODUCTS FIXED FORMAT
  const topProducts = products
    .map((p) => ({
      name: p.name,
      category: p?.category?.name || "",
      revenue: p.sellCount * p.sellingPrice,
      qty: p.sellCount,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // SUMMARY FIXED FORMAT
  const dueSummary = {
    totalDue: dueCustomers.reduce((a, b) => a + b.totalDue, 0),
    totalCustomers: dueCustomers.length,
    totalPendingInvoices: dueCustomers.reduce(
      (a, b) => a + (b.pendingInvoiceCount || 0),
      0
    ),
  };

  const receivedSummary = {
    totalReceived: sum(transactions, "amount"),
  };

  // MONTHLY REVENUE FIXED FORMAT
  const monthMap = {};
  invoices.forEach((inv) => {
    const key = format(new Date(inv.invoiceDate), "MMM yyyy");
    monthMap[key] = (monthMap[key] || 0) + inv.grandTotal;
  });

  const monthlyRevenue = {
    data: Object.entries(monthMap).map(([name, value]) => ({ name, value })),
  };

  // WEEKLY TREND FIXED FORMAT
  const weeklyTrend = {
    data: invoices.slice(-7).map((inv) => ({
      name: format(new Date(inv.invoiceDate), "dd MMM"),
      value: inv.grandTotal,
    })),
  };

  // RECENT ACTIVITY
  const recentActivity = invoices
    .slice(-10)
    .map((inv) => ({
      type: "invoice",
      amount: inv.grandTotal,
      date: inv.invoiceDate,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    metrics,
    dueSummary,
    receivedSummary,
    topCustomers,
    topProducts,
    monthlyRevenue,
    weeklyTrend,
    recentActivity,
  };
};

export const formatCurrency = (value) => {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

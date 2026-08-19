// app/dashboard/transactions/page.jsx
import React from "react";
import AllTransactionsPage from "../../../../components/transactions/AllTransactions";

export const dynamic = "force-dynamic";
export default function Transactions() {
  return <AllTransactionsPage />;
}
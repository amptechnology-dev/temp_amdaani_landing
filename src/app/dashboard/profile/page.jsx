// app/dashboard/profile/page.jsx
import React from "react";
import BusinessProfile from "../../../../components/profile/BusinessProfile";

export const dynamic = "force-dynamic";
export default function ProfilePage() {
  return <BusinessProfile />;
}
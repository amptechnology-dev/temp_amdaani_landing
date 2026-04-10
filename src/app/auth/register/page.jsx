import { Suspense } from "react";
import RegisterPage from "../../../../components/auth/RegisterPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div></div>}>
      <RegisterPage />
    </Suspense>
  );
}
// End of file src/app/auth/register/page.jsx

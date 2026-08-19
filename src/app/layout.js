import "./globals.css";
import Providers from "./Providers";

export const metadata = {
  title: "AMDAANI Invoice Billing App",
  description: "Invoicing, Inventory, Billing, GST, Accounting App * Business",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

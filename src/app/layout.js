import "./globals.css";
import Providers from "./Providers";

export const metadata = {
  title: "Amdaani Billing App",
  description: "Your app description",
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
